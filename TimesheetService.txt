import { BackendTimesheetService } from './BackendTimesheetService';
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
    return BackendTimesheetService.getAllTimesheets();
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
    return BackendTimesheetService.getUserTimesheets(userId, statusFilter, weekStartFilter, limit, offset);
  }

  /**
   * Create new timesheet - Using Backend API
   */
  static async createTimesheet(userId: string, weekStartDate: string): Promise<{ timesheet?: Timesheet; error?: string }> {
    return BackendTimesheetService.createTimesheet(userId, weekStartDate);
  }

  /**
   * Get timesheet for specific user and week - Using Backend API
   */
  static async getTimesheetByUserAndWeek(userId: string, weekStartDate: string): Promise<{ timesheet?: TimesheetWithDetails; error?: string }> {
    return BackendTimesheetService.getTimesheetByUserAndWeek(userId, weekStartDate);
  }

  /**
   * Submit timesheet for approval using database function
   */
  /**
   * Submit timesheet for approval - Using Backend API
   */
  static async submitTimesheet(timesheetId: string): Promise<{ success: boolean; error?: string }> {
    return BackendTimesheetService.submitTimesheet(timesheetId);
  }

  /**
   * Manager approve/reject timesheet - Using Backend API
   */
  static async managerApproveRejectTimesheet(
    timesheetId: string,
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    return BackendTimesheetService.managerApproveRejectTimesheet(timesheetId, action, reason);
  }

  /**
   * Management approve/reject timesheet - Using Backend API
   */
  static async managementApproveRejectTimesheet(
    timesheetId: string,
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    return BackendTimesheetService.managementApproveRejectTimesheet(timesheetId, action, reason);
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
    return BackendTimesheetService.addTimeEntry(timesheetId, entryData);
  }

  /**
   * Update timesheet total hours (handled automatically by backend)
   */
  private static async updateTimesheetTotalHours(timesheetId: string): Promise<void> {
    // This is now handled automatically by the backend when entries are updated
    console.log('✅ Timesheet total hours updated automatically by backend:', timesheetId);
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
      console.log('🔍 TimesheetService.getTimesheetById called with ID:', timesheetId);

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

        console.log('✅ Enhanced timesheet created:', {
          id: enhancedTimesheet.id,
          status: enhancedTimesheet.status,
          total_hours: enhancedTimesheet.total_hours,
          can_submit: enhancedTimesheet.can_submit,
          entries_count: enhancedTimesheet.time_entries?.length || 0
        });

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
      console.log(`📅 Loading calendar data for user ${userId}, year ${year}, month ${month}`);

      const response = await backendApi.get(`/timesheets/calendar/${userId}/${year}/${month}`);

      if (response.success && response.data) {
        console.log(`📅 Calendar data keys: ${Object.keys(response.data).length} days with data`);
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
    return BackendTimesheetService.getTimesheetsForApproval(approverRole);
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