import { Request, Response } from 'express';
import { TimesheetService, NotificationService } from '@/services';
import { handleAsyncError } from '@/utils/errors';
import { AuthUser } from '@/utils/auth';

import { Timesheet } from '@/models';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class TimesheetController {
  /**
   * Get user timesheets
   */
  static getAllTimesheets = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const result = await TimesheetService.getAllTimesheets(currentUser);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.timesheets
    });
  });

  /**
   * Get user timesheets
   */
  static getUserTimesheets = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const {
      userId,
      status,
      weekStartDate,
      limit = '50',
      offset = '0'
    } = req.query;

    const statusFilter = status ? (Array.isArray(status) ? status : [status]) : undefined;

    const result = await TimesheetService.getUserTimesheets(
      currentUser,
      userId as string,
      statusFilter as any,
      weekStartDate as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.timesheets,
      total: result.total
    });
  });

  /**
   * Create timesheet
   */
  static createTimesheet = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { userId, weekStartDate } = req.body;

    if (!userId || !weekStartDate) {
      return res.status(400).json({
        success: false,
        error: 'userId and weekStartDate are required'
      });
    }

    const result = await TimesheetService.createTimesheet(userId, weekStartDate, currentUser);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      data: result.timesheet
    });
  });

  /**
   * Get timesheet by user and week
   */
  static getTimesheetByUserAndWeek = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { userId, weekStartDate } = req.params;

    const result = await TimesheetService.getTimesheetByUserAndWeek(userId, weekStartDate, currentUser);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.timesheet
    });
  });

  /**
   * Check if timesheet can be submitted (Lead validation)
   */
  static checkCanSubmit = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { timesheetId } = req.params;

    const validationResult = await TimesheetService.validateLeadCanSubmit(
      timesheetId,
      currentUser.id
    );

    res.json({
      success: true,
      canSubmit: validationResult.canSubmit,
      message: validationResult.message,
      pendingReviews: validationResult.pendingReviews
    });
  });

  /**
   * Submit timesheet
   */
  public static submitTimesheet = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { timesheetId } = req.params;

    const result = await TimesheetService.submitTimesheet(timesheetId, currentUser);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Timesheet submitted successfully'
    });
  });

  /**
   * Manager approve/reject timesheet
   */
  static managerApproveRejectTimesheet = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { timesheetId } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "approve" or "reject"'
      });
    }

    const result = await TimesheetService.managerApproveRejectTimesheet(
      timesheetId,
      action,
      currentUser,
      reason
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // 🔔 Trigger automatic notification
    try {
      const ts = await Timesheet.findById(timesheetId).populate('user_id', '_id').lean();
      const recipientId = ts?.user_id?._id?.toString() || ts?.user_id?.toString();
      if (recipientId) {
        if (action === 'approve') {
          await NotificationService.notifyTimesheetApproval(recipientId, timesheetId, 'manager');
        } else {
          await NotificationService.notifyTimesheetRejection(recipientId, timesheetId, 'manager', reason || 'No reason provided');
        }
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    res.json({
      success: true,
      message: `Timesheet ${action}ed successfully`
    });
  });

  /**
   * Management approve/reject timesheet
   */
  static managementApproveRejectTimesheet = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { timesheetId } = req.params;
    const { action, reason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "approve" or "reject"'
      });
    }

    const result = await TimesheetService.managementApproveRejectTimesheet(
      timesheetId,
      action,
      currentUser,
      reason
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // 🔔 Trigger automatic notification
    try {
      const ts = await Timesheet.findById(timesheetId).populate('user_id', '_id').lean();
      const recipientId = ts?.user_id?._id?.toString() || ts?.user_id?.toString();
      if (recipientId) {
        if (action === 'approve') {
          await NotificationService.notifyTimesheetApproval(recipientId, timesheetId, 'Management');
        } else {
          await NotificationService.notifyTimesheetRejection(recipientId, timesheetId, 'Management', reason || 'No reason provided');
        }
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    res.json({
      success: true,
      message: `Timesheet ${action}ed successfully`
    });
  });

  /**
   * Add leave entry
   * POST /api/timesheets/:timesheetId/entries/leave
   */
  static addLeaveEntry = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { timesheetId } = req.params;
    const { date, leaveSession, description } = req.body;

    if (!date || !leaveSession) {
      return res.status(400).json({
        success: false,
        error: 'date and leaveSession are required'
      });
    }

    if (!['morning', 'afternoon', 'full_day'].includes(leaveSession)) {
      return res.status(400).json({
        success: false,
        error: 'leaveSession must be one of: morning, afternoon, full_day'
      });
    }

    const result = await TimesheetService.addLeaveEntry(
      timesheetId,
      date,
      leaveSession,
      currentUser,
      description
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'Leave entry added successfully',
      data: result.entry
    });
  });

  /**
   * Add miscellaneous entry
   * POST /api/timesheets/:timesheetId/entries/miscellaneous
   */
  static addMiscellaneousEntry = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { timesheetId } = req.params;
    const { date, activity, hours } = req.body;

    if (!date || !activity || !hours) {
      return res.status(400).json({
        success: false,
        error: 'date, activity, and hours are required'
      });
    }

    const result = await TimesheetService.addMiscellaneousEntry(
      timesheetId,
      date,
      activity,
      hours,
      currentUser
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'Miscellaneous entry added successfully',
      data: result.entry
    });
  });

  /**
   * Add project entry
   * POST /api/timesheets/:timesheetId/entries/project
   */
  static addProjectEntry = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { timesheetId } = req.params;
    const {
      projectId,
      date,
      hours,
      taskType,
      taskId,
      customTaskDescription,
      description,
      isBillable
    } = req.body;

    if (!projectId || !date || !hours || !taskType) {
      return res.status(400).json({
        success: false,
        error: 'projectId, date, hours, and taskType are required'
      });
    }

    if (!['project_task', 'custom_task'].includes(taskType)) {
      return res.status(400).json({
        success: false,
        error: 'taskType must be one of: project_task, custom_task'
      });
    }

    if (taskType === 'project_task' && !taskId) {
      return res.status(400).json({
        success: false,
        error: 'taskId is required for project_task entries'
      });
    }

    if (taskType === 'custom_task' && !customTaskDescription) {
      return res.status(400).json({
        success: false,
        error: 'customTaskDescription is required for custom_task entries'
      });
    }

    const result = await TimesheetService.addProjectEntry(
      timesheetId,
      projectId,
      date,
      hours,
      taskType,
      currentUser,
      {
        taskId,
        customTaskDescription,
        description,
        isBillable
      }
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'Project entry added successfully',
      data: result.entry
    });
  });

  /**
   * Add training entry
   * POST /api/timesheets/:timesheetId/entries/training
   */
  static addTrainingEntry = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { timesheetId } = req.params;
    const {
      date,
      hours,
      taskType,
      taskId,
      customTaskDescription,
      description
    } = req.body;

    if (!date || !hours || !taskType) {
      return res.status(400).json({
        success: false,
        error: 'date, hours, and taskType are required'
      });
    }

    if (!['project_task', 'custom_task'].includes(taskType)) {
      return res.status(400).json({
        success: false,
        error: 'taskType must be one of: project_task, custom_task'
      });
    }

    if (taskType === 'project_task' && !taskId) {
      return res.status(400).json({
        success: false,
        error: 'taskId is required for project_task entries'
      });
    }

    if (taskType === 'custom_task' && !customTaskDescription) {
      return res.status(400).json({
        success: false,
        error: 'customTaskDescription is required for custom_task entries'
      });
    }

    const result = await TimesheetService.addTrainingEntry(
      timesheetId,
      date,
      hours,
      taskType,
      currentUser,
      {
        taskId,
        customTaskDescription,
        description
      }
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'Training entry added successfully',
      data: result.entry
    });
  });

  /**
   * Add time entry
   */
  static addTimeEntry = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { timesheetId } = req.params;
    const entryData = req.body;

    const result = await TimesheetService.addTimeEntry(timesheetId, entryData, currentUser);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      data: result.entry
    });
  });

  /**
   * Get timesheet dashboard statistics
   */
  static getTimesheetDashboard = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;

    const result = await TimesheetService.getTimesheetDashboard(currentUser);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * Get timesheets by status
   */
  static getTimesheetsByStatus = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;
    const { status } = req.params;

    const result = await TimesheetService.getTimesheetsByStatus(status as any, currentUser);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.timesheets
    });
  });

  /**
   * Escalate timesheet to management
   */
  static escalateTimesheet = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const { timesheetId } = req.params;
    const currentUser = req.user!;

    const result = { error: 'Method not implemented yet' };

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Timesheet escalated successfully'
    });
  });

  /**
   * Mark timesheet as billed
   */
  static markTimesheetBilled = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const { timesheetId } = req.params;
    const currentUser = req.user!;

    const result = { error: 'Method not implemented yet' };

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Timesheet marked as billed'
    });
  });

  /**
   * Get time entries for timesheet
   */
  static getTimeEntries = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const { timesheetId } = req.params;
    const currentUser = req.user!;

    const result = await TimesheetService.getTimeEntries(timesheetId, currentUser);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.entries || []
    });
  });

  /**
   * Delete entire timesheet (draft only)
   */
  static deleteTimesheet = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const { timesheetId } = req.params;
    const currentUser = req.user!;

    // Use TimesheetService for secure timesheet deletion
    const result = await TimesheetService.deleteTimesheet(
      timesheetId,
      currentUser
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to delete timesheet'
      });
    }

    res.json({
      success: true,
      message: 'Timesheet deleted successfully'
    });
  });

  /**
   * Delete timesheet entries
   */
  static deleteTimesheetEntries = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const { timesheetId } = req.params;
    const currentUser = req.user!;

    const result = { error: "Method not implemented yet" };

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Entries deleted successfully'
    });
  });

  /**
   * Update timesheet entries
   */
  static updateTimesheetEntries = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const { timesheetId } = req.params;
    const { entries } = req.body;
    const currentUser = req.user!;

    const result = await TimesheetService.updateTimesheetEntries(timesheetId, entries, currentUser);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.updatedEntries || []
    });
  });

  /**
   * Get timesheet by ID with details
   */
  static getTimesheetById = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const { timesheetId } = req.params;
    const currentUser = req.user!;

    // Get the timesheet to find its owner
    const timesheet = await (require('@/models').Timesheet.findById)(timesheetId).populate('user_id', 'id').exec();
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found'
      });
    }

    // Use the existing getUserTimesheets method with specific timesheet filter
    const result = await TimesheetService.getUserTimesheets(
      currentUser,
      timesheet.user_id._id?.toString() || timesheet.user_id.toString(),
      undefined, // no status filter
      undefined, // no date filter
      1, // limit to 1
      0 // no offset
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    const targetTimesheet = result.timesheets.find(t => t.id === timesheetId);
    if (!targetTimesheet) {
      return res.status(404).json({
        success: false,
        error: 'Timesheet not found or access denied'
      });
    }

    res.json({
      success: true,
      data: targetTimesheet
    });
  });

  /**
   * Get calendar data for user
   */
  static getCalendarData = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const { userId, year, month } = req.params;
    const currentUser = req.user!;

    const result = await TimesheetService.getCalendarData(
      userId,
      parseInt(year),
      parseInt(month),
      currentUser
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.calendarData
    });
  });

  /**
   * Get timesheets for approval
   */
  static getTimesheetsForApproval = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const { approverRole, status, userId, startDate, endDate } = req.query;
    const currentUser = req.user!;

    const result = await TimesheetService.getTimesheetsForApproval(
      currentUser,
      approverRole as string,
      {
        status: status ? (Array.isArray(status) ? status : [status]) as string[] : undefined,
        userId: userId as string,
        dateRange: startDate && endDate ? { start: startDate as string, end: endDate as string } : undefined
      }
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.timesheets
    });
  });

  /**
   * Get deleted timesheets (management and super admin only)
   */
  static getDeletedTimesheets = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user!;

    // Use TimesheetService to get deleted timesheets
    const result = await TimesheetService.getDeletedTimesheets(currentUser);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Deleted timesheets retrieved successfully',
      data: result.timesheets || []
    });
  });

  /**
   * Restore soft deleted timesheet
   */
  static restoreTimesheet = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const { timesheetId } = req.params;
    const currentUser = req.user!;

    // Use TimesheetService for secure timesheet restoration
    const result = await TimesheetService.restoreTimesheet(timesheetId, currentUser);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to restore timesheet'
      });
    }

    res.json({
      success: true,
      message: 'Timesheet restored successfully'
    });
  });

  /**
   * Hard delete timesheet permanently (super admin only)
   */
  static hardDeleteTimesheet = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    const { timesheetId } = req.params;
    const currentUser = req.user!;

    // Only super admin can hard delete
    if (currentUser.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super admin can permanently delete timesheets'
      });
    }

    // Use TimesheetService for secure hard deletion
    const result = await TimesheetService.hardDeleteTimesheet(timesheetId, currentUser);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to hard delete timesheet'
      });
    }

    res.json({
      success: true,
      message: 'Timesheet permanently deleted'
    });
  });

  /**
   * Synchronize holiday entries for timesheet
   */
  static async synchronizeHolidayEntries(req: AuthenticatedRequest, res: Response) {
    try {
      const { timesheetId } = req.params;
      const currentUser = req.user!;

      const result = await TimesheetService.synchronizeHolidayEntries(timesheetId, currentUser);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || 'Failed to synchronize holiday entries'
        });
      }

      res.json({
        success: true,
        message: 'Holiday entries synchronized successfully',
        changes: result.changes
      });
    } catch (error) {
      console.error('Error in synchronizeHolidayEntries:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Test method to verify class structure
   */
  static testMethod = handleAsyncError(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, message: 'Test method works' });
  });
}

export default TimesheetController;
