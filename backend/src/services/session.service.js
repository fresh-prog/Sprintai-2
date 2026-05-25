import { prisma } from '../config/db.js';
import { Forbidden, NotFound } from '../utils/errors.js';

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
  return prisma.session.update({
    where: { id },
    data: { status, endedAt: new Date() },
  });
}

export async function deleteSession(userId, id) {
  await getSession(userId, id);
  await prisma.session.delete({ where: { id } });
}
