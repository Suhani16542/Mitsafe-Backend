import { verifyTurnstileToken } from '../services/turnstile.service.js';
import logger from '../config/logger.js';

/**
 * Middleware to enforce Cloudflare Turnstile token validation on incoming requests
 */
export const turnstileMiddleware = async (req, res, next) => {
  const token =
    req.body.turnstileToken ||
    req.body['cf-turnstile-response'] ||
    req.body.cf_turnstile_response ||
    req.headers['cf-turnstile-response'] ||
    req.headers['x-turnstile-token'];

  if (!token) {
    logger.warn('Turnstile verification failed: Token is missing in request.');
    return res.status(400).json({
      success: false,
      status: 'fail',
      message: 'Security verification failed: Cloudflare Turnstile token is missing.',
    });
  }

  const clientIp = req.ip || req.connection.remoteAddress;
  const result = await verifyTurnstileToken(token, clientIp);

  if (!result.success) {
    logger.warn(`Turnstile verification failed (${result.error || 'Invalid token'}).`);
    return res.status(403).json({
      success: false,
      status: 'fail',
      message: 'Security verification failed. Please complete the captcha check and try again.',
      error: result.error,
    });
  }

  next();
};

