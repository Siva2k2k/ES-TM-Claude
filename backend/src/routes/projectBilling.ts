import { Router } from 'express';
import {
  ProjectBillingController,
  getProjectBillingViewValidation,
  getTaskBillingViewValidation,
  getUserBillingViewValidation,
  updateBillableHoursValidation,
  updateProjectBillableTotalValidation,
  getUserBreakdownValidation
} from '@/controllers/ProjectBillingController';
import { requireAuth, requireManager } from '@/middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

/**
 * @route GET /api/v1/project-billing/projects
 * @desc Get project-based billing view with monthly/weekly breakdown
 * @access Private (Manager+)
 */
router.get('/projects', getProjectBillingViewValidation, ProjectBillingController.getProjectBillingView);

/**
 * @route PUT /api/v1/project-billing/projects/:projectId/billable-total
 * @desc Update total billable hours for a project (distributes across members)
 * @access Private (Manager+)
 */
router.put(
  '/projects/:projectId/billable-total',
  updateProjectBillableTotalValidation,
  ProjectBillingController.updateProjectBillableTotal
);

/**
 * @route GET /api/v1/project-billing/users
 * @desc Get user-based billing analytics with task breakdown
 * @access Private (Manager+)
 */
router.get('/users', getUserBillingViewValidation, ProjectBillingController.getUserBillingView);

/**
 * @route GET /api/v1/project-billing/tasks
 * @desc Get task-based billing view with detailed breakdown
 * @access Private (Manager+)
 */
router.get('/tasks', ProjectBillingController.getTaskBillingView);

/**
 * @route GET /api/v1/project-billing/breakdown
 * @desc Get user breakdown (weekly or monthly) for a project
 * @query type - 'weekly' or 'monthly'
 * @query projectId - Project ID
 * @query userId - User ID
 * @query startDate - ISO date string
 * @query endDate - ISO date string
 * @access Private (Manager+)
 */
router.get(
  '/breakdown',
  getUserBreakdownValidation,
  ProjectBillingController.getUserBreakdown
);

/**
 * @route GET /api/v1/project-billing/test
 * @desc Test endpoint
 * @access Private
 */
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Project billing routes are working!', user: req.user });
});

/**
 * @route PUT /api/v1/project-billing/billable-hours
 * @desc Update billable hours for a specific time entry
 * @access Private (Manager+)
 */
router.put('/billable-hours', updateBillableHoursValidation, ProjectBillingController.updateBillableHours);

export default router;
