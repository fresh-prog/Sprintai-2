import { Router } from 'express';
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

r.post('/',       validate({ body: createAthleteSchema }), ctrl.create);
r.get('/',        ctrl.list);
r.get('/:id',     validate({ params: athleteIdParam }), ctrl.get);
r.patch('/:id',   validate({ params: athleteIdParam, body: updateAthleteSchema }), ctrl.update);
r.delete('/:id',  validate({ params: athleteIdParam }), ctrl.destroy);

export default r;
