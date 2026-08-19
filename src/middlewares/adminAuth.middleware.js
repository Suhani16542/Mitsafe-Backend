import jwt from 'jsonwebtoken';
import Admin from '../models/admin.model.js';
import logger from '../config/logger.js';

export const adminAuthMiddleware = async (req, res, next) => {
  try {
    let token;

    // 1. Check HTTP-only cookie
    if (req.cookies && (req.cookies.admin_token || req.cookies.token || req.cookies.jwt)) {
      token = req.cookies.admin_token || req.cookies.token || req.cookies.jwt;
    }
    // 2. Check Authorization header (Bearer token)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 3. Fallback: Server-to-server API Key check (strictly when key is configured and matches)
    const clientAdminKey = req.headers['x-blog-admin-key'] || req.headers['x-admin-key'];
    const configuredAdminKey = process.env.BLOG_ADMIN_API_KEY;

    if (
      !token &&
      clientAdminKey &&
      configuredAdminKey &&
      clientAdminKey.trim() !== '' &&
      clientAdminKey.trim() === configuredAdminKey.trim()
    ) {
      req.admin = { email: process.env.ADMIN_EMAIL || 'admin@mitsafe.com', isApiKey: true };
      return next();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to access this resource.',
      });
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'mitsafe_admin_jwt_secret_default_key_2026';
    const decoded = jwt.verify(token, jwtSecret);

    // Verify admin exists in DB
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required: Admin account not found',
      });
    }

    req.admin = admin;
    req.user = { id: admin._id, email: admin.email, role: 'admin' };
    next();
  } catch (error) {
    logger.warn(`Admin auth middleware rejected request: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: error.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : 'Invalid authentication token.',
    });
  }
};

