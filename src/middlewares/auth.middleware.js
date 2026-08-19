import jwt from 'jsonwebtoken';
import asyncWrapper from '../utils/asyncWrapper.js';
import ApiError from '../utils/apiError.js';

export const protect = asyncWrapper(async (req, res, next) => {
  let token;

  // 1. Check cookies
  if (req.cookies && (req.cookies.admin_token || req.cookies.token || req.cookies.jwt)) {
    token = req.cookies.admin_token || req.cookies.token || req.cookies.jwt;
  }
  // 2. Check authorization header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new ApiError(401, 'You are not logged in! Please log in to get access.')
    );
  }

  // Verify token
  try {
    const jwtSecret = process.env.JWT_SECRET || 'mitsafe_admin_jwt_secret_default_key_2026';
    const decoded = jwt.verify(token, jwtSecret);
    // Attach user payload (e.g. id, email, role) to the request object
    req.user = decoded;
    next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired token.'));
  }
});

// Middleware for checking user roles (e.g., admin, user)
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'You do not have permission to perform this action.')
      );
    }
    next();
  };
};

