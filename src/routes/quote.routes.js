import express from 'express';
import { createQuote, getQuotes } from '../controllers/quote.controller.js';
import { quoteValidationRules } from '../validators/quote.validator.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { adminAuthMiddleware } from '../middlewares/adminAuth.middleware.js';
import { quoteSubmissionLimiter } from '../middlewares/rateLimiter.middleware.js';
import { honeypotMiddleware } from '../middlewares/honeypot.middleware.js';
import { turnstileMiddleware } from '../middlewares/turnstile.middleware.js';

const router = express.Router();

// GET /api/quotes or /api/v1/quotes (Admin Protected)
router.get('/', adminAuthMiddleware, getQuotes);

// POST /api/quotes, /api/quote, /api/v1/quotes (Public submission with multi-layered spam defense)
// Pipeline order: 1. Rate Limiter -> 2. Honeypot -> 3. Turnstile -> 4. Validation Rules -> 5. Validation Result -> 6. Controller (Replay check + DB + Brevo)
router.post(
  '/',
  quoteSubmissionLimiter,
  honeypotMiddleware,
  turnstileMiddleware,
  quoteValidationRules,
  validateRequest,
  createQuote
);

export default router;
