import { body } from 'express-validator';

export const adminLoginValidationRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .toLowerCase(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];
