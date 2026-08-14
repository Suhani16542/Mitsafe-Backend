import dotenv from 'dotenv';
// Load environment variables as early as possible
dotenv.config();

import { validateEnv } from './config/env.js';
validateEnv();

import app from './app.js';
import connectDB from './config/db.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      logger.info(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! Shutting down...');
      logger.error(`${err.name}: ${err.message}`);
      if (err.stack) logger.error(err.stack);
      server.close(() => {
        process.exit(1);
      });
    });
  })
  .catch((err) => {
    logger.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(`${err.name}: ${err.message}`);
  if (err.stack) logger.error(err.stack);
  process.exit(1);
});
