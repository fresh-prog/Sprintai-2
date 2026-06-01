// Research consent tracking. We support four scopes (see Prisma `ConsentScope`)
// per athlete. Granting is idempotent for a given (athlete, scope, formVersion);
// revoking marks the row revokedAt without deleting (audit trail).

import { prisma } from '../config/db.js';
import { Forbidden, NotFound } from '../utils/errors.js';

async function ensureAthlete(user, athleteId) {
  const a = await prisma.athlete.findUnique({ where: { id: athleteId } });
  if (!a) throw NotFound('Athlete not found');
  const canManage =
    user.role === 'ADMIN' || user.role === 'RESEARCHER'
    || (a.userId && a.userId === user.id)
    || (a.coachId && a.coachId === user.id);
  if (!canManage) throw Forbidden();
  return a;
}

export async function list(user, athleteId) {
  await ensureAthlete(user, athleteId);
  return prisma.consent.findMany({
    where: { athleteId },
    orderBy: { grantedAt: 'desc' },
  });
}

export async function grant(user, athleteId, { scope, granted = true, notes, formVersion = 'v1' }) {
  await ensureAthlete(user, athleteId);
  return prisma.consent.upsert({
    where: { athleteId_scope_formVersion: { athleteId, scope, formVersion } },
    update: { granted, notes, revokedAt: granted ? null : new Date(), grantedById: user.id },
    create: { athleteId, scope, formVersion, granted, notes, grantedById: user.id },
  });
}

export async function revoke(user, athleteId, scope, formVersion = 'v1') {
  await ensureAthlete(user, athleteId);
  return prisma.consent.update({
    where: { athleteId_scope_formVersion: { athleteId, scope, formVersion } },
    data: { granted: false, revokedAt: new Date() },
  });
}
