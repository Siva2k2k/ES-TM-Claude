import { Router } from 'express';
import { TimesheetController } from '@/controllers/TimesheetController';
import { TeamReviewController } from '@/controllers/TeamReviewController';
import { body, param, query } from 'express-validator';
import { validate } from '@/middleware/validation';
import { requireAuth } from '@/middleware/auth';
import mongoose from 'mongoose';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * @route GET /api/v1/timesheets/dashboard
 * @desc Get timesheet dashboard statistics
 * @access Private
 */
router.get('/dashboard', TimesheetController.getTimesheetDashboard);

/**
 * @route GET /api/v1/timesheets
 * @desc Get all timesheets (super admin and management only)
 * @access Private
 */
router.get('/', TimesheetController.getAllTimesheets);

/**
 * @route GET /api/v1/timesheets/user
 * @desc Get user timesheets with filters
 * @access Private
 */
router.get('/user', [
  query('userId').optional().isMongoId().withMessage('Invalid user ID'),
  query('status').optional().isArray().withMessage('Status must be an array'),
  query('weekStartDate').optional().isISO8601().withMessage('Invalid week start date'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  validate
], TimesheetController.getUserTimesheets);

/**
 * @route GET /api/v1/timesheets/:timesheetId/history
 * @desc Get timesheet with full approval history
 * @access Private
 */
router.get('/:timesheetId/history', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  validate
], TeamReviewController.getTimesheetHistory);



/**
 * @route POST /api/v1/timesheets
 * @desc Create new timesheet
 * @access Private
 */
router.post('/', [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('weekStartDate').isISO8601().withMessage('Valid week start date is required'),
  validate
], TimesheetController.createTimesheet);

/**
 * @route GET /api/v1/timesheets/:userId/:weekStartDate
 * @desc Get timesheet by user and week
 * @access Private
 */
/**
 * @route GET /api/v1/timesheets/projects/groups
 * @desc Get project-wise timesheet groups for Manager/Management (LEGACY/V1)
 * @access Private (Lead/Manager/Management/Super Admin)
 */
router.get('/projects/groups', [
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'frozen', 'all']).withMessage('Invalid status filter'),
  query('project_id').optional().custom(value => value === 'all' || mongoose.Types.ObjectId.isValid(value)).withMessage('Invalid project ID'),
  query('member_role').optional().isIn(['employee', 'lead', 'manager', 'management', 'super_admin', 'all']).withMessage('Invalid member role'),
  query('week_start').optional().isISO8601().withMessage('Invalid week start date'),
  query('week_end').optional().isISO8601().withMessage('Invalid week end date'),
  query('search').optional().isString().withMessage('Search must be a string'),
  validate
], TeamReviewController.getProjectTimesheetGroupsLegacy);

/**
 * @route GET /api/v1/timesheets/project-weeks
 * @desc Get project-week groups with pagination and filters (V2)
 * @access Private (Lead/Manager/Management/Super Admin)
 */
router.get('/project-weeks', [
  query('project_id').optional().isString().withMessage('Invalid project ID'),
  query('week_start').optional().isISO8601().withMessage('Invalid week start date'),
  query('week_end').optional().isISO8601().withMessage('Invalid week end date'),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'all']).withMessage('Invalid status filter'),
  query('sort_by').optional().isIn(['week_date', 'project_name', 'pending_count']).withMessage('Invalid sort field'),
  query('sort_order').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  validate
], TeamReviewController.getProjectWeekGroups);

/**
 * @route POST /api/v1/timesheets/project-week/approve
 * @desc Approve all timesheets for a project-week
 * @access Private (Lead/Manager/Management/Super Admin)
 */
router.post('/project-week/approve', [
  body('project_id').isMongoId().withMessage('Valid project ID is required'),
  body('week_start').isISO8601().withMessage('Valid week start date is required'),
  body('week_end').isISO8601().withMessage('Valid week end date is required'),
  validate
], TeamReviewController.approveProjectWeek);

/**
 * @route POST /api/v1/timesheets/project-week/reject
 * @desc Reject all timesheets for a project-week
 * @access Private (Lead/Manager/Management/Super Admin)
 */
router.post('/project-week/reject', [
  body('project_id').isMongoId().withMessage('Valid project ID is required'),
  body('week_start').isISO8601().withMessage('Valid week start date is required'),
  body('week_end').isISO8601().withMessage('Valid week end date is required'),
  body('reason').isString().isLength({ min: 10 }).withMessage('Rejection reason must be at least 10 characters'),
  validate
], TeamReviewController.rejectProjectWeek);

/**
 * @route POST /api/v1/timesheets/project-week/freeze
 * @desc Bulk freeze all timesheets for a project-week (Management only)
 * @access Private (Management/Super Admin)
 */
router.post('/project-week/freeze', [
  body('project_id').isMongoId().withMessage('Valid project ID is required'),
  body('week_start').isISO8601().withMessage('Valid week start date is required'),
  body('week_end').isISO8601().withMessage('Valid week end date is required'),
  validate
], TeamReviewController.freezeProjectWeek);

/**
 * @route GET /api/v1/timesheets/:userId/:weekStartDate
 * @desc Get timesheet by user and week
 * @access Private
 */
router.get('/:userId/:weekStartDate', [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  param('weekStartDate').isISO8601().withMessage('Invalid week start date'),
  validate
], TimesheetController.getTimesheetByUserAndWeek);

/**
 * @route POST /api/v1/timesheets/:timesheetId/submit
 * @desc Submit timesheet for approval
 * @access Private
 */
router.post('/:timesheetId/submit', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  validate
], TimesheetController.submitTimesheet);

/**
 * @route POST /api/v1/timesheets/:timesheetId/manager-action
 * @desc Manager approve/reject timesheet
 * @access Private
 */
router.post('/:timesheetId/manager-action', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  validate
], TimesheetController.managerApproveRejectTimesheet);

/**
 * @route POST /api/v1/timesheets/:timesheetId/management-action
 * @desc Management approve/reject timesheet
 * @access Private
 */
router.post('/:timesheetId/management-action', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  validate
], TimesheetController.managementApproveRejectTimesheet);

/**
 * @route POST /api/v1/timesheets/:timesheetId/entries
 * @desc Add time entry to timesheet
 * @access Private
 */
router.post('/:timesheetId/entries', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('hours').isFloat({ min: 0.1, max: 24 }).withMessage('Hours must be between 0.1 and 24'),
  body('entry_type').isIn(['project_task', 'custom_task']).withMessage('Invalid entry type'),
  body('is_billable').isBoolean().withMessage('is_billable must be a boolean'),
  body('project_id').optional().isMongoId().withMessage('Invalid project ID'),
  body('task_id').optional().isMongoId().withMessage('Invalid task ID'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('custom_task_description').optional().isString().withMessage('Custom task description must be a string'),
  validate
], TimesheetController.addTimeEntry);

/**
 * @route GET /api/v1/timesheets/status/:status
 * @desc Get timesheets by status
 * @access Private
 */
router.get('/status/:status', [
  param('status').isIn(['draft', 'submitted', 'manager_approved', 'management_pending', 'manager_rejected', 'management_rejected', 'frozen', 'billed']).withMessage('Invalid status'),
  validate
], TimesheetController.getTimesheetsByStatus);

/**
 * @route POST /api/v1/timesheets/:timesheetId/escalate
 * @desc Escalate timesheet to management
 * @access Private
 */
router.post('/:timesheetId/escalate', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  validate
], TimesheetController.escalateTimesheet);

/**
 * @route POST /api/v1/timesheets/:timesheetId/mark-billed
 * @desc Mark timesheet as billed
 * @access Private
 */
router.post('/:timesheetId/mark-billed', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  validate
], TimesheetController.markTimesheetBilled);

/**
 * @route GET /api/v1/timesheets/:timesheetId/entries
 * @desc Get time entries for timesheet
 * @access Private
 */
router.get('/:timesheetId/entries', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  validate
], TimesheetController.getTimeEntries);

/**
 * @route DELETE /api/v1/timesheets/:timesheetId
 * @desc Delete entire timesheet (draft only)
 * @access Private
 */
router.delete('/:timesheetId', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  validate
], TimesheetController.deleteTimesheet);

/**
 * @route DELETE /api/v1/timesheets/:timesheetId/entries
 * @desc Delete timesheet entries
 * @access Private
 */
router.delete('/:timesheetId/entries', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  validate
], TimesheetController.deleteTimesheetEntries);

/**
 * @route PUT /api/v1/timesheets/:timesheetId/entries
 * @desc Update timesheet entries
 * @access Private
 */
router.put('/:timesheetId/entries', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  body('entries').isArray().withMessage('Entries must be an array'),
  validate
], TimesheetController.updateTimesheetEntries);

/**
 * @route GET /api/v1/timesheets/details/:timesheetId
 * @desc Get timesheet details by ID
 * @access Private
 */
router.get('/details/:timesheetId', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  validate
], TimesheetController.getTimesheetById);

/**
 * @route GET /api/v1/timesheets/calendar/:userId/:year/:month
 * @desc Get calendar data for user
 * @access Private
 */
router.get('/calendar/:userId/:year/:month', [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  param('year').isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
  param('month').isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
  validate
], TimesheetController.getCalendarData);

/**
 * @route GET /api/v1/timesheets/for-approval
 * @desc Get timesheets for approval
 * @access Private
 */
router.get('/for-approval', [
  query('approverRole').isIn(['manager', 'management', 'lead']).withMessage('Invalid approver role'),
  validate
], TimesheetController.getTimesheetsForApproval);

/**
 * @route GET /api/v1/timesheets/deleted
 * @desc Get deleted timesheets (management and super admin only)
 * @access Private
 */
router.get('/deleted', [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  validate
], TimesheetController.getDeletedTimesheets);

/**
 * @route POST /api/v1/timesheets/:timesheetId/restore
 * @desc Restore soft deleted timesheet (management and super admin only)
 * @access Private
 */
router.post('/:timesheetId/restore', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  validate
], TimesheetController.restoreTimesheet);

/**
 * @route DELETE /api/v1/timesheets/:timesheetId/hard
 * @desc Hard delete timesheet permanently (super admin only)
 * @access Private
 */
router.delete('/:timesheetId/hard', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  validate
], TimesheetController.hardDeleteTimesheet);

/**
 * @route POST /api/v1/timesheets/:timesheetId/approve
 * @desc Approve timesheet for a specific project (multi-manager support)
 * @access Private (Lead/Manager/Management/Super Admin)
 */
router.post('/:timesheetId/approve', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  body('project_id').isMongoId().withMessage('Valid project ID is required'),
  validate
], TeamReviewController.approveTimesheet);

/**
 * @route POST /api/v1/timesheets/:timesheetId/reject
 * @desc Reject timesheet for a specific project (resets all approvals)
 * @access Private (Lead/Manager/Management/Super Admin)
 */
router.post('/:timesheetId/reject', [
  param('timesheetId').isMongoId().withMessage('Invalid timesheet ID'),
  body('project_id').isMongoId().withMessage('Valid project ID is required'),
  body('reason').isString().isLength({ min: 10 }).withMessage('Rejection reason must be at least 10 characters'),
  validate
], TeamReviewController.rejectTimesheet);

/**
 * @route POST /api/v1/timesheets/bulk/verify
 * @desc Bulk verify timesheets (Management only)
 * @access Private (Management/Super Admin)
 */
router.post('/bulk/verify', [
  body('timesheet_ids').isArray().withMessage('Timesheet IDs must be an array'),
  body('timesheet_ids.*').isMongoId().withMessage('Invalid timesheet ID'),
  body('project_id').optional().isMongoId().withMessage('Invalid project ID'),
  validate
], TeamReviewController.bulkVerify);

/**
 * @route POST /api/v1/timesheets/bulk/bill
 * @desc Bulk mark timesheets as billed (Management only)
 * @access Private (Management/Super Admin)
 */
router.post('/bulk/bill', [
  body('timesheet_ids').isArray().withMessage('Timesheet IDs must be an array'),
  body('timesheet_ids.*').isMongoId().withMessage('Invalid timesheet ID'),
  body('project_id').optional().isMongoId().withMessage('Invalid project ID'),
  validate
], TeamReviewController.bulkBill);

 

export default router;