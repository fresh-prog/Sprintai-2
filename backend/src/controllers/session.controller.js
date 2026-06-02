import * as svc from '../services/session.service.js';
import * as pose from '../services/pose.service.js';
import { findDuplicate, saveVideo, sha256Of } from '../services/upload.service.js';
import { processUploadedVideo } from '../services/videoProcessor.service.js';
import { logger } from '../config/logger.js';
import { prisma } from '../config/db.js';
import { BadRequest, NotFound } from '../utils/errors.js';

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

export async function uploadVideo(req, res) {
  await svc.getSession(req.user.id, req.params.id);
  if (!req.file) throw BadRequest('NO_FILE', 'No video file provided');

  // Dedup check — same user, same bytes ⇒ bounce to the existing session
  // instead of re-uploading + re-processing. We skip the duplicate path
  // when the user is uploading to a session that already has a different
  // video (then the upload is "replace this video", which is intentional).
  const hash = sha256Of(req.file.buffer);
  const existing = await findDuplicate(req.user.id, hash);
  if (existing && existing.session.id !== req.params.id) {
    // Tidy up: delete the empty placeholder session we just created. The
    // user has nothing in it that needs preserving.
    try { await svc.deleteSession(req.user.id, req.params.id); } catch { /* noop */ }
    return res.status(200).json({
      duplicate: true,
      sessionId: existing.session.id,
      videoAssetId: existing.asset.id,
      status: existing.session.status,
      message: 'This video has already been uploaded — opening the existing session.',
    });
  }

  const asset = await saveVideo(req.params.id, req.file);

  // Fire-and-forget pipeline: extract pose frames, then run sprint analysis.
  // The HTTP response goes out as soon as the file is on disk; the session
  // status transitions PROCESSING → COMPLETED in the background.
  processUploadedVideo(req.params.id, asset.storagePath).catch((err) => {
    logger.error({ err: err.message, sessionId: req.params.id }, 'background processing crashed');
  });

  res.status(201).json({
    videoAssetId: asset.id,
    sessionId: req.params.id,
    status: 'PROCESSING',
  });
}

export async function reprocess(req, res) {
  await svc.getSession(req.user.id, req.params.id);
  const asset = await prisma.videoAsset.findUnique({ where: { sessionId: req.params.id } });
  if (!asset) {
    throw NotFound(
      'No video on this session — reprocess only works on uploaded videos, not live captures.',
    );
  }

  // Wipe any prior analysis so the new run lands cleanly. We keep the
  // VideoAsset itself (and its file on disk) so we don't re-upload.
  await prisma.$transaction([
    prisma.poseFrame.deleteMany({ where: { sessionId: req.params.id } }),
    prisma.metric.deleteMany({ where: { sessionId: req.params.id } }),
    prisma.prediction.deleteMany({ where: { sessionId: req.params.id } }),
    prisma.session.update({
      where: { id: req.params.id },
      data: { status: 'PROCESSING', endedAt: null, meta: { reprocessedAt: new Date().toISOString() } },
    }),
  ]);

  processUploadedVideo(req.params.id, asset.storagePath).catch((err) => {
    logger.error({ err: err.message, sessionId: req.params.id }, 'reprocess crashed');
  });

  res.status(202).json({ sessionId: req.params.id, status: 'PROCESSING', reprocessing: true });
}
