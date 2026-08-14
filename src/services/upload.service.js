import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import logger from '../config/logger.js';

/**
 * Configure Cloudinary SDK dynamically from environment variables
 * @returns {boolean} Whether Cloudinary SDK is fully configured
 */
export const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ? process.env.CLOUDINARY_CLOUD_NAME.trim().replace(/^["']|["']$/g, '') : '';
  const apiKey = process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.trim().replace(/^["']|["']$/g, '') : '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.trim().replace(/^["']|["']$/g, '') : '';

  if (
    cloudName &&
    apiKey &&
    apiSecret &&
    !cloudName.includes('your_') &&
    !apiKey.includes('your_')
  ) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    return true;
  }
  return false;
};

/**
 * Process uploaded file and return permanent image URL & publicId (Cloudinary or local storage fallback)
 * @param {Object} file - Express Multer file object
 * @param {Object} req - Express Request object
 * @returns {Promise<{ imageUrl: string, publicId: string }>} Object containing imageUrl and publicId
 */
export const processBlogImageUpload = async (file, req) => {
  if (!file) {
    throw new Error('No file provided for upload');
  }

  const isCloudinaryReady = configureCloudinary();

  if (isCloudinaryReady) {
    try {
      logger.info(`Uploading image ${file.originalname} to Cloudinary...`);

      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: 'auto',
      });

      logger.info(`Cloudinary image upload successful: ${result.secure_url} (public_id: ${result.public_id})`);

      // Clean up local temp file after successful upload
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return {
        imageUrl: result.secure_url,
        publicId: result.public_id,
      };
    } catch (err) {
      logger.error(`Cloudinary upload failed: ${err.message}`, err);
    }
  } else {
    logger.info('Cloudinary credentials missing or incomplete. Using local disk storage.');
  }

  // Fallback: Local Server URL
  const protocol = req ? req.protocol : 'http';
  const host = req ? req.get('host') : 'localhost:5000';
  const filename = path.basename(file.path);
  const localUrl = `${protocol}://${host}/uploads/${filename}`;

  logger.info(`Blog image stored locally at: ${localUrl}`);
  return {
    imageUrl: localUrl,
    publicId: filename,
  };
};

