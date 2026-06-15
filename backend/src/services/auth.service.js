import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { Conflict, Unauthorized } from '../utils/errors.js';
import { issueRefreshToken, rotateRefreshToken, signAccessToken } from './token.service.js';

function publicUser(u) {
  return { id: u.id, email: u.email, displayName: u.displayName, role: u.role };
}

export async function register({ email, password, displayName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Conflict('EMAIL_TAKEN', 'Email already in use');
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, passwordHash, displayName },
  });
  // Issue tokens immediately so the client is signed in from one round-trip —
  // no separate /login call (which would mean a second bcrypt + RTT).
  const accessToken = signAccessToken(user);
  const refresh = await issueRefreshToken(user.id);
  return { accessToken, refresh, user: publicUser(user) };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw Unauthorized('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw Unauthorized('Invalid credentials');

  const accessToken = signAccessToken(user);
  const refresh = await issueRefreshToken(user.id);
  return { accessToken, refresh, user: publicUser(user) };
}

export async function refresh(rawToken) {
  const userId = await rotateRefreshToken(rawToken);
  if (!userId) throw Unauthorized('Invalid refresh token');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Unauthorized('User no longer exists');
  const accessToken = signAccessToken(user);
  const next = await issueRefreshToken(user.id);
  // Return the user too so the client can bootstrap in a single round-trip
  // instead of following up with /auth/me on every page load.
  return { accessToken, refresh: next, user: publicUser(user) };
}
