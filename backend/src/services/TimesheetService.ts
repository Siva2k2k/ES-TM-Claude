// @ts-nocheck - Temporarily disable type checking for Mongoose compatibility issues
import mongoose from 'mongoose';
import {
  Timesheet,
  TimeEntry,
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
  canManageRoleHierarchy,
} from '@/utils/authorization';
import {
  AuthUser,
  validateTimesheetAccess,
  requireManagerRole,
  requireManagementRole
} from '@/utils/auth';
import { AuditLogService } from '@/services/AuditLogService';
import { ValidationUtils } from '@/utils/validation';
import { NotificationService } from '@/services/NotificationService';

const WEEKDAY_MIN_HOURS = 8;
const WEEKDAY_MAX_HOURS = 10;
const WEEKLY_MAX_HOURS = 56;

function normalizeWeekStartDateInput(dateInput: string | Date): Date {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError('Invalid week start date');
  }
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const day = normalized.getDay();
  const diff = normalized.getDate() - day + (day === 0 ? -6 : 1);
  normalized.setDate(diff);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function toISODateString(date: Date): string {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().split('T')[0];
}

function isWeekendDay(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

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

function sanitizeTimeEntryForm(entry: TimeEntryForm): TimeEntryForm {
  const sanitized: TimeEntryForm = { ...entry };
  const entryDate = new Date(entry.date);
  if (!Number.isNaN(entryDate.getTime()) && isWeekendDay(entryDate)) {
    sanitized.is_billable = false;
  }
  return sanitized;
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
   */l
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
        // Lookup project-specific approvals for this timesheet
        {
          $lookup: {
            from: 'timesheetprojectapprovals',
            localField: '_id',
            foreignField: 'timesheet_id',
            as: 'project_approvals',
            pipeline: [
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
                  from: 'users',
                  localField: 'manager_id',
                  foreignField: '_id',
                  as: 'manager',
                  pipeline: [{ $project: { full_name: 1 } }]
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'lead_id',
                  foreignField: '_id',
                  as: 'lead',
                  pipeline: [{ $project: { full_name: 1 } }]
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

        // Map project approvals (if any) to a simple shape
        const projectApprovals = (ts.project_approvals || []).map((pa: any) => ({
          project_id: pa.project_id?.toString(),
          project_name: pa.project?.[0]?.name || undefined,
          manager_id: pa.manager?.[0]?._id?.toString() || pa.manager_id?.toString(),
          manager_name: pa.manager?.[0]?.full_name || undefined,
          manager_status: pa.manager_status,
          manager_rejection_reason: pa.manager_rejection_reason
        }));

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
          project_approvals: projectApprovals,
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
      // Validate inputs
      const userIdError = ValidationUtils.validateObjectId(userId, 'User ID', true);
      if (userIdError) {
        throw new ValidationError(userIdError);
      }

      const dateError = ValidationUtils.validateDate(weekStartDate, 'Week start date', true);
      if (dateError) {
        throw new ValidationError(dateError);
      }

      const normalizedWeekStart = normalizeWeekStartDateInput(weekStartDate);
      const normalizedWeekStartIso = toISODateString(normalizedWeekStart);

      // Validate access permissions
      validateTimesheetAccess(currentUser, userId, 'create');

      // Check if timesheet already exists for this user and week
      const existingTimesheet = await (Timesheet.findOne as any)({
        user_id: new mongoose.Types.ObjectId(userId),
        week_start_date: normalizedWeekStart,
        deleted_at: null
      }).exec();

      if (existingTimesheet) {
        throw new ConflictError(
          `A timesheet already exists for the week starting ${normalizedWeekStartIso}. Status: ${existingTimesheet.status}`
        );
      }

      // Calculate week end date
      const weekStart = new Date(normalizedWeekStart);
      const weekEnd = new Date(normalizedWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(0, 0, 0, 0);

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

      // Audit log: Timesheet created
      await AuditLogService.logEvent(
        'timesheets',
        timesheet._id.toString(),
        'INSERT',
        currentUser.id,
        currentUser.full_name,
        { week_start_date: normalizedWeekStartIso, user_id: userId },
        { created_by: currentUser.id },
        null,
        timesheetData
      );

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

      // Get timesheet
      const timesheet = await (Timesheet.findOne as any)({
        _id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      }).exec();

      if (!timesheet) {
        throw new NotFoundError('Timesheet not found');
      }

      const timesheetOwnerId = timesheet.user_id?.toString?.() ?? String(timesheet.user_id);

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

      let nextStatus: TimesheetStatus = 'submitted';
      if (currentUser.role === 'manager') {
        // Manager submitting own timesheet → goes to management approval directly
        nextStatus = 'management_pending';
      }

      // Update status
      await (Timesheet.findByIdAndUpdate as any)(timesheetId, {
        status: nextStatus,
        submitted_at: new Date(),
        updated_at: new Date()
      }).exec();

      // **Phase 7 Fix**: Create TimesheetProjectApproval records for each project
      // Get all time entries for this timesheet to identify projects
      const entries = await (TimeEntry.find as any)({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      }).lean().exec();

      // Group entries by project
      const projectIds = [...new Set(entries.map((e: any) => e.project_id?.toString()).filter(Boolean))];
      const submissionRecipientIds = new Set<string>();

      if (projectIds.length > 0) {
        const { Project, ProjectMember } = require('@/models/Project');
        const { TimesheetProjectApproval } = require('@/models/TimesheetProjectApproval');

        for (const projectId of projectIds) {
          // Check if approval record already exists
          const existingApproval = await TimesheetProjectApproval.findOne({
            timesheet_id: new mongoose.Types.ObjectId(timesheetId),
            project_id: new mongoose.Types.ObjectId(projectId)
          }).exec();

          if (existingApproval) {
            continue;
          }

          // Get project to find manager
          const project = await Project.findById(projectId).lean().exec();
          if (!project) {
            continue;
          }

          // Find lead for this project
          const leadMember = await ProjectMember.findOne({
            project_id: new mongoose.Types.ObjectId(projectId),
            project_role: 'lead',
            deleted_at: null,
            removed_at: null
          }).lean().exec();

          const managerId =
            project?.primary_manager_id && typeof project.primary_manager_id.toString === 'function'
              ? project.primary_manager_id.toString()
              : project?.primary_manager_id
                ? String(project.primary_manager_id)
                : undefined;

          if (managerId && managerId !== timesheetOwnerId) {
            submissionRecipientIds.add(managerId);
          }

          const leadId = leadMember?.user_id
            ? typeof leadMember.user_id.toString === 'function'
              ? leadMember.user_id.toString()
              : String(leadMember.user_id)
            : undefined;

          if (leadId && leadId !== timesheetOwnerId) {
            submissionRecipientIds.add(leadId);
          }

          // Check if user is a project member
          const userIsMember = await ProjectMember.findOne({
            project_id: new mongoose.Types.ObjectId(projectId),
            user_id: timesheet.user_id,
            deleted_at: null,
            removed_at: null
          }).lean().exec();

          if (!userIsMember) {
          }

          // Calculate hours and entries for this project
          const projectEntries = entries.filter((e: any) => e.project_id?.toString() === projectId);
          const totalHours = projectEntries.reduce((sum: number, e: any) => sum + (e.hours || 0), 0);

          // Create approval record
          await TimesheetProjectApproval.create({
            timesheet_id: new mongoose.Types.ObjectId(timesheetId),
            project_id: new mongoose.Types.ObjectId(projectId),
            lead_id: leadMember ? leadMember.user_id : null,
            lead_status: leadMember ? 'pending' : 'not_required',
            manager_id: project.primary_manager_id,
            manager_status: 'pending',
            entries_count: projectEntries.length,
            total_hours: totalHours,
            user_not_in_project: !userIsMember
          });

        }
      }

      if (submissionRecipientIds.size > 0) {
        try {
          await NotificationService.notifyTimesheetSubmission({
            recipientIds: Array.from(submissionRecipientIds),
            timesheetId,
            submittedById: currentUser.id,
            submittedByName: currentUser.full_name,
            weekStartDate: timesheet.week_start_date,
            totalHours: timesheet.total_hours
          });
        } catch (notificationError) {
          console.error('Failed to send timesheet submission notifications:', notificationError);
        }
      }

      // Audit log: Timesheet submitted
      await AuditLogService.logEvent(
        'timesheets',
        timesheetId,
        'TIMESHEET_SUBMITTED',
        currentUser.id,
        currentUser.full_name,
        { total_hours: timesheet.total_hours },
        { submitted_by: currentUser.id },
        { status: timesheet.status },
        { status: nextStatus, submitted_at: new Date() }
      );

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

      if (timesheet.user_id?.toString?.() === currentUser.id && action === 'approve') {
        throw new TimesheetError('Managers cannot approve their own timesheets');
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

      // Audit log: Manager approval/rejection
      await AuditLogService.logEvent(
        'timesheets',
        timesheetId,
        action === 'approve' ? 'TIMESHEET_APPROVED' : 'TIMESHEET_REJECTED',
        currentUser.id,
        currentUser.full_name,
        {
          action_by: 'manager',
          reason: reason || undefined,
          timesheet_user: timesheet.user_id.toString()
        },
        { approved_by_manager: currentUser.id },
        { status: timesheet.status },
        updateData
      );

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

      // Audit log: Management approval/rejection
      await AuditLogService.logEvent(
        'timesheets',
        timesheetId,
        action === 'approve' ? 'TIMESHEET_VERIFIED' : 'TIMESHEET_REJECTED',
        currentUser.id,
        currentUser.full_name,
        {
          action_by: 'management',
          reason: reason || undefined,
          timesheet_user: timesheet.user_id.toString(),
          action: action === 'approve' ? 'verified and frozen' : 'rejected'
        },
        { verified_by_management: currentUser.id },
        { status: timesheet.status },
        updateData
      );

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

      // Audit log: Time entry created
      await AuditLogService.logEvent(
        'time_entries',
        entry._id.toString(),
        'INSERT',
        currentUser.id,
        currentUser.full_name,
        {
          timesheet_id: timesheetId,
          date: entryData.date,
          hours: entryData.hours,
          entry_type: entryData.entry_type
        },
        { created_for_timesheet: timesheetId },
        null,
        entryInsertData
      );

      // Update timesheet total hours
      await this.updateTimesheetTotalHours(timesheetId);

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

      const entryDateObject = new Date(entryData.date);
      if (!Number.isNaN(entryDateObject.getTime()) && isWeekendDay(entryDateObject)) {
        entryData.is_billable = false;
      }

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

      // Calculate total hours from time entries
      const entries = await (TimeEntry.find as any)({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      }).exec();

      const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

      // Update timesheet
      await (Timesheet.findByIdAndUpdate as any)(timesheetId, {
        total_hours: totalHours,
        updated_at: new Date()
      }).exec();

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

      // Fetch existing entries for this timesheet (will be soft-deleted and replaced)
      const existingEntries = await (TimeEntry.find as any)({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        deleted_at: null
      }).lean().exec();

      const sanitizedEntries = entries.map(sanitizeTimeEntryForm);

      // We will validate the incoming batch against itself (to detect duplicates in the payload)
      // and against any other existing entries that are NOT being replaced (none in this flow since we soft-delete all),
      // so build an in-memory list representing final state: start with entries that would remain (none) then
      // validate the new entries among themselves.

      // Helper: convert an entry to a comparable shape for duplicate checks
      const normalize = (e: any) => ({
        date: new Date(e.date).toISOString().split('T')[0],
        entry_type: e.entry_type,
        project_id: e.project_id ? (e.project_id.toString ? e.project_id.toString() : e.project_id) : undefined,
        task_id: e.task_id ? (e.task_id.toString ? e.task_id.toString() : e.task_id) : undefined,
        custom_task_description: e.custom_task_description ? String(e.custom_task_description).trim() : undefined,
        hours: Number(e.hours) || 0
      });

      const payloadNormalized = sanitizedEntries.map(normalize);

      // Check duplicates within payload
      for (let i = 0; i < payloadNormalized.length; i++) {
        const a = payloadNormalized[i];
        // Business rule: hours must be > 0
        if (a.hours <= 0) {
          throw new ValidationError(`Entry validation failed: Hours must be greater than zero`);
        }

        // Check duplicates for project_task
        if (a.entry_type === 'project_task' && a.project_id && a.task_id) {
          for (let j = 0; j < payloadNormalized.length; j++) {
            if (i === j) continue;
            const b = payloadNormalized[j];
            if (b.date === a.date && b.entry_type === 'project_task' && b.project_id === a.project_id && b.task_id === a.task_id) {
              throw new ValidationError('Entry validation failed: A time entry for this project and task already exists on this date. Please update the existing entry instead.');
            }
          }
        }

        // Check duplicates for custom_task
        if (a.entry_type === 'custom_task' && a.custom_task_description) {
          for (let j = 0; j < payloadNormalized.length; j++) {
            if (i === j) continue;
            const b = payloadNormalized[j];
            if (b.date === a.date && b.entry_type === 'custom_task' && b.custom_task_description === a.custom_task_description) {
              throw new ValidationError('Entry validation failed: A custom task with this description already exists on this date. Please update the existing entry instead.');
            }
          }
        }

        // Check daily hours limit across payload + existingEntries (existingEntries will be deleted, so we only consider payload)
      }

      // Validate daily hours limits for payload grouped by date
      const hoursByDate: Record<string, number> = {};
      payloadNormalized.forEach((p) => {
        hoursByDate[p.date] = (hoursByDate[p.date] || 0) + (p.hours || 0);
      });

      for (const [date, total] of Object.entries(hoursByDate)) {
        if (total > 10) {
          throw new ValidationError(`Entry validation failed: Total hours for ${date} would exceed the maximum limit of 10 hours (${total}h)`);
        }
      }

      // existingEntries already fetched above for validation/audit logging

      // Delete all existing entries for this timesheet (soft delete)
      await (TimeEntry.updateMany as any)(
        { timesheet_id: new mongoose.Types.ObjectId(timesheetId), deleted_at: null },
        { deleted_at: new Date(), updated_at: new Date() }
      ).exec();

      // Audit log: Time entries deleted (bulk update)
      if (existingEntries.length > 0) {
        await AuditLogService.logEvent(
          'time_entries',
          timesheetId,
          'DELETE',
          currentUser.id,
          currentUser.full_name,
          { timesheet_id: timesheetId, entries_deleted: existingEntries.length },
          { bulk_update: true },
          existingEntries,
          null
        );
      }

      // Create new entries
      const entryInsertData = sanitizedEntries.map(entryData => ({
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

      // Audit log: New time entries created (bulk insert)
      if (updatedEntries.length > 0) {
        await AuditLogService.logEvent(
          'time_entries',
          timesheetId,
          'INSERT',
          currentUser.id,
          currentUser.full_name,
          { timesheet_id: timesheetId, entries_created: updatedEntries.length },
          { bulk_update: true },
          null,
          { entries: entryInsertData }
        );
      }

      // Update timesheet total hours
      await this.updateTimesheetTotalHours(timesheetId);

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

      const sanitizedEntries = entries.map(sanitizeTimeEntryForm);

      // Validate each time entry
      for (const entryData of sanitizedEntries) {
        const validation = await this.validateTimeEntry(timesheetId, entryData);
        if (!validation.valid) {
          throw new ValidationError(`Entry validation failed: ${validation.error}`);
        }
      }

      // Create new entries (append to existing ones)
      const entryInsertData = sanitizedEntries.map(entryData => ({
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

      // Validate access permissions
      validateTimesheetAccess(currentUser, userId, 'view');

      // Calculate date range for the month
      const startDate = new Date(year, month - 1, 1); // month is 0-indexed in Date constructor
      const endDate = new Date(year, month, 0); // Last day of the month


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

  /**
   * Soft delete timesheet - recoverable deletion
   */
  static async softDeleteTimesheet(
    timesheetId: string,
    reason: string,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Only super admin and management can delete timesheets
      if (!['super_admin', 'management'].includes(currentUser.role)) {
        throw new AuthorizationError('Only super admin and management can delete timesheets');
      }

      // Get timesheet
      const timesheet = await (Timesheet.findOne as any)({
        _id: timesheetId,
        deleted_at: null
      }).lean().exec();

      if (!timesheet) {
        throw new NotFoundError('Timesheet not found or already deleted');
      }

      // Check if timesheet can be deleted
      const dependencies = await this.canDeleteTimesheet(timesheetId);
      if (dependencies.length > 0) {
        return {
          success: false,
          error: `Cannot delete timesheet. Has dependencies: ${dependencies.join(', ')}`
        };
      }

      // Perform soft delete
      const result = await (Timesheet.updateOne as any)(
        { _id: timesheetId },
        {
          deleted_at: new Date(),
          deleted_by: new mongoose.Types.ObjectId(currentUser.id),
          deleted_reason: reason,
          updated_at: new Date()
        }
      ).exec();

      //Perform Soft delete on Time entries
      await (TimeEntry.updateMany as any)(
        { timesheet_id: timesheetId, deleted_at: null },
        { deleted_at: new Date(), deleted_by: new mongoose.Types.ObjectId(currentUser.id), deleted_reason: reason }
      ).exec();

      if (result.matchedCount === 0) {
        throw new NotFoundError('Timesheet not found');
      }

      // Audit log
      await AuditLogService.logEvent(
        'timesheets',
        timesheetId,
        'TIMESHEET_SOFT_DELETED',
        currentUser.id,
        currentUser.full_name,
        {
          user_id: timesheet.user_id,
          week_start_date: timesheet.week_start_date,
          status: timesheet.status,
          total_hours: timesheet.total_hours,
          reason: reason
        },
        { deleted_by: currentUser.id, delete_type: 'soft' },
        { deleted_at: null },
        { deleted_at: new Date(), deleted_by: currentUser.id, deleted_reason: reason }
      );

      return { success: true };
    } catch (error) {
      console.error('Error in softDeleteTimesheet:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to soft delete timesheet' };
    }
  }

  /**
   * Delete timesheet - allows users to delete their own draft timesheets
   */
  static async deleteTimesheet(
    timesheetId: string,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get timesheet first to check ownership and status
      const timesheet = await (Timesheet.findOne as any)({
        _id: timesheetId,
        deleted_at: null
      }).lean().exec();

      if (!timesheet) {
        throw new NotFoundError('Timesheet not found');
      }

      // Check if user owns the timesheet or has admin privileges
      if (timesheet.user_id.toString() !== currentUser.id && !['super_admin', 'management'].includes(currentUser.role)) {
        throw new AuthorizationError('You can only delete your own timesheets');
      }

      // Only allow deletion of draft timesheets by regular users
      if (timesheet.status !== 'draft' && !['super_admin', 'management'].includes(currentUser.role)) {
        return {
          success: false,
          error: 'Only draft timesheets can be deleted. Submitted timesheets must be handled by management.'
        };
      }

      // Check if timesheet can be deleted (has no dependencies)
      const dependencies = await this.canDeleteTimesheet(timesheetId);
      if (dependencies.length > 0) {
        return {
          success: false,
          error: `Cannot delete timesheet. Has dependencies: ${dependencies.join(', ')}`
        };
      }

      // Delete time entries first
      await (TimeEntry.deleteMany as any)({
        timesheet_id: timesheetId
      }).exec();

      // Delete the timesheet
      await (Timesheet.deleteOne as any)({
        _id: timesheetId
      }).exec();

      // Audit log
      await AuditLogService.logEvent(
        'timesheets',
        timesheetId,
        'TIMESHEET_DELETED',
        currentUser.id,
        currentUser.full_name,
        {
          user_id: timesheet.user_id,
          week_start_date: timesheet.week_start_date,
          status: timesheet.status,
          total_hours: timesheet.total_hours
        },
        { deleted_by: currentUser.id },
        { status: timesheet.status },
        { deleted: true }
      );

      return { success: true };
    } catch (error) {
      console.error('Error in deleteTimesheet:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to delete timesheet' };
    }
  }

  /**
   * Hard delete timesheet - permanent deletion with audit archive
   */
  static async hardDeleteTimesheet(
    timesheetId: string,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Only super admin can permanently delete
      if (currentUser.role !== 'super_admin') {
        throw new AuthorizationError('Only super admin can permanently delete timesheets');
      }

      // Get timesheet
      const timesheet = await (Timesheet.findById as any)(timesheetId).lean().exec();
      if (!timesheet) {
        throw new NotFoundError('Timesheet not found');
      }

      // Must be soft deleted first
      if (!timesheet.deleted_at) {
        return {
          success: false,
          error: 'Timesheet must be soft deleted first before permanent deletion'
        };
      }

      // Archive audit logs
      // @ts-ignore - Mongoose query type compatibility
      const auditLogsResult = await AuditLogService.getAuditLogs(currentUser as any, { tableName: 'timesheets' });
      const auditLogs = auditLogsResult.logs || [];

      // Mark as hard deleted
      const result = await (Timesheet.updateOne as any)(
        { _id: timesheetId },
        {
          is_hard_deleted: true,
          hard_deleted_at: new Date(),
          hard_deleted_by: new mongoose.Types.ObjectId(currentUser.id),
          updated_at: new Date()
        }
      ).exec();

      if (result.matchedCount === 0) {
        throw new NotFoundError('Timesheet not found');
      }

      // Final audit log
      await AuditLogService.logEvent(
        'timesheets',
        timesheetId,
        'TIMESHEET_HARD_DELETED',
        currentUser.id,
        currentUser.full_name,
        {
          user_id: timesheet.user_id,
          week_start_date: timesheet.week_start_date,
          status: timesheet.status,
          total_hours: timesheet.total_hours,
          audit_logs_archived: auditLogs.length,
          original_deleted_at: timesheet.deleted_at,
          original_deleted_by: timesheet.deleted_by,
          original_deleted_reason: timesheet.deleted_reason
        },
        { deleted_by_super_admin: currentUser.id, delete_type: 'hard', permanent: true },
        { is_hard_deleted: false },
        { is_hard_deleted: true, hard_deleted_at: new Date(), hard_deleted_by: currentUser.id }
      );

      return { success: true };
    } catch (error) {
      console.error('Error in hardDeleteTimesheet:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to permanently delete timesheet' };
    }
  }

  /**
   * Restore soft deleted timesheet
   */
  static async restoreTimesheet(
    timesheetId: string,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Only super admin and management can restore
      if (!['super_admin', 'management'].includes(currentUser.role)) {
        throw new AuthorizationError('Only super admin and management can restore timesheets');
      }

      // Get soft deleted timesheet
      const timesheet = await (Timesheet.findOne as any)({
        _id: timesheetId,
        deleted_at: { $exists: true },
        is_hard_deleted: false
      }).lean().exec();

      if (!timesheet) {
        throw new NotFoundError('Timesheet not found or cannot be restored (permanently deleted)');
      }

      // Restore timesheet
      const result = await (Timesheet.updateOne as any)(
        { _id: timesheetId },
        {
          $unset: { deleted_at: '', deleted_by: '', deleted_reason: '' },
          updated_at: new Date()
        }
      ).exec();

      if (result.matchedCount === 0) {
        throw new NotFoundError('Timesheet not found');
      }

      // Audit log
      await AuditLogService.logEvent(
        'timesheets',
        timesheetId,
        'TIMESHEET_RESTORED',
        currentUser.id,
        currentUser.full_name,
        {
          user_id: timesheet.user_id,
          week_start_date: timesheet.week_start_date,
          status: timesheet.status,
          was_deleted_at: timesheet.deleted_at,
          was_deleted_by: timesheet.deleted_by,
          was_deleted_reason: timesheet.deleted_reason
        },
        { restored_by: currentUser.id },
        { deleted_at: timesheet.deleted_at },
        { deleted_at: null }
      );

      return { success: true };
    } catch (error) {
      console.error('Error in restoreTimesheet:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to restore timesheet' };
    }
  }

  /**
   * Get all deleted timesheets (soft deleted only, not hard deleted)
   */
  static async getDeletedTimesheets(currentUser: AuthUser): Promise<{ timesheets: ITimesheet[]; error?: string }> {
    try {
      // Only super admin and management can view deleted timesheets
      if (!['super_admin', 'management'].includes(currentUser.role)) {
        throw new AuthorizationError('Only super admin and management can view deleted timesheets');
      }

      const timesheets = await (Timesheet.find as any)({
        deleted_at: { $exists: true },
        is_hard_deleted: false
      })
        .populate('user_id', 'full_name email')
        .populate('deleted_by', 'full_name')
        .sort({ deleted_at: -1 })
        .lean()
        .exec();

      return { timesheets };
    } catch (error) {
      console.error('Error in getDeletedTimesheets:', error);
      if (error instanceof AuthorizationError) {
        return { timesheets: [], error: error.message };
      }
      return { timesheets: [], error: 'Failed to fetch deleted timesheets' };
    }
  }

  /**
   * Check if timesheet can be deleted - returns list of dependencies
   */
  static async canDeleteTimesheet(timesheetId: string): Promise<string[]> {
    const dependencies: string[] = [];

    try {
      const timesheet = await (Timesheet.findById as any)(timesheetId).lean().exec();
      if (!timesheet) {
        return ['Timesheet not found'];
      }

      // Check if timesheet is billed
      if (timesheet.status === 'billed') {
        dependencies.push('Timesheet is already billed');
      }

      // Check if timesheet is frozen
      if (timesheet.is_frozen) {
        dependencies.push('Timesheet is frozen');
      }

      // Check if linked to billing snapshot
      if (timesheet.billing_snapshot_id) {
        dependencies.push('Linked to billing snapshot');
      }

      return dependencies;
    } catch (error) {
      console.error('Error checking timesheet dependencies:', error);
      return ['Error checking dependencies'];
    }
  }

}

export default TimesheetService;
