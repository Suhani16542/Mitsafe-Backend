import express from 'express';
import quoteRoutes from './quote.routes.js';
import blogRoutes from './blog.routes.js';
import adminRoutes from './admin.routes.js';

const router = express.Router();

// Health Check Route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Feature Routes
router.use('/admin', adminRoutes);
router.use('/quotes', quoteRoutes);
router.use('/blogs', blogRoutes);

// Base route under /api/v1
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to Mitsafe API Version 1',
  });
});

export default router;

