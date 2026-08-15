import jwt from 'jsonwebtoken';
import Admin from '../models/admin.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import logger from '../config/logger.js';

// Helper to generate JWT Token
const generateToken = (admin) => {
  const jwtSecret = process.env.JWT_SECRET || 'mitsafe_admin_jwt_secret_default_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
  return jwt.sign(
    { id: admin._id, email: admin.email },
    jwtSecret,
    { expiresIn }
  );
};

// Helper for cookie options
const getCookieOptions = (req) => {
  // Determine if HTTPS / Render reverse proxy or production
  const isSecure =
    process.env.NODE_ENV === 'production' ||
    req?.secure ||
    req?.headers?.['x-forwarded-proto'] === 'https';

  return {
    httpOnly: true,
    secure: Boolean(isSecure),
    sameSite: isSecure ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  };
};

/**
 * @desc    Admin Login
 * @route   POST /api/admin/login
 * @access  Public
 */
export const loginAdmin = asyncWrapper(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  logger.info(`Admin login attempt for: ${normalizedEmail} (password provided: ${Boolean(password)})`);

  // Find admin and explicitly include password field (since select: false in schema)
  const admin = await Admin.findOne({ email: normalizedEmail }).select('+password');

  if (!admin) {
    logger.warn(`Admin login failed: Account with email ${normalizedEmail} not found`);
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  // Check password match
  const isMatch = await admin.matchPassword(password);
  if (!isMatch) {
    logger.warn(`Admin login failed: Incorrect password for ${normalizedEmail}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  // Generate JWT token
  const token = generateToken(admin);

  // Set HTTP-only cookie with cross-origin support
  res.cookie('admin_token', token, getCookieOptions(req));

  logger.info(`Admin logged in successfully: ${admin.email}`);

  return res.status(200).json({
    success: true,
    message: 'Admin login successful',
    admin: {
      email: admin.email,
    },
    token, // Also return token in body as fallback for non-cookie API clients
  });
});

/**
 * @desc    Check Admin Authentication Session Status
 * @route   GET /api/admin/me
 * @access  Public (Checks auth internally)
 */
export const getAdminSession = asyncWrapper(async (req, res) => {
  let token;

  if (req.cookies && (req.cookies.admin_token || req.cookies.token)) {
    token = req.cookies.admin_token || req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Authentication required: No active session',
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'mitsafe_admin_jwt_secret_default_key_2026';
    const decoded = jwt.verify(token, jwtSecret);
    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'Admin account not found',
      });
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      admin: {
        email: admin.email,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Invalid or expired session',
    });
  }
});

/**
 * @desc    Admin Logout
 * @route   POST /api/admin/logout
 * @access  Public / Protected
 */
export const logoutAdmin = asyncWrapper(async (req, res) => {
  const cookieOptions = getCookieOptions(req);
  delete cookieOptions.maxAge;

  res.clearCookie('admin_token', cookieOptions);

  return res.status(200).json({
    success: true,
    message: 'Admin logged out successfully',
  });
});
