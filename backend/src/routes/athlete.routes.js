import { Router } from 'express';
import multer from 'multer';
import * as ctrl from '../controllers/athlete.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  athleteIdParam,
  createAthleteSchema,
  updateAthleteSchema,
} from '../validators/athlete.validator.js';

const r = Router();
r.use(requireAuth);

// Up to 5 MB CSV — generous; a typical roster CSV is a few KB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

r.post('/',       validate({ body: createAthleteSchema }), ctrl.create);
r.post('/bulk',   upload.single('csv'), ctrl.bulkUpload);
r.get('/',        ctrl.list);
r.get('/:id',     validate({ params: athleteIdParam }), ctrl.get);
r.patch('/:id',   validate({ params: athleteIdParam, body: updateAthleteSchema }), ctrl.update);
r.delete('/:id',  validate({ params: athleteIdParam }), ctrl.destroy);

export default r;
