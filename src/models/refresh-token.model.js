import mongoose from 'mongoose';
import validator from 'validator';

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session ID is required'],
      index: true,
    },

    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      unique: true,
      validate: {
        validator: value =>
          typeof value === 'string' &&
          value.length === 64 &&
          validator.isHexadecimal(value),
        message: 'Token hash must be a valid SHA-256 hexadecimal hash',
      },
    },

    status: {
      type: String,
      enum: {
        values: ['current', 'used', 'revoked'],
        message: 'Status must be current, used, or revoked',
      },
      default: 'current',
      required: [true, 'Token status is required'],
    },

    usedAt: {
      type: Date,
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: [true, 'Token expiration date is required'],
      validate: {
        validator: value => value > new Date(),
        message: 'Token expiration must be in the future',
      },
    },
  },
  { timestamps: true },
);

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
