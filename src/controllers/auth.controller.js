import User from '../models/user.model.js';
import mongoose from 'mongoose';
import ApiError from '../utils/api-error.js';
import ApiResponse from '../utils/api-response.js';
import jwt from 'jsonwebtoken';
import RefreshToken from '../models/refresh-token.model.js';
import Session from '../models/session.model.js';
import {
  createSession,
  findRefreshTokenRecord,
  findActiveSession,
  revokeSessionAndRefreshTokens,
  revokeAllUserSessions,
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
  3. Generate a one-time sessionId to use in both the accessToken and refreshToken, and then pass it into createSession.
  4. Generate the access token and refresh token.
  5. Create a new session using createSession().
  6. Set the access and refresh tokens in secure cookies.
  7. Return the user's public information, never their password or token hash.
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

  // 3. Generate a one-time sessionId.
  const sessionId = new mongoose.Types.ObjectId();

  // 4. Generate JWTs using methods defined in user.model.js.
  const accessToken = user.generateAccessToken(sessionId);
  const refreshToken = user.generateRefreshToken(sessionId);

  // 5. Create a session and persist the refresh-token hash.
  await createSession({
    sessionId,
    userId: user._id,
    refreshToken,
    deviceName: (req.get('User-Agent') || 'Unknown device').slice(0, 100),
    ipAddress: req.ip,
  });

  // 6. Configure HTTP-only cookies.
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

  // 7. Return only public user information.
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

  // 5. Ensure the JWT identifies the same user and session.
  if (
    decoded.userId !== tokenRecord.userId.toString() ||
    decoded.sessionId !== tokenRecord.sessionId.toString()
  ) {
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

  // 9. Generate replacement JWTs for the current device session.
  const newAccessToken = user.generateAccessToken(session._id);
  const newRefreshToken = user.generateRefreshToken(session._id);

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

export const logout = async (req, res) => {
  await revokeSessionAndRefreshTokens({
    sessionId: req.sessionId,
    userId: req.user._id,
  });

  const cookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  return res.status(200).json(new ApiResponse(200, 'Logged out successfully'));
};

export const logoutAll = async (req, res) => {
  await revokeAllUserSessions(req.user._id);

  const cookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/',
  };

  // Clear the current device's cookies.
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  return res
    .status(200)
    .json(new ApiResponse(200, 'Logged out from all devices successfully'));
};

export const getActiveSessions = async (req, res) => {
  const sessions = await Session.find({
    userId: req.user._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .select('_id deviceName ipAddress lastUsedAt createdAt')
    .sort({ lastUsedAt: -1 })
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(200, 'Active sessions fetched successfully', sessions),
    );
};

export const revokeDeviceSession = async (req, res) => {
  const { sessionId } = req.params;

  // Validate the session ID before querying MongoDB.
  if (!mongoose.isValidObjectId(sessionId)) {
    throw new ApiError(400, 'Invalid session ID');
  }

  // Ensure the session belongs to the authenticated user.
  const session = await Session.findOne({
    _id: sessionId,
    userId: req.user._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    throw new ApiError(404, 'Active session not found');
  }

  await revokeSessionAndRefreshTokens({
    sessionId: session._id,
    userId: req.user._id,
  });

  // If the user revokes the session used for this request,
  // clear cookies on this device too.
  if (session._id.equals(req.sessionId)) {
    const cookieOptions = {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, 'Device session revoked successfully'));
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword, logoutAllDevices } = req.body;

  const mongoSession = await mongoose.startSession();

  try {
    await mongoSession.withTransaction(async () => {
      // Find the authenticated user and include the password hash.
      const user = await User.findById(req.user._id)
        .select('+password')
        .session(mongoSession);

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Verify the user's current password.
      const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

      if (!isPasswordCorrect) {
        throw new ApiError(401, 'Current password is incorrect');
      }

      // Ensure the new password differs from the current password.
      if (currentPassword === newPassword) {
        throw new ApiError(
          400,
          'New password must differ from current password',
        );
      }

      // Save the new password.
      // The Mongoose pre-save hook hashes it automatically.
      user.password = newPassword;
      await user.save({ session: mongoSession });

      // Revoke sessions only after the password update succeeds.
      if (logoutAllDevices) {
        // Revoke all sessions and their refresh-token records.
        await revokeAllUserSessions(user._id, mongoSession);
      } else {
        // Revoke only the current session and its refresh tokens.
        await revokeSessionAndRefreshTokens({
          sessionId: req.sessionId,
          userId: user._id,
          mongoSession,
        });
      }
    });
  } finally {
    await mongoSession.endSession();
  }

  // Clear the current device's cookies after the transaction succeeds.
  const cookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  const message = logoutAllDevices
    ? 'Password changed successfully. All devices have been logged out.'
    : 'Password changed successfully. This device has been logged out.';

  return res.status(200).json(new ApiResponse(200, message));
};
