/**
 * Phase 7: Project Timesheet Accordion
 * Expandable project cards showing members and their timesheets
 * Mobile-first design with 44px touch targets
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User
} from 'lucide-react';
import type { ProjectTimesheetGroup, TimesheetStatus } from '../../../types/timesheetApprovals';
import { MemberTimesheetCard } from './MemberTimesheetCard';

interface ProjectTimesheetAccordionProps {
  project: ProjectTimesheetGroup;
  currentUserRole: string;
  currentUserId: string;
  onApprove: (timesheetId: string, projectId: string) => void;
  onReject: (timesheetId: string, projectId: string, reason: string) => void;
  onViewDetails: (timesheetId: string, userId: string, projectId: string) => void;
  isLoading?: boolean;
}

/**
 * Get status badge color
 */
const getStatusColor = (status: TimesheetStatus): string => {
  const colors: Record<TimesheetStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-yellow-100 text-yellow-800',
    lead_approved: 'bg-blue-100 text-blue-800',
    manager_approved: 'bg-green-100 text-green-800',
    frozen: 'bg-green-100 text-green-800',
    billed: 'bg-purple-100 text-purple-800',
    rejected: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Get status icon
 */
const getStatusIcon = (status: TimesheetStatus) => {
  switch (status) {
    case 'manager_approved':
    case 'frozen':
    case 'billed':
      return <CheckCircle className="w-4 h-4" />;
    case 'rejected':
      return <XCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

export const ProjectTimesheetAccordion: React.FC<ProjectTimesheetAccordionProps> = ({
  project,
  currentUserRole,
  currentUserId,
  onApprove,
  onReject,
  onViewDetails,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate summary statistics
  const pendingCount = project.members.filter(
    m => m.current_week_timesheet?.manager_status === 'pending'
  ).length;

  const approvedCount = project.members.filter(
    m => m.current_week_timesheet?.manager_status === 'approved'
  ).length;

  const rejectedCount = project.members.filter(
    m => m.current_week_timesheet?.manager_status === 'rejected'
  ).length;

  const totalHours = project.members.reduce(
    (sum, m) => sum + (m.current_week_timesheet?.total_hours_for_project || 0),
    0
  );

  // Check if current user is the project manager
  const isProjectManager = currentUserId === project.manager_id;
  const isProjectLead = currentUserId === project.lead_id;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors min-h-[44px] active:bg-gray-100"
        disabled={isLoading}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Project Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-blue-600" />
          </div>

          {/* Project Info */}
          <div className="flex-1 min-w-0 text-left">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {project.project_name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {/* Manager Badge */}
              {isProjectManager && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  <User className="w-3 h-3 mr-1" />
                  You're Manager
                </span>
              )}

              {/* Lead Badge */}
              {isProjectLead && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  <User className="w-3 h-3 mr-1" />
                  You're Lead
                </span>
              )}

              {/* Member Count */}
              <span className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-1" />
                {project.total_members} {project.total_members === 1 ? 'member' : 'members'}
              </span>

              {/* Total Hours */}
              <span className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                {totalHours.toFixed(1)}h
              </span>
            </div>
          </div>
        </div>

        {/* Summary Stats & Expand Icon */}
        <div className="flex items-center space-x-3 ml-3 flex-shrink-0">
          {/* Pending Badge */}
          {pendingCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {pendingCount} pending
            </span>
          )}

          {/* Approved Badge */}
          {approvedCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {approvedCount} approved
            </span>
          )}

          {/* Rejected Badge */}
          {rejectedCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {rejectedCount} rejected
            </span>
          )}

          {/* Expand Icon */}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50">
          {/* Project Details Header */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Manager:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {project.manager_name}
                </span>
              </div>
              {project.lead_name && (
                <div>
                  <span className="text-gray-600">Lead:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {project.lead_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Members List */}
          <div className="p-4 space-y-3">
            {project.members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No members with timesheets this week</p>
              </div>
            ) : (
              project.members.map((member) => (
                <MemberTimesheetCard
                  key={member.user_id}
                  member={member}
                  projectId={project.project_id}
                  projectName={project.project_name}
                  currentUserRole={currentUserRole}
                  currentUserId={currentUserId}
                  isProjectManager={isProjectManager}
                  isProjectLead={isProjectLead}
                  onApprove={onApprove}
                  onReject={onReject}
                  onViewDetails={onViewDetails}
                  isLoading={isLoading}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
