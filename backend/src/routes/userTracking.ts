import express from 'express';
import UserTrackingController from '../controllers/UserTrackingController';
import { authenticateJWT } from '../middleware/auth';
import { authorizeRoles } from '../middleware/authorization';

const router = express.Router();

/**
 * @route   GET /api/user-tracking/dashboard
 * @desc    Get dashboard overview for managers/management
 * @access  Manager, Management
 */
router.get('/dashboard', 
  authenticateJWT, 
  authorizeRoles(['manager', 'management']),
  UserTrackingController.getDashboardOverview
);

/**
 * @route   GET /api/user-tracking/users
 * @desc    Get user list with performance summary
 * @access  Manager, Management
 */
router.get('/users', 
  authenticateJWT, 
  authorizeRoles(['manager', 'management']),
  UserTrackingController.getUserList
);

/**
 * @route   GET /api/user-tracking/users/:userId/analytics
 * @desc    Get detailed user analytics
 * @access  Manager (for their reports), Management, Self
 */
router.get('/users/:userId/analytics', 
  authenticateJWT, 
  authorizeRoles(['employee', 'manager', 'management']),
  UserTrackingController.getUserAnalytics
);

/**
 * @route   GET /api/user-tracking/users/:userId/trends
 * @desc    Get utilization trends for a user
 * @access  Manager (for their reports), Management, Self
 */
router.get('/users/:userId/trends', 
  authenticateJWT, 
  authorizeRoles(['employee', 'manager', 'management']),
  UserTrackingController.getUtilizationTrends
);

/**
 * @route   GET /api/user-tracking/team/ranking
 * @desc    Get team performance ranking
 * @access  Manager, Management
 */
router.get('/team/ranking', 
  authenticateJWT, 
  authorizeRoles(['manager', 'management']),
  UserTrackingController.getTeamRanking
);

/**
 * @route   GET /api/user-tracking/projects/performance
 * @desc    Get project performance breakdown
 * @access  Manager, Management
 */
router.get('/projects/performance', 
  authenticateJWT, 
  authorizeRoles(['manager', 'management']),
  UserTrackingController.getProjectPerformance
);

/**
 * @route   POST /api/user-tracking/aggregate
 * @desc    Trigger aggregation for specific timesheet or user
 * @access  Manager, Management
 */
router.post('/aggregate', 
  authenticateJWT, 
  authorizeRoles(['manager', 'management']),
  UserTrackingController.triggerAggregation
);

/**
 * @route   GET /api/user-tracking/stats
 * @desc    Get aggregation statistics and status
 * @access  Manager, Management
 */
router.get('/stats', 
  authenticateJWT, 
  authorizeRoles(['manager', 'management']),
  UserTrackingController.getAggregationStats
);

export default router;