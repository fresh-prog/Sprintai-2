import * as svc from '../services/session.service.js';
import * as pose from '../services/pose.service.js';
import { prisma } from '../config/db.js';

export async function create(req, res) {
  const session = await svc.createSession(req.user.id, req.body);
  res.status(201).json(session);
}

export async function list(req, res) {
  res.json(await svc.listSessions(req.user.id, req.query));
}

export async function get(req, res) {
  res.json(await svc.getSession(req.user.id, req.params.id));
}

export async function end(req, res) {
  res.json(await svc.endSession(req.user.id, req.params.id, req.body.status));
}

export async function destroy(req, res) {
  await svc.deleteSession(req.user.id, req.params.id);
  res.status(204).end();
}

export async function ingestFrames(req, res) {
  await svc.getSession(req.user.id, req.params.id);
  const result = await pose.ingestFrames(req.params.id, req.body.frames);
  res.status(202).json(result);
}

export async function getFrames(req, res) {
  await svc.getSession(req.user.id, req.params.id);
  const { from = 0, to = 1_000_000 } = req.query;
  const frames = await prisma.poseFrame.findMany({
    where: { sessionId: req.params.id, frameIdx: { gte: Number(from), lte: Number(to) } },
    orderBy: { frameIdx: 'asc' },
    take: 5000,
  });
  res.json({ frames });
}
