// Called when a session transitions to COMPLETED. Pulls the persisted pose
// frames, asks the biomech service for a one-shot summary, and writes the
// derived metrics back as Metric rows so the dashboard can render them
// without re-computing on every page load.
//
// Designed to be idempotent: re-running on a finalized session will overwrite
// the previous summary rows for that session.

import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { biomechClient } from './biomech.client.js';

const SUMMARY_METRIC_PREFIX = 'summary.';

export async function finalizeSession(sessionId) {
  const frames = await prisma.poseFrame.findMany({
    where: { sessionId },
    orderBy: { frameIdx: 'asc' },
    take: 10_000,
  });
  if (frames.length === 0) return { skipped: true, reason: 'no frames' };

  const payload = frames.map((f) => ({
    frameIdx: f.frameIdx,
    tsMs: f.tsMs,
    keypoints: f.keypoints,
  }));

  const summary = await biomechClient.computeSummary(payload);
  if (!summary) {
    logger.warn({ sessionId }, 'biomech summary unavailable; skipping finalize');
    return { skipped: true, reason: 'biomech unavailable' };
  }

  const endTs = frames[frames.length - 1].tsMs;
  const rows = [];

  for (const [joint, agg] of Object.entries(summary.rom ?? {})) {
    if (typeof agg?.range === 'number') {
      rows.push({ sessionId, name: `${SUMMARY_METRIC_PREFIX}rom.${joint}`, tsMs: endTs, value: agg.range });
    }
  }
  for (const [pair, idx] of Object.entries(summary.symmetry ?? {})) {
    if (typeof idx === 'number') {
      rows.push({ sessionId, name: `${SUMMARY_METRIC_PREFIX}symmetry.${pair}`, tsMs: endTs, value: idx });
    }
  }
  if (typeof summary.gait?.cadence_spm === 'number') {
    rows.push({ sessionId, name: `${SUMMARY_METRIC_PREFIX}gait.cadence_spm`, tsMs: endTs, value: summary.gait.cadence_spm });
  }

  await prisma.$transaction([
    prisma.metric.deleteMany({ where: { sessionId, name: { startsWith: SUMMARY_METRIC_PREFIX } } }),
    prisma.metric.createMany({ data: rows }),
  ]);

  logger.info({ sessionId, count: rows.length, opensim: summary.opensim }, 'session finalized');
  return { persisted: rows.length, opensim: summary.opensim };
}
