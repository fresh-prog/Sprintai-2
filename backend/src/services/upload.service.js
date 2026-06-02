import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';
import { BadRequest } from '../utils/errors.js';

const ALLOWED_MIME = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
]);

export async function ensureUploadDir() {
  await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
}

/** Hex SHA-256 of a Buffer. Used as the dedup key. */
export function sha256Of(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Look up an existing VideoAsset for this user that holds the same file
 * contents. Returns `{ asset, session }` if a duplicate exists, `null`
 * otherwise. Scoped to the caller's own sessions so we never bounce
 * users between each other's data.
 */
export async function findDuplicate(userId, hash) {
  if (!hash) return null;
  const asset = await prisma.videoAsset.findFirst({
    where: { hash, session: { userId } },
    include: { session: true },
    orderBy: { uploadedAt: 'desc' },
  });
  return asset ? { asset, session: asset.session } : null;
}

export async function saveVideo(sessionId, file) {
  if (!file) throw BadRequest('NO_FILE', 'No video file provided');
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw BadRequest('BAD_MIME', `Unsupported mime: ${file.mimetype}`);
  }
  if (file.size > env.UPLOAD_MAX_MB * 1024 * 1024) {
    throw BadRequest('TOO_LARGE', `File exceeds ${env.UPLOAD_MAX_MB} MB`);
  }
  await ensureUploadDir();

  const hash = sha256Of(file.buffer);

  // Randomized name to neutralize path-traversal attempts in the original filename.
  const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.mp4';
  const name = `${crypto.randomUUID()}${ext}`;
  const dest = path.join(env.UPLOAD_DIR, name);
  await fs.writeFile(dest, file.buffer);

  const asset = await prisma.videoAsset.upsert({
    where: { sessionId },
    update: { storagePath: dest, hash },
    create: { sessionId, storagePath: dest, hash },
  });
  return asset;
}
