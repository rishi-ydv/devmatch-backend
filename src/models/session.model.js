import mongoose from 'mongoose';
import validator from 'validator';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    refreshTokenHash: {
      type: String,
      required: [true, 'Refresh token hash is required'],
      unique: true,
      minlength: [64, 'Invalid refresh token hash'],
      maxlength: [64, 'Invalid refresh token hash'],
      validate: {
        validator: value => /^[a-f0-9]{64}$/i.test(value),
        message: 'Refresh token hash must be a SHA-256 hash',
      },
    },

    deviceName: {
      type: String,
      trim: true,
      maxlength: [100, 'Device name cannot exceed 100 characters'],
      default: 'Unknown device',
    },

    ipAddress: {
      type: String,
      default: null,
      validate: {
        validator: value => value == null || validator.isIP(value),
        message: 'Please provide a valid IP address',
      },
    },

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: [true, 'Session expiration date is required'],
      validate: {
        validator: value => value > new Date(),
        message: 'Session expiration must be in the future',
      },
    },

    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const Session = mongoose.model('Session', sessionSchema);

export default Session;
