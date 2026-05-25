import { prisma } from '../config/db.js';
import { jointAngles, symmetryIndex } from '../utils/angles.js';
import { framesIngested, framesPersisted } from '../observability/metrics.js';

const PERSIST_EVERY_N = 5; // Down-sample 30 fps → ~6 fps for storage.

/**
 * Persist a batch of frames coming in via REST or WS. Drops most rows but
 * computes joint angles for the ones it keeps and emits Metric rows so the
 * dashboard has data even without the biomech service running.
 */
export async function ingestFrames(sessionId, frames) {
  framesIngested.inc(frames.length);
  const kept = frames.filter((f) => f.frameIdx % PERSIST_EVERY_N === 0);
  if (kept.length === 0) return { persisted: 0 };
  framesPersisted.inc(kept.length);

  // Tx so partial failure doesn't leave dangling rows.
  await prisma.$transaction(async (tx) => {
    await tx.poseFrame.createMany({
      data: kept.map((f) => ({
        sessionId,
        frameIdx: f.frameIdx,
        tsMs: f.tsMs,
        keypoints: f.keypoints,
        confidence: averageVisibility(f.keypoints),
      })),
    });

    const metricRows = [];
    for (const f of kept) {
      const a = jointAngles(f.keypoints);
      for (const [name, value] of Object.entries(a)) {
        metricRows.push({ sessionId, name, tsMs: f.tsMs, value });
      }
      metricRows.push({
        sessionId,
        name: 'symmetry_knee',
        tsMs: f.tsMs,
        value: symmetryIndex(a.left_knee, a.right_knee),
      });
    }
    if (metricRows.length) await tx.metric.createMany({ data: metricRows });
  });

  return { persisted: kept.length };
}

function averageVisibility(kp) {
  if (!kp?.length) return 0;
  const sum = kp.reduce((acc, p) => acc + (p.vis ?? p.visibility ?? 0), 0);
  return sum / kp.length;
}
