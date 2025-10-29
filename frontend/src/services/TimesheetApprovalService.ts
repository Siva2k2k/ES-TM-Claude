import type { Timesheet, TimeEntry, TimesheetStatus, UserRole, TimesheetWithDetails } from '../types';
import type { TimeEntryInput, BulkTimeEntry } from '../types/timesheetApprovals';
import { TimesheetService } from './TimesheetService';
import { backendApi } from '../lib/backendApi';



export class TimesheetApprovalService {
  
  // Get timesheet status flow based on user role and current status
  static getStatusFlow(currentStatus: TimesheetStatus, userRole: UserRole): {
    canEdit: boolean;
    canSubmit: boolean;
    canApprove: boolean;
    canReject: boolean;
    canVerify: boolean;
    nextAction: string;
  } {
    const permissions = {
      canEdit: false,
      canSubmit: false,
      canApprove: false,
      canReject: false,
      canVerify: false,
      nextAction: ''
    };

    switch (currentStatus) {
      case 'draft':
        if (['employee', 'lead', 'manager'].includes(userRole)) {
          permissions.canEdit = true;
          permissions.canSubmit = true;
          permissions.nextAction = 'Submit for approval';
        }
        break;

      case 'submitted':
        if (userRole === 'manager') {
          permissions.canApprove = true;
          permissions.canReject = true;
          permissions.nextAction = 'Awaiting manager approval';
        } else if (userRole === 'lead') {
          permissions.canApprove = true;
          permissions.canReject = true;
          permissions.nextAction = 'Lead review in progress';
        }
        break;

      case 'manager_approved':
        if (userRole === 'manager') {
          permissions.canApprove = true;
          permissions.canReject = true;
          permissions.nextAction = 'Finalize timesheet or return for fixes';
        } else if (userRole === 'management') {
          permissions.canApprove = true;
          permissions.canReject = true;
          permissions.nextAction = 'Awaiting final approval';
        } else {
          permissions.nextAction = 'Awaiting manager finalization';
        }
        break;

      case 'management_pending':
        if (userRole === 'management') {
          permissions.canApprove = true;
          permissions.canReject = true;
          permissions.nextAction = 'Awaiting management approval';
        } else {
          permissions.nextAction = 'Pending management approval';
        }
        break;

      case 'manager_rejected':
        if (['employee', 'lead', 'manager'].includes(userRole)) {
          permissions.canEdit = true;
          permissions.canSubmit = true;
          permissions.nextAction = 'Rejected - needs revision';
        }
        break;

      case 'management_rejected':
        if (userRole === 'manager') {
          permissions.canApprove = true;
          permissions.canReject = true;
          permissions.nextAction = 'Rejected by management - needs manager review';
        } else if (['employee', 'lead'].includes(userRole)) {
          permissions.canEdit = true;
          permissions.canSubmit = true;
          permissions.nextAction = 'Rejected by management - needs revision';
        }
        break;

      case 'frozen':
        permissions.nextAction = 'Approved & Frozen - included in billing';
        break;
    }

    return permissions;
  }

  // Get user's timesheets with filtering
  static async getUserTimesheets(
    userId: string,
    filters?: {
      status?: TimesheetStatus[];
      dateRange?: { start: string; end: string };
      showPriorityFirst?: boolean;
    }
  ): Promise<TimesheetWithDetails[]> {
    try {
      // Use the existing TimesheetService method to get raw timesheet data
      const result = await TimesheetService.getUserTimesheets(userId, filters?.status);
      
      if (result.error) {
        console.error('Error fetching user timesheets:', result.error);
        return [];
      }

      // Get current user to determine their role for permission logic
      try {
        const userResponse = await backendApi.get(`/users/${userId}`);
        if (!userResponse.success) {
          console.error('Error fetching user role:', userResponse.message);
          return [];
        }
        var userData = userResponse.data;
      } catch (error) {
        console.error('Error fetching user role:', error);
        return [];
      }

      const userRole = userData?.role as UserRole || 'employee';

      // Enhance each timesheet with permission logic
      const enhancedTimesheets: TimesheetWithDetails[] = [];
      
      for (const rawTimesheet of result.timesheets) {
        // Use all fields from backend (includes effectiveStatus, project_approvals, editable_project_ids)
        // The backend already calculated partial rejection logic
        const timesheet: Timesheet = {
          ...rawTimesheet, // Keep all backend fields including project_approvals, editable_project_ids
          id: rawTimesheet.id,
          user_id: rawTimesheet.user_id,
          week_start_date: rawTimesheet.week_start_date,
          week_end_date: rawTimesheet.week_end_date,
          status: rawTimesheet.status, // Backend returns effectiveStatus for partial rejections
          total_hours: rawTimesheet.total_hours,
          submitted_at: rawTimesheet.submitted_at,
          approved_by_manager_id: rawTimesheet.approved_by_manager_id,
          approved_by_manager_at: rawTimesheet.approved_by_manager_at,
          manager_rejection_reason: rawTimesheet.manager_rejection_reason,
          manager_rejected_at: rawTimesheet.manager_rejected_at,
          approved_by_management_id: rawTimesheet.approved_by_management_id,
          approved_by_management_at: rawTimesheet.approved_by_management_at,
          management_rejection_reason: rawTimesheet.management_rejection_reason,
          management_rejected_at: rawTimesheet.management_rejected_at,
          verified_by_id: rawTimesheet.verified_by_id,
          is_verified: rawTimesheet.is_verified,
          verified_at: rawTimesheet.verified_at,
          is_frozen: rawTimesheet.is_frozen,
          billing_snapshot_id: rawTimesheet.billing_snapshot_id,
          created_at: rawTimesheet.created_at,
          updated_at: rawTimesheet.updated_at,
          deleted_at: rawTimesheet.deleted_at
        };

        // Get permission logic for this timesheet
        const permissions = this.getStatusFlow(timesheet.status, userRole);

        // Compute billable/non-billable hours and project breakdown if entries present
        const entries = rawTimesheet.time_entries || [];
        const billableHours = typeof rawTimesheet.billableHours === 'number'
          ? rawTimesheet.billableHours
          : entries.filter((e: any) => e.is_billable).reduce((s: number, e: any) => s + (e.hours || 0), 0);
        const nonBillableHours = typeof rawTimesheet.nonBillableHours === 'number'
          ? rawTimesheet.nonBillableHours
          : (timesheet.total_hours || 0) - billableHours;
        const projectBreakdown = Array.isArray(rawTimesheet.projectBreakdown) ? rawTimesheet.projectBreakdown : [];

        // Create enhanced timesheet with permissions and existing time_entries
        // Use backend's can_edit if available (respects partial rejection logic)
        const enhancedTimesheet: TimesheetWithDetails = {
          ...timesheet,
          user_name: rawTimesheet.user_name || '',
          time_entries: entries,
          entries,
          billableHours,
          nonBillableHours,
          projectBreakdown,
          project_approvals: rawTimesheet.project_approvals, // Include project approvals from backend
          editable_project_ids: rawTimesheet.editable_project_ids, // Include editable projects from backend
          can_edit: rawTimesheet.can_edit !== undefined ? rawTimesheet.can_edit : permissions.canEdit, // Prefer backend value
          can_submit: permissions.canSubmit,
          can_approve: permissions.canApprove,
          can_reject: permissions.canReject,
          can_verify: permissions.canVerify,
          next_action: rawTimesheet.next_action || permissions.nextAction
        };

        enhancedTimesheets.push(enhancedTimesheet);
      }
      
      return enhancedTimesheets;
    } catch (error) {
      console.error('Error in TimesheetApprovalService.getUserTimesheets:', error);
      return [];
    }
  }

  // Wrapper used by EmployeeTimesheetPage
  static async getEmployeeTimesheets(userId: string): Promise<any[]> {
    try {
      const response = await backendApi.get(`/timesheets/user?userId=${userId}`);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch employee timesheets:', error);
      return [];
    }
  }

  // Get timesheets for approval (Manager/Management view)
  static async getTimesheetsForApproval(
    approverRole: UserRole,
    _approverId: string,
    filters?: {
      status?: TimesheetStatus[];
      userId?: string;
      dateRange?: { start: string; end: string };
    }
  ): Promise<TimesheetWithDetails[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('approverRole', approverRole);

      if (filters?.status && filters.status.length > 0) {
        filters.status.forEach(s => queryParams.append('status', s));
      }
      if (filters?.userId) {
        queryParams.append('userId', filters.userId);
      }
      if (filters?.dateRange) {
        queryParams.append('startDate', filters.dateRange.start);
        queryParams.append('endDate', filters.dateRange.end);
      }

      const response = await backendApi.get(`/timesheets/for-approval?${queryParams.toString()}`);

      if (response.success && response.data) {
        // Enhance timesheets with calculated fields and permissions
        const enhancedTimesheets: TimesheetWithDetails[] = response.data.map((timesheet: any) => {
          const billableHours = timesheet.billableHours || 0;
          const nonBillableHours = timesheet.nonBillableHours || ((timesheet.total_hours || 0) - billableHours);

          const ownerRole: UserRole | undefined = timesheet.user?.role || timesheet.owner_role;
          const canApproveForLead =
            approverRole === 'lead' &&
            ownerRole === 'employee' &&
            timesheet.status === 'submitted';

          const canApproveForManager =
            approverRole === 'manager' &&
            (timesheet.status === 'submitted' || timesheet.status === 'manager_approved');

          const canApproveForManagement =
            approverRole === 'management' &&
            (timesheet.status === 'management_pending' || timesheet.status === 'manager_approved');

          const canReject =
            (approverRole === 'lead' && ownerRole === 'employee' && timesheet.status === 'submitted') ||
            (approverRole === 'manager' && (timesheet.status === 'submitted' || timesheet.status === 'manager_approved')) ||
            (approverRole === 'management' && (timesheet.status === 'management_pending' || timesheet.status === 'manager_approved'));

          return {
            ...timesheet,
            entries: timesheet.time_entries || [],
            billableHours,
            nonBillableHours,
            can_edit: false,
            can_submit: false,
            can_approve: canApproveForLead || canApproveForManager || canApproveForManagement,
            can_reject: canReject,
            can_verify: approverRole === 'management' && timesheet.status === 'management_pending',
            next_action: this.getNextActionForRole(timesheet.status, approverRole)
          };
        });

        return enhancedTimesheets;
      } else {
        console.error('Error fetching timesheets for approval:', response.message);
        return [];
      }
    } catch (error) {
      console.error('Error in TimesheetApprovalService.getTimesheetsForApproval:', error);
      return [];
    }
  }

  /**
   * Get next action description based on status and role
   */
  private static getNextActionForRole(status: TimesheetStatus, role: UserRole): string {
    if (role === 'lead') {
      switch (status) {
        case 'submitted':
          return 'Review employee timesheet entries';
        case 'manager_approved':
          return 'Awaiting manager finalization';
        default:
          return 'No action required';
      }
    }
    
    if (role === 'manager') {
      switch (status) {
        case 'submitted':
          return 'Ready for your approval';
        case 'manager_approved':
          return 'Finalize or return to employee';
        case 'manager_rejected':
          return 'Previously rejected - awaiting resubmission';
        default:
          return 'No action required';
      }
    }
    
    if (role === 'management') {
      switch (status) {
        case 'management_pending':
          return 'Ready for final approval';
        case 'manager_approved':
          return 'Manager approved - ready for your review';
        default:
          return 'No action required';
      }
    }
    
    return 'No action available';
  }

  // Enhanced timesheet with permissions and user details
  static async enhanceTimesheet(timesheet: Timesheet): Promise<TimesheetWithDetails> {
    try {
      // Get user details from database
      let user = { full_name: 'Unknown User', email: '', role: 'employee' };
      try {
        const userResponse = await backendApi.get(`/users/${timesheet.user_id}`);
        if (userResponse.success && userResponse.data) {
          user = {
            full_name: userResponse.data.full_name || 'Unknown User',
            email: userResponse.data.email || '',
            role: userResponse.data.role || 'employee'
          };
        }
      } catch (userError) {
        console.error('Error fetching user for timesheet:', userError);
      }

      // Get time entries for this timesheet
      const { entries } = await TimesheetService.getTimeEntries(timesheet.id);

      const permissions = this.getStatusFlow(timesheet.status, user.role as UserRole);

      return {
        ...timesheet,
        user_name: user.full_name,
        user_email: user.email,
        time_entries: entries,
        entries,
        can_edit: permissions.canEdit,
        can_submit: permissions.canSubmit,
        can_approve: permissions.canApprove,
        can_reject: permissions.canReject,
        can_verify: permissions.canVerify,
        next_action: permissions.nextAction
      };
    } catch (error) {
      console.error('Error enhancing timesheet:', error);
      const permissions = this.getStatusFlow(timesheet.status, 'employee');

      return {
        ...timesheet,
        user_name: 'Unknown User',
        user_email: '',
        time_entries: [],
        entries: [],
        can_edit: permissions.canEdit,
        can_submit: permissions.canSubmit,
        can_approve: permissions.canApprove,
        can_reject: permissions.canReject,
        can_verify: permissions.canVerify,
        next_action: permissions.nextAction
      };
    }
  }

  // Create new timesheet
  static async createTimesheet(userId: string, weekStartDate: string): Promise<Timesheet | null> {
    try {
      
      const result = await TimesheetService.createTimesheet(userId, weekStartDate);
      
      if (result.error) {
        console.error('Error creating timesheet in TimesheetService:', result.error);
        return null;
      }
      
      return result.timesheet || null;
    } catch (error) {
      console.error('Error in TimesheetApprovalService.createTimesheet:', error);
      return null;
    }
  }

  // Get timesheet for specific user and week
  static async getTimesheetByUserAndWeek(userId: string, weekStartDate: string): Promise<TimesheetWithDetails | null> {
    try {
      const result = await TimesheetService.getTimesheetByUserAndWeek(userId, weekStartDate);
      
      if (result.error) {
        console.error('Error fetching timesheet by user and week:', result.error);
        return null;
      }
      
      return result.timesheet || null;
    } catch (error) {
      console.error('Error in TimesheetApprovalService.getTimesheetByUserAndWeek:', error);
      return null;
    }
  }

  // Add time entry
  static async addTimeEntry(timesheetId: string, entry: TimeEntryInput): Promise<TimeEntry | null> {
    try {
      const result = await TimesheetService.addTimeEntry(timesheetId, {
        project_id: entry.project_id,
        task_id: entry.task_id,
        date: entry.date,
        hours: entry.hours,
        description: entry.description,
        is_billable: entry.is_billable,
        custom_task_description: entry.custom_task_description,
        entry_type: entry.entry_type,
        // Pass through additional fields used for leave/training/misc/holiday
        entry_category: entry.entry_category,
        leave_session: entry.leave_session,
        miscellaneous_activity: entry.miscellaneous_activity,
        project_name: entry.project_name
      });
      
      if (result.error) {
        console.error('Error adding time entry in TimesheetService:', result.error);
        return null;
      }
      
      return result.entry || null;
    } catch (error) {
      console.error('Error in TimesheetApprovalService.addTimeEntry:', error);
      return null;
    }
  }

  // Update timesheet entries (replaces all existing entries)
  static async updateTimesheetEntries(timesheetId: string, entries: TimeEntryInput[]): Promise<boolean> {
    try {
      const result = await TimesheetService.updateTimesheetEntries(
        timesheetId,
        entries.map(entry => ({
            project_id: entry.project_id,
            task_id: entry.task_id,
            date: entry.date,
            hours: entry.hours,
            description: entry.description,
            is_billable: entry.is_billable,
            custom_task_description: entry.custom_task_description,
            entry_type: entry.entry_type,
            // additional metadata
            entry_category: entry.entry_category,
            leave_session: entry.leave_session,
            miscellaneous_activity: entry.miscellaneous_activity,
            project_name: entry.project_name
        }))
      );

      if (result.error) {
        console.error('Error updating timesheet entries:', result.error);
        return false;
      }

      return result.success;
    } catch (error) {
      console.error('Error in TimesheetApprovalService.updateTimesheetEntries:', error);
      return false;
    }
  }

  // Bulk add time entries
  static async addBulkTimeEntries(timesheetId: string, bulkEntry: BulkTimeEntry): Promise<TimeEntry[]> {
    const entries: TimeEntry[] = [];
    
    for (const date of bulkEntry.dates) {
      const entry = await this.addTimeEntry(timesheetId, {
        project_id: bulkEntry.project_id,
        task_id: bulkEntry.task_id,
        date,
        hours: bulkEntry.hours,
        description: bulkEntry.description,
        is_billable: bulkEntry.is_billable,
        custom_task_description: bulkEntry.custom_task_description,
        entry_type: bulkEntry.entry_type
      });
      
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  // Add multiple entries at once (uses TimesheetService bulk insert/update)
  static async addMultipleEntries(timesheetId: string, entries: TimeEntryInput[]): Promise<TimeEntry[] | null> {
    // if (!entries || entries.length === 0) {
    //   return null; 
    // }
    
    try {
      // Reuse updateTimesheetEntries to replace all entries with the provided list
      const result = await TimesheetService.updateTimesheetEntries(
        timesheetId,
        entries.map(e => ({
          project_id: e.project_id,
          task_id: e.task_id,
          date: e.date,
          hours: e.hours,
          description: e.description,
          is_billable: e.is_billable,
          custom_task_description: e.custom_task_description,
          entry_type: e.entry_type,
          entry_category: e.entry_category,
          leave_session: e.leave_session,
          miscellaneous_activity: e.miscellaneous_activity,
          project_name: e.project_name
        }))
      );

      if (!result.success) {
        console.error('Error adding multiple entries:', result.error);
        return null;
      }

      return result.updatedEntries || [];
    } catch (error) {
      console.error('Error in TimesheetApprovalService.addMultipleEntries:', error);
      return null;
    }
  }

  // Submit timesheet
  static async submitTimesheet(timesheetId: string, userId: string): Promise<boolean> {
    try {
      
      // Skip ALL validation and try direct submission to test if writes work
      
      const result = await TimesheetService.submitTimesheet(timesheetId);
      
      
      if (result.success) {
      } else {
        console.error('❌ Timesheet submission failed:', result.error);
      }
      
      return result.success;
    } catch (error) {
      console.error('💥 Error in TimesheetApprovalService.submitTimesheet:', error);
      return false;
    }
  }

  // Manager approve/reject
  static async managerAction(
    timesheetId: string, 
    _managerId: string, 
    action: 'approve' | 'reject', 
    options: {
      reason?: string;
      approverRole?: 'lead' | 'manager';
      finalize?: boolean;
      notify?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const payload = {
        notify: true,
        finalize: false,
        approverRole: 'manager' as 'lead' | 'manager',
        ...options
      };

      const result = await TimesheetService.managerApproveRejectTimesheet(
        timesheetId,
        action,
        payload
      );
      
      return result.success;
    } catch (error) {
      console.error('Error in TimesheetApprovalService.managerAction:', error);
      return false;
    }
  }

  // Management approve/reject
  static async managementAction(
    timesheetId: string, 
    _managementId: string, 
    action: 'approve' | 'reject', 
    options: {
      reason?: string;
      approverRole?: 'management' | 'manager';
      finalize?: boolean;
      notify?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const payload = {
        notify: true,
        finalize: action === 'approve',
        approverRole: 'management' as 'management' | 'manager',
        ...options
      };

      const result = await TimesheetService.managementApproveRejectTimesheet(
        timesheetId,
        action,
        payload
      );
      
      return result.success;
    } catch (error) {
      console.error('Error in TimesheetApprovalService.managementAction:', error);
      return false;
    }
  }

  // Get calendar view data
  static async getCalendarData(userId: string, month: string, year: string): Promise<{
    [date: string]: {
      status: TimesheetStatus;
      hours: number;
      entries: TimeEntry[];
    }
  }> {
    try {
      
      // Use the existing TimesheetService method that's already integrated
      const result = await TimesheetService.getCalendarData(userId, parseInt(year), parseInt(month));
      
      if (result.error) {
        console.error('❌ Error fetching calendar data:', result.error);
        return {};
      }
      
      
      // Transform the data to ensure proper typing
      const transformedData: { [date: string]: { status: TimesheetStatus; hours: number; entries: TimeEntry[]; } } = {};
      
      if (result.calendarData) {
        Object.keys(result.calendarData).forEach(date => {
          const dayData = result.calendarData[date];
          transformedData[date] = {
            status: dayData.status as TimesheetStatus,
            hours: dayData.hours,
            entries: dayData.entries
          };
        });
      }
      
      
      return transformedData;
    } catch (error) {
      console.error('❌ Error in TimesheetApprovalService.getCalendarData:', error);
      return {};
    }
  }

  // Weekly billing snapshot (Management only)
  static async createWeeklyBillingSnapshot(_managementId: string, weekStartDate: string): Promise<boolean> {
    try {
      const response = await backendApi.post(`/api/v1/billing/snapshots/weekly`, {
        weekStartDate
      });

      return response.success || false;
    } catch (error) {
      console.error('Error in createWeeklyBillingSnapshot:', error);
      return false;
    }
  }
}
