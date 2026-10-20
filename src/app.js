import express from 'express';
import cookieParser from 'cookie-parser';

import routes from './routes/index.js';
import globalErrorHandler from './middlewares/error.middleware.js';
import ApiError from './utils/api-error.js';

const app = express();

// Global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'DevMatch API is running',
  });
});

// Register all API routes
app.use('/api', routes);

// Handle unknown routes
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

//Global error handler
app.use(globalErrorHandler);

export default app;
