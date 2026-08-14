import ApiError from '../utils/apiError.js';
import logger from '../config/logger.js';

/**
 * Middleware to protect Blog Management APIs using a secure server-side API Key
 * Header required: x-blog-admin-key: <BLOG_ADMIN_API_KEY>
 */
export const verifyBlogAdminKey = (req, res, next) => {
  const configuredAdminKey = process.env.BLOG_ADMIN_API_KEY;

  if (!configuredAdminKey) {
    logger.error('BLOG_ADMIN_API_KEY is not defined in environment variables.');
    return next(new ApiError(500, 'Server configuration error: Admin API key not configured'));
  }

  // Extract admin key from headers (x-blog-admin-key)
  const clientAdminKey = req.headers['x-blog-admin-key'] || req.headers['x-admin-key'];

  if (!clientAdminKey) {
    return next(new ApiError(401, 'Unauthorized: Missing x-blog-admin-key header'));
  }

  if (clientAdminKey !== configuredAdminKey) {
    return next(new ApiError(403, 'Forbidden: Invalid admin key'));
  }

  next();
};
