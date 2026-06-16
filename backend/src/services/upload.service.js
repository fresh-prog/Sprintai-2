import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
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
 * Hex SHA-256 of a file on disk, computed by streaming so we never hold the
 * whole (up to 200 MB) video in memory.
 */
export function sha256OfFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
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

/**
 * Promote a multer temp upload (on disk at `file.path`) to a permanent,
 * content-addressed file and record the VideoAsset. `hash` is the streamed
 * SHA-256 the controller already computed (reused here to avoid re-hashing).
 * The temp file is always consumed: moved on success, unlinked on rejection.
 */
export async function saveVideo(sessionId, file, hash) {
  if (!file?.path) throw BadRequest('NO_FILE', 'No video file provided');
  try {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw BadRequest('BAD_MIME', `Unsupported mime: ${file.mimetype}`);
    }
    if (file.size > env.UPLOAD_MAX_MB * 1024 * 1024) {
      throw BadRequest('TOO_LARGE', `File exceeds ${env.UPLOAD_MAX_MB} MB`);
    }
    await ensureUploadDir();

    // Randomized name to neutralize path-traversal attempts in the original filename.
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.mp4';
    const name = `${crypto.randomUUID()}${ext}`;
    const dest = path.join(env.UPLOAD_DIR, name);
    // rename is atomic on the same filesystem; fall back to copy+unlink across mounts.
    try {
      await fs.rename(file.path, dest);
    } catch {
      await fs.copyFile(file.path, dest);
      await fs.unlink(file.path).catch(() => {});
    }

    return prisma.videoAsset.upsert({
      where: { sessionId },
      update: { storagePath: dest, hash },
      create: { sessionId, storagePath: dest, hash },
    });
  } catch (err) {
    // Don't leave an orphaned temp file behind on any failure.
    await fs.unlink(file.path).catch(() => {});
    throw err;
  }
}

/** Best-effort removal of a multer temp file (used on the dedup short-circuit). */
export async function discardTemp(file) {
  if (file?.path) await fs.unlink(file.path).catch(() => {});
}
