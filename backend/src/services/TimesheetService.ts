import mongoose from 'mongoose';
import {
  Timesheet,
  TimeEntry,
  User,
  Project,
  Task,
  ITimesheet,
  ITimeEntry,
  IUser,
  TimesheetStatus,
  EntryType
} from '@/models';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  TimesheetError,
  AuthorizationError
} from '@/utils/errors';
import {
  PermissionValidator,
  requireSuperAdminOrManagement,
  requireManagerOrAbove,
  requireTimesheetOwnershipOrManager,
  canManageRoleHierarchy,
  canTransitionTimesheetStatus
} from '@/utils/authorization';
import {
  AuthUser,
  validateTimesheetAccess,
  requireManagerRole,
  requireManagementRole
} from '@/utils/auth';

export interface TimesheetWithDetails extends ITimesheet {
  user_name: string;
  user_email?: string;
  time_entries: ITimeEntry[];
  can_edit: boolean;
  can_submit: boolean;
  can_approve: boolean;
  can_reject: boolean;
  next_action: string;
  user?: IUser;
  billableHours?: number;
  nonBillableHours?: number;
}

export interface TimeEntryForm {
  project_id?: string;
  task_id?: string;
  date: string;
  hours: number;
  description?: string;
  is_billable: boolean;
  custom_task_description?: string;
  entry_type: EntryType;
}

export interface CalendarData {
  [date: string]: {
    hours: number;
    status: string;
    entries: ITimeEntry[];
  };
}

/**
 * Timesheet Management Service - MongoDB/Mongoose Implementation
 * Converted from Supabase to support Node.js, TypeScript, MongoDB, and Mongoose
 */
export class TimesheetService {

  /**
   * Get all timesheets (Super Admin and Management)
   */
  static async getAllTimesheets(currentUser: AuthUser): Promise<{ timesheets: ITimesheet[]; error?: string }> {
    try {
      // Check permissions
      if (!['super_admin', 'management'].includes(currentUser.role)) {
        throw new AuthorizationError('Only super admin and management can view all timesheets');
      }

      const timesheets = await (Timesheet.find as any)({ deleted_at: null })
        .populate('user_id', 'full_name email role')
        .sort({ week_start_date: -1 })
        .lean()
        .exec();

      return { timesheets };
    } catch (error) {
      console.error('Error fetching all timesheets:', error);
      return {
        timesheets: [],
        error: error instanceof Error ? error.message : 'Failed to fetch timesheets'
      };
    }
  }

  /**
   * Get timesheets by status
   */
  static async getTimesheetsByStatus(
    status: TimesheetStatus,
    currentUser: AuthUser
  ): Promise<{ timesheets: ITimesheet[]; error?: string }> {
    try {
      // Check permissions based on role
      if (!canManageRoleHierarchy(currentUser.role, 'employee')) {
        throw new AuthorizationError('Insufficient permissions to view timesheets by status');
      }

      const timesheets = await (Timesheet.find as any)({
        status,
        deleted_at: null
      })
        .populate('user_id', 'full_name email role')
        .sort({ week_start_date: -1 })
        .lean()
        .exec();

      return { timesheets };
    } catch (error) {
      console.error('Error fetching timesheets by status:', error);
      return {
        timesheets: [],
        error: error instanceof Error ? error.message : 'Failed to fetch timesheets by status'
      };
    }
  }

  /**
   * Get user's timesheets
   */
  static async getUserTimesheets(
    currentUser: AuthUser,
    userId?: string,
    statusFilter?: TimesheetStatus[],
    weekStartFilter?: string,
    limit = 50,
    offset = 0
  ): Promise<{ timesheets: TimesheetWithDetails[]; total: number; error?: string }> {
    try {
      const effectiveUserId = userId || currentUser.id;

      // Validate access permissions
      validateTimesheetAccess(currentUser, effectiveUserId, 'view');

      // Build query
      const query: any = {
        user_id: new mongoose.Types.ObjectId(effectiveUserId),
        deleted_at: null
      };

      if (statusFilter && statusFilter.length > 0) {
        query.status = { $in: statusFilter };
      }

      if (weekStartFilter) {
        query.week_start_date = new Date(weekStartFilter);
      }

      // Execute aggregation to get timesheets with time entries
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'timeentries',
            localField: '_id',
            foreignField: 'timesheet_id',
            as: 'time_entries',
            pipeline: [
              { $match: { deleted_at: null } },
              {
                $lookup: {
                  from: 'projects',
                  localField: 'project_id',
                  foreignField: '_id',
                  as: 'project',
                  pipeline: [{ $project: { name: 1 } }]
                }
              },
              {
                $lookup: {
                  from: 'tasks',
                  localField: 'task_id',
                  foreignField: '_id',
                  as: 'task',
                  pipeline: [{ $project: { name: 1 } }]
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user',
            pipeline: [{ $project: { full_name: 1, email: 1, role: 1 } }]
          }
        },
        { $sort: { week_start_date: -1 } } as any,
        { $skip: offset },
        { $limit: limit }
      ];

      const timesheets = await (Timesheet.aggregate as any)(pipeline).exec();

      // Enhance timesheets with calculated fields
      const enhancedTimesheets: TimesheetWithDetails[] = timesheets.map(ts => {
        const entries = ts.time_entries || [];
        const billableHours = entries
          .filter((e: ITimeEntry) => e.is_billable)
          .reduce((sum: number, e: ITimeEntry) => sum + e.hours, 0);
        const nonBillableHours = entries
          .filter((e: ITimeEntry) => !e.is_billable)
          .reduce((sum: number, e: ITimeEntry) => sum + e.hours, 0);

        const user = ts.user[0];

        return {
          ...ts,
          id: ts._id.toString(),
          user_id: ts.user_id.toString(),
          user_name: user?.full_name || 'Unknown User',
          user_email: user?.email,
          time_entries: entries,
          user: user,
          billableHours,
          nonBillableHours,
          can_edit: ['draft', 'manager_rejected', 'management_rejected'].includes(ts.status),
          can_submit: ts.status === 'draft' && ts.total_hours > 0,
          can_approve: false, // Determined by role in component
          can_reject: false, // Determined by role in component
          next_action: this.getNextAction(ts.status, currentUser, ts.user_id.toString())
        };
      });

      return {
        timesheets: enhancedTimesheets,
        total: enhancedTimesheets.length
      };
    } catch (error) {
      console.error('Error in getUserTimesheets:', error);
      return {
        timesheets: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch user timesheets'
      };
    }
  }

  /**
   * Create new timesheet
   */
  static async createTimesheet(
    userId: string,
    weekStartDate: string,
    currentUser: AuthUser
  ): Promise<{ timesheet?: ITimesheet; error?: string }> {
    try {
      console.log('TimesheetService.createTimesheet called with:', { userId, weekStartDate });

      // Validate access permissions
      validateTimesheetAccess(currentUser, userId, 'create');

      // Check if timesheet already exists for this user and week
      const existingTimesheet = await (Timesheet.findOne as any)({
        user_id: new mongoose.Types.ObjectId(userId),
        week_start_date: new Date(weekStartDate),
        deleted_at: null
      }).exec();

      if (existingTimesheet) {
        throw new ConflictError(
          `A timesheet already exists for the week starting ${weekStartDate}. Status: ${existingTimesheet.status}`
        );
      }

      // Calculate week end date
      const weekStart = new Date(weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Create new timesheet
      const timesheetData = {
        user_id: new mongoose.Types.ObjectId(userId),
        week_start_date: weekStart,
        week_end_date: weekEnd,
        total_hours: 0,
        status: 'draft' as TimesheetStatus,
        is_verified: false,
        is_frozen: false
      };

      const timesheet = await (Timesheet.create as any)(timesheetData);

      console.log('Timesheet created successfully:', timesheet);
      return { timesheet };
    } catch (error) {
      console.error('Error in createTimesheet:', error);

      if (error instanceof ConflictError) {
        return { error: error.message };
      }

      return { error: error instanceof Error ? error.message : 'Failed to create timesheet' };
    }
  }

  /**
   * Get timesheet for specific user and week
   */
  static async getTimesheetByUserAndWeek(
    userId: string,
    weekStartDate: string,
    currentUser: AuthUser
  ): Promise<{ timesheet?: TimesheetWithDetails; error?: string }> {
    try {
      // Validate access permissions
      validateTimesheetAccess(currentUser, userId, 'view');

      const pipeline = [
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(userId),
            week_start_date: new Date(weekStartDate),
            deleted_at: null
          }
        },
        {
          $lookup: {
            from: 'timeentries',
            localField: '_id',
            foreignField: 'timesheet_id',
            as: 'time_entries',
            pipeline: [
              { $match: { deleted_at: null } },
              { $sort: { date: 1 } }
            ]
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user',
            pipeline: [{ $project: { full_name: 1, email: 1, role: 1 } }]
          }
        }
      ];

      const results = await (Timesheet.aggregate as any)(pipeline).exec();
      const timesheet = results[0];

      if (!timesheet) {
        return { timesheet: undefined };
      }

      // Calculate billable/non-billable hours
      const entries = timesheet.time_entries || [];
      const billableHours = entries
        .filter((e: ITimeEntry) => e.is_billable)
        .reduce((sum: number, e: ITimeEntry) => sum + e.hours, 0);
      const nonBillableHours = entries
        .filter((e: ITimeEntry) => !e.is_billable)
        .reduce((sum: number, e: ITimeEntry) => sum + e.hours, 0);

      const user = timesheet.user[0];
      const enhancedTimesheet: TimesheetWithDetails = {
        ...timesheet,
        id: timesheet._id.toString(),
        user_id: timesheet.user_id.toString(),
        user_name: user?.full_name || 'Unknown User',
        user_email: user?.email,
        time_entries: entries,
        user: user,
        billableHours,
        nonBillableHours,
        can_edit: ['draft', 'manager_rejected', 'management_rejected'].includes(timesheet.status),
        can_submit: timesheet.status === 'draft' && timesheet.total_hours > 0,
        can_approve: false,
        can_reject: false,
        next_action: this.getNextAction(timesheet.status, currentUser, timesheet.user_id.toString())
      };

      return { timesheet: enhancedTimesheet };
    } catch (error) {
      console.error('Error in getTimesheetByUserAndWeek:', error);
      return { error: error instanceof Error ? error.message : 'Failed to fetch timesheet' };
    }
  }

  /**
   * Submit timesheet for approval
   */
  static async submitTimesheet(
    timesheetId: string,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('TimesheetService.submitTimesheet called for ID:', timesheetId);

      // Get timesheet
      const timesheet = await (Timesheet.findOne as any)({
        _id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      }).exec();

      if (!timesheet) {
        throw new NotFoundError('Timesheet not found');
      }

      // Validate access permissions
      validateTimesheetAccess(currentUser, timesheet.user_id.toString(), 'edit');

      // Check status
      if (!['draft', 'manager_rejected', 'management_rejected'].includes(timesheet.status)) {
        throw new TimesheetError(`Timesheet cannot be submitted from current status: ${timesheet.status}`);
      }

      // Check if timesheet has entries
      if (timesheet.total_hours === 0) {
        throw new TimesheetError('Cannot submit timesheet with zero hours');
      }

      // Update status
      await (Timesheet.findByIdAndUpdate as any)(timesheetId, {
        status: 'submitted',
        submitted_at: new Date(),
        updated_at: new Date()
      }).exec();

      console.log('Timesheet submitted successfully:', timesheetId);
      return { success: true };
    } catch (error) {
      console.error('Error in submitTimesheet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit timesheet'
      };
    }
  }

  /**
   * Manager approve/reject timesheet
   */
  static async managerApproveRejectTimesheet(
    timesheetId: string,
    action: 'approve' | 'reject',
    currentUser: AuthUser,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagerRole(currentUser);

      const timesheet = await (Timesheet.findOne as any)({
        _id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      }).exec();

      if (!timesheet) {
        throw new NotFoundError('Timesheet not found');
      }

      // Check status
      if (timesheet.status !== 'submitted') {
        throw new TimesheetError(`Timesheet cannot be processed from current status: ${timesheet.status}`);
      }

      let updateData: any;
      if (action === 'approve') {
        updateData = {
          status: 'manager_approved',
          approved_by_manager_id: new mongoose.Types.ObjectId(currentUser.id),
          approved_by_manager_at: new Date(),
          updated_at: new Date()
        };
      } else {
        if (!reason || reason.trim() === '') {
          throw new ValidationError('Rejection reason is required');
        }
        updateData = {
          status: 'manager_rejected',
          manager_rejection_reason: reason,
          manager_rejected_at: new Date(),
          updated_at: new Date()
        };
      }

      await (Timesheet.findByIdAndUpdate as any)(timesheetId, updateData).exec();

      console.log(`Manager ${action}ed timesheet: ${timesheetId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in managerApproveRejectTimesheet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to ${action} timesheet`
      };
    }
  }

  /**
   * Management approve/reject timesheet
   */
  static async managementApproveRejectTimesheet(
    timesheetId: string,
    action: 'approve' | 'reject',
    currentUser: AuthUser,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagementRole(currentUser);

      const timesheet = await (Timesheet.findOne as any)({
        _id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      }).populate('user_id', 'hourly_rate').exec();

      if (!timesheet) {
        throw new NotFoundError('Timesheet not found');
      }

      // Check status
      if (!['manager_approved', 'management_pending'].includes(timesheet.status)) {
        throw new TimesheetError(`Timesheet cannot be processed from current status: ${timesheet.status}`);
      }

      let updateData: any;
      if (action === 'approve') {
        updateData = {
          status: 'frozen',
          approved_by_management_id: new mongoose.Types.ObjectId(currentUser.id),
          approved_by_management_at: new Date(),
          verified_by_id: new mongoose.Types.ObjectId(currentUser.id),
          verified_at: new Date(),
          is_verified: true,
          is_frozen: true,
          updated_at: new Date()
        };
      } else {
        if (!reason || reason.trim() === '') {
          throw new ValidationError('Rejection reason is required');
        }
        updateData = {
          status: 'management_rejected',
          management_rejection_reason: reason,
          management_rejected_at: new Date(),
          updated_at: new Date()
        };
      }

      await (Timesheet.findByIdAndUpdate as any)(timesheetId, updateData).exec();

      console.log(`Management ${action}ed timesheet: ${timesheetId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in managementApproveRejectTimesheet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to ${action} timesheet`
      };
    }
  }



  /**
   * Add time entry to timesheet
   */
  static async addTimeEntry(
    timesheetId: string,
    entryData: TimeEntryForm,
    currentUser: AuthUser
  ): Promise<{ entry?: ITimeEntry; error?: string }> {
    try {
      console.log('TimesheetService.addTimeEntry called with:', { timesheetId, entryData });

      // Get timesheet to validate permissions
      const timesheet = await (Timesheet.findOne as any)({
        _id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      }).exec();

      if (!timesheet) {
        throw new NotFoundError('Timesheet not found');
      }

      // Validate access permissions
      validateTimesheetAccess(currentUser, timesheet.user_id.toString(), 'edit');

      // Validate timesheet status
      if (!['draft', 'manager_rejected', 'management_rejected'].includes(timesheet.status)) {
        throw new TimesheetError('Cannot add entries to timesheet in current status');
      }

      // Validate time entry
      const validation = await this.validateTimeEntry(timesheetId, entryData);
      if (!validation.valid) {
        throw new ValidationError(validation.error!);
      }

      // Create time entry
      const entryInsertData = {
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        project_id: entryData.project_id ? new mongoose.Types.ObjectId(entryData.project_id) : undefined,
        task_id: entryData.task_id ? new mongoose.Types.ObjectId(entryData.task_id) : undefined,
        date: new Date(entryData.date),
        hours: entryData.hours,
        description: entryData.description,
        is_billable: entryData.is_billable,
        custom_task_description: entryData.custom_task_description,
        entry_type: entryData.entry_type
      };

      const entry = await (TimeEntry.create as any)(entryInsertData);

      // Update timesheet total hours
      await this.updateTimesheetTotalHours(timesheetId);

      console.log('Time entry created successfully:', entry);
      return { entry };
    } catch (error) {
      console.error('Error in addTimeEntry:', error);
      return { error: error instanceof Error ? error.message : 'Failed to add time entry' };
    }
  }

  /**
   * Validate time entry for overlaps and business rules
   */
  private static async validateTimeEntry(
    timesheetId: string,
    entryData: TimeEntryForm,
    excludeEntryId?: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Get existing entries for the date
      const query: any = {
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        date: new Date(entryData.date),
        deleted_at: null
      };

      if (excludeEntryId) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeEntryId) };
      }

      const existingEntries = await (TimeEntry.find as any)(query).exec();

      // Check for duplicate project/task combinations
      if (entryData.entry_type === 'project_task' && entryData.project_id && entryData.task_id) {
        const duplicateProjectTask = existingEntries.find(e =>
          e.entry_type === 'project_task' &&
          e.project_id?.toString() === entryData.project_id &&
          e.task_id?.toString() === entryData.task_id
        );

        if (duplicateProjectTask) {
          return {
            valid: false,
            error: 'A time entry for this project and task already exists on this date. Please update the existing entry instead.'
          };
        }
      }

      // Check for duplicate custom tasks
      if (entryData.entry_type === 'custom_task' && entryData.custom_task_description) {
        const duplicateCustomTask = existingEntries.find(e =>
          e.entry_type === 'custom_task' &&
          e.custom_task_description === entryData.custom_task_description
        );

        if (duplicateCustomTask) {
          return {
            valid: false,
            error: 'A custom task with this description already exists on this date. Please update the existing entry instead.'
          };
        }
      }

      // Check daily hours limit (8-10 hours business rule)
      const currentDayHours = existingEntries.reduce((sum, entry) => sum + entry.hours, 0);
      const totalHoursWithNewEntry = currentDayHours + entryData.hours;

      if (totalHoursWithNewEntry > 10) {
        return {
          valid: false,
          error: `Total hours for this date would exceed the maximum limit of 10 hours (current: ${currentDayHours}, adding: ${entryData.hours}, total: ${totalHoursWithNewEntry})`
        };
      }

      if (entryData.hours <= 0) {
        return {
          valid: false,
          error: 'Hours must be greater than zero'
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error in validateTimeEntry:', error);
      return { valid: false, error: 'Failed to validate time entry' };
    }
  }

  /**
   * Update timesheet total hours (called automatically after entry changes)
   */
  private static async updateTimesheetTotalHours(timesheetId: string): Promise<void> {
    try {
      console.log('Updating total hours for timesheet:', timesheetId);

      // Calculate total hours from time entries
      const entries = await (TimeEntry.find as any)({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      }).exec();

      const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
      console.log('Calculated total hours:', totalHours);

      // Update timesheet
      await (Timesheet.findByIdAndUpdate as any)(timesheetId, {
        total_hours: totalHours,
        updated_at: new Date()
      }).exec();

      console.log('Timesheet total hours updated successfully');
    } catch (error) {
      console.error('Error in updateTimesheetTotalHours:', error);
    }
  }

  /**
   * Check if timesheet can be modified
   */
  static canModifyTimesheet(timesheet: ITimesheet): boolean {
    return ['draft', 'manager_rejected', 'management_rejected'].includes(timesheet.status) &&
      !timesheet.is_frozen;
  }

  /**
   * Check if timesheet is frozen
   */
  static isTimesheetFrozen(timesheet: ITimesheet): boolean {
    return timesheet.is_frozen || timesheet.status === 'frozen' || timesheet.status === 'billed';
  }

  /**
   * Check if timesheet is billed
   */
  static isTimesheetBilled(timesheet: ITimesheet): boolean {
    return timesheet.status === 'billed';
  }

  /**
   * Get timesheet dashboard statistics
   */
  static async getTimesheetDashboard(currentUser: AuthUser): Promise<{
    totalTimesheets: number;
    pendingApproval: number;
    pendingManagement: number;
    pendingBilling: number;
    verified: number;
    billed: number;
    totalHours: number;
    averageHoursPerWeek: number;
    completionRate: number;
    error?: string;
  }> {
    try {
      // Get timesheets based on user access level
      let filter: any = { deleted_at: null };

      // Non-management users can only see their own stats
      if (!['super_admin', 'management'].includes(currentUser.role)) {
        filter.user_id = new mongoose.Types.ObjectId(currentUser.id);
      }

      const timesheets = await (Timesheet.find as any)(filter)
        .select('status total_hours is_frozen')
        .lean()
        .exec();

      if (!timesheets) {
        return {
          totalTimesheets: 0,
          pendingApproval: 0,
          pendingManagement: 0,
          pendingBilling: 0,
          verified: 0,
          billed: 0,
          totalHours: 0,
          averageHoursPerWeek: 0,
          completionRate: 0
        };
      }

      const totalTimesheets = timesheets.length;
      const pendingApproval = timesheets.filter((ts: any) => ts.status === 'submitted').length;
      const pendingManagement = timesheets.filter((ts: any) => ts.status === 'management_pending').length;
      const pendingBilling = timesheets.filter((ts: any) => ts.status === 'frozen').length;
      const verified = timesheets.filter((ts: any) => ts.status === 'frozen').length;
      const billed = timesheets.filter((ts: any) => ts.status === 'billed').length;
      const totalHours = timesheets.reduce((sum: number, ts: any) => sum + (ts.total_hours || 0), 0);

      return {
        totalTimesheets,
        pendingApproval,
        pendingManagement,
        pendingBilling,
        verified,
        billed,
        totalHours,
        averageHoursPerWeek: totalHours / Math.max(totalTimesheets, 1),
        completionRate: (verified / Math.max(totalTimesheets, 1)) * 100
      };
    } catch (error) {
      console.error('Error in getTimesheetDashboard:', error);
      return {
        totalTimesheets: 0,
        pendingApproval: 0,
        pendingManagement: 0,
        pendingBilling: 0,
        verified: 0,
        billed: 0,
        totalHours: 0,
        averageHoursPerWeek: 0,
        completionRate: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      };
    }
  }

  /**
   * Update timesheet entries (bulk replace)
   */
  static async updateTimesheetEntries(
    timesheetId: string,
    entries: TimeEntryForm[],
    currentUser: AuthUser
  ): Promise<{ updatedEntries?: ITimeEntry[]; error?: string }> {
    try {
      console.log('TimesheetService.updateTimesheetEntries called with:', { timesheetId, entryCount: entries.length });

      // Get timesheet to validate permissions
      const timesheet = await (Timesheet.findOne as any)({
        _id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      }).exec();

      if (!timesheet) {
        throw new NotFoundError('Timesheet not found');
      }

      // Validate access permissions
      validateTimesheetAccess(currentUser, timesheet.user_id.toString(), 'edit');

      // Validate timesheet status
      if (!['draft', 'manager_rejected', 'management_rejected'].includes(timesheet.status)) {
        throw new TimesheetError('Cannot update entries for timesheet in current status');
      }

      // Validate each time entry
      for (const entryData of entries) {
        const validation = await this.validateTimeEntry(timesheetId, entryData);
        if (!validation.valid) {
          throw new ValidationError(`Entry validation failed: ${validation.error}`);
        }
      }

      // Delete all existing entries for this timesheet
      await (TimeEntry.deleteMany as any)({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId)
      });

      // Create new entries
      const entryInsertData = entries.map(entryData => ({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        project_id: entryData.project_id ? new mongoose.Types.ObjectId(entryData.project_id) : undefined,
        task_id: entryData.task_id ? new mongoose.Types.ObjectId(entryData.task_id) : undefined,
        date: new Date(entryData.date),
        hours: entryData.hours,
        description: entryData.description,
        is_billable: entryData.is_billable,
        custom_task_description: entryData.custom_task_description,
        entry_type: entryData.entry_type,
        created_at: new Date(),
        updated_at: new Date()
      }));

      const updatedEntries = await (TimeEntry.insertMany as any)(entryInsertData);

      // Update timesheet total hours
      await this.updateTimesheetTotalHours(timesheetId);

      console.log('Timesheet entries updated successfully:', { count: updatedEntries.length });
      return { updatedEntries };
    } catch (error) {
      console.error('Error in updateTimesheetEntries:', error);
      return { error: error instanceof Error ? error.message : 'Failed to update timesheet entries' };
    }
  }

  /**
   * Get time entries for a timesheet
   */
  static async getTimeEntries(
    timesheetId: string,
    currentUser: AuthUser
  ): Promise<{ entries?: ITimeEntry[]; error?: string }> {
    try {
      console.log('TimesheetService.getTimeEntries called with:', { timesheetId });

      // Get timesheet to validate permissions
      const timesheet = await (Timesheet.findOne as any)({
        _id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      }).exec();

      if (!timesheet) {
        throw new NotFoundError('Timesheet not found');
      }

      // Validate access permissions
      validateTimesheetAccess(currentUser, timesheet.user_id.toString(), 'view');

      // Get time entries for this timesheet
      const entries = await (TimeEntry.find as any)({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId)
      })
        .populate('project_id', 'name')
        .populate('task_id', 'name description')
        .sort({ date: 1, created_at: 1 })
        .exec();

      console.log('Time entries retrieved successfully:', { count: entries.length });
      return { entries };
    } catch (error) {
      console.error('Error in getTimeEntries:', error);
      return { error: error instanceof Error ? error.message : 'Failed to get time entries' };
    }
  }

  /**
   * Add multiple time entries at once
   */
  static async addMultipleEntries(
    timesheetId: string,
    entries: TimeEntryForm[],
    currentUser: AuthUser
  ): Promise<{ updatedEntries?: ITimeEntry[]; error?: string }> {
    try {
      console.log('TimesheetService.addMultipleEntries called with:', { timesheetId, entryCount: entries.length });

      // Get timesheet to validate permissions
      const timesheet = await (Timesheet.findOne as any)({
        _id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      }).exec();

      if (!timesheet) {
        throw new NotFoundError('Timesheet not found');
      }

      // Validate access permissions
      validateTimesheetAccess(currentUser, timesheet.user_id.toString(), 'edit');

      // Validate timesheet status
      if (!['draft', 'manager_rejected', 'management_rejected'].includes(timesheet.status)) {
        throw new TimesheetError('Cannot add entries to timesheet in current status');
      }

      // Validate each time entry
      for (const entryData of entries) {
        const validation = await this.validateTimeEntry(timesheetId, entryData);
        if (!validation.valid) {
          throw new ValidationError(`Entry validation failed: ${validation.error}`);
        }
      }

      // Create new entries (append to existing ones)
      const entryInsertData = entries.map(entryData => ({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        project_id: entryData.project_id ? new mongoose.Types.ObjectId(entryData.project_id) : undefined,
        task_id: entryData.task_id ? new mongoose.Types.ObjectId(entryData.task_id) : undefined,
        date: new Date(entryData.date),
        hours: entryData.hours,
        description: entryData.description,
        is_billable: entryData.is_billable,
        custom_task_description: entryData.custom_task_description,
        entry_type: entryData.entry_type,
        created_at: new Date(),
        updated_at: new Date()
      }));

      const addedEntries = await (TimeEntry.insertMany as any)(entryInsertData);

      // Update timesheet total hours
      await this.updateTimesheetTotalHours(timesheetId);

      console.log('Multiple entries added successfully:', { count: addedEntries.length });
      return { updatedEntries: addedEntries };
    } catch (error) {
      console.error('Error in addMultipleEntries:', error);
      return { error: error instanceof Error ? error.message : 'Failed to add multiple entries' };
    }
  }

  /**
   * Get calendar data for a specific user and month
   */
  static async getCalendarData(
    userId: string,
    year: number,
    month: number,
    currentUser: AuthUser
  ): Promise<{ calendarData?: CalendarData; error?: string }> {
    try {
      console.log(`getCalendarData called for user ${userId}, year ${year}, month ${month}`);

      // Validate access permissions
      validateTimesheetAccess(currentUser, userId, 'view');

      // Calculate date range for the month
      const startDate = new Date(year, month - 1, 1); // month is 0-indexed in Date constructor
      const endDate = new Date(year, month, 0); // Last day of the month

      console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Aggregation pipeline to get time entries grouped by date
      const pipeline = [
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(userId),
            week_start_date: { $gte: startDate, $lte: endDate },
            deleted_at: null
          }
        },
        {
          $lookup: {
            from: 'timeentries',
            localField: '_id',
            foreignField: 'timesheet_id',
            as: 'time_entries',
            pipeline: [
              {
                $match: {
                  deleted_at: null,
                  date: { $gte: startDate, $lte: endDate }
                }
              },
              {
                $lookup: {
                  from: 'projects',
                  localField: 'project_id',
                  foreignField: '_id',
                  as: 'project',
                  pipeline: [{ $project: { name: 1 } }]
                }
              },
              {
                $lookup: {
                  from: 'tasks',
                  localField: 'task_id',
                  foreignField: '_id',
                  as: 'task',
                  pipeline: [{ $project: { name: 1 } }]
                }
              }
            ]
          }
        }
      ];

      const timesheets = await (Timesheet.aggregate as any)(pipeline).exec();

      // Build calendar data structure
      const calendarData: CalendarData = {};

      timesheets.forEach((timesheet: any) => {
        const entries = timesheet.time_entries || [];

        entries.forEach((entry: any) => {
          const dateKey = entry.date.toISOString().split('T')[0]; // YYYY-MM-DD format

          if (!calendarData[dateKey]) {
            calendarData[dateKey] = {
              hours: 0,
              status: timesheet.status || 'draft',
              entries: []
            };
          }

          calendarData[dateKey].hours += entry.hours;
          calendarData[dateKey].entries.push({
            id: entry._id.toString(),
            timesheet_id: entry.timesheet_id.toString(),
            project_id: entry.project_id?.toString(),
            task_id: entry.task_id?.toString(),
            date: entry.date,
            hours: entry.hours,
            description: entry.description,
            is_billable: entry.is_billable,
            custom_task_description: entry.custom_task_description,
            entry_type: entry.entry_type,
            created_at: entry.created_at,
            updated_at: entry.updated_at,
            // Additional populated fields (not part of ITimeEntry interface)
            project: entry.project?.[0],
            task: entry.task?.[0]
          } as any);
        });
      });

      console.log(`Calendar data processed: ${Object.keys(calendarData).length} days with data`);
      return { calendarData };
    } catch (error) {
      console.error('Error in getCalendarData:', error);
      return { error: error instanceof Error ? error.message : 'Failed to fetch calendar data' };
    }
  }

  /**
   * Get timesheets for approval (Manager/Management view)
   */
  static async getTimesheetsForApproval(
    currentUser: AuthUser,
    approverRole: string,
    filters?: {
      status?: string[];
      userId?: string;
      dateRange?: { start: string; end: string };
    }
  ): Promise<{ timesheets: TimesheetWithDetails[]; error?: string }> {
    try {
      // Check permissions
      if (!['manager', 'management', 'super_admin', 'lead'].includes(currentUser.role)) {
        throw new AuthorizationError('Access denied: Insufficient permissions to view timesheets for approval');
      }

      // Build query based on approver role
      let query: any = { deleted_at: null };

      // Status filters based on approver role
      if (approverRole === 'manager' || approverRole === 'lead') {
        query.status = { $in: ['submitted'] }; // Managers see submitted timesheets
      } else if (approverRole === 'management') {
        query.status = { $in: ['manager_approved', 'management_pending'] }; // Management sees manager-approved timesheets
      } else {
        // Default: show timesheets that need approval
        query.status = { $in: ['submitted', 'manager_approved', 'management_pending'] };
      }

      // Apply additional filters if provided
      if (filters?.status && filters.status.length > 0) {
        query.status = { $in: filters.status };
      }

      if (filters?.userId) {
        query.user_id = new mongoose.Types.ObjectId(filters.userId);
      }

      if (filters?.dateRange) {
        query.week_start_date = {
          $gte: new Date(filters.dateRange.start),
          $lte: new Date(filters.dateRange.end)
        };
      }

      // Execute aggregation to get timesheets with time entries and user details
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'timeentries',
            localField: '_id',
            foreignField: 'timesheet_id',
            as: 'time_entries',
            pipeline: [
              { $match: { deleted_at: null } }
            ]
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user',
            pipeline: [{ $project: { full_name: 1, email: 1, role: 1 } }]
          }
        },
        { $sort: { week_start_date: -1, created_at: -1 } } as any
      ];

      const timesheets = await (Timesheet.aggregate as any)(pipeline).exec();

      // Enhance timesheets with calculated fields
      const enhancedTimesheets: TimesheetWithDetails[] = timesheets.map(ts => {
        const entries = ts.time_entries || [];
        const billableHours = entries
          .filter((e: ITimeEntry) => e.is_billable)
          .reduce((sum: number, e: ITimeEntry) => sum + e.hours, 0);
        const nonBillableHours = entries
          .filter((e: ITimeEntry) => !e.is_billable)
          .reduce((sum: number, e: ITimeEntry) => sum + e.hours, 0);

        const user = ts.user[0];

        return {
          ...ts,
          id: ts._id.toString(),
          user_id: ts.user_id.toString(),
          user_name: user?.full_name || 'Unknown User',
          user_email: user?.email,
          time_entries: entries,
          user: user,
          billableHours,
          nonBillableHours,
          can_edit: false, // Approvers typically cannot edit
          can_submit: false,
          can_approve: ['manager', 'management', 'super_admin'].includes(currentUser.role),
          can_reject: ['manager', 'management', 'super_admin'].includes(currentUser.role),
          next_action: this.getNextAction(ts.status, currentUser, ts.user_id.toString())
        };
      });

      return { timesheets: enhancedTimesheets };
    } catch (error) {
      console.error('Error in getTimesheetsForApproval:', error);
      return {
        timesheets: [],
        error: error instanceof Error ? error.message : 'Failed to fetch timesheets for approval'
      };
    }
  }

  /**
   * Get timesheet by ID with details
   */
  static async getTimesheetById(
    timesheetId: string,
    currentUser: AuthUser
  ): Promise<{ timesheet?: TimesheetWithDetails; error?: string }> {
    try {
      console.log('TimesheetService.getTimesheetById called with:', { timesheetId });

      const timesheet = await (Timesheet.findOne as any)({
        _id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      })
        .populate('user_id', 'full_name email')
        .populate('approved_by_manager_id', 'full_name email')
        .populate('approved_by_management_id', 'full_name email')
        .exec();

      if (!timesheet) {
        throw new NotFoundError('Timesheet not found');
      }

      // Validate access permissions
      validateTimesheetAccess(currentUser, timesheet.user_id._id.toString(), 'view');

      // Get time entries for this timesheet
      const timeEntries = await (TimeEntry.find as any)({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId)
      })
        .populate('project_id', 'name')
        .populate('task_id', 'name description')
        .sort({ date: 1, created_at: 1 })
        .exec();

      // Build detailed timesheet object
      const timesheetObj = timesheet.toObject();
      const detailedTimesheet: TimesheetWithDetails = {
        ...timesheetObj,
        user_name: timesheet.user_id.full_name,
        user_email: timesheet.user_id.email,
        time_entries: timeEntries,
        can_edit: this.canEditTimesheet(timesheet.status, currentUser, timesheet.user_id._id.toString()),
        can_submit: this.canSubmitTimesheet(timesheet.status, currentUser, timesheet.user_id._id.toString()),
        can_approve: this.canApproveTimesheet(timesheet.status, currentUser),
        can_reject: this.canRejectTimesheet(timesheet.status, currentUser),
        next_action: this.getNextAction(timesheet.status, currentUser, timesheet.user_id._id.toString())
      };

      console.log('Timesheet retrieved successfully:', timesheetId);
      return { timesheet: detailedTimesheet };
    } catch (error) {
      console.error('Error in getTimesheetById:', error);
      return { error: error instanceof Error ? error.message : 'Failed to get timesheet' };
    }
  }

  // Helper methods for permission checking
  private static canEditTimesheet(status: TimesheetStatus, currentUser: AuthUser, timesheetUserId: string): boolean {
    // Own timesheet in draft or rejected status
    if (currentUser.id === timesheetUserId) {
      return ['draft', 'manager_rejected', 'management_rejected'].includes(status);
    }
    // Managers can edit team member timesheets in certain statuses
    if (['manager', 'management', 'super_admin'].includes(currentUser.role)) {
      return ['draft', 'manager_rejected'].includes(status);
    }
    return false;
  }

  private static canSubmitTimesheet(status: TimesheetStatus, currentUser: AuthUser, timesheetUserId: string): boolean {
    return currentUser.id === timesheetUserId && status === 'draft';
  }

  private static canApproveTimesheet(status: TimesheetStatus, currentUser: AuthUser): boolean {
    if (currentUser.role === 'manager' && status === 'submitted') return true;
    if (['management', 'super_admin'].includes(currentUser.role) && status === 'manager_approved') return true;
    return false;
  }

  private static canRejectTimesheet(status: TimesheetStatus, currentUser: AuthUser): boolean {
    if (currentUser.role === 'manager' && status === 'submitted') return true;
    if (['management', 'super_admin'].includes(currentUser.role) && ['submitted', 'manager_approved'].includes(status)) return true;
    return false;
  }

  private static getNextAction(status: TimesheetStatus, currentUser: AuthUser, timesheetUserId: string): string {
    switch (status) {
      case 'draft':
        return currentUser.id === timesheetUserId ? 'Submit for approval' : 'Waiting for employee to submit';
      case 'submitted':
        return currentUser.role === 'manager' ? 'Manager approval required' : 'Waiting for manager approval';
      case 'manager_approved':
        return ['management', 'super_admin'].includes(currentUser.role) ? 'Management approval required' : 'Waiting for management approval';
      case 'manager_rejected':
        return currentUser.id === timesheetUserId ? 'Address feedback and resubmit' : 'Waiting for employee to resubmit';
      case 'management_rejected':
        return currentUser.id === timesheetUserId ? 'Address feedback and resubmit' : 'Waiting for employee to resubmit';
      case 'frozen':
        return 'Ready for billing';
      case 'billed':
        return 'Completed';
      default:
        return 'Unknown status';
    }
  }

}

export default TimesheetService;
