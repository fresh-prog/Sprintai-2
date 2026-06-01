// Called when a session transitions to COMPLETED. Pulls the persisted pose
// frames, asks the biomech service for the one-shot summary + sprint analysis,
// and writes the derived metrics back as Metric rows so the dashboard can
// render them without re-computing on every page load.
//
// Idempotent: re-running on a finalized session overwrites the previous
// `summary.*` and `sprint.*` rows.

import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { biomechClient } from './biomech.client.js';

const SUMMARY_PREFIX = 'summary.';
const SPRINT_PREFIX  = 'sprint.';
const MANAGED_PREFIXES = [SUMMARY_PREFIX, SPRINT_PREFIX];

export async function finalizeSession(sessionId) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { athlete: true },
  });
  if (!session) return { skipped: true, reason: 'session not found' };

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

  const [summary, sprint] = await Promise.all([
    biomechClient.computeSummary(payload),
    biomechClient.analyzeSprint(payload, session.athlete?.heightCm),
  ]);

  if (!summary && !sprint) {
    logger.warn({ sessionId }, 'biomech unavailable; skipping finalize');
    return { skipped: true, reason: 'biomech unavailable' };
  }

  const endTs = frames[frames.length - 1].tsMs;
  const rows = [];
  const predictions = [];

  // -- Generic biomech summary ------------------------------------------------
  for (const [joint, agg] of Object.entries(summary?.rom ?? {})) {
    if (typeof agg?.range === 'number') {
      rows.push({ sessionId, name: `${SUMMARY_PREFIX}rom.${joint}`, tsMs: endTs, value: agg.range });
    }
  }
  for (const [pair, idx] of Object.entries(summary?.symmetry ?? {})) {
    if (typeof idx === 'number') {
      rows.push({ sessionId, name: `${SUMMARY_PREFIX}symmetry.${pair}`, tsMs: endTs, value: idx });
    }
  }
  if (typeof summary?.gait?.cadence_spm === 'number') {
    rows.push({ sessionId, name: `${SUMMARY_PREFIX}gait.cadence_spm`, tsMs: endTs, value: summary.gait.cadence_spm });
  }

  // -- Sprint-specific metrics -----------------------------------------------
  if (sprint && sprint.ok !== false) {
    const m = sprint;
    const scalar = {
      'sprint_score':           m.sprint_score,
      'technique_score':        m.technique_score,
      'stride_freq_hz':         m.stride_freq_hz,
      'stride_len_norm':        m.avg_stride_len_norm,
      'gct_ms':                 m.avg_gct_ms,
      'trunk_lean_deg':         m.avg_trunk_lean_deg,
      'knee_drive_deg':         m.avg_knee_drive_deg,
      'arm_swing_deg':          m.avg_arm_swing_deg,
      'velocity_norm':          m.horizontal_velocity_norm,
    };
    for (const [name, value] of Object.entries(scalar)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        rows.push({ sessionId, name: `${SPRINT_PREFIX}${name}`, tsMs: endTs, value });
      }
    }
    // Phase timeline → one Prediction per phase segment so it lights up the
    // SPRINT_PHASE timeline in the UI.
    for (const seg of m.phase_timeline ?? []) {
      predictions.push({
        sessionId,
        kind: 'SPRINT_PHASE',
        tsMs: seg.start_ms,
        label: seg.phase,
        confidence: 1.0,
        meta: { endMs: seg.end_ms, durationMs: seg.duration_ms },
      });
    }
  }

  await prisma.$transaction([
    prisma.metric.deleteMany({
      where: { sessionId, OR: MANAGED_PREFIXES.map((p) => ({ name: { startsWith: p } })) },
    }),
    prisma.metric.createMany({ data: rows }),
    prisma.prediction.deleteMany({ where: { sessionId, kind: 'SPRINT_PHASE' } }),
    prisma.prediction.createMany({ data: predictions }),
  ]);

  logger.info(
    { sessionId, metrics: rows.length, phases: predictions.length, sprintScore: sprint?.sprint_score },
    'session finalized',
  );
  return { persisted: rows.length, phases: predictions.length, sprintScore: sprint?.sprint_score };
}
