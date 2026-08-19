import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import logger from '../config/logger.js';

/**
 * Configure / check Cloudinary SDK status
 * @returns {boolean} Whether Cloudinary SDK is fully configured
 */
export const configureCloudinary = () => {
  return isCloudinaryConfigured();
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
      return reject(new Error('Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing or incomplete.'));
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
          logger.error(`Cloudinary stream upload failed: ${error.message}`, error);
          return reject(error);
        }
        logger.info(`Cloudinary image upload successful: ${result.secure_url} (public_id: ${result.public_id})`);
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
    throw new Error('No file provided for upload');
  }

  // 1. Direct Buffer Upload (Multer Memory Storage)
  if (file.buffer) {
    logger.info(`Uploading image buffer (${file.originalname}) directly to Cloudinary...`);
    const result = await uploadBufferToCloudinary(file.buffer, file.originalname);
    return result;
  }

  // 2. Fallback if file was saved to temporary disk path
  if (file.path) {
    logger.info(`Uploading temp file ${file.path} to Cloudinary...`);
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'mitsafe/blogs',
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });

    return {
      imageUrl: result.secure_url,
      publicId: result.public_id,
    };
  }

  throw new Error('Invalid file format received for image upload');
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
