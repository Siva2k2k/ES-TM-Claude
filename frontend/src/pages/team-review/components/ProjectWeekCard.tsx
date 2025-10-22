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

// Helper functions extracted to reduce cognitive complexity
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'approved':
      return 'bg-green-50 border-green-200';
    case 'rejected':
      return 'bg-red-50 border-red-200';
    case 'partially_processed':
      return 'bg-blue-50 border-blue-200';
    default:
      return 'bg-white border-gray-200';
  }
};

const getStatusBadge = (status: string, subStatus?: string): JSX.Element => {
  const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
  switch (status) {
    case 'approved':
      return <span className={`${baseClasses} bg-green-100 text-green-800`}>Approved</span>;
    case 'rejected':
      return <span className={`${baseClasses} bg-red-100 text-red-800`}>Rejected</span>;
    case 'partially_processed':
      return (
        <span
          className={`${baseClasses} bg-blue-100 text-blue-800`}
          title={subStatus || 'Some timesheets approved, some pending'}
        >
          Partially Processed
        </span>
      );
    default:
      return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Pending Approval</span>;
  }
};

const calculateAggregatedHours = (
  users: ProjectWeekGroup['users'],
  userBillableData: Record<string, { worked_hours: number; billable_hours: number; billable_adjustment: number }>
) => {
  const totalWorkedHours = users.reduce((sum, u) => {
    const localData = userBillableData[u.user_id];
    return sum + (localData?.worked_hours ?? u.worked_hours ?? 0);
  }, 0);
  
  const totalBillableHours = users.reduce((sum, u) => {
    const localData = userBillableData[u.user_id];
    return sum + (localData?.billable_hours ?? u.billable_hours ?? 0);
  }, 0);
  
  const totalAdjustment = users.reduce((sum, u) => {
    const localData = userBillableData[u.user_id];
    return sum + (localData?.billable_adjustment ?? u.billable_adjustment ?? 0);
  }, 0);

  return { totalWorkedHours, totalBillableHours, totalAdjustment };
};

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
  const [userBillableData, setUserBillableData] = useState<Record<string, {
    worked_hours: number;
    billable_hours: number;
    billable_adjustment: number;
  }>>({});

  const handleBillableUpdate = (userId: string, data: {
    worked_hours: number;
    billable_hours: number;
    billable_adjustment: number;
  }) => {
    setUserBillableData(prev => ({
      ...prev,
      [userId]: data
    }));
  };

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

  const pendingUsers = projectWeek.users.filter(u => u.approval_status === 'pending');
  const hasPendingApprovals = pendingUsers.length > 0;

  const actionRole = approvalRole || 'manager';
  const isManagementMode = actionRole === 'management';
  
  // For management mode, exclude managers from the approval check
  // Managers have status 'management_pending', not 'manager_approved'
  const teamMembers = isManagementMode 
    ? projectWeek.users.filter(u => u.user_role !== 'manager')
    : projectWeek.users;
  
  const managerApprovedUsers = teamMembers.filter(u => u.timesheet_status !== 'management_pending');
  const allManagerApproved = managerApprovedUsers.length === teamMembers.length && teamMembers.length > 0;
  const hasManagerApproved = managerApprovedUsers.length > 0;

  const canShowActions = canApprove && (projectWeek.approval_status === 'pending' || projectWeek.approval_status === 'partially_processed');
  const shouldShowActions = canShowActions && (isManagementMode ? hasManagerApproved : hasPendingApprovals);

  const actionButtonDisabled = isLoading || (isManagementMode && !allManagerApproved);
  const actionButtonLabel = isManagementMode ? 'Verify All' : 'Approve All';
  
  const getActionButtonTitle = () => {
    if (isManagementMode) {
      return allManagerApproved
        ? 'Verify and freeze all manager-approved timesheets'
        : 'All timesheets must be manager approved before verification.';
    }
    return 'Approve all pending timesheets for this project-week.';
  };
  
  const rejectButtonTitle = isManagementMode
    ? 'Reject timesheets back to managers'
    : 'Reject all pending timesheets for this project-week.';
  
  // Show total_hours if provided, otherwise sum per-user totals as a fallback
  const displayHours = (typeof projectWeek.total_hours === 'number' && projectWeek.total_hours > 0)
    ? projectWeek.total_hours
    : projectWeek.users.reduce((sum, u) => sum + (u.total_hours_for_project || 0), 0);

  // Calculate aggregated worked hours and billable hours with local updates
  const { totalWorkedHours, totalBillableHours, totalAdjustment } = calculateAggregatedHours(
    projectWeek.users,
    userBillableData
  );

  return (
    <div className={`rounded-lg border-2 overflow-hidden transition-all ${getStatusColor(projectWeek.approval_status)}`}>
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Project Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {projectWeek.project_name}
              </h3>
              {getStatusBadge(projectWeek.approval_status, projectWeek.sub_status)}
              {projectWeek.is_reopened && (
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800"
                  title={`Reopened: ${projectWeek.original_approval_count} timesheets were approved, then new submissions were added`}
                >
                  Reopened
                </span>
              )}
            </div>
            {projectWeek.sub_status && (
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">{projectWeek.sub_status}</span>
              </div>
            )}
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
                  title={getActionButtonTitle()}
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
            {(projectWeek.pending_count !== undefined || projectWeek.approved_count !== undefined) && (
              <div className="text-xs mt-1 space-y-0.5">
                {projectWeek.approved_count !== undefined && projectWeek.approved_count > 0 && (
                  <div className="text-green-600">
                    {projectWeek.approved_count} approved
                  </div>
                )}
                {projectWeek.pending_count !== undefined && projectWeek.pending_count > 0 && (
                  <div className="text-yellow-600">
                    {projectWeek.pending_count} pending
                  </div>
                )}
                {projectWeek.rejected_count !== undefined && projectWeek.rejected_count > 0 && (
                  <div className="text-red-600">
                    {projectWeek.rejected_count} rejected
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Hours</span>
            </div>
            {(isManagementMode || approvalRole === 'manager') ? (
              <>
                <div className="text-2xl font-bold text-gray-900">
                  {totalBillableHours.toFixed(1)}
                </div>
                <div className="text-xs mt-1 space-y-0.5">
                  <div className="text-blue-600">
                    {totalWorkedHours.toFixed(1)}h worked
                  </div>
                  {totalAdjustment !== 0 && (
                    <div className={totalAdjustment >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {totalAdjustment >= 0 ? '+' : ''}{totalAdjustment.toFixed(1)}h adjust
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-2xl font-bold text-gray-900">
                {displayHours.toFixed(1)}
              </div>
            )}
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
                ? `${managerApprovedUsers.length}/${teamMembers.length} manager approved`
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
            <>
              {/* Show approval path groupings for Manager role */}
              {approvalRole === 'manager' && (
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700">
                        Lead Approved: {projectWeek.users.filter(u => u.timesheet_status === 'lead_approved').length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-700">
                        Direct Submit: {projectWeek.users.filter(u => u.timesheet_status === 'submitted' && u.user_role === 'employee').length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">
                        Team Leads: {projectWeek.users.filter(u => u.user_role === 'lead').length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="divide-y divide-gray-200">
                {projectWeek.users.map(user => (
                  console.log("User Timesheet Details:", user.approval_status),
                  <UserTimesheetDetails
                    key={user.user_id}
                    user={user}
                    projectId={projectWeek.project_id}
                    isExpanded={expandedUsers.has(user.user_id)}
                    onToggle={() => toggleUserExpansion(user.user_id)}
                    onApproveUser={() => onApproveUser?.(user.user_id, projectWeek.project_id)}
                    onRejectUser={() => onRejectUser?.(user.user_id, projectWeek.project_id)}
                    onBillableUpdate={(data) => handleBillableUpdate(user.user_id, data)}
                    canApprove={!!canApprove}
                    approvalRole={approvalRole}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
