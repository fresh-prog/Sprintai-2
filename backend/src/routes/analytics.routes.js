import { Router } from 'express';
import * as ctrl from '../controllers/analytics.controller.js';
import * as exp from '../controllers/export.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/session.validator.js';

const r = Router();
r.use(requireAuth);

r.get('/sessions/:id/metrics',     validate({ params: idParam }), ctrl.metrics);
r.get('/sessions/:id/predictions', validate({ params: idParam }), ctrl.predictions);
r.get('/sessions/:id/summary',     validate({ params: idParam }), ctrl.summary);
r.get('/sessions/:id/export',      validate({ params: idParam }), exp.exportSession);
r.get('/sessions/:id/report.pdf',  validate({ params: idParam }), exp.exportReport);

r.get('/admin/overview', requireRole('ADMIN'), ctrl.adminOverview);

export default r;
