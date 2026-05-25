import { prisma } from '../config/db.js';
import { Forbidden, NotFound } from '../utils/errors.js';
import { finalizeSession } from './sessionFinalizer.service.js';
import { logger } from '../config/logger.js';

export async function createSession(userId, { label, source, meta }) {
  return prisma.session.create({
    data: { userId, label, source, meta: meta ?? {} },
  });
}

export async function listSessions(userId, { page = 1, limit = 50 } = {}) {
  const [data, total] = await Promise.all([
    prisma.session.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.session.count({ where: { userId } }),
  ]);
  return { data, page, limit, total };
}

export async function getSession(userId, id) {
  const s = await prisma.session.findUnique({
    where: { id },
    include: { videoAsset: true },
  });
  if (!s) throw NotFound('Session not found');
  if (s.userId !== userId) throw Forbidden();
  return s;
}

export async function endSession(userId, id, status = 'COMPLETED') {
  await getSession(userId, id);
  const updated = await prisma.session.update({
    where: { id },
    data: { status, endedAt: new Date() },
  });

  // Fire-and-forget summary pass; surfaces in the dashboard once the biomech
  // service replies. We deliberately don't await this so the HTTP response
  // stays snappy.
  if (status === 'COMPLETED') {
    finalizeSession(id).catch((err) =>
      logger.error({ err: err.message, sessionId: id }, 'finalize failed'),
    );
  }
  return updated;
}

export async function deleteSession(userId, id) {
  await getSession(userId, id);
  await prisma.session.delete({ where: { id } });
}
