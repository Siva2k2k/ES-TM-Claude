/**
 * Defaulter Routes
 * Routes for tracking and managing timesheet defaulters
 */

import express from 'express';
import {
  DefaulterController,
  projectDefaultersValidation,
  managerDefaultersValidation,
  notifyDefaultersValidation
} from '../controllers/DefaulterController';
import { requireAuth } from '../middleware/auth';
import { query } from 'express-validator';

const router = express.Router();

// All defaulter routes require authentication
router.use(requireAuth);

// Stats route must come before parameterized routes
// GET /api/v1/defaulters/stats
router.get(
  '/stats',
  [
    query('managerId').optional().isMongoId().withMessage('Invalid manager ID format'),
    query('weekStartDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Week start date must be in YYYY-MM-DD format')
  ],
  DefaulterController.getDefaulterStats
);

// Notify route must come before parameterized routes
// POST /api/v1/defaulters/notify
router.post(
  '/notify',
  notifyDefaultersValidation,
  DefaulterController.notifyDefaulters
);

// Validate route must come before general parameterized routes
// GET /api/v1/defaulters/validate/:projectId/:weekStart
router.get(
  '/validate/:projectId/:weekStart',
  projectDefaultersValidation,
  DefaulterController.validateNoDefaulters
);

// Missing submissions route (must come before parameterized routes)
// GET /api/v1/defaulters/missing-submissions
router.get(
  '/missing-submissions',
  DefaulterController.getMissingSubmissions
);

// Manager defaulters route
// GET /api/v1/defaulters/manager/:managerId/:weekStart
router.get(
  '/manager/:managerId/:weekStart',
  managerDefaultersValidation,
  DefaulterController.getManagerDefaulters
);

// Project defaulters route (must come last among parameterized routes)
// GET /api/v1/defaulters/:projectId/:weekStart
router.get(
  '/:projectId/:weekStart',
  projectDefaultersValidation,
  DefaulterController.getProjectDefaulters
);

export default router;
