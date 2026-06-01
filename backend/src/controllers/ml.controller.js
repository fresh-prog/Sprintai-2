import * as mlSvc from '../services/ml.service.js';
import * as sessionSvc from '../services/session.service.js';

export async function predictTime(req, res) {
  await sessionSvc.getSession(req.user.id, req.params.id);
  res.json(await mlSvc.predictTime(req.params.id));
}

export async function injuryRisk(req, res) {
  await sessionSvc.getSession(req.user.id, req.params.id);
  res.json(await mlSvc.injuryRisk(req.params.id));
}

export async function similar(req, res) {
  await sessionSvc.getSession(req.user.id, req.params.id);
  const k = Math.min(Math.max(Number(req.query.k) || 5, 1), 25);
  res.json(await mlSvc.similarAthletes(req.params.id, { k }));
}
