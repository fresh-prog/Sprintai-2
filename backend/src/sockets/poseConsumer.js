// Drains pose windows that the WS handler pushed onto Redis streams, runs
// activity inference + biomech metric extraction asynchronously, and
// broadcasts results back to the session's room.
//
// Why split from the WS handler? Posture is a per-frame call (sub-10 ms) so
// it makes sense inline. Activity needs a sliding 32-frame window and biomech
// can take hundreds of ms — both would block the WS hot path. Putting them
// behind a consumer group also lets us scale workers horizontally later.

import { redis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { mlClient } from '../services/ml.client.js';
import { biomechClient } from '../services/biomech.client.js';
import { jointAngles } from '../utils/angles.js';
import { RollingBuffer } from '../utils/buffer.js';
import { prisma } from '../config/db.js';

const GROUP = 'pose-consumer';
const CONSUMER = `worker-${process.pid}`;
const WINDOW_LEN = 32;
const BLOCK_MS = 2_000;

// Per-session rolling buffer of recent frames (for activity windows).
const buffers = new Map();
let stopping = false;

export function startPoseConsumer(io) {
  (async function loop() {
    while (!stopping) {
      try {
        await drainOnce(io);
      } catch (err) {
        logger.error({ err: err.message }, 'pose consumer iteration failed');
        await sleep(500);
      }
    }
  })();

  return () => { stopping = true; };
}

async function drainOnce(io) {
  // Discover active session streams. KEYS is fine here because we expect tens
  // of concurrent sessions — swap for SCAN if that ever changes.
  const keys = await redis.keys('pose:stream:*');
  if (keys.length === 0) {
    await sleep(250);
    return;
  }

  for (const key of keys) {
    const sessionId = key.slice('pose:stream:'.length);
    await ensureGroup(key);

    const res = await redis.xreadgroup(
      'GROUP', GROUP, CONSUMER,
      'COUNT', '20',
      'BLOCK', BLOCK_MS.toString(),
      'STREAMS', key, '>',
    );
    if (!res) continue;

    for (const [, entries] of res) {
      for (const [id, fields] of entries) {
        const payload = fieldsToObj(fields);
        const frames = JSON.parse(payload.frames || '[]');
        if (!frames.length) {
          await redis.xack(key, GROUP, id);
          continue;
        }
        await handleWindow(io, sessionId, frames);
        await redis.xack(key, GROUP, id);
      }
    }
  }
}

async function ensureGroup(key) {
  try {
    await redis.xgroup('CREATE', key, GROUP, '$', 'MKSTREAM');
  } catch (e) {
    if (!String(e.message).includes('BUSYGROUP')) throw e;
  }
}

async function handleWindow(io, sessionId, frames) {
  // 1. Maintain a per-session rolling buffer for activity inference.
  let buf = buffers.get(sessionId);
  if (!buf) {
    buf = new RollingBuffer(WINDOW_LEN);
    buffers.set(sessionId, buf);
  }
  buf.push(...frames);

  const ns = io.of('/ws/pose');
  const room = `session:${sessionId}`;
  const last = frames[frames.length - 1];

  // 2. Emit live joint angles for the latest frame — fast, no external call.
  const angles = jointAngles(last.keypoints);
  ns.to(room).emit('metric:angles', { tsMs: last.tsMs, angles });

  // 3. Activity prediction once we have a full window.
  if (buf.full) {
    const window = buf.values().map((f) => f.keypoints.flatMap((p) => [p.x, p.y, p.z ?? 0, p.vis ?? 0]));
    const pred = await mlClient.predictActivity(window);
    if (pred?.label) {
      const row = await prisma.prediction.create({
        data: {
          sessionId,
          kind: 'ACTIVITY',
          tsMs: last.tsMs,
          label: pred.label,
          confidence: pred.confidence ?? 0,
        },
      });
      ns.to(room).emit('prediction:activity', row);
    }
  }

  // 4. Best-effort biomech symmetry/ROM ping on every Nth window.
  if (frames[0].frameIdx % (WINDOW_LEN * 4) === 0) {
    const sym = await biomechClient.computeRom?.(frames);
    if (sym) ns.to(room).emit('metric:rom', { tsMs: last.tsMs, rom: sym.rom });
  }
}

function fieldsToObj(arr) {
  const out = {};
  for (let i = 0; i < arr.length; i += 2) out[arr[i]] = arr[i + 1];
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
