/**
 * Phase 7: Team Review Service
 * Handles project-wise timesheet approval workflows with multi-manager support
 * Now uses unified backendApi with Axios interceptors
 */

import { backendApi } from '../lib/backendApi';
import type {
  ProjectTimesheetGroup,
  ApprovalActionRequest,
  ApprovalActionResponse,
  BulkApprovalRequest,
  BulkApprovalResponse,
  TimesheetWithHistory,
  TeamReviewFilters,
  ProjectWeekFilters,
  ProjectWeekResponse,
  BulkProjectWeekApprovalResponse
} from '../types/timesheetApprovals';

/**
 * Team Review Service
 * Manages project-wise timesheet approval workflows
 */
export class TeamReviewService {
  /**
   * Get project-wise timesheet groups for Manager/Management
   * Returns hierarchical structure: Projects → Members → Timesheets
   */
  static async getProjectTimesheetGroups(
    filters?: TeamReviewFilters
  ): Promise<ProjectTimesheetGroup[]> {
    try {
      const response = await backendApi.get<{ projects: ProjectTimesheetGroup[] }>(
        '/timesheets/projects/groups',
        { params: filters }
      );

      return response.projects;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to load project timesheet groups');
    }
  }

  /**
   * Approve timesheet for a specific project
   * Multi-manager logic: Timesheet status updates only when ALL managers approve
   */
  static async approveTimesheetForProject(
    request: ApprovalActionRequest
  ): Promise<ApprovalActionResponse> {
    try {
      const response = await backendApi.post<ApprovalActionResponse>(
        `/timesheets/${request.timesheet_id}/approve`,
        {
          project_id: request.project_id,
          action: 'approve'
        }
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to approve timesheet');
    }
  }

  /**
   * Reject timesheet for a specific project
   * Rejection resets ALL approvals for the timesheet
   */
  static async rejectTimesheetForProject(
    request: ApprovalActionRequest
  ): Promise<ApprovalActionResponse> {
    try {
      const response = await backendApi.post<ApprovalActionResponse>(
        `/timesheets/${request.timesheet_id}/reject`,
        {
          project_id: request.project_id,
          action: 'reject',
          reason: request.reason
        }
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to reject timesheet');
    }
  }

  /**
   * Bulk verify timesheets for a specific project (Management only)
   * Changes management_status from 'pending' to 'approved' for the specified project approvals
   */
  static async bulkVerifyTimesheets(
    request: BulkApprovalRequest
  ): Promise<BulkApprovalResponse> {
    try {
      const response = await backendApi.post<BulkApprovalResponse>(
        '/timesheets/bulk/verify',
        {
          timesheet_ids: request.timesheet_ids,
          project_id: request.project_id,
          verification_notes: request.verification_notes
        }
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to bulk verify timesheets');
    }
  }

  /**
   * Bulk mark timesheets as billed (Management only)
   * Changes status from 'frozen' to 'billed'
   */
  static async bulkBillTimesheets(
    request: BulkApprovalRequest
  ): Promise<BulkApprovalResponse> {
    try {
      const response = await backendApi.post<BulkApprovalResponse>(
        '/timesheets/bulk/bill',
        {
          timesheet_ids: request.timesheet_ids,
          project_id: request.project_id
        }
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to bulk bill timesheets');
    }
  }

  /**
   * Get timesheet with full approval history
   * Used for employee's timesheet detail view
   */
  static async getTimesheetWithHistory(
    timesheetId: string
  ): Promise<TimesheetWithHistory> {
    try {
      const response = await backendApi.get<TimesheetWithHistory>(
        `/timesheets/${timesheetId}/history`
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to load timesheet history');
    }
  }

  /**
   * Get timesheet detail for a specific project
   * Used when Manager/Lead views member's timesheet
   */
  static async getTimesheetForProject(
    timesheetId: string,
    projectId: string
  ): Promise<TimesheetWithHistory> {
    try {
      const response = await backendApi.get<TimesheetWithHistory>(
        `/timesheets/${timesheetId}/project/${projectId}`
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to load timesheet for project');
    }
  }

  /**
   * Get pending approvals count for current user
   * Used for dashboard badges
   */
  static async getPendingApprovalsCount(): Promise<{
    total: number;
    by_project: Array<{ project_id: string; project_name: string; count: number }>;
  }> {
    try {
      const response = await backendApi.get<{
        total: number;
        by_project: Array<{ project_id: string; project_name: string; count: number }>;
      }>(
        '/timesheets/approvals/pending/count'
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to load pending approvals count');
    }
  }

  /**
   * Get approval statistics for Management dashboard
   */
  static async getApprovalStatistics(weekStart?: string, weekEnd?: string): Promise<{
    total_submitted: number;
    total_approved: number;
    total_rejected: number;
    total_frozen: number;
    total_billed: number;
    by_project: Array<{
      project_id: string;
      project_name: string;
      submitted: number;
      approved: number;
      rejected: number;
      frozen: number;
      billed: number;
    }>;
  }> {
    try {
      const response = await backendApi.get(
        '/timesheets/approvals/statistics',
        {
          params: { week_start: weekStart, week_end: weekEnd }
        }
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to load approval statistics');
    }
  }

  // ============================================================================
  // V2 Methods: Project-Week Based Approval
  // ============================================================================

  /**
   * Get project-week groups with pagination and filters (V2)
   * Returns paginated list of project-weeks for approval
   */
  static async getProjectWeekGroups(
    filters?: ProjectWeekFilters
  ): Promise<ProjectWeekResponse> {
    try {
      const response = await backendApi.get<ProjectWeekResponse>(
        '/timesheets/project-weeks',
        { params: filters }
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to load project-week groups');
    }
  }

  /**
   * Approve all timesheets for a project-week
   * Bulk approval at project-week level
   */
  static async approveProjectWeek(
    projectId: string,
    weekStart: string,
    weekEnd: string
  ): Promise<BulkProjectWeekApprovalResponse> {
    try {
      const response = await backendApi.post<BulkProjectWeekApprovalResponse>(
        '/timesheets/project-week/approve',
        {
          project_id: projectId,
          week_start: weekStart,
          week_end: weekEnd
        }
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to approve project-week');
    }
  }

  /**
   * Reject all timesheets for a project-week
   * Bulk rejection at project-week level
   */
  static async rejectProjectWeek(
    projectId: string,
    weekStart: string,
    weekEnd: string,
    reason: string
  ): Promise<BulkProjectWeekApprovalResponse> {
    try {
      const response = await backendApi.post<BulkProjectWeekApprovalResponse>(
        '/timesheets/project-week/reject',
        {
          project_id: projectId,
          week_start: weekStart,
          week_end: weekEnd,
          reason
        }
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to reject project-week');
    }
  }

  /**
   * Bulk freeze all timesheets for a project-week (Management only)
   * Freezes ALL manager_approved timesheets, skips users without timesheets
   * Validation: Cannot freeze if ANY timesheet is still in submitted/pending state
   */
  static async freezeProjectWeek(
    projectId: string,
    weekStart: string,
    weekEnd: string
  ): Promise<{
    success: boolean;
    message: string;
    frozen_count: number;
    skipped_count: number;
    failed: Array<{ user_id: string; user_name: string; reason: string }>;
  }> {
    try {
      const response = await backendApi.post<{
        success: boolean;
        message: string;
        frozen_count: number;
        skipped_count: number;
        failed: Array<{ user_id: string; user_name: string; reason: string }>;
      }>(
        '/timesheets/project-week/freeze',
        {
          project_id: projectId,
          week_start: weekStart,
          week_end: weekEnd
        }
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to freeze project-week');
    }
  }

  /**
   * Update billable adjustment for a project approval (Manager only)
   * Manager can adjust billable hours (+/-) for a user's timesheet on a specific project
   */
  static async updateBillableAdjustment(
    timesheetId: string,
    projectId: string,
    adjustment: number
  ): Promise<{
    success: boolean;
    approval: {
      worked_hours: number;
      billable_hours: number;
      billable_adjustment: number;
    };
    error?: string;
  }> {
    try {
      const response = await backendApi.put<{
        success: boolean;
        approval: {
          worked_hours: number;
          billable_hours: number;
          billable_adjustment: number;
        };
      }>(
        '/timesheets/billable-adjustment',
        {
          timesheet_id: timesheetId,
          project_id: projectId,
          adjustment
        }
      );

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update billable adjustment');
    }
  }
}

export default TeamReviewService;
