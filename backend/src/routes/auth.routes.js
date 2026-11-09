/**
 * Authentication and User routes.
 *
 * Public:
 *  POST /api/auth/register         — Register new customer
 *  POST /api/auth/login            — Login customer or admin
 *
 * Authenticated:
 *  POST /api/auth/logout           — Logout and clear cookie
 *  GET  /api/auth/me               — Get current user profile
 *  PATCH /api/auth/me              — Update current user profile
 *  POST /api/auth/change-password  — Change password
 */
import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateMe,
  changePassword,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public routes (protected by strict authLimiter)
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

// Authenticated routes
router.use(authenticate);
router.post('/logout', logout);
router.get('/me', getMe);
router.patch('/me', validate(updateProfileSchema), updateMe);
router.post('/change-password', validate(changePasswordSchema), changePassword);

export default router;
