import pino from 'pino';
import { createRequire } from 'node:module';
import { env, isProd } from './env.js';

// pino-pretty is purely for human-friendly dev logs. It used to be a hard
// dependency, but we want the container to boot even when it isn't
// installed — pino's default JSON output is fine in that case. Probe
// quietly and downgrade to JSON if the module isn't resolvable.
function hasPinoPretty() {
  if (isProd) return false;
  try {
    createRequire(import.meta.url).resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: hasPinoPretty()
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
    : undefined,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash'],
    remove: true,
  },
});
