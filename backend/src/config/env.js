import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  BACKEND_PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be ≥ 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be ≥ 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  // 10 is the OWASP-recommended floor and ~4x faster than 12 — important on
  // small shared-CPU hosts where bcrypt(12) was costing ~750ms per call.
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(10),

  // Optional admin seed: if both are set, an ADMIN user is upserted on boot.
  ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),
  ADMIN_PASSWORD: z.string().min(8).optional().or(z.literal('')),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  ML_SERVICE_URL: z.string().url(),
  BIOMECH_SERVICE_URL: z.string().url(),

  UPLOAD_DIR: z.string().default('./uploads'),
  UPLOAD_MAX_MB: z.coerce.number().default(200),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(120),

  // Privacy floor for the public Talent Map: suppress any country with fewer
  // than this many distinct opted-in athletes, so small cohorts can't be
  // de-anonymised. 1 = no suppression (every opted-in country shows).
  TALENT_MAP_MIN_ATHLETES: z.coerce.number().int().min(1).default(1),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';

// Refuse to boot a production server with the secrets that ship in
// .env.example — they're public and would let anyone forge tokens.
if (isProd) {
  const placeholders = [env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET].filter((s) =>
    s.startsWith('change-me-'),
  );
  if (placeholders.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      'Refusing to start: JWT_ACCESS_SECRET / JWT_REFRESH_SECRET still hold the',
      '.env.example placeholders. Generate real secrets, e.g.:',
      "node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
    );
    process.exit(1);
  }
}
