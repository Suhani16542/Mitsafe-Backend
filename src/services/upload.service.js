import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import logger from '../config/logger.js';
import ApiError from '../utils/apiError.js';

/**
 * Configure / check Cloudinary SDK status
 * @returns {boolean} Whether Cloudinary SDK is fully configured
 */
export const configureCloudinary = () => {
  return isCloudinaryConfigured();
};

/**
 * Helper to extract safe diagnostic log info without printing credentials or secrets
 */
const logUploadDiagnostics = ({ file, method, folder, resourceType, preset }) => {
  const config = cloudinary.config();
  logger.info('--- Cloudinary Upload Diagnostic ---');
  logger.info(`Cloud name configured: ${Boolean(config.cloud_name)}`);
  logger.info(`API key configured: ${Boolean(config.api_key)}`);
  logger.info(`API secret configured: ${Boolean(config.api_secret)}`);
  logger.info(`File received: ${Boolean(file)}`);
  if (file) {
    logger.info(`Original filename: ${file.originalname || 'unknown'}`);
    logger.info(`Mimetype: ${file.mimetype || 'unknown'}`);
    logger.info(`File size: ${file.size || (file.buffer ? file.buffer.length : 'unknown')} bytes`);
  }
  logger.info(`Upload method: ${method}`);
  logger.info(`Resource type: ${resourceType}`);
  logger.info(`Folder: ${folder}`);
  logger.info(`Upload preset name: ${preset || 'none (using authenticated SDK signed upload)'}`);
  logger.info('------------------------------------');
};

/**
 * Upload a file buffer directly to Cloudinary
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {string} filename - Original file name for reference
 * @param {string} folder - Target folder in Cloudinary
 * @returns {Promise<{ imageUrl: string, publicId: string }>}
 */
export const uploadBufferToCloudinary = (buffer, filename = '', folder = 'mitsafe/blogs') => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(
        new ApiError(
          500,
          'Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing or incomplete in environment variables.'
        )
      );
    }

    const cleanFileName = filename
      ? filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'image';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: `${cleanFileName}_${Date.now()}`,
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          logger.error('--- Cloudinary Upload Failed ---');
          logger.error(`Cloudinary response status: Failed`);
          logger.error(`Cloudinary error http_code: ${error.http_code || 500}`);
          logger.error(`Cloudinary error message: ${error.message || 'Unknown error'}`);
          logger.error(`Cloudinary error name: ${error.name || 'Error'}`);
          logger.error('--------------------------------');

          let friendlyMessage = error.message || 'Cloudinary upload failed';
          if (error.http_code === 403) {
            friendlyMessage = `Cloudinary 403 Forbidden: ${error.message}. Please verify that your Cloudinary API Key has 'create' / upload permissions in Cloudinary Console -> Settings -> Access Keys.`;
          }

          const apiError = new ApiError(error.http_code || 500, friendlyMessage);
          apiError.cloudinaryError = {
            http_code: error.http_code,
            name: error.name,
            message: error.message,
          };
          return reject(apiError);
        }

        logger.info('--- Cloudinary Upload Succeeded ---');
        logger.info(`Cloudinary response status: 200 OK`);
        logger.info(`Public ID: ${result.public_id}`);
        logger.info(`Secure URL: ${result.secure_url}`);
        logger.info('-----------------------------------');

        resolve({
          imageUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Process uploaded file (memory buffer or disk file) and return permanent Cloudinary secure URL
 * @param {Object} file - Express Multer file object
 * @param {Object} req - Express Request object
 * @returns {Promise<{ imageUrl: string, publicId: string }>} Object containing permanent imageUrl and publicId
 */
export const processBlogImageUpload = async (file, req) => {
  if (!file) {
    throw new ApiError(400, 'No file provided for upload');
  }

  // 1. Direct Buffer Upload (Multer Memory Storage)
  if (file.buffer) {
    logUploadDiagnostics({
      file,
      method: 'upload_stream (memory buffer)',
      folder: 'mitsafe/blogs',
      resourceType: 'image',
      preset: null,
    });

    const result = await uploadBufferToCloudinary(file.buffer, file.originalname);
    return result;
  }

  // 2. Fallback if file was saved to temporary disk path
  if (file.path) {
    logUploadDiagnostics({
      file,
      method: 'uploader.upload (temp disk path)',
      folder: 'mitsafe/blogs',
      resourceType: 'image',
      preset: null,
    });

    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'mitsafe/blogs',
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });

      logger.info('--- Cloudinary Upload Succeeded ---');
      logger.info(`Cloudinary response status: 200 OK`);
      logger.info(`Public ID: ${result.public_id}`);
      logger.info(`Secure URL: ${result.secure_url}`);
      logger.info('-----------------------------------');

      return {
        imageUrl: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      logger.error('--- Cloudinary Upload Failed ---');
      logger.error(`Cloudinary response status: Failed`);
      logger.error(`Cloudinary error http_code: ${error.http_code || 500}`);
      logger.error(`Cloudinary error message: ${error.message || 'Unknown error'}`);
      logger.error(`Cloudinary error name: ${error.name || 'Error'}`);
      logger.error('--------------------------------');

      let friendlyMessage = error.message || 'Cloudinary upload failed';
      if (error.http_code === 403) {
        friendlyMessage = `Cloudinary 403 Forbidden: ${error.message}. Please verify that your Cloudinary API Key has 'create' / upload permissions in Cloudinary Console -> Settings -> Access Keys.`;
      }

      const apiError = new ApiError(error.http_code || 500, friendlyMessage);
      apiError.cloudinaryError = {
        http_code: error.http_code,
        name: error.name,
        message: error.message,
      };
      throw apiError;
    }
  }

  throw new ApiError(400, 'Invalid file format received for image upload');
};

/**
 * Delete image from Cloudinary by public ID
 * @param {string} publicId
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId || !isCloudinaryConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Deleted image from Cloudinary: ${publicId}`);
  } catch (err) {
    logger.warn(`Failed to delete image from Cloudinary (${publicId}): ${err.message}`);
  }
};

