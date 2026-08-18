import { body, param } from 'express-validator';

export const createBlogValidationRules = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Blog title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Blog content is required'),

  body('category')
    .trim()
    .notEmpty()
    .withMessage('Blog category is required'),

  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),

  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters'),

  body('status')
    .optional()
    .trim()
    .isIn(['draft', 'published'])
    .withMessage('Status must be either draft or published'),

  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean value'),

  body('featuredImage')
    .optional()
    .trim(),

  body('readTime')
    .optional()
    .trim(),

  body('keywords')
    .optional()
    .custom((value) => {
      if (typeof value !== 'string' && !Array.isArray(value)) {
        throw new Error('Keywords must be an array of strings or a comma-separated string');
      }
      return true;
    }),

  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value !== 'string' && !Array.isArray(value)) {
        throw new Error('Tags must be an array of strings or a comma-separated string');
      }
      return true;
    }),

  body('author')
    .optional()
    .trim(),
];

export const updateBlogValidationRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Mongo Object ID format'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),

  body('keywords')
    .optional()
    .custom((value) => {
      if (typeof value !== 'string' && !Array.isArray(value)) {
        throw new Error('Keywords must be an array of strings or a comma-separated string');
      }
      return true;
    }),

  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value !== 'string' && !Array.isArray(value)) {
        throw new Error('Tags must be an array of strings or a comma-separated string');
      }
      return true;
    }),

  body('status')
    .optional()
    .trim()
    .isIn(['draft', 'published'])
    .withMessage('Status must be either draft or published'),

  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean value'),
];

export const blogStatusValidationRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid Mongo Object ID format'),

  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['draft', 'published'])
    .withMessage('Status must be either draft or published'),
];
