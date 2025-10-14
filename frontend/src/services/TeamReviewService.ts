/**
 * Phase 7: Team Review Service
 * Handles project-wise timesheet approval workflows with multi-manager support
 * SonarQube compliant with Axios integration
 */

import axios, { AxiosError } from 'axios';
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
  BulkProjectWeekApprovalRequest,
  BulkProjectWeekApprovalResponse
} from '../types/timesheetApprovals';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Get authorization headers with access token
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Handle API errors consistently
 */
const handleApiError = (error: unknown, defaultMessage: string): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    const message = axiosError.response?.data?.error ||
                    axiosError.response?.data?.message ||
                    axiosError.message ||
                    defaultMessage;
    throw new Error(message);
  }
  throw new Error(defaultMessage);
};

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
      const response = await axios.get<{ projects: ProjectTimesheetGroup[] }>(
        `${API_BASE_URL}/timesheets/projects/groups`,
        {
          headers: getAuthHeaders(),
          params: filters
        }
      );

      return response.data.projects;
    } catch (error) {
      return handleApiError(error, 'Failed to load project timesheet groups');
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
      const response = await axios.post<ApprovalActionResponse>(
        `${API_BASE_URL}/timesheets/${request.timesheet_id}/approve`,
        {
          project_id: request.project_id,
          action: 'approve'
        },
        {
          headers: getAuthHeaders()
        }
      );

      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to approve timesheet');
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
      const response = await axios.post<ApprovalActionResponse>(
        `${API_BASE_URL}/timesheets/${request.timesheet_id}/reject`,
        {
          project_id: request.project_id,
          action: 'reject',
          reason: request.reason
        },
        {
          headers: getAuthHeaders()
        }
      );

      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to reject timesheet');
    }
  }

  /**
   * Bulk verify timesheets (Management only)
   * Changes status from 'manager_approved' to 'frozen'
   */
  static async bulkVerifyTimesheets(
    request: BulkApprovalRequest
  ): Promise<BulkApprovalResponse> {
    try {
      const response = await axios.post<BulkApprovalResponse>(
        `${API_BASE_URL}/timesheets/bulk/verify`,
        {
          timesheet_ids: request.timesheet_ids,
          project_id: request.project_id,
          verification_notes: request.verification_notes
        },
        {
          headers: getAuthHeaders()
        }
      );

      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to bulk verify timesheets');
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
      const response = await axios.post<BulkApprovalResponse>(
        `${API_BASE_URL}/timesheets/bulk/bill`,
        {
          timesheet_ids: request.timesheet_ids,
          project_id: request.project_id
        },
        {
          headers: getAuthHeaders()
        }
      );

      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to bulk bill timesheets');
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
      const response = await axios.get<TimesheetWithHistory>(
        `${API_BASE_URL}/timesheets/${timesheetId}/history`,
        {
          headers: getAuthHeaders()
        }
      );

      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to load timesheet history');
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
      const response = await axios.get<TimesheetWithHistory>(
        `${API_BASE_URL}/timesheets/${timesheetId}/project/${projectId}`,
        {
          headers: getAuthHeaders()
        }
      );

      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to load timesheet for project');
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
      const response = await axios.get<{
        total: number;
        by_project: Array<{ project_id: string; project_name: string; count: number }>;
      }>(
        `${API_BASE_URL}/timesheets/approvals/pending/count`,
        {
          headers: getAuthHeaders()
        }
      );

      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to load pending approvals count');
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
      const response = await axios.get(
        `${API_BASE_URL}/timesheets/approvals/statistics`,
        {
          headers: getAuthHeaders(),
          params: { week_start: weekStart, week_end: weekEnd }
        }
      );

      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to load approval statistics');
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
      const response = await axios.get<ProjectWeekResponse>(
        `${API_BASE_URL}/timesheets/project-weeks`,
        {
          headers: getAuthHeaders(),
          params: filters
        }
      );

      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to load project-week groups');
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
      const response = await axios.post<BulkProjectWeekApprovalResponse>(
        `${API_BASE_URL}/timesheets/project-week/approve`,
        {
          project_id: projectId,
          week_start: weekStart,
          week_end: weekEnd
        },
        {
          headers: getAuthHeaders()
        }
      );

      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to approve project-week');
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
      const response = await axios.post<BulkProjectWeekApprovalResponse>(
        `${API_BASE_URL}/timesheets/project-week/reject`,
        {
          project_id: projectId,
          week_start: weekStart,
          week_end: weekEnd,
          reason
        },
        {
          headers: getAuthHeaders()
        }
      );

      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to reject project-week');
    }
  }
}

export default TeamReviewService;
