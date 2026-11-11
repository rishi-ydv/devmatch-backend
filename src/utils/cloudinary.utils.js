import { randomUUID } from 'node:crypto';
import cloudinary from '../configs/cloudinary.config.js';
import ApiError from './api-error.js';

// Upload a processed profile image to Cloudinary.
export const uploadProfileImage = async imageBuffer => {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new ApiError(400, 'Invalid image buffer.');
  }

  const publicId = `profile_${randomUUID()}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'devmatch/profile-photos',
        public_id: publicId,
        allowed_formats: ['webp'],
        format: 'webp',
        overwrite: false,
        unique_filename: false,
        use_filename: false,
        type: 'authenticated',
        access_mode: 'authenticated',
        transformation: [
          {
            quality: 'auto:good',
            fetch_format: 'webp',
          },
        ],
      },
      (error, result) => {
        if (error) {
          return reject(new ApiError(502, 'Unable to upload profile photo.'));
        }

        if (!result?.secure_url || !result?.public_id) {
          return reject(
            new ApiError(502, 'Invalid response from image storage service.'),
          );
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    uploadStream.end(imageBuffer);
  });
};

// Delete a profile image from Cloudinary.
export const deleteProfileImage = async (publicId) => {
  if (!publicId) {
    return true;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      type: 'authenticated',
      invalidate: true,
    });

    // Already deleted is also considered successful cleanup.
    if (result.result === 'ok' || result.result === 'not found') {
      return true;
    }

    return false;
  } catch {
    // Cleanup can be retried by the background worker.
    return false;
  }
};
