import mongoose from 'mongoose';
import RefreshToken from '../models/refresh-token.model.js';
import Session from '../models/session.model.js';
import { hashRefreshToken } from './token.utils.js';
import ApiError from './api-error.js';

export const rotateRefreshToken = async ({
  tokenRecord,
  session,
  newRefreshToken,
}) => {
  const mongoSession = await mongoose.startSession();

  const now = new Date();
  const oldTokenHash = tokenRecord.tokenHash;
  const newTokenHash = hashRefreshToken(newRefreshToken);

  try {
    await mongoSession.withTransaction(async () => {
      // 1. Mark the old token as used.
      const usedToken = await RefreshToken.findOneAndUpdate(
        {
          _id: tokenRecord._id,
          status: 'current',
          expiresAt: { $gt: now },
        },
        {
          $set: {
            status: 'used',
            usedAt: now,
          },
        },
        {
          returnDocument: 'after',
          session: mongoSession,
        },
      );

      if (!usedToken) {
        throw new ApiError(401, 'Refresh token is no longer valid');
      }

      // 2. Update the session to use the new token hash.
      const updatedSession = await Session.findOneAndUpdate(
        {
          _id: session._id,
          userId: tokenRecord.userId,
          refreshTokenHash: oldTokenHash,
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        {
          $set: {
            refreshTokenHash: newTokenHash,
            lastUsedAt: now,
          },
        },
        {
          returnDocument: 'after',
          session: mongoSession,
        },
      );

      if (!updatedSession) {
        throw new ApiError(401, 'Session is no longer valid');
      }

      // 3. Save the new refresh token's history record.
      await RefreshToken.create(
        [
          {
            userId: tokenRecord.userId,
            sessionId: session._id,
            tokenHash: newTokenHash,
            status: 'current',
            expiresAt: session.expiresAt,
          },
        ],
        { session: mongoSession },
      );
    });

    return { success: true };
  } finally {
    await mongoSession.endSession();
  }
};
