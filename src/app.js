import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { globalErrorHandler, routeNotFoundHandler } from './middlewares/error.middleware.js';
import router from './routes/index.js';
import logger from './config/logger.js';

import path from 'path';
import quoteRoutes from './routes/quote.routes.js';
import blogRoutes from './routes/blog.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// Trust reverse proxy (e.g. Render, Nginx) so req.secure and x-forwarded-proto are respected
app.set('trust proxy', 1);

// Global Middlewares

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows cross-origin image loading
  })
);

// Whitelist of allowed origins for CORS with credentials support
const rawOrigins = [
  'https://www.mitsafe.com',
  'https://mitsafe.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
];

const allowedOrigins = Array.from(
  new Set(
    rawOrigins
      .flatMap((item) => (item ? item.split(',') : []))
      .map((item) => item.trim().replace(/\/$/, ''))
      .filter((item) => item && item !== '*')
  )
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');
      if (
        allowedOrigins.includes(normalizedOrigin) ||
        (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin))
      ) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked for unauthorized origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-blog-admin-key',
      'x-admin-key',
    ],
    optionsSuccessStatus: 200,
  })
);

// Rate limiting to prevent abuse
const limiter = rateLimit({
  max: 100, // limit each IP to 100 requests per 15 minutes
  windowMs: 15 * 60 * 1000,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again in 15 minutes!',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter);

// Development logging using Morgan combined with winston
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Static directory serving for uploaded images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Cookie parser
app.use(cookieParser());

// API Routes (supporting versioned /api/v1 as well as unversioned aliases)
app.use('/api/v1', router);
app.use('/api/admin', adminRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/quote', quoteRoutes);
app.use('/api/blogs', blogRoutes);

// Handle 404/route not found
app.all('*', routeNotFoundHandler);

// Global Error Handler Middleware
app.use(globalErrorHandler);

export default app;

