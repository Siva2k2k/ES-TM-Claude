import { backendApi } from '../lib/backendApi';
import { supabase } from '../lib/supabase';
import type { Timesheet, TimeEntry, TimesheetStatus, TimesheetWithDetails } from '../types';

/**
 * Backend Timesheet Service - Node.js/MongoDB Integration
 * Handles timesheet operations through the backend API while keeping Supabase for auth
 */
export class BackendTimesheetService {
  /**
   * Get all timesheets (Super Admin and Management)
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
   * Get user's timesheets using backend API
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
   * Create new timesheet
   */
  static async createTimesheet(userId: string, weekStartDate: string): Promise<{ timesheet?: Timesheet; error?: string }> {
    try {
      console.log('BackendTimesheetService.createTimesheet called with:', { userId, weekStartDate });

      const response = await backendApi.createTimesheet({
        userId,
        weekStartDate
      });

      if (response.success) {
        console.log('Timesheet created successfully:', response.data);
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
   * Get timesheet for specific user and week
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
   * Submit timesheet for approval
   */
  static async submitTimesheet(timesheetId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('BackendTimesheetService.submitTimesheet called for ID:', timesheetId);

      const response = await backendApi.submitTimesheet(timesheetId);

      if (response.success) {
        console.log('Timesheet submitted successfully:', timesheetId);
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
   * Manager approve/reject timesheet
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
        console.log(`Manager ${action}ed timesheet: ${timesheetId}`);
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
   * Management approve/reject timesheet
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
        console.log(`Management ${action}ed timesheet: ${timesheetId}`);
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
   * Add time entry to timesheet
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
      console.log('BackendTimesheetService.addTimeEntry called with:', { timesheetId, entryData });

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
        console.log('Time entry created successfully:', response.data);
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
   * Get timesheet dashboard data
   * Note: This method still uses Supabase as it's for dashboard statistics
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
      const { data, error } = await supabase
        .from('timesheets')
        .select('status, total_hours')
        .is('deleted_at', null);

      if (error) {
        console.error('Error fetching timesheet dashboard:', error);
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
          error: error.message
        };
      }

      const timesheets = data as { status: TimesheetStatus; total_hours: number }[];
      const totalTimesheets = timesheets.length;
      const pendingApproval = timesheets.filter(ts => ts.status === 'submitted').length;
      const pendingManagement = timesheets.filter(ts => ts.status === 'management_pending').length;
      const pendingBilling = timesheets.filter(ts => ts.status === 'frozen').length;
      const verified = timesheets.filter(ts => ts.status === 'frozen').length;
      const billed = timesheets.filter(ts => ts.status === 'billed').length;
      const totalHours = timesheets.reduce((sum, ts) => sum + ts.total_hours, 0);

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
        error: 'Failed to fetch dashboard data'
      };
    }
  }

  /**
   * Get timesheets for approval (Manager/Management view)
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

export default BackendTimesheetService;
