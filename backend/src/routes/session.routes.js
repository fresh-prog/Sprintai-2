import path from 'node:path';
import fs from 'node:fs';
import { Router } from 'express';
import multer from 'multer';
import * as ctrl from '../controllers/session.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createSessionSchema, endSessionSchema, idParam, ingestFramesSchema,
} from '../validators/session.validator.js';
import { env } from '../config/env.js';

const r = Router();
r.use(requireAuth);

// Stream uploads straight to disk (a temp file under UPLOAD_DIR) instead of
// buffering the whole video in memory — a 200 MB in-RAM buffer per request is
// an easy way to OOM a small host under a few concurrent uploads.
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(env.UPLOAD_DIR, 'tmp');
      fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    },
    // Random temp name; the final, content-addressed name is assigned in
    // upload.service once we've hashed the bytes.
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.mp4';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024 },
});

r.post('/',          validate({ body: createSessionSchema }), ctrl.create);
r.get('/',           ctrl.list);
r.get('/:id',        validate({ params: idParam }), ctrl.get);
r.patch('/:id/end',  validate({ params: idParam, body: endSessionSchema }), ctrl.end);
r.delete('/:id',     validate({ params: idParam }), ctrl.destroy);

r.post('/:id/frames', validate({ params: idParam, body: ingestFramesSchema }), ctrl.ingestFrames);
r.get('/:id/frames',  validate({ params: idParam }), ctrl.getFrames);

r.post('/:id/upload',    validate({ params: idParam }), upload.single('video'), ctrl.uploadVideo);
r.post('/:id/reprocess', validate({ params: idParam }), ctrl.reprocess);

export default r;
