import { body } from 'express-validator';

export const quoteValidationRules = [
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty'),

  // Ensure at least name or fullName is provided
  body().custom((value, { req }) => {
    const hasName = (req.body.fullName && req.body.fullName.trim()) || (req.body.name && req.body.name.trim());
    if (!hasName) {
      throw new Error('Name / Full name is required');
    }
    return true;
  }),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('service')
    .optional()
    .trim(),

  body('serviceCategory')
    .optional()
    .trim(),

  // Ensure at least service or serviceCategory is provided
  body().custom((value, { req }) => {
    const hasService = (req.body.service && req.body.service.trim()) || (req.body.serviceCategory && req.body.serviceCategory.trim());
    if (!hasService) {
      throw new Error('Service selection is required');
    }
    return true;
  }),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Project details / message is required')
    .isLength({ min: 5, max: 3000 })
    .withMessage('Message must be between 5 and 3000 characters long'),

  body('phone')
    .optional()
    .trim()
    .isLength({ max: 25 })
    .withMessage('Phone number is too long'),

  body('companyName')
    .optional()
    .trim(),

  body('company')
    .optional()
    .trim(),

  body('budget')
    .optional()
    .trim(),

  body('timeline')
    .optional()
    .trim(),

  body('sourcePage')
    .optional()
    .trim(),

  body('requestType')
    .optional()
    .trim()
    .isIn(['quote', 'consultation'])
    .withMessage('Invalid request type'),
];
