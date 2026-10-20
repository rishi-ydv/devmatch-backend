import { Router } from 'express';
import { signup } from '../../controllers/auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { signupSchema } from '../../validators/auth.validator.js';

const router = Router();

// POST /api/v1/auth/signup
router.post('/signup', validate(signupSchema), signup);

export default router;