import { body, param } from 'express-validator';

export const createCategoryValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 100 })
    .withMessage('Category name cannot exceed 100 characters'),

  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/i)
    .withMessage('Slug can only contain letters, numbers, and hyphens'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('status')
    .optional()
    .trim()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive'),
];

export const updateCategoryValidationRules = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Category ID or slug parameter is required'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Category name cannot exceed 100 characters'),

  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/i)
    .withMessage('Slug can only contain letters, numbers, and hyphens'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('status')
    .optional()
    .trim()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive'),
];
