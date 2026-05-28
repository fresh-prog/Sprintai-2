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

export function buildApp() {
  const app = express();

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

  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.get('/metrics', metricsHandler);

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/sessions', sessionRoutes);
  app.use('/api/v1', analyticsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
