/**
 * Phase 7: Member Timesheet Card
 * Displays member's project-filtered timesheet with approval actions
 * Mobile-first design with 44px touch targets
 */

import React, { useState } from 'react';
import {
  User,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Shield,
  Calendar,
  ChevronRight
} from 'lucide-react';
import type { ProjectMemberTimesheet, ApprovalStatus } from '../../../types/timesheetApprovals';
import { ApprovalActions } from './ApprovalActions';

interface MemberTimesheetCardProps {
  member: ProjectMemberTimesheet;
  projectId: string;
  projectName: string;
  currentUserRole: string;
  currentUserId: string;
  isProjectManager: boolean;
  isProjectLead: boolean;
  onApprove: (timesheetId: string, projectId: string) => void;
  onReject: (timesheetId: string, projectId: string, reason: string) => void;
  onViewDetails: (timesheetId: string, userId: string, projectId: string) => void;
  isLoading?: boolean;
}

/**
 * Get approval status badge
 */
const getApprovalStatusBadge = (status: ApprovalStatus) => {
  const badges: Record<ApprovalStatus, { icon: React.ReactNode; color: string; text: string }> = {
    approved: {
      icon: <CheckCircle className="w-3 h-3" />,
      color: 'bg-green-100 text-green-800',
      text: 'Approved'
    },
    rejected: {
      icon: <XCircle className="w-3 h-3" />,
      color: 'bg-red-100 text-red-800',
      text: 'Rejected'
    },
    pending: {
      icon: <Clock className="w-3 h-3" />,
      color: 'bg-yellow-100 text-yellow-800',
      text: 'Pending'
    },
    not_required: {
      icon: <AlertCircle className="w-3 h-3" />,
      color: 'bg-gray-100 text-gray-600',
      text: 'Not Required'
    }
  };

  const badge = badges[status];
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color} gap-1`}>
      {badge.icon}
      {badge.text}
    </span>
  );
};

/**
 * Get role badge color
 */
const getRoleBadgeColor = (role: string): string => {
  const colors: Record<string, string> = {
    lead: 'bg-green-100 text-green-800',
    employee: 'bg-gray-100 text-gray-800'
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
};

export const MemberTimesheetCard: React.FC<MemberTimesheetCardProps> = ({
  member,
  projectId,
  projectName,
  currentUserRole,
  currentUserId,
  isProjectManager,
  isProjectLead,
  onApprove,
  onReject,
  onViewDetails,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const timesheet = member.current_week_timesheet;

  // No timesheet submitted this week
  if (!timesheet) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">{member.user_name}</h4>
              <p className="text-xs text-gray-500">{member.user_email}</p>
            </div>
          </div>
          <span className="text-sm text-gray-500">No timesheet this week</span>
        </div>
      </div>
    );
  }

  // Determine if current user can approve this timesheet
  const canApproveAsLead = isProjectLead && member.project_role === 'employee' && timesheet.lead_status === 'pending';
  const canApproveAsManager = isProjectManager && timesheet.manager_status === 'pending' && timesheet.lead_status !== 'pending';
  const canApprove = canApproveAsLead || canApproveAsManager;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Member Info */}
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {member.user_name}
              </h4>
              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {member.user_email}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {/* Project Role Badge */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(member.project_role)}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {member.project_role === 'lead' ? 'Lead' : 'Employee'}
                </span>
              </div>
            </div>
          </div>

          {/* Hours Badge */}
          <div className="flex-shrink-0 text-right">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
              <Clock className="w-4 h-4 mr-1" />
              {timesheet.total_hours_for_project}h
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {timesheet.entries_count} {timesheet.entries_count === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        </div>

        {/* Week Info */}
        <div className="mt-3 flex items-center text-xs text-gray-600">
          <Calendar className="w-3 h-3 mr-1" />
          {new Date(timesheet.week_start).toLocaleDateString()} - {new Date(timesheet.week_end).toLocaleDateString()}
        </div>

        {/* Approval Status */}
        <div className="mt-3 space-y-2">
          {/* Lead Approval Status (if applicable) */}
          {timesheet.lead_status !== 'not_required' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Lead Approval:</span>
              {getApprovalStatusBadge(timesheet.lead_status)}
            </div>
          )}

          {/* Manager Approval Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Manager Approval:</span>
            {getApprovalStatusBadge(timesheet.manager_status)}
          </div>

          {/* Rejection Reason */}
          {timesheet.rejection_reason && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-800">
                <span className="font-medium">Rejection Reason:</span> {timesheet.rejection_reason}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-200 bg-gray-50 p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* View Details Button */}
          <button
            onClick={() => onViewDetails(timesheet.timesheet_id, member.user_id, projectId)}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px] active:bg-gray-100"
            disabled={isLoading}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>

          {/* Approval Actions */}
          {canApprove && (
            <ApprovalActions
              timesheetId={timesheet.timesheet_id}
              projectId={projectId}
              onApprove={onApprove}
              onReject={onReject}
              isLoading={isLoading}
              variant="compact"
            />
          )}
        </div>
      </div>
    </div>
  );
};
