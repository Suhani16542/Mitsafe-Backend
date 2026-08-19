import express from 'express';
import {
  getBlogs,
  getBlogBySlug,
  getCategories,
  createBlog,
  updateBlog,
  toggleBlogStatus,
  deleteBlog,
  uploadBlogImage,
} from '../controllers/blog.controller.js';
import { adminAuthMiddleware } from '../middlewares/adminAuth.middleware.js';
import {
  createBlogValidationRules,
  updateBlogValidationRules,
  blogStatusValidationRules,
} from '../validators/blog.validator.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { uploadSingleImage } from '../middlewares/upload.middleware.js';

const router = express.Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/blogs or /api/v1/blogs - Get published blogs with pagination, search, category filter
router.get('/', getBlogs);

// GET /api/blogs/categories or /api/v1/blogs/categories - Get distinct published blog categories
router.get('/categories', getCategories);

// GET /api/blogs/:slug or /api/v1/blogs/:slug - Get single published blog by slug
router.get('/:slug', getBlogBySlug);

// ==========================================
// PROTECTED MANAGEMENT ROUTES (Admin Authentication Required)
// Cookie (admin_token) or Authorization header required
// ==========================================

// POST /api/blogs/upload-image - Upload featured image to Cloudinary
router.post(
  '/upload-image',
  adminAuthMiddleware,
  uploadSingleImage,
  uploadBlogImage
);

// POST /api/blogs - Create a new blog post
router.post(
  '/',
  adminAuthMiddleware,
  createBlogValidationRules,
  validateRequest,
  createBlog
);

// PUT /api/blogs/:id - Update an existing blog post
router.put(
  '/:id',
  adminAuthMiddleware,
  updateBlogValidationRules,
  validateRequest,
  updateBlog
);

// PATCH /api/blogs/:id/status - Toggle published/draft status
router.patch(
  '/:id/status',
  adminAuthMiddleware,
  blogStatusValidationRules,
  validateRequest,
  toggleBlogStatus
);

// DELETE /api/blogs/:id - Delete a blog post
router.delete(
  '/:id',
  adminAuthMiddleware,
  deleteBlog
);

export default router;

