import { Router } from 'express';
import { getProfile } from '../../controllers/user.controller.js';
import { verifyJWT } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/profile', verifyJWT, getProfile);

export default router;
