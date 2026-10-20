import mongoose from 'mongoose';
import { ZodError } from 'zod';

const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  // Handle Zod validation errors.
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';

    errors = err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  }

  // Handle Mongoose schema validation errors.
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';

    errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message,
    }));
  }

  // Handle MongoDB duplicate-key errors.
  else if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with this value already exists';

    errors = Object.keys(err.keyValue || {}).map(field => ({
      field,
      message: `${field} already exists`,
    }));
  }

  // Hide unexpected internal error details.
  if (statusCode >= 500) {
    message = 'Internal server error';
    errors = [];
  }

  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
  });
};

export default globalErrorHandler;
