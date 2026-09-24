import asyncWrapper from '../utils/asyncWrapper.js';
import Quote from '../models/quote.model.js';
import { sendQuoteNotificationEmail } from '../services/email.service.js';
import logger from '../config/logger.js';
import sanitizeHtml from 'sanitize-html';

/**
 * Helper to safely sanitize string inputs against XSS and HTML/script injection
 */
const sanitizeString = (str, maxLength = 3000) => {
  if (!str || typeof str !== 'string') return '';
  const sanitized = sanitizeHtml(str.trim(), {
    allowedTags: [],
    allowedAttributes: {},
  });
  return sanitized.slice(0, maxLength);
};

/**
 * @desc    Submit a new quote / consultation enquiry
 * @route   POST /api/v1/quotes (or /api/quotes, /api/quote)
 * @access  Public (Protected by Rate Limiter, Honeypot, Turnstile & Validator)
 */
export const createQuote = asyncWrapper(async (req, res) => {
  const {
    fullName,
    name,
    email,
    phone,
    companyName,
    company,
    service,
    serviceCategory,
    timeline,
    message,
    sourcePage,
    requestType,
  } = req.body;

  // Resolve and sanitize input fields (whitelisting only expected fields)
  const resolvedFullName = sanitizeString(fullName || name || '', 100);
  const resolvedCompanyName = sanitizeString(companyName || company || '', 150);
  const resolvedService = sanitizeString(service || serviceCategory || '', 120);
  const normalizedEmail = (email || '').trim().toLowerCase().slice(0, 254);
  const cleanedPhone = sanitizeString(phone || '', 30);
  const cleanedTimeline = sanitizeString(timeline || '', 100);
  const sanitizedMessage = sanitizeString(message || '', 3000);
  const cleanedSourcePage = sanitizeString(sourcePage || '/', 255);
  const resolvedRequestType = requestType === 'consultation' ? 'consultation' : 'quote';

  // Duplicate Submission Protection (5-minute window)
  // Rejects rapid duplicate submissions matching same email OR same phone with same message
  const duplicateWindowMinutes = 5;
  const duplicateTimeThreshold = new Date(Date.now() - duplicateWindowMinutes * 60 * 1000);

  const duplicateCriteria = [];
  if (normalizedEmail) {
    duplicateCriteria.push({ email: normalizedEmail, message: sanitizedMessage });
  }
  if (cleanedPhone) {
    duplicateCriteria.push({ phone: cleanedPhone, message: sanitizedMessage });
  }
  if (duplicateCriteria.length === 0) {
    duplicateCriteria.push({ message: sanitizedMessage });
  }

  const existingDuplicate = await Quote.findOne({
    $or: duplicateCriteria,
    createdAt: { $gte: duplicateTimeThreshold },
  });

  if (existingDuplicate) {
    logger.warn('Duplicate quote submission rejected within cooldown window.');
    return res.status(409).json({
      success: false,
      status: 'fail',
      message: 'A duplicate quote enquiry was recently submitted. Please wait a few moments before submitting again.',
    });
  }

  // Persist genuine quote enquiry to MongoDB
  const newQuote = await Quote.create({
    fullName: resolvedFullName,
    email: normalizedEmail,
    phone: cleanedPhone,
    companyName: resolvedCompanyName,
    service: resolvedService,
    timeline: cleanedTimeline,
    message: sanitizedMessage,
    sourcePage: cleanedSourcePage || '/',
    requestType: resolvedRequestType,
  });

  logger.info(`New quote enquiry saved to database (ID: ${newQuote._id}).`);

  // Dispatch exactly one notification email via Brevo REST API
  let emailDeliveryStatus = { success: false };
  try {
    emailDeliveryStatus = await sendQuoteNotificationEmail(newQuote);
    if (emailDeliveryStatus.success) {
      logger.info(`Quote notification email sent successfully (ID: ${emailDeliveryStatus.messageId || 'OK'})`);
    } else {
      logger.error('Quote notification email failed to dispatch.');
    }
  } catch (err) {
    logger.error(`Error during email dispatch: ${err.message}`);
    emailDeliveryStatus = { success: false, error: err.message };
  }

  // Preserve frontend expected success response
  res.status(201).json({
    success: true,
    message: 'Your quote enquiry has been submitted successfully! Our team will contact you shortly.',
    data: newQuote,
    emailSent: emailDeliveryStatus.success,
  });
});


/**
 * @desc    Get list of submitted quotes (Admin protected)
 * @route   GET /api/v1/quotes (or /api/quotes)
 * @access  Protected (Admin Key Required)
 */
export const getQuotes = asyncWrapper(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const [quotes, total] = await Promise.all([
    Quote.find().sort('-createdAt').skip(skip).limit(limit).lean(),
    Quote.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: quotes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});
