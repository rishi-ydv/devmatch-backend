import { Router } from 'express';
import {
  getProfile,
  updateProfile,
} from '../../controllers/user.controller.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import { updateProfileSchema } from '../../validators/user.validator.js';
import { validate } from '../../middlewares/validate.middleware.js';

const router = Router();

router.get('/profile', verifyJWT, getProfile);

router.patch(
  '/profile',
  verifyJWT,
  validate(updateProfileSchema),
  updateProfile,
);

export default router;
