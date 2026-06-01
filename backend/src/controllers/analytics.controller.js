import { prisma } from '../config/db.js';
import * as svc from '../services/session.service.js';

export async function metrics(req, res) {
  await svc.getSession(req.user.id, req.params.id);
  const { name } = req.query;
  const where = { sessionId: req.params.id, ...(name ? { name: String(name) } : {}) };
  const rows = await prisma.metric.findMany({
    where,
    orderBy: { tsMs: 'asc' },
    take: 20_000,
  });
  res.json({ metrics: rows });
}

export async function predictions(req, res) {
  await svc.getSession(req.user.id, req.params.id);
  const { kind } = req.query;
  const where = { sessionId: req.params.id, ...(kind ? { kind: String(kind) } : {}) };
  const rows = await prisma.prediction.findMany({
    where,
    orderBy: { tsMs: 'asc' },
    take: 5000,
  });
  res.json({ predictions: rows });
}

export async function summary(req, res) {
  const session = await svc.getSession(req.user.id, req.params.id);
  const managed = ['summary.', 'sprint.'];
  const [metricAgg, topPred, frameCount, summaryRows, sprintRows, phaseRows] = await Promise.all([
    prisma.metric.groupBy({
      by: ['name'],
      where: {
        sessionId: session.id,
        AND: managed.map((p) => ({ name: { not: { startsWith: p } } })),
      },
      _max: { value: true },
      _min: { value: true },
      _avg: { value: true },
    }),
    prisma.prediction.groupBy({
      by: ['kind', 'label'],
      where: { sessionId: session.id },
      _count: { _all: true },
      orderBy: { _count: { label: 'desc' } },
      take: 5,
    }),
    prisma.poseFrame.count({ where: { sessionId: session.id } }),
    prisma.metric.findMany({
      where: { sessionId: session.id, name: { startsWith: 'summary.' } },
      orderBy: { name: 'asc' },
    }),
    prisma.metric.findMany({
      where: { sessionId: session.id, name: { startsWith: 'sprint.' } },
      orderBy: { name: 'asc' },
    }),
    prisma.prediction.findMany({
      where: { sessionId: session.id, kind: 'SPRINT_PHASE' },
      orderBy: { tsMs: 'asc' },
    }),
  ]);

  const biomech = { rom: {}, symmetry: {}, gait: {} };
  for (const row of summaryRows) {
    const [, group, ...rest] = row.name.split('.');
    const key = rest.join('.');
    if (group in biomech) biomech[group][key] = row.value;
  }

  const sprint = {};
  for (const row of sprintRows) {
    sprint[row.name.slice('sprint.'.length)] = row.value;
  }
  const phases = phaseRows.map((p) => ({
    phase: p.label,
    startMs: p.tsMs,
    endMs:   p.meta?.endMs   ?? p.tsMs,
    durationMs: p.meta?.durationMs ?? 0,
  }));

  res.json({ session, metricAgg, topPred, frameCount, biomech, sprint, phases });
}

export async function adminOverview(_req, res) {
  const [users, sessions, frames] = await Promise.all([
    prisma.user.count(),
    prisma.session.count(),
    prisma.poseFrame.count(),
  ]);
  res.json({ users, sessions, frames });
}
