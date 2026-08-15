import express from 'express';
import {
  loginAdmin,
  getAdminSession,
  logoutAdmin,
} from '../controllers/admin.controller.js';
import { adminLoginValidationRules } from '../validators/admin.validator.js';
import { validateRequest } from '../middlewares/validation.middleware.js';

const router = express.Router();

// POST /api/admin/login
router.post('/login', adminLoginValidationRules, validateRequest, loginAdmin);

// GET /api/admin/me
router.get('/me', getAdminSession);

// POST /api/admin/logout
router.post('/logout', logoutAdmin);

export default router;
