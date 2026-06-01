// Pipeline that runs when a user uploads a sprint video:
//
//   1. mark session PROCESSING
//   2. ask biomech /extract to run MediaPipe Pose over the file
//   3. persist the resulting frames as PoseFrame rows
//   4. call finalizeSession → biomech /summary + /sprint → sprint metrics
//   5. mark session COMPLETED
//
// We deliberately don't block the HTTP upload response on this — it's
// fire-and-forget. The session detail page polls for status, or the
// session list reflects PROCESSING / COMPLETED automatically.

import axios from 'axios';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { finalizeSession } from './sessionFinalizer.service.js';

const client = axios.create({
  baseURL: env.BIOMECH_SERVICE_URL,
  timeout: 5 * 60 * 1000, // long videos may take a minute or two
});

export async function processUploadedVideo(sessionId, videoPath) {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'PROCESSING' },
    });

    logger.info({ sessionId, videoPath }, 'kicking off frame extraction');
    const { data } = await client.post('/extract', {
      videoPath,
      stride: 2,
      maxFrames: 6000,
    });

    if (!data?.ok || !Array.isArray(data.frames) || data.frames.length === 0) {
      logger.warn({ sessionId, reason: data?.reason }, 'no frames extracted');
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'FAILED', meta: { ...data, error: data?.reason ?? 'no pose detected' } },
      });
      return { ok: false, reason: data?.reason };
    }

    // Persist down-sampled — the existing ingest pipeline keeps every 5th
    // frame. We just write everything we extracted here since stride=2 in
    // /extract already gave us ~15 fps.
    const rows = data.frames.map((f) => ({
      sessionId,
      frameIdx: f.frameIdx,
      tsMs: f.tsMs,
      keypoints: f.keypoints,
      confidence: f.confidence ?? 0,
    }));

    // Postgres has a parameter limit (65k); chunk to be safe.
    const CHUNK = 1000;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await prisma.poseFrame.createMany({ data: rows.slice(i, i + CHUNK) });
    }
    logger.info({ sessionId, count: rows.length }, 'persisted pose frames');

    // Update video asset with detected dimensions.
    await prisma.videoAsset.update({
      where: { sessionId },
      data: {
        width: data.width,
        height: data.height,
        durationMs: data.totalFrames ? Math.round((data.totalFrames / (data.fps || 30)) * 1000) : null,
      },
    });

    // Trigger the rest of the analysis (sprint metrics, summary, etc.).
    await finalizeSession(sessionId);

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });
    return { ok: true, frames: rows.length };
  } catch (err) {
    logger.error({ err: err.message, sessionId }, 'video processing failed');
    await prisma.session
      .update({
        where: { id: sessionId },
        data: { status: 'FAILED', meta: { error: err.message } },
      })
      .catch(() => {});
    return { ok: false, reason: err.message };
  }
}
