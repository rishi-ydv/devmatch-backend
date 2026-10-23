import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Session from '../models/session.model.js';
import ApiError from '../utils/api-error.js';
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

  // 3. Find the active session belonging to this user.
  const session = await Session.findOne({
    _id: decoded.sessionId,
    userId: decoded.userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    throw new ApiError(401, 'Session is invalid, revoked, or expired');
  }

  // 4. Find the user associated with the token.
  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new ApiError(401, 'User no longer exists');
  }

  // 5. Attach authenticated information to the request.
  req.user = user;
  req.sessionId = session._id;

  // 6. Allow the request to continue.
  return next();
};
