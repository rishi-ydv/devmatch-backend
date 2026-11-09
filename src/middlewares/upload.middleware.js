import multer from 'multer';
import ApiError from '../utils/api-error.js';

// Only allow these declared MIME types.
// This is an initial check, not proof that the file is a genuine image.
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new ApiError(400, 'Only JPEG, PNG, and WebP images are allowed.'),
    );
  }

  cb(null, true);
};

// Keep uploaded files in memory temporarily.
// Never use the original filename as a server-side storage path.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // Maximum 2 MiB
    files: 1, // Maximum one file
    fields: 0, // No text fields
    parts: 1, // Maximum one multipart part
  },
});

// Create Multer's single-file middleware.
const singleProfilePhoto = upload.single('profilePhoto');

// Wrap Multer to handle its errors consistently.
export const uploadProfilePhoto = (req, res, next) => {
  singleProfilePhoto(req, res, error => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(413, 'Profile photo must not exceed 2 MB.'));
      }

      return next(new ApiError(400, 'Invalid file upload request.'));
    }

    // Forward existing ApiError or unexpected errors.
    next(error);
  });
};
