import { Router } from 'express';
import {
  ReportController,
  generateReportValidation,
  previewReportValidation,
  categoryValidation,
  createCustomTemplateValidation
} from '@/controllers/ReportController';
import { requireAuth, requireManager, requireManagement } from '@/middleware/auth';

const router = Router();

// Apply authentication to all report routes
router.use(requireAuth);

/**
 * @route GET /api/v1/reports/templates
 * @desc Get all available report templates for user (based on role)
 * @access Private (All authenticated users)
 */
router.get('/templates', ReportController.getTemplates);

/**
 * @route GET /api/v1/reports/templates/:category
 * @desc Get report templates by category
 * @access Private (All authenticated users)
 */
router.get('/templates/:category', categoryValidation, ReportController.getTemplatesByCategory);

/**
 * @route POST /api/v1/reports/templates/custom
 * @desc Create custom report template
 * @access Private (Management+)
 */
router.post(
  '/templates/custom',
  requireManagement,
  createCustomTemplateValidation,
  ReportController.createCustomTemplate
);

/**
 * @route POST /api/v1/reports/generate
 * @desc Generate and export report
 * @access Private (All authenticated users - role-based data filtering)
 */
router.post('/generate', generateReportValidation, ReportController.generateReport);

/**
 * @route POST /api/v1/reports/preview
 * @desc Preview report data without generating file
 * @access Private (All authenticated users)
 */
router.post('/preview', previewReportValidation, ReportController.previewReport);

/**
 * @route GET /api/v1/reports/history
 * @desc Get report generation history for current user
 * @access Private (All authenticated users)
 */
router.get('/history', ReportController.getHistory);

/**
 * @route GET /api/v1/reports/analytics/live
 * @desc Get live analytics data for dashboard
 * @access Private (All authenticated users - role-based scope)
 */
router.get('/analytics/live', ReportController.getLiveAnalytics);

export default router;
