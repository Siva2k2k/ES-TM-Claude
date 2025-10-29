/**
 * Team Review Page V2
 * Project-week based approval system with tabs, filters, and pagination
 * Supports Management, Manager, and Lead roles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, AlertCircle, CheckCircle, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../../store/contexts/AuthContext';
import { useRoleManager } from '../../hooks/useRoleManager';
import TeamReviewService from '../../services/TeamReviewService';
import { backendApi } from '../../lib/backendApi';
import {
  FilterBar,
  PaginationControls,
  ProjectWeekCard,
  ProjectWeekApprovalModal
} from './components';
import UserRejectModal from './components/UserRejectModal';
import type {
  ProjectWeekFilters,
  ProjectWeekGroup,
  ProjectWeekResponse
} from '../../types/timesheetApprovals';

type TabStatus = 'pending' | 'approved' | 'rejected';

interface MissingSubmission {
  user_id: string;
  user_name: string;
  user_email?: string;
  role: string;
  project_id: string;
  project_name: string;
  week_start_date: string;
  week_end_date: string;
  message: string;
}

export const TeamReviewPageV2: React.FC = () => {
  const navigate = useNavigate();
  const { currentUserRole } = useAuth();
  const roleManager = useRoleManager();

  const approvalRole: 'lead' | 'manager' | 'management' =
    currentUserRole === 'management' || currentUserRole === 'super_admin'
      ? 'management'
      : currentUserRole === 'manager'
      ? 'manager'
      : 'lead';

  const isManagementRole = approvalRole === 'management';

  // State
  const [activeTab, setActiveTab] = useState<TabStatus>('pending');
  const [data, setData] = useState<ProjectWeekResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [missingSubmissions, setMissingSubmissions] = useState<MissingSubmission[]>([]);
  const [loadingMissing, setLoadingMissing] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<ProjectWeekFilters>({
    status: 'pending',
    sort_by: 'week_date',
    sort_order: 'desc',
    page: 1,
    limit: 10
  });

  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    projectWeek: ProjectWeekGroup | null;
    action: 'approve' | 'reject';
    approvalRole: 'lead' | 'manager' | 'management';
  }>({
    isOpen: false,
    projectWeek: null,
    action: 'approve',
    approvalRole
  });

  // Check permissions
  const canApprove = roleManager.canApproveTimesheets();

  // Load project weeks (memoized)
  const loadProjectWeeks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await TeamReviewService.getProjectWeekGroups(filters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project weeks');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load missing submissions
  const loadMissingSubmissions = useCallback(async () => {
    setLoadingMissing(true);
    try {
      const response = await backendApi.get<{
        success: boolean;
        user_id: string;
        user_role: string;
        missing_submissions: MissingSubmission[];
        count: number;
        period: string;
      }>('/defaulters/missing-submissions');

      setMissingSubmissions(response.missing_submissions || []);
    } catch (err) {
      console.error('Error loading missing submissions:', err);
      setMissingSubmissions([]);
    } finally {
      setLoadingMissing(false);
    }
  }, []);


  useEffect(() => {
    if (!canApprove) {
      navigate('/dashboard');
      return;
    }
    loadProjectWeeks();
    loadMissingSubmissions();
  }, [canApprove, navigate, filters, loadProjectWeeks, loadMissingSubmissions]);

  // Handle tab change
  const handleTabChange = (tab: TabStatus) => {
    setActiveTab(tab);
    setFilters(prev => ({
      ...prev,
      status: tab,
      page: 1
    }));
  };

  // Handle filter change
  const handleFiltersChange = (newFilters: ProjectWeekFilters) => {
    setFilters({
      ...newFilters,
      status: activeTab // Keep current tab status
    });
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }));
  };

  // Handle approval actions
  const handleApproveClick = (projectWeek: ProjectWeekGroup) => {
    if (isManagementRole) {
      // Filter out managers from the approval check (they have management_pending status)
      const teamMembers = projectWeek.users.filter(user => user.user_role !== 'manager');
      const allManagerApproved =
        teamMembers.length > 0 && teamMembers.every(user => user.manager_status === 'approved');

      if (!allManagerApproved) {
        setError('All team member timesheets in this project must be manager approved before final verification.');
        setTimeout(() => setError(null), 5000);
        return;
      }
    }

    setModalState({
      isOpen: true,
      projectWeek,
      action: 'approve',
      approvalRole
    });
  };

  const handleRejectClick = (projectWeek: ProjectWeekGroup) => {
    setModalState({
      isOpen: true,
      projectWeek,
      action: 'reject',
      approvalRole
    });
  };

  // Per-user approve/reject handlers (called from ProjectWeekCard -> UserTimesheetDetails)
  const handleApproveUser = async (userId: string, projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      // userId corresponds to the member's user id; need to find their timesheet id from current data
      const projectWeek = data?.project_weeks.find(pw => pw.project_id === projectId && pw.users.some(u => u.user_id === userId));
      const user = projectWeek?.users.find(u => u.user_id === userId);
      if (!user) throw new Error('Timesheet not found for the user');

      await TeamReviewService.approveTimesheetForProject({
        timesheet_id: user.timesheet_id,
        project_id: projectId,
        action: 'approve'
      });

      setSuccess(`Approved ${user.user_name}'s timesheet for ${projectWeek?.project_name}`);
      setTimeout(() => setSuccess(null), 4000);

      // Refresh the project weeks to reflect updated approval state
      await loadProjectWeeks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve user timesheet');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = async (userId: string, projectId: string) => {
    // Open a modal to collect rejection reason. We'll set modal state below.
    const projectWeek = data?.project_weeks.find(pw => pw.project_id === projectId && pw.users.some(u => u.user_id === userId));
    const user = projectWeek?.users.find(u => u.user_id === userId);
    if (!user) {
      setError('Timesheet not found for the user');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setUserRejectState({ isOpen: true, userId: user.user_id, userName: user.user_name, projectId, projectName: projectWeek?.project_name || '' });
  };

  // State for per-user reject modal
  const [userRejectState, setUserRejectState] = useState<{
    isOpen: boolean;
    userId?: string;
    userName?: string;
    projectId?: string;
    projectName?: string;
  }>({ isOpen: false });

  const handleUserRejectConfirm = async (reason: string) => {
    if (!userRejectState.userId || !userRejectState.projectId) return;
    setLoading(true);
    setError(null);
    try {
      // find timesheet id
      const projectWeek = data?.project_weeks.find(pw => pw.project_id === userRejectState.projectId && pw.users.some(u => u.user_id === userRejectState.userId));
      const user = projectWeek?.users.find(u => u.user_id === userRejectState.userId);
      if (!user) throw new Error('Timesheet not found for the user');

      await TeamReviewService.rejectTimesheetForProject({
        timesheet_id: user.timesheet_id,
        project_id: userRejectState.projectId,
        reason,
        action: 'reject'
      });

      setSuccess(`Rejected ${user.user_name}'s timesheet for ${projectWeek?.project_name}`);
      setTimeout(() => setSuccess(null), 4000);

      // Close modal and refresh
      setUserRejectState({ isOpen: false });
      await loadProjectWeeks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject user timesheet');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleModalConfirm = async (reason?: string) => {
    const projectWeek = modalState.projectWeek;
    if (!projectWeek) return;

    try {
      if (modalState.action === 'approve') {
        if (modalState.approvalRole === 'management') {
          const managerApprovedUsers = projectWeek.users.filter(user => user.manager_status === 'approved' || user.timesheet_status === 'management_pending');

          if (managerApprovedUsers.length !== projectWeek.users.length) {
            throw new Error('All timesheets must be manager approved before verification.');
          }

          await TeamReviewService.bulkVerifyTimesheets({
            timesheet_ids: managerApprovedUsers.map(user => user.timesheet_id),
            project_id: projectWeek.project_id,
            action: 'verify'
          });

          setSuccess(`Successfully verified ${managerApprovedUsers.length} timesheet${managerApprovedUsers.length === 1 ? '' : 's'} for ${projectWeek.project_name} - ${projectWeek.week_label}.`);
        } else {
          await TeamReviewService.approveProjectWeek(
            projectWeek.project_id,
            projectWeek.week_start,
            projectWeek.week_end
          );
          setSuccess(`Successfully approved ${projectWeek.project_name} - ${projectWeek.week_label}`);
        }
      } else {
        if (!reason) throw new Error('Rejection reason is required');
        await TeamReviewService.rejectProjectWeek(
          projectWeek.project_id,
          projectWeek.week_start,
          projectWeek.week_end,
          reason
        );
        setSuccess(`Successfully rejected ${projectWeek.project_name} - ${projectWeek.week_label}`);
      }
      // Reload data
      await loadProjectWeeks();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      setTimeout(() => setError(null), 5000);
      throw err; // Re-throw to prevent modal from closing
    }
  };

  // Get unique projects for filter dropdown
  const uniqueProjects = React.useMemo(() => {
    if (!data?.project_weeks) return [];
    const projectMap = new Map<string, { id: string; name: string }>();
    data.project_weeks.forEach(pw => {
      if (!projectMap.has(pw.project_id)) {
        projectMap.set(pw.project_id, {
          id: pw.project_id,
          name: pw.project_name
        });
      }
    });
    return Array.from(projectMap.values());
  }, [data]);

  // (tabCounts not used) - remove to satisfy linter

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-blue-600" />
              Team Review
            </h1>
            <p className="text-gray-600 mt-1">
              Project-week approval for {currentUserRole}
            </p>
          </div>

          <button
            onClick={loadProjectWeeks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 min-h-[44px] active:bg-blue-800"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Defaulter's List */}
      {missingSubmissions.length > 0 && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Defaulter's List</h2>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              {missingSubmissions.length} missing submission{missingSubmissions.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="space-y-3">
            {missingSubmissions.map((submission) => (
              <div key={`${submission.user_id}-${submission.project_id}-${submission.week_start_date}`} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-800">
                  {submission.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {(['pending', 'approved', 'rejected'] as TabStatus[]).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="capitalize">{tab}</span>
              {activeTab === tab && data && (
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                  {data.pagination.total}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        projects={uniqueProjects}
        isLoading={loading}
      />

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project weeks...</p>
        </div>
      ) : !data || data.project_weeks.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Project-Weeks Found
          </h3>
          <p className="text-gray-600">
            {filters.search
              ? 'No project-weeks match your search.'
              : `No ${activeTab} project-weeks in the selected date range.`}
          </p>
        </div>
      ) : (
        <>
          {/* Project-Week Cards */}
          <div className="space-y-6 mb-6">
            {data.project_weeks.map(projectWeek => (
              <ProjectWeekCard
                key={`${projectWeek.project_id}-${projectWeek.week_start}`}
                projectWeek={projectWeek}
                onApprove={handleApproveClick}
                onReject={handleRejectClick}
                onApproveUser={isManagementRole ? undefined : handleApproveUser}
                onRejectUser={isManagementRole ? undefined : handleRejectUser}
                canApprove={canApprove}
                approvalRole={approvalRole}
                isLoading={loading}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.pagination && data.pagination.total > 0 && (
            <PaginationControls
              pagination={data.pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              isLoading={loading}
            />
          )}
        </>
      )}

      {/* Approval Modal */}
      <ProjectWeekApprovalModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        projectWeek={modalState.projectWeek}
        action={modalState.action}
        approvalRole={modalState.approvalRole}
        onConfirm={handleModalConfirm}
        isLoading={loading}
      />
      <UserRejectModal
        isOpen={userRejectState.isOpen}
        onClose={() => setUserRejectState({ isOpen: false })}
        userName={userRejectState.userName || null}
        projectName={userRejectState.projectName || null}
        onConfirm={handleUserRejectConfirm}
        isLoading={loading}
      />
    </div>
  );
};

export default TeamReviewPageV2;
