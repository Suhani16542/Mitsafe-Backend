import rateLimit from 'express-rate-limit';

/**
 * Dedicated rate limiter for quote submissions to mitigate automated floods and spam.
 * Limits each client IP to a maximum of 3 Get a Quote requests per 15-minute window.
 */
export const quoteSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Maximum 3 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    });
  },
  skipSuccessfulRequests: false,
});

