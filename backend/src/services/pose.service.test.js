// Behavior tests for the pose-frame ingest path. Verifies down-sampling and
// metric derivation without touching Postgres or the Prom counters.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const captured = { poseFrame: [], metric: [] };

vi.mock('../config/db.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb) => {
      return cb({
        poseFrame: { createMany: vi.fn(async ({ data }) => { captured.poseFrame.push(...data); }) },
        metric:    { createMany: vi.fn(async ({ data }) => { captured.metric.push(...data); }) },
      });
    }),
  },
}));

vi.mock('../observability/metrics.js', () => ({
  framesIngested: { inc: vi.fn() },
  framesPersisted: { inc: vi.fn() },
}));

const { ingestFrames } = await import('./pose.service.js');

function frame(i) {
  const kp = Array.from({ length: 33 }, (_, j) => ({ i: j, x: 0.5, y: 0.5, z: 0, vis: 1 }));
  return { frameIdx: i, tsMs: i * 33, keypoints: kp };
}

describe('pose.service.ingestFrames', () => {
  beforeEach(() => { captured.poseFrame = []; captured.metric = []; });

  it('persists every 5th frame (down-sampling)', async () => {
    const frames = Array.from({ length: 20 }, (_, i) => frame(i));
    const out = await ingestFrames('session-1', frames);
    expect(out.persisted).toBe(4); // idx 0,5,10,15
    expect(captured.poseFrame.map((f) => f.frameIdx)).toEqual([0, 5, 10, 15]);
  });

  it('emits joint-angle + symmetry metrics for every persisted frame', async () => {
    const frames = Array.from({ length: 10 }, (_, i) => frame(i));
    await ingestFrames('session-2', frames);
    // 2 persisted frames × (8 joints + 1 symmetry) = 18 metric rows
    expect(captured.metric).toHaveLength(2 * 9);
    const names = new Set(captured.metric.map((m) => m.name));
    expect(names.has('left_knee')).toBe(true);
    expect(names.has('symmetry_knee')).toBe(true);
  });

  it('is a no-op when the batch contains nothing to persist', async () => {
    const frames = [frame(1), frame(2), frame(3), frame(4)]; // none divisible by 5
    const out = await ingestFrames('session-3', frames);
    expect(out.persisted).toBe(0);
    expect(captured.poseFrame).toHaveLength(0);
    expect(captured.metric).toHaveLength(0);
  });
});
