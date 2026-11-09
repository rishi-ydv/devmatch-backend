import { fileTypeFromBuffer } from 'file-type';
import ApiError from '../utils/api-error.js';

// Allowed formats based on actual file content.
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const validateImageSignature = async (req, res, next) => {
  try {
    // Reject requests without an uploaded file.
    if (!req.file || !req.file.buffer) {
      return next(new ApiError(400, 'Profile photo is required.'));
    }

    // Detect the actual format using the file's binary contents.
    const detectedType = await fileTypeFromBuffer(req.file.buffer);

    // Reject unknown or unsupported file formats.
    if (!detectedType || !allowedMimeTypes.has(detectedType.mime)) {
      return next(
        new ApiError(
          400,
          'Invalid image file. Only JPEG, PNG, and WebP are allowed.',
        ),
      );
    }

    // Ensure the declared MIME type matches the detected MIME type.
    if (req.file.mimetype !== detectedType.mime) {
      return next(
        new ApiError(
          400,
          'File content does not match its declared image type.',
        ),
      );
    }

    // Store the verified MIME type for subsequent processing.
    req.file.detectedMimeType = detectedType.mime;

    next();
  } catch {
    // Do not expose internal file-processing errors to the client.
    return next(new ApiError(400, 'Unable to validate the uploaded image.'));
  }
};
