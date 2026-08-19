import express from 'express';
import { createQuote, getQuotes } from '../controllers/quote.controller.js';
import { quoteValidationRules } from '../validators/quote.validator.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { adminAuthMiddleware } from '../middlewares/adminAuth.middleware.js';

const router = express.Router();

// GET /api/quotes or /api/v1/quotes (Admin Protected)
router.get('/', adminAuthMiddleware, getQuotes);

// POST /api/quotes or /api/v1/quotes (Public submission)
router.post('/', quoteValidationRules, validateRequest, createQuote);

export default router;

