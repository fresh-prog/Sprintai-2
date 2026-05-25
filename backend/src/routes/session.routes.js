import { Router } from 'express';
import * as ctrl from '../controllers/session.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createSessionSchema, endSessionSchema, idParam, ingestFramesSchema,
} from '../validators/session.validator.js';

const r = Router();
r.use(requireAuth);

r.post('/',          validate({ body: createSessionSchema }), ctrl.create);
r.get('/',           ctrl.list);
r.get('/:id',        validate({ params: idParam }), ctrl.get);
r.patch('/:id/end',  validate({ params: idParam, body: endSessionSchema }), ctrl.end);
r.delete('/:id',     validate({ params: idParam }), ctrl.destroy);

r.post('/:id/frames', validate({ params: idParam, body: ingestFramesSchema }), ctrl.ingestFrames);
r.get('/:id/frames',  validate({ params: idParam }), ctrl.getFrames);

export default r;
