import logger from '../config/logger.js';
import ApiError from '../utils/apiError.js';

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

export const routeNotFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Can't find ${req.originalUrl} on this server!`));
};

export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;

    // Handle Mongoose cast errors (e.g. invalid ObjectId)
    if (err.name === 'CastError') {
      const message = `Invalid ${err.path}: ${err.value}.`;
      error = new ApiError(400, message);
    }

    // Handle Mongoose duplicate key errors
    if (err.code === 11000) {
      const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : '';
      const message = `Duplicate field value: ${value}. Please use another value!`;
      error = new ApiError(400, message);
    }

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((el) => el.message);
      const message = `Invalid input data. ${errors.join('. ')}`;
      error = new ApiError(400, message);
    }

    // Handle JWT invalid signature errors
    if (err.name === 'JsonWebTokenError') {
      error = new ApiError(401, 'Invalid token. Please log in again!');
    }

    // Handle JWT expired errors
    if (err.name === 'TokenExpiredError') {
      error = new ApiError(401, 'Your token has expired! Please log in again.');
    }

    sendErrorProd(error, res);
  }
};
