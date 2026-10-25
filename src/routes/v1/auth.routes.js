import { Router } from 'express';
import {
  signup,
  refreshAccessToken,
  login,
  getMe,
  logout,
  logoutAll,
  getActiveSessions
} from '../../controllers/auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { signupSchema, loginSchema } from '../../validators/auth.validator.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';

const router = Router();

// POST /api/v1/auth/signup
router.post('/signup', validate(signupSchema), signup);

// POST /api/v1/auth/login
router.post('/login', validate(loginSchema), login);

// POST /api/v1/auth/refresh-token
router.post('/refresh-token', refreshAccessToken);

// GET /api/v1/auth/me
router.get('/me', verifyJWT, getMe);

// POST /api/v1/auth/logout
router.post('/logout', verifyJWT, logout);

// POST /api/v1/auth/logout-all
router.post('/logout-all', verifyJWT, logoutAll);

// GET /api/v1/auth/sessions
router.get('/sessions', verifyJWT, getActiveSessions);

export default router;
