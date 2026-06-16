import express from 'express';
// Side-effect import: monkey-patches Express 4 so async controllers that
// throw or reject are routed to our errorHandler instead of crashing the
// process as an unhandled promise rejection. Must come before any router.
import 'express-async-errors';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFound } from './middleware/error.js';
import { httpDurationMiddleware, metricsHandler } from './observability/metrics.js';

import authRoutes from './routes/auth.routes.js';
import sessionRoutes from './routes/session.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import athleteRoutes from './routes/athlete.routes.js';
import consentRoutes from './routes/consent.routes.js';
import mlRoutes from './routes/ml.routes.js';

export function buildApp() {
  const app = express();

  // We sit behind the frontend nginx (and optionally Caddy for TLS) in
  // production. Trust the immediate proxy so req.secure / req.ip reflect
  // the X-Forwarded-* headers it sets.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));
  app.use(httpDurationMiddleware);

  app.use(
    '/api/',
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Tighter throttle on credential endpoints to slow brute-force / credential
  // stuffing. Login + register share this stricter bucket on top of the global
  // limiter above. Successful requests don't count toward the cap.
  app.use(
    ['/api/v1/auth/login', '/api/v1/auth/register'],
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts — try again later.' } },
    }),
  );

  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.get('/metrics', metricsHandler);

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/sessions', sessionRoutes);
  app.use('/api/v1/athletes', athleteRoutes);
  app.use('/api/v1', consentRoutes);
  app.use('/api/v1', mlRoutes);
  app.use('/api/v1', analyticsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
