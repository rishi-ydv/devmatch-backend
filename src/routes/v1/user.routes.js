import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateProfilePhoto,
} from '../../controllers/user.controller.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import { updateProfileSchema } from '../../validators/user.validator.js';
import { validate } from '../../middlewares/validate.middleware.js';

import { uploadLimiter } from '../../middlewares/upload-limiter.middleware.js';
import { uploadProfilePhoto } from '../../middlewares/upload.middleware.js';
import { validateImageSignature } from '../../middlewares/validate-image.middleware.js';
import { processProfilePhoto } from '../../middlewares/process-image.middleware.js';

const router = Router();

router.get('/profile', verifyJWT, getProfile);

router.patch(
  '/profile',
  verifyJWT,
  validate(updateProfileSchema),
  updateProfile,
);

router.patch(
  '/profile/photo',
  verifyJWT,
  uploadLimiter,
  uploadProfilePhoto,
  validateImageSignature,
  processProfilePhoto,
  updateProfilePhoto,
);

export default router;
