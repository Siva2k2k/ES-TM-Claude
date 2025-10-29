import { Router } from 'express';
import {
  BillingController,
  generateWeeklySnapshotValidation,
  approveMonthlyBillingValidation,
  exportBillingReportValidation,
  snapshotIdValidation,
  getBillingSummaryValidation
} from '@/controllers/BillingController';
import { requireAuth, requireManagement } from '@/middleware/auth';

const router = Router();

// Apply authentication to all billing routes
router.use(requireAuth);

// All billing operations require Management+ role
router.use(requireManagement);

/**
 * @route POST /api/v1/billing/snapshots/generate
 * @desc Generate weekly billing snapshots
 * @access Private (Management+)
 */
router.post('/snapshots/generate', generateWeeklySnapshotValidation, BillingController.generateWeeklySnapshot);

/**
 * @route POST /api/v1/billing/snapshots/weekly
 * @desc Create weekly billing snapshot
 * @access Private (Management+)
 */
router.post('/snapshots/weekly', generateWeeklySnapshotValidation, BillingController.generateWeeklySnapshot);

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
 * @route GET /api/v1/billing/summary
 * @desc Get billing summary
 * @access Private (Management+)
 */
router.get('/summary', getBillingSummaryValidation, BillingController.getBillingSummary);

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
 * @route GET /api/v1/billing/revenue-by-project
 * @desc Get revenue by project
 * @access Private (Management+)
 */
router.get('/revenue-by-project', BillingController.getRevenueByProject);

/**
 * @route GET /api/v1/billing/revenue/projects
 * @desc Get revenue by project (alternative endpoint)
 * @access Private (Management+)
 */
router.get('/revenue/projects', BillingController.getRevenueByProject);

/**
 * @route POST /api/v1/billing/export
 * @desc Export billing report
 * @access Private (Management+)
 */
router.post('/export', exportBillingReportValidation, BillingController.exportBillingReport);

/**
 * @route GET /api/v1/billing/export
 * @desc Export billing report (GET method)
 * @access Private (Management+)
 */
router.get('/export', exportBillingReportValidation, BillingController.exportBillingReport);

// Mount sub-routes
// Note: Billing rates and invoices functionality is handled by projectBilling routes
// See /api/v1/project-billing for rate and invoice management

export default router;