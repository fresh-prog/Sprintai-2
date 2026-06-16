import { z } from 'zod';

export const createSessionSchema = z.object({
  label: z.string().min(1).max(120),
  source: z.enum(['WEBCAM', 'UPLOAD']),
  // ISO 3166-1 alpha-2 of where the run is performed (e.g. "UG"). Optional —
  // drives the Global Talent Map marker. Normalised to upper-case server-side.
  country: z.string().trim().length(2).optional(),
  // Explicit opt-in to appear (anonymously, aggregated by country) on the
  // public Global Talent Map. Defaults false when omitted.
  publicRanking: z.boolean().optional(),
  meta: z.record(z.any()).optional(),
});

export const endSessionSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED']).default('COMPLETED'),
});

export const idParam = z.object({ id: z.string().uuid() });

const keypoint = z.object({
  i: z.number().int().min(0).max(32),
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
  vis: z.number().optional(),
});

export const ingestFramesSchema = z.object({
  frames: z
    .array(
      z.object({
        frameIdx: z.number().int().nonnegative(),
        tsMs: z.number().int().nonnegative(),
        keypoints: z.array(keypoint).length(33),
      }),
    )
    .min(1)
    .max(256),
});
