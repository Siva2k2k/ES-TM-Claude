/**
 * useTeamReview Hook
 *
 * Custom hook for team timesheet review management
 * Handles loading, filtering, and approval/rejection of team timesheets
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../store/contexts/AuthContext';
import { TimesheetApprovalService } from '../services/TimesheetApprovalService';
import { UserService } from '../services/UserService';
import { showSuccess, showError } from '../utils/toast';
import {
  TimesheetReviewSummary,
  TeamReviewFilter,
  canViewTeamTimesheets,
  canApproveTimesheets,
  type TimesheetStatus
} from '../types/teamReview.schemas';

export interface UseTeamReviewOptions {
  autoLoad?: boolean;
  initialFilter?: Partial<TeamReviewFilter>;
}

export interface UseTeamReviewReturn {
  // Data
  timesheets: TimesheetReviewSummary[];
  teamMembers: any[];

  // Loading states
  isLoading: boolean;
  isApproving: boolean;
  isRejecting: boolean;

  // Filters
  filter: TeamReviewFilter;
  setFilter: (filter: Partial<TeamReviewFilter>) => void;

  // Actions
  loadTimesheets: () => Promise<void>;
  loadTeamMembers: () => Promise<void>;
  approveTimesheet: (timesheetId: string) => Promise<void>;
  rejectTimesheet: (timesheetId: string, reason: string) => Promise<void>;
  bulkApprove: (timesheetIds: string[]) => Promise<void>;
  bulkReject: (timesheetIds: string[], reason: string) => Promise<void>;

  // Permissions
  canView: boolean;
  canApprove: boolean;
  canManageUser: (userId: string) => boolean;

  // Error
  error: string | null;
}

export function useTeamReview(options: UseTeamReviewOptions = {}): UseTeamReviewReturn {
  const { autoLoad = true, initialFilter = {} } = options;
  const { currentUser, currentUserRole } = useAuth();

  // State
  const [timesheets, setTimesheets] = useState<TimesheetReviewSummary[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userManagerProjects, setUserManagerProjects] = useState<Map<string, string[]>>(new Map());

  const [filter, setFilterState] = useState<TeamReviewFilter>({
    status: 'all',
    userId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    searchTerm: undefined,
    ...initialFilter
  });

  // Permissions
  const canView = currentUserRole ? canViewTeamTimesheets(currentUserRole) : false;
  const canApprove = currentUserRole ? canApproveTimesheets(currentUserRole) : false;

  // Check if user can manage a specific team member
  const canManageUser = useCallback((userId: string): boolean => {
    if (!currentUserRole) return false;

    // Management and super_admin can manage all
    if (['management', 'super_admin'].includes(currentUserRole)) {
      return true;
    }

    // Managers can manage their team
    if (currentUserRole === 'manager') {
      return true;
    }

    // Leads can manage if they have manager role on projects with the user
    if (currentUserRole === 'lead' && userManagerProjects.has(userId)) {
      const projects = userManagerProjects.get(userId) || [];
      return projects.length > 0;
    }

    return false;
  }, [currentUserRole, userManagerProjects]);

  // Update filter
  const setFilter = useCallback((newFilter: Partial<TeamReviewFilter>) => {
    setFilterState(prev => ({ ...prev, ...newFilter }));
  }, []);

  // Load team members
  const loadTeamMembers = useCallback(async () => {
    if (!currentUser?.id || !canView) return;

    try {
      setIsLoading(true);
      setError(null);

      let result;

      if (['lead', 'manager'].includes(currentUserRole || '')) {
        // Load with project-specific roles
        const teamMembersResult = await UserService.getTeamMembersWithProjectRoles(currentUser.id);

        if (!teamMembersResult.error) {
          setUserManagerProjects(teamMembersResult.userManagerProjects || new Map());
          result = { users: teamMembersResult.users, error: null };
        } else {
          result = { users: [], error: teamMembersResult.error };
        }
      } else {
        // Management and Super Admin can see all users
        result = await UserService.getAllUsers();
        setUserManagerProjects(new Map());
      }

      if (result.error) {
        setError(result.error);
        showError(result.error);
      } else {
        setTeamMembers(result.users || []);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load team members';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, currentUserRole, canView]);

  // Load timesheets
  const loadTimesheets = useCallback(async () => {
    if (!currentUser?.id || !canView) return;

    try {
      setIsLoading(true);
      setError(null);

      let result;

      if (['lead', 'manager'].includes(currentUserRole || '')) {
        // Load team timesheets
        result = await TimesheetApprovalService.getTeamTimesheets(currentUser.id);
      } else {
        // Load all timesheets for management
        result = await TimesheetApprovalService.getAllTimesheets();
      }

      if (result.error) {
        setError(result.error);
        showError(result.error);
      } else {
        // Map to TimesheetReviewSummary format
        const mapped = (result.timesheets || []).map(mapToReviewSummary);
        setTimesheets(mapped);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load timesheets';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, currentUserRole, canView]);

  // Approve timesheet
  const approveTimesheet = useCallback(async (timesheetId: string) => {
    if (!currentUser?.id || !canApprove) {
      showError('You do not have permission to approve timesheets');
      return;
    }

    try {
      setIsApproving(true);
      setError(null);

      const result = await TimesheetApprovalService.approveTimesheet(
        timesheetId,
        currentUser.id
      );

      if (result.error) {
        setError(result.error);
        showError(result.error);
      } else {
        showSuccess('Timesheet approved successfully');
        await loadTimesheets();
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to approve timesheet';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsApproving(false);
    }
  }, [currentUser?.id, canApprove, loadTimesheets]);

  // Reject timesheet
  const rejectTimesheet = useCallback(async (timesheetId: string, reason: string) => {
    if (!currentUser?.id || !canApprove) {
      showError('You do not have permission to reject timesheets');
      return;
    }

    if (!reason || reason.trim().length < 10) {
      showError('Rejection reason must be at least 10 characters');
      return;
    }

    try {
      setIsRejecting(true);
      setError(null);

      const result = await TimesheetApprovalService.rejectTimesheet(
        timesheetId,
        currentUser.id,
        reason
      );

      if (result.error) {
        setError(result.error);
        showError(result.error);
      } else {
        showSuccess('Timesheet rejected');
        await loadTimesheets();
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to reject timesheet';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsRejecting(false);
    }
  }, [currentUser?.id, canApprove, loadTimesheets]);

  // Bulk approve
  const bulkApprove = useCallback(async (timesheetIds: string[]) => {
    if (!currentUser?.id || !canApprove) {
      showError('You do not have permission to approve timesheets');
      return;
    }

    if (timesheetIds.length === 0) {
      showError('No timesheets selected');
      return;
    }

    try {
      setIsApproving(true);
      setError(null);

      // Approve each timesheet
      const results = await Promise.all(
        timesheetIds.map(id =>
          TimesheetApprovalService.approveTimesheet(id, currentUser.id)
        )
      );

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        showError(`${errors.length} timesheet(s) failed to approve`);
      } else {
        showSuccess(`${timesheetIds.length} timesheet(s) approved successfully`);
      }

      await loadTimesheets();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to approve timesheets';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsApproving(false);
    }
  }, [currentUser?.id, canApprove, loadTimesheets]);

  // Bulk reject
  const bulkReject = useCallback(async (timesheetIds: string[], reason: string) => {
    if (!currentUser?.id || !canApprove) {
      showError('You do not have permission to reject timesheets');
      return;
    }

    if (timesheetIds.length === 0) {
      showError('No timesheets selected');
      return;
    }

    if (!reason || reason.trim().length < 10) {
      showError('Rejection reason must be at least 10 characters');
      return;
    }

    try {
      setIsRejecting(true);
      setError(null);

      // Reject each timesheet
      const results = await Promise.all(
        timesheetIds.map(id =>
          TimesheetApprovalService.rejectTimesheet(id, currentUser.id, reason)
        )
      );

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        showError(`${errors.length} timesheet(s) failed to reject`);
      } else {
        showSuccess(`${timesheetIds.length} timesheet(s) rejected`);
      }

      await loadTimesheets();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to reject timesheets';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsRejecting(false);
    }
  }, [currentUser?.id, canApprove, loadTimesheets]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && canView) {
      loadTeamMembers();
      loadTimesheets();
    }
  }, [autoLoad, canView, loadTeamMembers, loadTimesheets]);

  return {
    timesheets,
    teamMembers,
    isLoading,
    isApproving,
    isRejecting,
    filter,
    setFilter,
    loadTimesheets,
    loadTeamMembers,
    approveTimesheet,
    rejectTimesheet,
    bulkApprove,
    bulkReject,
    canView,
    canApprove,
    canManageUser,
    error
  };
}

// Helper to map API response to TimesheetReviewSummary
function mapToReviewSummary(data: any): TimesheetReviewSummary {
  return {
    id: data.id || data._id,
    employeeId: data.employee_id || data.user_id,
    employeeName: data.employee_name || data.user_name || 'Unknown',
    employeeEmail: data.employee_email || data.user_email || '',
    weekStartDate: data.week_start_date,
    weekEndDate: data.week_end_date || '',
    totalHours: data.total_hours || 0,
    billableHours: data.billable_hours || 0,
    status: data.status,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at || data.approved_at,
    reviewedBy: data.reviewed_by || data.approved_by,
    reviewerName: data.reviewer_name || data.approver_name,
    rejectionReason: data.rejection_reason,
    entriesCount: data.entries_count || (data.entries?.length || 0),
    projectsCount: data.projects_count || 0
  };
}
