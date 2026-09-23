import express from 'express';
import {
  getCategories,
  getCategoryByIdOrSlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import { adminAuthMiddleware } from '../middlewares/adminAuth.middleware.js';
import {
  createCategoryValidationRules,
  updateCategoryValidationRules,
} from '../validators/category.validator.js';
import { validateRequest } from '../middlewares/validation.middleware.js';

const router = express.Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/v1/categories or /api/categories - Get all categories
router.get('/', getCategories);

// GET /api/v1/categories/:id - Get single category by MongoID or slug
router.get('/:id', getCategoryByIdOrSlug);

// ==========================================
// PROTECTED MANAGEMENT ROUTES (Admin Auth Required)
// Cookie (admin_token) or Authorization header or x-blog-admin-key / x-admin-key
// ==========================================

// POST /api/v1/categories - Create a new category
router.post(
  '/',
  adminAuthMiddleware,
  createCategoryValidationRules,
  validateRequest,
  createCategory
);

// PUT /api/v1/categories/:id - Update an existing category
router.put(
  '/:id',
  adminAuthMiddleware,
  updateCategoryValidationRules,
  validateRequest,
  updateCategory
);

// PATCH /api/v1/categories/:id - Partially update an existing category
router.patch(
  '/:id',
  adminAuthMiddleware,
  updateCategoryValidationRules,
  validateRequest,
  updateCategory
);

// DELETE /api/v1/categories/:id - Delete a category
router.delete(
  '/:id',
  adminAuthMiddleware,
  deleteCategory
);

export default router;
