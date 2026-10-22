import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import { validate } from '../../middleware/validate.js';
import { RegisterSchema, LoginSchema } from '@agricloud/shared';

const router = Router();

router.post('/register', authRateLimiter, validate(RegisterSchema), AuthController.register);
router.post('/login', authRateLimiter, validate(LoginSchema), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', requireAuth, AuthController.me);

export default router;
