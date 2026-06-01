// Sprint-specific ML / analytics. Each function pulls the persisted
// sprint.* metrics for a session (and optionally a cohort), forwards them
// to the biomech service, and returns the structured result.
//
// Why split this from biomech.client.js? These are higher-level helpers
// that combine multiple DB queries with a single biomech call. Keeping
// them here means controllers stay thin.

import axios from 'axios';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const biomech = axios.create({ baseURL: env.BIOMECH_SERVICE_URL, timeout: 15_000 });

async function metricsForSession(sessionId) {
  const rows = await prisma.metric.findMany({
    where: { sessionId, OR: [{ name: { startsWith: 'sprint.' } }, { name: { startsWith: 'summary.symmetry.' } }] },
  });
  const sprint = {};
  const symmetry = {};
  for (const r of rows) {
    if (r.name.startsWith('sprint.')) sprint[r.name.slice('sprint.'.length)] = r.value;
    else symmetry[r.name.slice('summary.symmetry.'.length)] = r.value;
  }
  return { sprint, symmetry };
}

export async function predictTime(sessionId) {
  const { sprint } = await metricsForSession(sessionId);
  try {
    const { data } = await biomech.post('/ml/predict-time', { metrics: sprint });
    return data;
  } catch (err) {
    logger.warn({ err: err.message, sessionId }, 'predict-time failed');
    return { ok: false, reason: err.message };
  }
}

export async function injuryRisk(sessionId) {
  const { sprint, symmetry } = await metricsForSession(sessionId);
  try {
    const { data } = await biomech.post('/ml/injury-risk', { metrics: sprint, symmetry });
    return data;
  } catch (err) {
    logger.warn({ err: err.message, sessionId }, 'injury-risk failed');
    return { ok: false, reason: err.message };
  }
}

export async function similarAthletes(sessionId, { k = 5 } = {}) {
  // Subject = this session's sprint vector. Cohort = the latest COMPLETED
  // session per athlete (excluding the subject's own athlete).
  const subjectSession = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!subjectSession) return { ok: false, reason: 'session not found' };

  const { sprint: subjectMetrics } = await metricsForSession(sessionId);
  const subject = { id: subjectSession.athleteId ?? subjectSession.id, ...subjectMetrics };

  // Latest completed session per athlete, with their sprint metrics.
  const recent = await prisma.session.findMany({
    where: { status: 'COMPLETED', athleteId: { not: null, not: subjectSession.athleteId } },
    orderBy: { startedAt: 'desc' },
    take: 100,
    include: { athlete: { select: { id: true, fullName: true, country: true, primaryEvent: true } } },
  });

  const cohort = await Promise.all(recent.map(async (s) => {
    const { sprint } = await metricsForSession(s.id);
    return { id: s.athleteId, sessionId: s.id, ...s.athlete, ...sprint };
  }));

  try {
    const { data } = await biomech.post('/ml/similarity', { subject, cohort, k });
    return data;
  } catch (err) {
    logger.warn({ err: err.message, sessionId }, 'similarity failed');
    return { ok: false, reason: err.message };
  }
}
