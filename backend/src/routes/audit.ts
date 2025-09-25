import { Router } from 'express';
import {
  AuditLogController,
  getAuditLogsValidation,
  exportAuditLogsValidation,
  searchAuditLogsValidation,
  clearOldLogsValidation,
  userIdValidation,
  logIdValidation
} from '@/controllers/AuditLogController';
import { requireAuth, requireManagement, requireSuperAdmin } from '@/middleware/auth';

const router = Router();

// Apply authentication to all audit routes
router.use(requireAuth);

// Most audit operations require Management+ role
router.use(requireManagement);

/**
 * @route GET /api/v1/audit/logs
 * @desc Get audit logs with filtering and pagination
 * @access Private (Management+)
 */
router.get('/logs', getAuditLogsValidation, AuditLogController.getAuditLogs);

/**
 * @route GET /api/v1/audit/logs/:logId
 * @desc Get audit log by ID
 * @access Private (Management+)
 */
router.get('/logs/:logId', logIdValidation, AuditLogController.getAuditLogById);

/**
 * @route GET /api/v1/audit/security
 * @desc Get security events (login attempts, permission denials, etc.)
 * @access Private (Management+)
 */
router.get('/security', AuditLogController.getSecurityEvents);

/**
 * @route GET /api/v1/audit/users/:userId/activity
 * @desc Get user activity timeline
 * @access Private (Management+ or own activity)
 */
router.get('/users/:userId/activity', userIdValidation, AuditLogController.getUserActivity);

/**
 * @route GET /api/v1/audit/summary
 * @desc Get system activity summary
 * @access Private (Management+)
 */
router.get('/summary', AuditLogController.getActivitySummary);

/**
 * @route GET /api/v1/audit/export
 * @desc Export audit logs
 * @access Private (Management+)
 */
router.get('/export', exportAuditLogsValidation, AuditLogController.exportAuditLogs);

/**
 * @route GET /api/v1/audit/search
 * @desc Search audit logs
 * @access Private (Management+)
 */
router.get('/search', searchAuditLogsValidation, AuditLogController.searchAuditLogs);

/**
 * @route POST /api/v1/audit/clear-old
 * @desc Clear old audit logs (retention policy)
 * @access Private (Super Admin)
 */
router.post('/clear-old', requireSuperAdmin, clearOldLogsValidation, AuditLogController.clearOldLogs);

export default router;