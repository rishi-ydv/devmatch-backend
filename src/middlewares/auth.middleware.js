import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import  ApiError  from '../utils/api-error.js';
import config from '../configs/enviroment.config.js';

export const verifyJWT = async (req, res, next) => {
  // 1. Read the access token from the cookie.
  const accessToken = req.cookies?.accessToken;

  if (!accessToken) {
    throw new ApiError(401, 'Unauthorized: Access token is required');
  }

  // 2. Verify the JWT signature and expiration.
  let decoded;

  try {
    decoded = jwt.verify(accessToken, config.accessTokenSecret);
  } catch {
    throw new ApiError(401, 'Invalid or expired access token');
  }

  // 3. Ensure the token contains the expected user ID.
  if (!decoded || typeof decoded !== 'object' || !decoded.userId) {
    throw new ApiError(401, 'Invalid access token payload');
  }

  // 4. Find the user associated with the token.
  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new ApiError(401, 'User no longer exists');
  }

  // 5. Attach the authenticated user to the request.
  req.user = user;

  // 6. Allow the request to continue.
  return next();
};
