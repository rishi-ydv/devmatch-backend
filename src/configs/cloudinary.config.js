import { v2 as cloudinary } from 'cloudinary';
import config from './enviroment.config.js';

// Ensure Cloudinary credentials are configured.
const { cloudName, apiKey, apiSecret } = config.cloudinary;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error('Cloudinary environment variables are missing.');
}

// Configure Cloudinary using backend-only credentials.
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export default cloudinary;
