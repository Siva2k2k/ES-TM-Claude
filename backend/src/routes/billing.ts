import { Router } from 'express';
import {
  BillingController,
  generateWeeklySnapshotValidation,
  approveMonthlyBillingValidation,
  exportBillingReportValidation,
  snapshotIdValidation
} from '@/controllers/BillingController';
import { requireAuth, requireManagement } from '@/middleware/auth';

const router = Router();

// Apply authentication to all billing routes
router.use(requireAuth);

// All billing operations require Management+ role
router.use(requireManagement);

/**
 * @route POST /api/v1/billing/snapshots
 * @desc Generate weekly billing snapshots
 * @access Private (Management+)
 */
router.post('/snapshots', generateWeeklySnapshotValidation, BillingController.generateWeeklySnapshot);

/**
 * @route GET /api/v1/billing/snapshots
 * @desc Get all billing snapshots
 * @access Private (Management+)
 */
router.get('/snapshots', BillingController.getAllBillingSnapshots);

/**
 * @route GET /api/v1/billing/snapshots/:snapshotId
 * @desc Get billing snapshot by ID
 * @access Private (Management+)
 */
router.get('/snapshots/:snapshotId', snapshotIdValidation, BillingController.getBillingSnapshotById);

/**
 * @route GET /api/v1/billing/dashboard
 * @desc Get billing dashboard data
 * @access Private (Management+)
 */
router.get('/dashboard', BillingController.getBillingDashboard);

/**
 * @route POST /api/v1/billing/approve-monthly
 * @desc Approve monthly billing
 * @access Private (Management+)
 */
router.post('/approve-monthly', approveMonthlyBillingValidation, BillingController.approveMonthlyBilling);

/**
 * @route GET /api/v1/billing/revenue/projects
 * @desc Get revenue by project
 * @access Private (Management+)
 */
router.get('/revenue/projects', BillingController.getRevenueByProject);

/**
 * @route GET /api/v1/billing/export
 * @desc Export billing report
 * @access Private (Management+)
 */
router.get('/export', exportBillingReportValidation, BillingController.exportBillingReport);

export default router;