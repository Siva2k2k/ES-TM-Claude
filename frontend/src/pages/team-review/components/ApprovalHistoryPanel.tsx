/**
 * Phase 7: Approval History Panel
 * Timeline display of approval/rejection history for employees
 * Mobile-first design
 */

import React from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  DollarSign,
  Eye,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import type { ApprovalHistoryEntry, TimesheetStatus } from '../../../types/timesheetApprovals';
import * as formatting from '../../../utils/formatting';

interface ApprovalHistoryPanelProps {
  history: ApprovalHistoryEntry[];
  isLoading?: boolean;
}

/**
 * Get action icon and color
 */
const getActionDisplay = (action: ApprovalHistoryEntry['action']) => {
  const displays = {
    approved: {
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      text: 'Approved'
    },
    rejected: {
      icon: <XCircle className="w-5 h-5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      text: 'Rejected'
    },
    verified: {
      icon: <Eye className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      text: 'Verified'
    },
    billed: {
      icon: <DollarSign className="w-5 h-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      text: 'Billed'
    }
  };
  return displays[action];
};

/**
 * Get role badge color
 */
const getRoleBadgeColor = (role: string): string => {
  const colors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-800',
    management: 'bg-red-100 text-red-800',
    manager: 'bg-blue-100 text-blue-800',
    lead: 'bg-green-100 text-green-800',
    employee: 'bg-gray-100 text-gray-800'
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
};

/**
 * Get status display name
 */
const getStatusDisplayName = (status: TimesheetStatus): string => {
  const names: Record<TimesheetStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    lead_approved: 'Lead Approved',
    manager_approved: 'Manager Approved',
    frozen: 'Frozen',
    billed: 'Billed',
    rejected: 'Rejected'
  };
  return names[status] || status;
};

export const ApprovalHistoryPanel: React.FC<ApprovalHistoryPanelProps> = ({
  history,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No Approval History</h3>
          <p className="text-sm text-gray-500">
            This timesheet hasn't been reviewed yet
          </p>
        </div>
      </div>
    );
  }

  // Sort history by date (newest first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-gray-500" />
          Approval History
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Timeline of all approval actions
        </p>
      </div>

      {/* Timeline */}
      <div className="p-4">
        <div className="space-y-4">
          {sortedHistory.map((entry, index) => {
            const display = getActionDisplay(entry.action);
            const isLast = index === sortedHistory.length - 1;

            return (
              <div key={entry.id} className="relative">
                {/* Timeline Line */}
                {!isLast && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                )}

                {/* Entry Card */}
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 ${display.bgColor} rounded-full flex items-center justify-center ${display.color}`}>
                    {display.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      {/* Action Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${display.color}`}>
                            {display.text}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(entry.approver_role)}`}>
                            <Shield className="w-3 h-3 mr-1" />
                            {entry.approver_role}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatting.formatDate(entry.created_at, 'datetime')}
                        </div>
                      </div>

                      {/* Approver Info */}
                      <div className="flex items-center text-sm text-gray-700 mb-2">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">{entry.approver_name}</span>
                      </div>

                      {/* Project Info */}
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Project:</span> {entry.project_name}
                      </div>

                      {/* Status Change */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="px-2 py-0.5 bg-gray-200 rounded text-xs font-medium">
                          {getStatusDisplayName(entry.status_before)}
                        </span>
                        <span>→</span>
                        <span className="px-2 py-0.5 bg-gray-200 rounded text-xs font-medium">
                          {getStatusDisplayName(entry.status_after)}
                        </span>
                      </div>

                      {/* Rejection Reason */}
                      {entry.reason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm font-medium text-red-900 mb-1">
                            Reason:
                          </p>
                          <p className="text-sm text-red-800">{entry.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total Actions:</span>
          <span className="font-semibold text-gray-900">{history.length}</span>
        </div>
      </div>
    </div>
  );
};
