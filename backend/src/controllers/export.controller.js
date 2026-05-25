import { prisma } from '../config/db.js';
import * as svc from '../services/session.service.js';
import { streamSessionReport } from '../services/report.service.js';
import { BadRequest } from '../utils/errors.js';

const FRAME_LIMIT = 50_000;
const METRIC_LIMIT = 200_000;

export async function exportSession(req, res) {
  const session = await svc.getSession(req.user.id, req.params.id);
  const format = String(req.query.format ?? 'json').toLowerCase();

  const [frames, metrics, predictions] = await Promise.all([
    prisma.poseFrame.findMany({
      where: { sessionId: session.id },
      orderBy: { frameIdx: 'asc' },
      take: FRAME_LIMIT,
    }),
    prisma.metric.findMany({
      where: { sessionId: session.id },
      orderBy: { tsMs: 'asc' },
      take: METRIC_LIMIT,
    }),
    prisma.prediction.findMany({
      where: { sessionId: session.id },
      orderBy: { tsMs: 'asc' },
    }),
  ]);

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="session-${session.id}.json"`);
    return res.json({
      session: {
        id: session.id,
        label: session.label,
        source: session.source,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        meta: session.meta,
      },
      frames: frames.map(serializeFrame),
      metrics: metrics.map(serializeMetric),
      predictions: predictions.map(serializePrediction),
    });
  }

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="session-${session.id}-metrics.csv"`);
    res.write('ts_ms,name,value\n');
    for (const m of metrics) {
      res.write(`${m.tsMs},${csvEscape(m.name)},${m.value}\n`);
    }
    for (const p of predictions) {
      res.write(`${p.tsMs},${csvEscape('prediction.' + p.kind.toLowerCase())},${p.confidence}\n`);
    }
    return res.end();
  }

  throw BadRequest('UNSUPPORTED_FORMAT', `format must be 'json' or 'csv', got '${format}'`);
}

export async function exportReport(req, res) {
  await streamSessionReport(req.user.id, req.params.id, res);
}

function serializeFrame(f) {
  // BigInt → number is safe here: autoincrement IDs stay well within 2^53.
  return { id: Number(f.id), frameIdx: f.frameIdx, tsMs: f.tsMs, keypoints: f.keypoints, confidence: f.confidence };
}

function serializeMetric(m) {
  return { id: Number(m.id), name: m.name, tsMs: m.tsMs, value: m.value, meta: m.meta };
}

function serializePrediction(p) {
  return { id: Number(p.id), kind: p.kind, tsMs: p.tsMs, label: p.label, confidence: p.confidence, meta: p.meta };
}

function csvEscape(s) {
  const v = String(s);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
