import { Router } from 'express';
import { z } from 'zod';
import * as ctrl from '../controllers/consent.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { athleteIdParam } from '../validators/athlete.validator.js';

const SCOPES = ['TRAINING_DATA', 'RESEARCH_RELEASE', 'COACH_VISIBILITY', 'PUBLIC_RANKING'];

const grantSchema = z.object({
  scope:       z.enum(SCOPES),
  granted:     z.boolean().default(true),
  notes:       z.string().max(2000).optional(),
  formVersion: z.string().max(20).default('v1'),
});
const revokeSchema = z.object({
  scope:       z.enum(SCOPES),
  formVersion: z.string().max(20).default('v1'),
});

const r = Router();
r.use(requireAuth);

r.get('/athletes/:id/consents',         validate({ params: athleteIdParam }), ctrl.list);
r.post('/athletes/:id/consents',        validate({ params: athleteIdParam, body: grantSchema }), ctrl.grant);
r.post('/athletes/:id/consents/revoke', validate({ params: athleteIdParam, body: revokeSchema }), ctrl.revoke);

export default r;
