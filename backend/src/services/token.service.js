import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';

const REFRESH_TTL_DAYS = parseDays(env.JWT_REFRESH_TTL);

function parseDays(s) {
  const m = /^(\d+)d$/.exec(s);
  return m ? Number(m[1]) : 7;
}

export function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_ACCESS_TTL,
  });
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export async function issueRefreshToken(userId) {
  const raw = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash: sha256(raw), expiresAt },
  });
  return { raw, expiresAt };
}

export async function rotateRefreshToken(raw) {
  const hash = sha256(raw);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) return null;
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });
  return existing.userId;
}

export async function revokeRefreshToken(raw) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
