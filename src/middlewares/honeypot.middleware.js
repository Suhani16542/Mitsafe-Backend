import logger from '../config/logger.js';

/**
 * Middleware to detect honeypot spam bot submissions.
 * Hidden field names: `website_hp`, `hp_field`, `honeypot`, `business_hp`.
 * Legitimate human users will not see or fill this field. Bots scanning the DOM will fill it.
 */
export const honeypotMiddleware = (req, res, next) => {
  const honeypotVal =
    req.body.website_hp ??
    req.body.hp_field ??
    req.body.honeypot ??
    req.body.business_hp;

  if (honeypotVal !== undefined && honeypotVal !== null && String(honeypotVal).trim().length > 0) {
    logger.warn('Spam honeypot trap triggered. Rejecting request without processing.');
    return res.status(400).json({
      success: false,
      status: 'fail',
      message: 'Spam submission detected. Request rejected.',
    });
  }

  next();
};

