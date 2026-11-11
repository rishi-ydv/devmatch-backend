import { rateLimit } from 'express-rate-limit';
import ApiError from '../utils/api-error.js';

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => req.user._id.toString(),
  standardHeaders: 'draft-8',
  legacyHeaders: false,

  handler: (req, res, next) => {
    next(
      new ApiError(
        429,
        'Too many photo upload attempts. Please try again after 15 minutes.',
      ),
    );
  },
});