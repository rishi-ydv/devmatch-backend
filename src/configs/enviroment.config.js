import dotenv from "dotenv";

dotenv.config();

// Centralized application configuration.
// Keeps sensitive values (e.g., JWT secret, DB URI) outside source code
// and ensures a single source of truth across the app.
const config = {
  port: process.env.PORT || 3000, // App port (default: 3000)
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY,
  mongoURI: process.env.MONGODB_URI, // MongoDB connection URI
  nodeEnv: process.env.NODE_ENV,
  // cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  // cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  // cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  // corsOrigins: process.env.CORS_ORIGINS,
};

export default config;