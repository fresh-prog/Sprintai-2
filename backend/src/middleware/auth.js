import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Forbidden, Unauthorized } from '../utils/errors.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(Unauthorized('Missing bearer token'));
  try {
    const token = header.slice('Bearer '.length);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(Unauthorized('Invalid or expired token'));
  }
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (req.user?.role !== role) return next(Forbidden());
    next();
  };
}
