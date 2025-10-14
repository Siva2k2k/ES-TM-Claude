/**
 * Team Review Page V2
 * Project-week based approval system with tabs, filters, and pagination
 * Supports Management, Manager, and Lead roles
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../store/contexts/AuthContext';
import { useRoleManager } from '../../hooks/useRoleManager';
import TeamReviewService from '../../services/TeamReviewService';
import {
  FilterBar,
  PaginationControls,
  ProjectWeekCard,
  ProjectWeekApprovalModal
} from './components';
import type {
  ProjectWeekFilters,
  ProjectWeekGroup,
  ProjectWeekResponse
} from '../../types/timesheetApprovals';

type TabStatus = 'pending' | 'approved' | 'rejected';

export const TeamReviewPageV2: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, currentUserRole } = useAuth();
  const roleManager = useRoleManager();

  // State
  const [activeTab, setActiveTab] = useState<TabStatus>('pending');
  const [data, setData] = useState<ProjectWeekResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
  }>({
    isOpen: false,
    projectWeek: null,
    action: 'approve'
  });

  // Check permissions
  const canApprove = roleManager.canApproveTimesheets();

  useEffect(() => {
    if (!canApprove) {
      navigate('/dashboard');
      return;
    }
    loadProjectWeeks();
  }, [canApprove, navigate, filters]);

  // Load project weeks
  const loadProjectWeeks = async () => {
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
  };

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
    setModalState({
      isOpen: true,
      projectWeek,
      action: 'approve'
    });
  };

  const handleRejectClick = (projectWeek: ProjectWeekGroup) => {
    setModalState({
      isOpen: true,
      projectWeek,
      action: 'reject'
    });
  };

  const handleModalConfirm = async (reason?: string) => {
    if (!modalState.projectWeek) return;

    try {
      if (modalState.action === 'approve') {
        await TeamReviewService.approveProjectWeek(
          modalState.projectWeek.project_id,
          modalState.projectWeek.week_start,
          modalState.projectWeek.week_end
        );
        setSuccess(`Successfully approved ${modalState.projectWeek.project_name} - ${modalState.projectWeek.week_label}`);
      } else {
        if (!reason) throw new Error('Rejection reason is required');
        await TeamReviewService.rejectProjectWeek(
          modalState.projectWeek.project_id,
          modalState.projectWeek.week_start,
          modalState.projectWeek.week_end,
          reason
        );
        setSuccess(`Successfully rejected ${modalState.projectWeek.project_name} - ${modalState.projectWeek.week_label}`);
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

  // Tab counts
  const tabCounts = {
    pending: data?.pagination.total || 0,
    approved: 0,
    rejected: 0
  };

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
        onConfirm={handleModalConfirm}
        isLoading={loading}
      />
    </div>
  );
};

export default TeamReviewPageV2;
