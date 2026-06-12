import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { redis } from '../config/redis.js';
import { ingestFrames } from '../services/pose.service.js';
import { finalizeSession } from '../services/sessionFinalizer.service.js';
import { mlClient } from '../services/ml.client.js';
import { prisma } from '../config/db.js';

export function attachSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    maxHttpBufferSize: 2 * 1024 * 1024,
  });

  // JWT auth on the handshake.
  io.of('/ws/pose').use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('UNAUTHENTICATED'));
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.data.user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error('UNAUTHENTICATED'));
    }
  });

  // Resolves only when the session exists and belongs to this socket's user.
  async function assertOwnsSession(socket, sessionId) {
    if (!sessionId) return false;
    const s = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });
    return s !== null && s.userId === socket.data.user.id;
  }

  io.of('/ws/pose').on('connection', (socket) => {
    logger.info({ user: socket.data.user.id }, 'pose socket connected');

    socket.on('session:join', async ({ sessionId }, ack) => {
      if (!(await assertOwnsSession(socket, sessionId))) {
        return ack?.({ ok: false, error: 'FORBIDDEN' });
      }
      socket.join(`session:${sessionId}`);
      socket.data.sessionId = sessionId;
      ack?.({ ok: true });
    });

    socket.on('pose:window', async ({ frames }, ack) => {
      const sessionId = socket.data.sessionId;
      if (!sessionId || !Array.isArray(frames)) return ack?.({ received: 0, dropped: frames?.length ?? 0 });

      // 1. Persist (down-sampled).
      const { persisted } = await ingestFrames(sessionId, frames);

      // 2. Buffer raw window in a Redis stream for downstream consumers.
      try {
        await redis.xadd(
          `pose:stream:${sessionId}`,
          'MAXLEN', '~', '5000',
          '*',
          'frames', JSON.stringify(frames),
        );
      } catch (err) {
        logger.warn({ err: err.message }, 'redis xadd failed');
      }

      // 3. Best-effort live posture prediction on the last frame.
      const last = frames[frames.length - 1];
      const features = last.keypoints.flatMap((p) => [p.x, p.y, p.z ?? 0, p.vis ?? 0]);
      const pred = await mlClient.predictPosture(features);
      if (pred?.label) {
        const row = await prisma.prediction.create({
          data: {
            sessionId,
            kind: 'POSTURE',
            tsMs: last.tsMs,
            label: pred.label,
            confidence: pred.confidence ?? 0,
          },
        });
        io.of('/ws/pose').to(`session:${sessionId}`).emit('prediction:posture', row);
      }

      ack?.({ received: frames.length, persisted });
    });

    socket.on('session:end', async ({ sessionId }, ack) => {
      if (!(await assertOwnsSession(socket, sessionId))) {
        return ack?.({ ok: false, error: 'FORBIDDEN' });
      }
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED', endedAt: new Date() },
      });
      socket.leave(`session:${sessionId}`);
      finalizeSession(sessionId).catch((err) =>
        logger.error({ err: err.message, sessionId }, 'finalize failed'),
      );
      ack?.({ ok: true });
    });

    socket.on('disconnect', () => {
      logger.info({ user: socket.data.user.id }, 'pose socket disconnected');
    });
  });

  return io;
}
