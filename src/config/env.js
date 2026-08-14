import logger from './logger.js';
import { configureCloudinary } from '../services/upload.service.js';

export const validateEnv = () => {
  const requiredVars = ['MONGODB_URI'];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.warn(`Missing critical environment variable(s): ${missingVars.join(', ')}.`);
  }

  // Check and log status of Brevo Email Configuration
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey && !brevoApiKey.includes('placeholder') && !brevoApiKey.includes('your_brevo')) {
    logger.info('Brevo email configuration loaded successfully');
  } else {
    logger.info('BREVO_API_KEY is not set. Quote email notifications will run in log-only mode.');
  }

  // Check and log status of Blog Admin protection API key
  if (!process.env.BLOG_ADMIN_API_KEY) {
    logger.info('BLOG_ADMIN_API_KEY is not set. Using default fallback key for blog admin protection.');
  }

  // Initialize and check status of Cloudinary Storage Configuration
  const isCloudinaryReady = configureCloudinary();
  if (isCloudinaryReady) {
    logger.info('Cloudinary configuration loaded successfully');
  } else {
    logger.info('Cloudinary credentials not fully configured. Blog image upload will fallback to local storage.');
  }
};
