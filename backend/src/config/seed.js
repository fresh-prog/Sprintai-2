import bcrypt from 'bcryptjs';
import { prisma } from './db.js';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Idempotent admin seed. When ADMIN_EMAIL + ADMIN_PASSWORD are set, ensures an
 * ADMIN user exists with that email and (re)sets its password + role. Runs on
 * every boot — safe to call repeatedly. Lets an administrator sign in to the
 * /admin monitoring view on a fresh deployment without manual DB access.
 */
export async function seedAdmin() {
  const email = (env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = env.ADMIN_PASSWORD || '';
  if (!email || !password) return;

  try {
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN', passwordHash },
      create: { email, passwordHash, displayName: 'Administrator', role: 'ADMIN' },
    });
    logger.info({ email: user.email }, 'admin account seeded');
  } catch (err) {
    logger.error({ err: err.message }, 'admin seed failed');
  }
}
