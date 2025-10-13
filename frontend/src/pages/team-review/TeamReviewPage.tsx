/**
 * Phase 7: Team Review Page
 * Project-wise timesheet approval interface for Manager/Management roles
 * Mobile-first design with hierarchical Projects → Members → Entries view
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { useAuth } from '../../store/contexts/AuthContext';
import { useRoleManager } from '../../hooks/useRoleManager';
import TeamReviewService from '../../services/TeamReviewService';
import {
  ProjectTimesheetAccordion,
  BulkApprovalPanel
} from './components';
import type { ProjectTimesheetGroup, TeamReviewFilters } from '../../types/timesheetApprovals';

export const TeamReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, currentUserRole } = useAuth();
  const roleManager = useRoleManager();

  const [projects, setProjects] = useState<ProjectTimesheetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState<TeamReviewFilters>({
    status: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Check permissions
  const canApprove = roleManager.canApproveTimesheets();
  const canBulkVerify = roleManager.canVerifyTimesheets();

  useEffect(() => {
    if (!canApprove) {
      navigate('/dashboard');
      return;
    }
    loadProjects();
  }, [canApprove, navigate, filters]);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await TeamReviewService.getProjectTimesheetGroups(filters);
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (timesheetId: string, projectId: string) => {
    try {
      const response = await TeamReviewService.approveTimesheetForProject({
        timesheet_id: timesheetId,
        project_id: projectId,
        action: 'approve'
      });

      setSuccess(response.message);
      await loadProjects();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve timesheet');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleReject = async (timesheetId: string, projectId: string, reason: string) => {
    try {
      const response = await TeamReviewService.rejectTimesheetForProject({
        timesheet_id: timesheetId,
        project_id: projectId,
        action: 'reject',
        reason
      });

      setSuccess(response.message);
      await loadProjects();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject timesheet');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleBulkVerify = async (timesheetIds: string[], projectId?: string) => {
    try {
      const response = await TeamReviewService.bulkVerifyTimesheets({
        timesheet_ids: timesheetIds,
        project_id: projectId,
        action: 'verify'
      });

      setSuccess(`Verified ${response.processed_count} timesheets successfully`);
      await loadProjects();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk verify');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleBulkBill = async (timesheetIds: string[], projectId?: string) => {
    try {
      const response = await TeamReviewService.bulkBillTimesheets({
        timesheet_ids: timesheetIds,
        project_id: projectId,
        action: 'bill'
      });

      setSuccess(`Marked ${response.processed_count} timesheets as billed`);
      await loadProjects();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk bill');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleViewDetails = (timesheetId: string, userId: string, projectId: string) => {
    navigate(`/dashboard/timesheets/${timesheetId}?project=${projectId}&user=${userId}`);
  };

  // Filter projects by search term
  const filteredProjects = projects.filter(project =>
    project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.members.some(m => m.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate summary statistics
  const totalPending = projects.reduce((sum, p) => sum + p.pending_approvals_count, 0);
  const totalApproved = projects.reduce((sum, p) => sum + p.approved_this_week, 0);
  const totalRejected = projects.reduce((sum, p) => sum + p.rejected_this_week, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
              <FileCheck className="w-8 h-8 mr-3 text-blue-600" />
              Team Review
            </h1>
            <p className="text-gray-600 mt-1">
              Project-wise timesheet approval for {currentUserRole}
            </p>
          </div>

          <button
            onClick={loadProjects}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 min-h-[44px] active:bg-blue-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
          <div className="text-sm text-gray-600 mt-1">Pending Approval</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{totalApproved}</div>
          <div className="text-sm text-gray-600 mt-1">Approved This Week</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{totalRejected}</div>
          <div className="text-sm text-gray-600 mt-1">Rejected This Week</div>
        </div>
      </div>

      {/* Bulk Approval Panel (Management Only) */}
      {canBulkVerify && projects.length > 0 && (
        <div className="mb-6">
          <BulkApprovalPanel
            projects={projects}
            onBulkVerify={handleBulkVerify}
            onBulkBill={handleBulkBill}
            isLoading={loading}
          />
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects or members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full min-h-[44px]"
          />
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'No projects match your search.' : 'No projects with pending approvals.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <ProjectTimesheetAccordion
              key={project.project_id}
              project={project}
              currentUserRole={currentUserRole}
              currentUserId={currentUser?.id || ''}
              onApprove={handleApprove}
              onReject={handleReject}
              onViewDetails={handleViewDetails}
              isLoading={loading}
            />
          ))}
        </div>
      )}
    </div>
  );
};
