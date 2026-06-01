// Assembles the coach-facing report by pulling the persisted sprint metrics,
// the predicted 100m time (via the ML pipeline), and the fault counts, then
// forwarding everything to the biomech /coach-report endpoint.
//
// Output is structured for direct rendering on the SessionDetail page:
//   { tier:{tier, score, description, predicted_100m_s},
//     comparison: [{metric, label, value, olympic_mean, ..., status}, ...],
//     recommendations: [{priority, title, cue, drills, source}, ...] }

import axios from 'axios';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { predictTime } from './ml.service.js';

const biomech = axios.create({ baseURL: env.BIOMECH_SERVICE_URL, timeout: 15_000 });

export async function buildCoachReport(sessionId) {
  // Pull sprint.* metrics + the sprint_score in one query.
  const metricRows = await prisma.metric.findMany({
    where: { sessionId, name: { startsWith: 'sprint.' } },
  });
  const metrics = {};
  for (const r of metricRows) metrics[r.name.slice('sprint.'.length)] = r.value;

  if (Object.keys(metrics).length === 0) {
    return { ok: false, reason: 'no sprint metrics yet — finalize the session first' };
  }

  const sprintScore = metrics.sprint_score ?? 0;

  // Fault counts (pivot the TECHNIQUE_ERROR predictions).
  const faultRows = await prisma.prediction.findMany({
    where: { sessionId, kind: 'TECHNIQUE_ERROR' },
    select: { label: true },
  });
  const faultsCounts = {};
  for (const f of faultRows) faultsCounts[f.label] = (faultsCounts[f.label] || 0) + 1;

  // Predicted 100m time — best-effort, falls back to undefined.
  let predicted100m;
  try {
    const pred = await predictTime(sessionId);
    if (pred?.ok) predicted100m = pred.predicted_100m_s;
  } catch (err) {
    logger.warn({ err: err.message, sessionId }, 'predict-time failed in coach report');
  }

  try {
    const { data } = await biomech.post('/coach-report', {
      metrics,
      sprint_score: sprintScore,
      predicted_100m_s: predicted100m ?? null,
      faults_counts: faultsCounts,
    });
    return { ok: true, ...data };
  } catch (err) {
    logger.warn({ err: err.message, sessionId }, 'biomech /coach-report failed');
    return { ok: false, reason: err.message };
  }
}
