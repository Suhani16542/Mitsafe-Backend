import express from 'express';
import { createQuote, getQuotes } from '../controllers/quote.controller.js';
import { quoteValidationRules } from '../validators/quote.validator.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { verifyBlogAdminKey } from '../middlewares/blogAdmin.middleware.js';

const router = express.Router();

// GET /api/quotes or /api/v1/quotes (Admin Key protected)
router.get('/', verifyBlogAdminKey, getQuotes);

// POST /api/quotes or /api/v1/quotes
router.post('/', quoteValidationRules, validateRequest, createQuote);

export default router;
