import dotenv from "dotenv";

dotenv.config();

// Centralized application configuration.
// Keeps sensitive values (e.g., JWT secret, DB URI) outside source code
// and ensures a single source of truth across the app.
const config = {
  port: process.env.PORT || 3000, // App port (default: 3000)
  // jwtSecret: process.env.JWT_SECRET, // Secret for signing JWT tokens
  // jwtExpires: process.env.JWT_EXPIRES_IN,
  mongoURI: process.env.MONGODB_URI, // MongoDB connection URI
  // nodeEnv: process.env.NODE_ENV,
  // cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  // cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  // cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  // corsOrigins: process.env.CORS_ORIGINS,
};

export default config;