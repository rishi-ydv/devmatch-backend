import mongoose from 'mongoose';
import Session from '../models/session.model.js';
import RefreshToken from '../models/refresh-token.model.js';
import { hashRefreshToken } from './token.utils.js';

export const createSession = async ({
  sessionId,
  userId,
  refreshToken,
  deviceName = 'Unknown device',
  ipAddress = null,
}) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const refreshTokenHash = hashRefreshToken(refreshToken);

  const mongoSession = await mongoose.startSession();

  try {
    await mongoSession.withTransaction(async () => {
      await Session.create(
        [
          {
            _id: sessionId,
            userId,
            refreshTokenHash,
            deviceName,
            ipAddress,
            expiresAt,
          },
        ],
        { session: mongoSession },
      );

      await RefreshToken.create(
        [
          {
            userId,
            sessionId,
            tokenHash: refreshTokenHash,
            status: 'current',
            expiresAt,
          },
        ],
        { session: mongoSession },
      );
    });

    return { sessionId, expiresAt };
  } finally {
    await mongoSession.endSession();
  }
};

export const findRefreshTokenRecord = async refreshToken => {
  const tokenHash = hashRefreshToken(refreshToken);

  return RefreshToken.findOne({ tokenHash });
};

export const findActiveSession = async sessionId => {
  return Session.findOne({
    _id: sessionId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
};

export const revokeSessionAndRefreshTokens = async ({ sessionId, userId }) => {
  const mongoSession = await mongoose.startSession();
  const now = new Date();

  try {
    await mongoSession.withTransaction(async () => {
      // Revoke only the specified user's session.
      await Session.updateOne(
        {
          _id: sessionId,
          userId,
          revokedAt: null,
        },
        {
          $set: { revokedAt: now },
        },
        { session: mongoSession },
      );

      // Revoke all refresh-token records belonging to this session.
      await RefreshToken.updateMany(
        {
          sessionId,
          userId,
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

    return { success: true };
  } finally {
    await mongoSession.endSession();
  }
};

export const revokeAllUserSessions = async userId => {
  const mongoSession = await mongoose.startSession();
  const now = new Date();

  try {
    await mongoSession.withTransaction(async () => {
      // Revoke all active sessions belonging to this user.
      await Session.updateMany(
        {
          userId,
          revokedAt: null,
        },
        {
          $set: { revokedAt: now },
        },
        { session: mongoSession },
      );

      // Revoke all refresh-token records belonging to this user
      // that have not already been revoked.
      await RefreshToken.updateMany(
        {
          userId,
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

    return { success: true };
  } finally {
    await mongoSession.endSession();
  }
};
