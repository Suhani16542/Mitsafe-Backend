import asyncWrapper from '../utils/asyncWrapper.js';
import Quote from '../models/quote.model.js';
import { sendQuoteNotificationEmail } from '../services/email.service.js';
import logger from '../config/logger.js';

/**
 * @desc    Submit a new quote / consultation enquiry
 * @route   POST /api/v1/quotes (or /api/quotes)
 * @access  Public
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
    budget,
    timeline,
    message,
    sourcePage,
    requestType,
  } = req.body;

  // Resolve field aliases for frontend compatibility
  const resolvedFullName = (fullName || name || '').trim();
  const resolvedCompanyName = (companyName || company || '').trim();
  const resolvedService = (service || serviceCategory || '').trim();

  // Save quote to MongoDB
  const newQuote = await Quote.create({
    fullName: resolvedFullName,
    email,
    phone: phone || '',
    companyName: resolvedCompanyName,
    service: resolvedService,
    budget: budget || '',
    timeline: timeline || '',
    message,
    sourcePage: sourcePage || '/',
    requestType: requestType || 'quote',
  });

  // Asynchronously send notification email via Brevo (does not block HTTP response)
  sendQuoteNotificationEmail(newQuote).catch((err) => {
    logger.error('Background quote email notification failed:', err);
  });

  res.status(201).json({
    success: true,
    message: 'Your quote enquiry has been submitted successfully! Our team will contact you shortly.',
    data: newQuote,
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
