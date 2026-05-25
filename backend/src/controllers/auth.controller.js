import { prisma } from '../config/db.js';
import { isProd } from '../config/env.js';
import * as authService from '../services/auth.service.js';
import { revokeRefreshToken } from '../services/token.service.js';
import { Unauthorized } from '../utils/errors.js';

const REFRESH_COOKIE = 'refresh_token';

function setRefreshCookie(res, raw, expiresAt) {
  res.cookie(REFRESH_COOKIE, raw, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/api/v1/auth',
  });
}

export async function register(req, res) {
  const user = await authService.register(req.body);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const { accessToken, refresh, user } = await authService.login(req.body);
  setRefreshCookie(res, refresh.raw, refresh.expiresAt);
  res.json({ accessToken, user });
}

export async function refresh(req, res) {
  const raw = req.cookies[REFRESH_COOKIE];
  if (!raw) throw Unauthorized('No refresh token');
  const { accessToken, refresh: next } = await authService.refresh(raw);
  setRefreshCookie(res, next.raw, next.expiresAt);
  res.json({ accessToken });
}

export async function logout(req, res) {
  const raw = req.cookies[REFRESH_COOKIE];
  if (raw) await revokeRefreshToken(raw);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  res.status(204).end();
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw Unauthorized();
  res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
  });
}

