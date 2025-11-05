import express from 'express';
import UserTrackingController from '../controllers/UserTrackingController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/authorization';

const router = express.Router();

/**
 * @route   GET /api/user-tracking/dashboard
 * @desc    Get dashboard overview for managers/management
 * @access  Manager, Management
 */
router.get('/dashboard',
  requireAuth,
  requireRole(['manager', 'management']),
  UserTrackingController.getDashboardOverview.bind(UserTrackingController)
);

/**
 * @route   GET /api/user-tracking/users
 * @desc    Get user list with performance summary
 * @access  Manager, Management
 */
router.get('/users',
  requireAuth,
  requireRole(['manager', 'management']),
  UserTrackingController.getUserList.bind(UserTrackingController)
);

/**
 * @route   GET /api/user-tracking/users/:userId/analytics
 * @desc    Get detailed user analytics
 * @access  Manager (for their reports), Management, Self
 */
router.get('/users/:userId/analytics',
  requireAuth,
  requireRole(['employee', 'manager', 'management']),
  UserTrackingController.getUserAnalytics.bind(UserTrackingController)
);

/**
 * @route   GET /api/user-tracking/users/:userId/trends
 * @desc    Get utilization trends for a user
 * @access  Manager (for their reports), Management, Self
 */
router.get('/users/:userId/trends',
  requireAuth,
  requireRole(['employee', 'manager', 'management']),
  UserTrackingController.getUtilizationTrends.bind(UserTrackingController)
);

/**
 * @route   GET /api/user-tracking/team/ranking
 * @desc    Get team performance ranking
 * @access  Manager, Management
 */
router.get('/team/ranking',
  requireAuth,
  requireRole(['manager', 'management']),
  UserTrackingController.getTeamRanking.bind(UserTrackingController)
);

/**
 * @route   GET /api/user-tracking/projects/performance
 * @desc    Get project performance breakdown
 * @access  Manager, Management
 */
router.get('/projects/performance',
  requireAuth,
  requireRole(['manager', 'management']),
  UserTrackingController.getProjectPerformance.bind(UserTrackingController)
);

/**
 * @route   POST /api/user-tracking/aggregate
 * @desc    Trigger aggregation for specific timesheet or user
 * @access  Manager, Management
 */
router.post('/aggregate',
  requireAuth,
  requireRole(['manager', 'management']),
  UserTrackingController.triggerAggregation.bind(UserTrackingController)
);

/**
 * @route   GET /api/user-tracking/stats
 * @desc    Get aggregation statistics and status
 * @access  Manager, Management
 */
router.get('/stats',
  requireAuth,
  requireRole(['manager', 'management']),
  UserTrackingController.getAggregationStats.bind(UserTrackingController)
);

export default router;
