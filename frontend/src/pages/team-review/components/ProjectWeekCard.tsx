/**
 * ProjectWeekCard Component
 * Card displaying project-week with users and approval actions
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Users, Clock, FileText, AlertTriangle } from 'lucide-react';
import { UserTimesheetDetails } from './UserTimesheetDetails';
import type { ProjectWeekGroup } from '../../../types/timesheetApprovals';

interface ProjectWeekCardProps {
  projectWeek: ProjectWeekGroup;
  onApprove: (projectWeek: ProjectWeekGroup) => void;
  onReject: (projectWeek: ProjectWeekGroup) => void;
  onApproveUser?: (userId: string, projectWeekId: string) => void;
  onRejectUser?: (userId: string, projectWeekId: string) => void;
  canApprove?: boolean;
  approvalRole?: 'lead' | 'manager' | 'management';
  isLoading?: boolean;
}

export const ProjectWeekCard: React.FC<ProjectWeekCardProps> = ({
  projectWeek,
  onApprove,
  onReject,
  onApproveUser,
  onRejectUser,
  canApprove = false,
  approvalRole = 'manager',
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const getStatusColor = () => {
    switch (projectWeek.approval_status) {
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getStatusBadge = () => {
    const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
    switch (projectWeek.approval_status) {
      case 'approved':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Approved</span>;
      case 'rejected':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Rejected</span>;
      default:
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Pending Approval</span>;
    }
  };

  const pendingUsers = projectWeek.users.filter(u => u.approval_status === 'pending');
  const hasPendingApprovals = pendingUsers.length > 0;

  const actionRole = approvalRole || 'manager';
  const isManagementMode = actionRole === 'management';
  const managerApprovedUsers = projectWeek.users.filter(u => u.timesheet_status === 'manager_approved');
  const allManagerApproved = managerApprovedUsers.length === projectWeek.users.length && projectWeek.users.length > 0;
  const hasManagerApproved = managerApprovedUsers.length > 0;

  const shouldShowActions =
    canApprove &&
    projectWeek.approval_status === 'pending' &&
    (isManagementMode ? hasManagerApproved : hasPendingApprovals);

  const actionButtonDisabled = isLoading || (isManagementMode && !allManagerApproved);
  const actionButtonLabel = isManagementMode ? 'Verify All' : 'Approve All';
  const actionButtonTitle = isManagementMode
    ? allManagerApproved
      ? 'Verify and freeze all manager-approved timesheets'
      : 'All timesheets must be manager approved before verification.'
    : 'Approve all pending timesheets for this project-week.';
  const rejectButtonTitle = isManagementMode
    ? 'Reject timesheets back to managers'
    : 'Reject all pending timesheets for this project-week.';
  // Show total_hours if provided, otherwise sum per-user totals as a fallback
  const displayHours = (typeof projectWeek.total_hours === 'number' && projectWeek.total_hours > 0)
    ? projectWeek.total_hours
    : projectWeek.users.reduce((sum, u) => sum + (u.total_hours_for_project || 0), 0);

  return (
    <div className={`rounded-lg border-2 overflow-hidden transition-all ${getStatusColor()}`}>
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Project Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {projectWeek.project_name}
              </h3>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">{projectWeek.week_label}</span>
              <span className="text-gray-400">•</span>
              <span>Manager: {projectWeek.manager_name}</span>
              {projectWeek.lead_name && (
                <>
                  <span className="text-gray-400">•</span>
                  <span>Lead: {projectWeek.lead_name}</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons (Only for pending) */}
          {shouldShowActions && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onApprove(projectWeek)}
                  disabled={actionButtonDisabled}
                  title={actionButtonTitle}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[42px]"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{actionButtonLabel}</span>
                </button>
                <button
                  onClick={() => onReject(projectWeek)}
                  disabled={isLoading}
                  title={rejectButtonTitle}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[42px]"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject All</span>
                </button>
              </div>
              {isManagementMode && !allManagerApproved && (
                <div className="flex items-center gap-2 text-xs text-yellow-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span>All project members must be manager approved before final verification.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600">Users</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{projectWeek.total_users}</div>
            {hasPendingApprovals && (
              <div className="text-xs text-yellow-600 mt-1">
                {pendingUsers.length} pending
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Hours</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {displayHours.toFixed(1)}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-600">Entries</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{projectWeek.total_entries}</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-600">Status</span>
            </div>
            <div className="text-lg font-semibold text-gray-900 capitalize">
              {isManagementMode
                ? `${managerApprovedUsers.length}/${projectWeek.total_users} manager approved`
                : projectWeek.approval_status}
            </div>
            {isManagementMode && (
              <div className="text-xs text-gray-500 mt-1">
                {allManagerApproved ? 'Ready for final verification' : 'Waiting on manager approvals'}
              </div>
            )}
          </div>
        </div>

        {/* Rejection Reason (if rejected) */}
        {projectWeek.approval_status === 'rejected' && projectWeek.rejected_reason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-red-900 mb-2">Rejection Reason:</h4>
            <p className="text-sm text-red-800">{projectWeek.rejected_reason}</p>
            {projectWeek.rejected_at && (
              <p className="text-xs text-red-600 mt-2">
                Rejected on {new Date(projectWeek.rejected_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Hide User Details</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>View User Details ({projectWeek.users.length} users)</span>
            </>
          )}
        </button>
      </div>

      {/* Expanded User Details */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {projectWeek.users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No users found for this project-week
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {projectWeek.users.map(user => (
                <UserTimesheetDetails
                  key={user.user_id}
                  user={user}
                  isExpanded={expandedUsers.has(user.user_id)}
                  onToggle={() => toggleUserExpansion(user.user_id)}
                  onApproveUser={() => onApproveUser && onApproveUser(user.user_id, projectWeek.project_id)}
                  onRejectUser={() => onRejectUser && onRejectUser(user.user_id, projectWeek.project_id)}
                  canApprove={!!canApprove}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
