import sharp from 'sharp';
import ApiError from '../utils/api-error.js';

const MAX_IMAGE_WIDTH = 5000;
const MAX_IMAGE_HEIGHT = 5000;
const MAX_INPUT_PIXELS = 40_000_000;

export const processProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      return next(new ApiError(400, 'Profile photo is required.'));
    }

    // Decode the image and inspect its metadata.
    const metadata = await sharp(req.file.buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: 'error',
    }).metadata();

    // Reject images with missing or invalid dimensions.
    if (
      !Number.isInteger(metadata.width) ||
      !Number.isInteger(metadata.height) ||
      metadata.width <= 0 ||
      metadata.height <= 0
    ) {
      return next(new ApiError(400, 'Invalid image dimensions.'));
    }

    // Enforce maximum image dimensions.
    if (
      metadata.width > MAX_IMAGE_WIDTH ||
      metadata.height > MAX_IMAGE_HEIGHT
    ) {
      return next(new ApiError(400, 'Image dimensions are too large.'));
    }

    // Decode, normalize orientation, resize and re-encode.
    const processedBuffer = await sharp(req.file.buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: 'error',
    })
      .rotate()
      .resize(500, 500, {
        fit: 'cover',
        withoutEnlargement: true,
      })
      .webp({
        quality: 80,
        effort: 4,
      })
      .toBuffer();

    // Replace the original upload with the processed image.
    req.file.buffer = processedBuffer;
    req.file.mimetype = 'image/webp';
    req.file.detectedMimeType = 'image/webp';
    req.file.originalname = 'profile-photo.webp';
    req.file.size = processedBuffer.length;

    next();
  } catch {
    // Do not expose Sharp or internal processing errors.
    return next(
      new ApiError(
        400,
        'Invalid or unsupported image. Please upload a valid image.',
      ),
    );
  }
};
