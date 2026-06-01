import { Router } from 'express';
import * as ctrl from '../controllers/ml.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/session.validator.js';

const r = Router();
r.use(requireAuth);

r.get('/sessions/:id/predict-time', validate({ params: idParam }), ctrl.predictTime);
r.get('/sessions/:id/injury-risk',  validate({ params: idParam }), ctrl.injuryRisk);
r.get('/sessions/:id/similar',      validate({ params: idParam }), ctrl.similar);

export default r;
