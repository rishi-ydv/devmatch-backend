import mongoose from 'mongoose';
import Session from '../models/session.model.js';
import RefreshToken from '../models/refresh-token.model.js';
import { hashRefreshToken } from './token.utils.js';

export const createSession = async ({
  userId,
  refreshToken,
  deviceName = 'Unknown device',
  ipAddress = null,
}) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const sessionId = new mongoose.Types.ObjectId();
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
