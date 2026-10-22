import User from '../models/user.model.js';
import ApiError from '../utils/api-error.js';
import ApiResponse from '../utils/api-response.js';
import jwt from 'jsonwebtoken';
import RefreshToken from '../models/refresh-token.model.js';
import Session from '../models/session.model.js';
import {
  createSession,
  findRefreshTokenRecord,
  findActiveSession,
} from '../utils/session.utils.js';
import { hashRefreshToken } from '../utils/token.utils.js';
import { rotateRefreshToken } from '../utils/refresh-token.utils.js';
import config from '../configs/enviroment.config.js';

export const signup = async (req, res) => {
  const { firstName, lastName, emailId, password } = req.body;

  const existingUser = await User.findOne({ emailId });

  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const user = await User.create({
    firstName,
    lastName,
    emailId,
    password,
  });

  return res.status(201).json(
    new ApiResponse(201, 'User registered successfully', {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
      },
    }),
  );
};

/*
The login flow:
  1. Find the user by emailId.
  2. Compare the submitted password with the stored password hash using bcrypt.compare().
  3. Generate the access token and refresh token.
  4. Create a new session using createSession().
  5. Set the access and refresh tokens in secure cookies.
  6. Return the user's public information, never their password or token hash.
*/
export const login = async (req, res) => {
  const { emailId, password } = req.body;

  // 1. Find the user and explicitly include the password hash.
  const user = await User.findOne({ emailId }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // 2. Compare the submitted password with the stored hash.
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // 3. Generate JWTs using methods defined in user.model.js.
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // 4. Create a session and persist the refresh-token hash.
  await createSession({
    userId: user._id,
    refreshToken,
    deviceName: (req.get('User-Agent') || 'Unknown device').slice(0, 100),
    ipAddress: req.ip,
  });

  // 5. Configure HTTP-only cookies.
  const cookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/',
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // 6. Return only public user information.
  return res.status(200).json(
    new ApiResponse(200, 'Login successful', {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailId: user.emailId,
      },
    }),
  );
};

export const refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token is required');
  }

  // 1. Verify the refresh JWT.
  const decoded = jwt.verify(refreshToken, config.refreshTokenSecret);

  // 2. Find its historical database record.
  const tokenRecord = await findRefreshTokenRecord(refreshToken);

  if (!tokenRecord) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  // 3. Handle a previously used token.
  if (tokenRecord.status === 'used') {
    const now = new Date();
    const mongoSession = await Session.startSession();

    try {
      await mongoSession.withTransaction(async () => {
        await Session.updateOne(
          { _id: tokenRecord.sessionId, revokedAt: null },
          { $set: { revokedAt: now } },
          { session: mongoSession },
        );

        await RefreshToken.updateMany(
          {
            sessionId: tokenRecord.sessionId,
            status: { $ne: 'revoked' },
          },
          {
            $set: {
              status: 'revoked',
              revokedAt: now,
            },
          },
          { session: mongoSession },
        );
      });
    } finally {
      await mongoSession.endSession();
    }

    throw new ApiError(
      401,
      'Refresh token reuse detected. Please log in again.',
    );
  }

  // 4. Reject revoked or otherwise invalid token records.
  if (tokenRecord.status !== 'current') {
    throw new ApiError(401, 'Refresh token is no longer valid');
  }

  // 5. Ensure the JWT identifies the same user as the record.
  if (decoded.userId !== tokenRecord.userId.toString()) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  // 6. Find the active login session.
  const session = await findActiveSession(tokenRecord.sessionId);

  if (!session) {
    throw new ApiError(401, 'Session is invalid or expired');
  }

  // 7. Confirm that the session still tracks this token.
  const incomingHash = hashRefreshToken(refreshToken);

  if (session.refreshTokenHash !== incomingHash) {
    throw new ApiError(401, 'Refresh token is no longer current');
  }

  // 8. Load the user.
  const user = await User.findById(tokenRecord.userId);

  if (!user) {
    throw new ApiError(401, 'User no longer exists');
  }

  // 9. Generate replacement JWTs using your existing model methods.
  const newAccessToken = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();

  // 10. Atomically rotate the refresh token in MongoDB.
  await rotateRefreshToken({
    tokenRecord,
    session,
    newRefreshToken,
  });

  // 11. Set the replacement refresh token and access token cookie.
  const cookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/',
  };

  // Set the new access token cookie.
  res.cookie('accessToken', newAccessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  // Set the rotated refresh token cookie.
  res.cookie('refreshToken', newRefreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // 12. Return the new access token.
  return res
    .status(200)
    .json(new ApiResponse(200, 'Access token refreshed successfully'));
};

// Get the currently authenticated user
export const getMe = async (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, 'Authenticated user retrieved successfully', {
      user: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        emailId: req.user.emailId,
      },
    }),
  );
};
