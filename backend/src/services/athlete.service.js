// Athlete domain service. Coaches own a roster; researchers can query the
// whole population (with consent flagged in athlete.notes for now — a proper
// consent table is in the v2 roadmap). Athletes themselves can manage their
// own single profile.

import { prisma } from '../config/db.js';
import { Forbidden, NotFound } from '../utils/errors.js';

function normalizeDob(input) {
  if (!input) return undefined;
  // Accept both "YYYY-MM-DD" and full ISO.
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function canManage(user, athlete) {
  if (user.role === 'ADMIN' || user.role === 'RESEARCHER') return true;
  if (athlete.userId && athlete.userId === user.id) return true;
  if (athlete.coachId && athlete.coachId === user.id) return true;
  return false;
}

export async function createAthlete(user, data) {
  // Coaches default coachId to themselves; athletes default userId to themselves.
  const isCoach = user.role === 'COACH' || user.role === 'ADMIN';
  return prisma.athlete.create({
    data: {
      ...data,
      dateOfBirth: normalizeDob(data.dateOfBirth),
      coachId: isCoach ? user.id : null,
      userId: data.userId ?? (user.role === 'ATHLETE' ? user.id : null),
    },
  });
}

export async function listAthletes(user, { page = 1, limit = 50 } = {}) {
  // Scope by role: COACH sees their roster, ATHLETE sees their own profile,
  // RESEARCHER/ADMIN see everyone.
  const where =
    user.role === 'ADMIN' || user.role === 'RESEARCHER'
      ? {}
      : user.role === 'COACH'
      ? { coachId: user.id }
      : { userId: user.id };

  const [data, total] = await Promise.all([
    prisma.athlete.findMany({
      where, orderBy: { fullName: 'asc' },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.athlete.count({ where }),
  ]);
  return { data, page, limit, total };
}

export async function getAthlete(user, id) {
  const athlete = await prisma.athlete.findUnique({ where: { id } });
  if (!athlete) throw NotFound('Athlete not found');
  if (!canManage(user, athlete) && user.role !== 'RESEARCHER') throw Forbidden();
  return athlete;
}

export async function updateAthlete(user, id, patch) {
  const athlete = await getAthlete(user, id);
  if (!canManage(user, athlete)) throw Forbidden();
  return prisma.athlete.update({
    where: { id: athlete.id },
    data: { ...patch, dateOfBirth: normalizeDob(patch.dateOfBirth) },
  });
}

export async function deleteAthlete(user, id) {
  const athlete = await getAthlete(user, id);
  if (!canManage(user, athlete)) throw Forbidden();
  await prisma.athlete.delete({ where: { id: athlete.id } });
}
