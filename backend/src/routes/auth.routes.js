import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';

const r = Router();

r.post('/register', validate({ body: registerSchema }), ctrl.register);
r.post('/login',    validate({ body: loginSchema }),    ctrl.login);
r.post('/refresh',  ctrl.refresh);
r.post('/logout',   ctrl.logout);
r.get('/me',        requireAuth, ctrl.me);

export default r;
