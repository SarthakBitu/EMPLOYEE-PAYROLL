import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

const router = Router();

router.get('/status', authController.status);
router.post('/setup', authLimiter, authController.setup);
router.post('/login', authLimiter, authController.login);
router.get('/me', requireAuth, authController.me);

export default router;
