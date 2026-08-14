import jwt from 'jsonwebtoken';
import asyncWrapper from '../utils/asyncWrapper.js';
import ApiError from '../utils/apiError.js';

export const protect = asyncWrapper(async (req, res, next) => {
  let token;
  // Check authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    // Check cookies as backup
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new ApiError(401, 'You are not logged in! Please log in to get access.')
    );
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user payload (e.g. id, role) to the request object
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
