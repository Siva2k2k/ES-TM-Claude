import { backendApi } from '../lib/backendApi';
import type { Timesheet, TimeEntry, TimesheetStatus, TimesheetWithDetails } from '../types';

/**
 * Timesheet Management Service - Backend API Integration
 * All timesheet operations now use MongoDB backend
 */
export class TimesheetService {
  /**
   * Get all timesheets (Super Admin and Management) - Using Backend API
   */
  static async getAllTimesheets(): Promise<{ timesheets: Timesheet[]; error?: string }> {
    try {
      const response = await backendApi.getAllTimesheets();
      return { timesheets: response.data || [] };
    } catch (error: any) {
      console.error('Error fetching all timesheets:', error);
      return { timesheets: [], error: error.message };
    }
  }

  /**
   * Get timesheets by status
   */
  static async getTimesheetsByStatus(status: TimesheetStatus): Promise<{ timesheets: Timesheet[]; error?: string }> {
    try {
      const response = await backendApi.get(`/timesheets/status/${status}`);

      if (response.success && response.data) {
        return { timesheets: response.data as Timesheet[] };
      } else {
        return { timesheets: [], error: response.message || 'Failed to fetch timesheets by status' };
      }
    } catch (error: any) {
      console.error('Error in getTimesheetsByStatus:', error);
      return { timesheets: [], error: error.message || 'Failed to fetch timesheets by status' };
    }
  }

  /**
   * Get user's timesheets - Using Backend API
   */
  static async getUserTimesheets(
    userId?: string,
    statusFilter?: TimesheetStatus[],
    weekStartFilter?: string,
    limit = 50,
    offset = 0
  ): Promise<{ timesheets: TimesheetWithDetails[]; total: number; error?: string }> {
    try {
      const response = await backendApi.getUserTimesheets({
        userId,
        status: statusFilter,
        weekStartDate: weekStartFilter,
        limit,
        offset
      });

      return {
        timesheets: response.data || [],
        total: response.total || 0
      };
    } catch (error: any) {
      console.error('Error fetching user timesheets:', error);
      return { timesheets: [], total: 0, error: error.message };
    }
  }

  /**
   * Create new timesheet - Using Backend API
   */
  static async createTimesheet(userId: string, weekStartDate: string): Promise<{ timesheet?: Timesheet; error?: string }> {
    try {

      const response = await backendApi.createTimesheet({
        userId,
        weekStartDate
      });

      if (response.success) {
        return { timesheet: response.data as Timesheet };
      } else {
        return { error: 'Failed to create timesheet' };
      }
    } catch (error: any) {
      console.error('Error in createTimesheet:', error);
      return { error: error.message };
    }
  }

  /**
   * Get timesheet for specific user and week - Using Backend API
   */
  static async getTimesheetByUserAndWeek(userId: string, weekStartDate: string): Promise<{ timesheet?: TimesheetWithDetails; error?: string }> {
    try {
      const response = await backendApi.getTimesheetByUserAndWeek(userId, weekStartDate);

      if (response.success && response.data) {
        return { timesheet: response.data as TimesheetWithDetails };
      } else {
        return { timesheet: undefined };
      }
    } catch (error: any) {
      console.error('Error fetching timesheet by user and week:', error);
      return { error: error.message };
    }
  }

  /**
   * Submit timesheet for approval using database function
   */
  /**
   * Submit timesheet for approval - Using Backend API
   */
  static async submitTimesheet(timesheetId: string): Promise<{ success: boolean; error?: string }> {
    try {

      const response = await backendApi.submitTimesheet(timesheetId);

      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: 'Failed to submit timesheet' };
      }
    } catch (error: any) {
      console.error('Error in submitTimesheet:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Manager approve/reject timesheet - Using Backend API
   */
  static async managerApproveRejectTimesheet(
    timesheetId: string,
    action: 'approve' | 'reject',
    options: {
      reason?: string;
      approverRole?: 'lead' | 'manager';
      finalize?: boolean;
      notify?: boolean;
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.managerApproveRejectTimesheet(timesheetId, action, options);

      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: `Failed to ${action} timesheet` };
      }
    } catch (error: any) {
      console.error('Error in managerApproveRejectTimesheet:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Management approve/reject timesheet - Using Backend API
   */
  static async managementApproveRejectTimesheet(
    timesheetId: string,
    action: 'approve' | 'reject',
    options: {
      reason?: string;
      approverRole?: 'management' | 'manager';
      finalize?: boolean;
      notify?: boolean;
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.managementApproveRejectTimesheet(timesheetId, action, options);

      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: `Failed to ${action} timesheet` };
      }
    } catch (error: any) {
      console.error('Error in managementApproveRejectTimesheet:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Escalate timesheet to management
   */
  static async escalateToManagement(timesheetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.post(`/timesheets/${timesheetId}/escalate`);

      return {
        success: response.success || false,
        error: response.success ? undefined : (response.message || 'Failed to escalate timesheet')
      };
    } catch (error: any) {
      console.error('Error in escalateToManagement:', error);
      return { success: false, error: error.message || 'Failed to escalate timesheet' };
    }
  }

  /**
   * Mark timesheet as billed
   */
  static async markTimesheetBilled(timesheetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.post(`/timesheets/${timesheetId}/mark-billed`);

      return {
        success: response.success || false,
        error: response.success ? undefined : (response.message || 'Failed to mark timesheet as billed')
      };
    } catch (error: any) {
      console.error('Error in markTimesheetBilled:', error);
      return { success: false, error: error.message || 'Failed to mark timesheet as billed' };
    }
  }

  /**
   * Get timesheet dashboard data using MongoDB backend API
   */
  static async getTimesheetDashboard(): Promise<{
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
      const response = await backendApi.getTimesheetDashboard();

      if (response.success && response.data) {
        return {
          totalTimesheets: response.data.totalTimesheets || 0,
          pendingApproval: response.data.pendingApproval || 0,
          pendingManagement: response.data.pendingManagement || 0,
          pendingBilling: response.data.pendingBilling || 0,
          verified: response.data.verified || 0,
          billed: response.data.billed || 0,
          totalHours: response.data.totalHours || 0,
          averageHoursPerWeek: response.data.averageHoursPerWeek || 0,
          completionRate: response.data.completionRate || 0
        };
      } else {
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
          error: 'Failed to fetch dashboard data'
        };
      }
    } catch (error: any) {
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
        error: error.message || 'Failed to fetch dashboard data'
      };
    }
  }

  /**
   * Get time entries for a timesheet
   */
  static async getTimeEntries(timesheetId: string): Promise<{ entries: TimeEntry[]; error?: string }> {
    try {
      const response = await backendApi.get(`/timesheets/${timesheetId}/entries`);

      if (response.success && response.data) {
        return { entries: response.data as TimeEntry[] };
      } else {
        return { entries: [], error: response.message || 'Failed to fetch time entries' };
      }
    } catch (error: any) {
      console.error('Error in getTimeEntries:', error);
      return { entries: [], error: error.message || 'Failed to fetch time entries' };
    }
  }

  /**
   * Validation is now handled by the backend
   */

  /**
   * Add time entry to timesheet - Using Backend API
   */
  static async addTimeEntry(
    timesheetId: string,
    entryData: {
      project_id?: string;
      task_id?: string;
      date: string;
      hours: number;
      description?: string;
      is_billable: boolean;
      custom_task_description?: string;
      entry_type: 'project_task' | 'custom_task';
    }
  ): Promise<{ entry?: TimeEntry; error?: string }> {
    try {

      const response = await backendApi.addTimeEntry(timesheetId, {
        date: entryData.date,
        hours: entryData.hours,
        entry_type: entryData.entry_type,
        is_billable: entryData.is_billable,
        project_id: entryData.project_id,
        task_id: entryData.task_id,
        description: entryData.description,
        custom_task_description: entryData.custom_task_description
      });

      if (response.success) {
        return { entry: response.data as TimeEntry };
      } else {
        return { error: 'Failed to add time entry' };
      }
    } catch (error: any) {
      console.error('Error in addTimeEntry:', error);
      return { error: error.message };
    }
  }

  /**
   * Update timesheet total hours (handled automatically by backend)
   */
  private static async updateTimesheetTotalHours(timesheetId: string): Promise<void> {
    // This is now handled automatically by the backend when entries are updated
  }

  /**
   * Delete all time entries for a timesheet
   */
  static async deleteTimesheetEntries(timesheetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.delete(`/timesheets/${timesheetId}/entries`);

      return {
        success: response.success || false,
        error: response.success ? undefined : (response.message || 'Failed to delete timesheet entries')
      };
    } catch (error: any) {
      console.error('Error in deleteTimesheetEntries:', error);
      return { success: false, error: error.message || 'Failed to delete timesheet entries' };
    }
  }

  /**
   * Update timesheet with new entries using backend API
   */
  static async updateTimesheetEntries(
    timesheetId: string,
    entries: {
      project_id?: string;
      task_id?: string;
      date: string;
      hours: number;
      description?: string;
      is_billable: boolean;
      custom_task_description?: string;
      entry_type: 'project_task' | 'custom_task';
    }[]
  ): Promise<{ success: boolean; error?: string; updatedEntries?: TimeEntry[] }> {
    try {
      const response = await backendApi.put(`/timesheets/${timesheetId}/entries`, {
        entries
      });

      if (response.success) {
        return {
          success: true,
          updatedEntries: response.data as TimeEntry[]
        };
      } else {
        return {
          success: false,
          error: response.message || 'Failed to update timesheet entries'
        };
      }
    } catch (error: any) {
      console.error('Error in updateTimesheetEntries:', error);
      return { success: false, error: error.message || 'Failed to update timesheet entries' };
    }
  }

  /**
   * Get timesheet by ID with details
   */
  static async getTimesheetById(timesheetId: string): Promise<{ timesheet?: TimesheetWithDetails; error?: string }> {
    try {

      const response = await backendApi.get(`/timesheets/details/${timesheetId}`);

      if (response.success && response.data) {
        const timesheetData = response.data;

        // Calculate hours if not provided
        const billableHours = timesheetData.billableHours ||
          (timesheetData.time_entries || []).filter((e: any) => e.is_billable).reduce((sum: number, e: any) => sum + e.hours, 0);
        const nonBillableHours = timesheetData.nonBillableHours ||
          (timesheetData.total_hours || 0) - billableHours;

        const enhancedTimesheet: TimesheetWithDetails = {
          ...timesheetData,
          entries: timesheetData.time_entries || [],
          billableHours,
          nonBillableHours,
          can_edit: ['draft', 'manager_rejected', 'management_rejected'].includes(timesheetData.status),
          can_submit: timesheetData.status === 'draft' && (timesheetData.total_hours || 0) > 0,
          can_approve: false, // Will be determined by role in component
          can_reject: false, // Will be determined by role in component
          next_action: this.getNextAction(timesheetData.status)
        };

        return { timesheet: enhancedTimesheet };
      } else {
        return { error: response.message || 'Failed to fetch timesheet details' };
      }
    } catch (error: any) {
      console.error('💥 Error in getTimesheetById:', error);
      return { error: error.message || 'Failed to fetch timesheet details' };
    }
  }

  /**
   * Get next action description for timesheet status
   */
  private static getNextAction(status: TimesheetStatus): string {
    switch (status) {
      case 'draft':
        return 'Ready to submit';
      case 'submitted':
        return 'Awaiting manager approval';
      case 'manager_approved':
        return 'Automatically forwarded to management';
      case 'management_pending':
        return 'Awaiting management approval';
      case 'manager_rejected':
        return 'Needs revision after manager rejection';
      case 'management_rejected':
        return 'Needs revision after management rejection';
      case 'frozen':
        return 'Approved & frozen - ready for billing';
      case 'billed':
        return 'Complete - timesheet has been billed';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Get calendar data for a user and month
   */
  static async getCalendarData(userId: string, year: number, month: number): Promise<{
    calendarData: { [date: string]: { hours: number; status: string; entries: TimeEntry[] } };
    error?: string;
  }> {
    try {

      const response = await backendApi.get(`/timesheets/calendar/${userId}/${year}/${month}`);

      if (response.success && response.data) {
        return { calendarData: response.data };
      } else {
        return { calendarData: {}, error: response.message || 'Failed to fetch calendar data' };
      }
    } catch (error: any) {
      console.error('❌ Error in getCalendarData:', error);
      return { calendarData: {}, error: error.message || 'Failed to fetch calendar data' };
    }
  }

  /**
   * Get timesheets for approval (Manager/Management view) - Using Backend API
   */
  static async getTimesheetsForApproval(
    approverRole: 'manager' | 'management' | 'lead'
  ): Promise<{ timesheets: TimesheetWithDetails[]; error?: string }> {
    try {
      let statusFilter: TimesheetStatus[];

      if (approverRole === 'lead') {
        statusFilter = ['draft', 'submitted', 'manager_approved', 'manager_rejected', 'frozen'];
      } else if (approverRole === 'manager') {
        statusFilter = ['submitted', 'management_rejected'];
      } else {
        statusFilter = ['management_pending'];
      }

      const result = await this.getUserTimesheets(undefined, statusFilter);

      if (result.error) {
        return { timesheets: [], error: result.error };
      }

      // Enhance with approval permissions
      const enhancedTimesheets = result.timesheets.map(timesheet => ({
        ...timesheet,
        can_edit: approverRole !== 'lead',
        can_submit: false,
        can_approve: approverRole !== 'lead',
        can_reject: approverRole !== 'lead',
      }));

      return { timesheets: enhancedTimesheets };
    } catch (error: any) {
      console.error('Error in getTimesheetsForApproval:', error);
      return { timesheets: [], error: error.message };
    }
  }

  /**
   * Delete timesheet (only allowed for draft status)
   */
  static async deleteTimesheet(timesheetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.delete(`/timesheets/${timesheetId}`);
      return {
        success: response.success,
        error: response.success ? undefined : (response.message || 'Failed to delete timesheet')
      };
    } catch (error: any) {
      console.error('Error in deleteTimesheet:', error);
      return { success: false, error: error.message || 'Failed to delete timesheet' };
    }
  }

  /**
   * Check if timesheet can be deleted (only draft versions)
   */
  static canDeleteTimesheet(timesheet: Timesheet): boolean {
    return timesheet.status === 'draft' && !timesheet.is_frozen;
  }

  /**
   * Get deleted timesheets (management and super admin only)
   */
  static async getDeletedTimesheets(): Promise<{ timesheets: Timesheet[]; error?: string }> {
    try {
      const response: any = await backendApi.get('/timesheets/deleted');
      if (response.success && response.data) {
        return { timesheets: response.data as Timesheet[] };
      } else {
        return { timesheets: [], error: response.message || 'Failed to fetch deleted timesheets' };
      }
    } catch (error: unknown) {
      console.error('Error in getDeletedTimesheets:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch deleted timesheets';
      return { timesheets: [], error: errorMessage };
    }
  }

  /**
   * Restore soft deleted timesheet (management and super admin only)
   */
  static async restoreTimesheet(timesheetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response: any = await backendApi.post(`/timesheets/${timesheetId}/restore`);
      return {
        success: response.success,
        error: response.success ? undefined : (response.message || 'Failed to restore timesheet')
      };
    } catch (error: unknown) {
      console.error('Error in restoreTimesheet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to restore timesheet';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Hard delete timesheet permanently (super admin only)
   */
  static async hardDeleteTimesheet(timesheetId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Use deleteWithBody to send DELETE with body data
      const response: any = await backendApi.deleteWithBody(`/timesheets/${timesheetId}/hard`, {
        reason: reason || 'Permanent deletion requested'
      });
      return {
        success: response.success,
        error: response.success ? undefined : (response.message || 'Failed to permanently delete timesheet')
      };
    } catch (error: unknown) {
      console.error('Error in hardDeleteTimesheet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to permanently delete timesheet';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if timesheet can be modified
   */
  static canModifyTimesheet(timesheet: Timesheet): boolean {
    return ['draft', 'manager_rejected', 'management_rejected'].includes(timesheet.status) &&
      !timesheet.is_frozen;
  }

  /**
   * Check if timesheet is frozen
   */
  static isTimesheetFrozen(timesheet: Timesheet): boolean {
    return timesheet.is_frozen || timesheet.status === 'frozen' || timesheet.status === 'billed';
  }

  /**
   * Check if timesheet is billed
   */
  static isTimesheetBilled(timesheet: Timesheet): boolean {
    return timesheet.status === 'billed';
  }
}

export default TimesheetService;
