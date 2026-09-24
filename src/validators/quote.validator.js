import { body } from 'express-validator';

export const quoteValidationRules = [
  body('fullName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters long'),

  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters long'),

  // Ensure at least name or fullName is provided
  body().custom((value, { req }) => {
    const nameVal = (req.body.fullName || req.body.name || '').trim();
    if (!nameVal) {
      throw new Error('Name / Full name is required');
    }
    if (nameVal.length < 2 || nameVal.length > 100) {
      throw new Error('Name must be between 2 and 100 characters long');
    }
    return true;
  }),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .isLength({ max: 254 })
    .withMessage('Email address is too long')
    .normalizeEmail(),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .custom((val) => {
      if (!val) return true;
      // Allow international phone numbers (+, digits, spaces, hyphens, periods, parentheses)
      const validChars = /^[\d\s\-+.()]{6,25}$/.test(val);
      const digitCount = (val.match(/\d/g) || []).length;
      if (!validChars || digitCount < 6 || digitCount > 16) {
        throw new Error('Please enter a valid phone number (6 to 16 digits)');
      }
      return true;
    }),

  body('companyName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Company name cannot exceed 150 characters'),

  body('company')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Company name cannot exceed 150 characters'),

  body('service')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 })
    .withMessage('Service selection cannot exceed 120 characters'),

  body('serviceCategory')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 120 })
    .withMessage('Service category cannot exceed 120 characters'),

  // Ensure at least service or serviceCategory is provided
  body().custom((value, { req }) => {
    const serviceVal = (req.body.service || req.body.serviceCategory || '').trim();
    if (!serviceVal) {
      throw new Error('Service selection is required');
    }
    if (serviceVal.length < 2 || serviceVal.length > 120) {
      throw new Error('Service selection must be between 2 and 120 characters');
    }
    return true;
  }),


  body('timeline')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Estimated timeline cannot exceed 100 characters'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Project details / message is required')
    .isLength({ min: 5, max: 3000 })
    .withMessage('Message must be between 5 and 3000 characters long'),

  body('sourcePage')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Source page path cannot exceed 255 characters'),

  body('requestType')
    .optional({ checkFalsy: true })
    .trim()
    .isIn(['quote', 'consultation'])
    .withMessage('Invalid request type. Must be either quote or consultation'),
];
