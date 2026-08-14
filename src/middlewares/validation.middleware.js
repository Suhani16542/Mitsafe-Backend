import { validationResult } from 'express-validator';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: errorMessages,
    });
  }
  next();
};
