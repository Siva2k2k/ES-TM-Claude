/**
 * Approval History Modal Component
 * 
 * Displays the complete approval history for a timesheet in a modal dialog.
 * Shows timeline of all approval/rejection actions with project-wise breakdown.
 * 
 * Features:
 * - Fetches approval history from backend
 * - Timeline visualization with icons
 * - Project-wise approval status
 * - Pending approvals indication
 * - Loading and error states
 * - Mobile responsive design
 * 
 * Cognitive Complexity: <15 (SonarQube compliant)
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  User,
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
  Eye,
  DollarSign
} from 'lucide-react';
import { TeamReviewService } from '../../services/TeamReviewService';
import type { ApprovalHistoryEntry, TimesheetProjectApproval } from '../../types/timesheetApprovals';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ApprovalHistoryModalProps {
  timesheetId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TimesheetHistoryData {
  timesheet: {
    user_name?: string;
    week_start: string;
    week_end: string;
    status: string;
  };
  project_approvals: TimesheetProjectApproval[];
  approval_history: ApprovalHistoryEntry[];
}

export const ApprovalHistoryModal: React.FC<ApprovalHistoryModalProps> = ({
  timesheetId,
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<TimesheetHistoryData | null>(null);

  useEffect(() => {
    if (isOpen && timesheetId) {
      fetchApprovalHistory();
    }
  }, [isOpen, timesheetId]);

  const fetchApprovalHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await TeamReviewService.getTimesheetWithHistory(timesheetId);
      // The backend returns top-level keys: timesheet, project_approvals, approval_history
      const ts = data.timesheet as any || {};
      // Provide friendly aliases so the UI can read `week_start`/`week_end`
      const timesheetOut = {
        ...ts,
        week_start: ts.week_start_date || ts.week_start,
        week_end: ts.week_end_date || ts.week_end
      };

      setHistoryData({
        timesheet: timesheetOut,
        project_approvals: data.timesheet?.project_approvals || [],
        approval_history: data.approval_history || []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approval history');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-indigo-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Approval History
                </h2>
                {historyData?.timesheet && (
                  <p className="text-sm text-gray-500">
                    Week of {formatDate(historyData.timesheet.week_start)}
                    {historyData.timesheet.user_name && ` - ${historyData.timesheet.user_name}`}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              icon={X}
              className="text-gray-400 hover:text-gray-600"
            />
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {loading && <LoadingState />}
            {error && <ErrorState error={error} onRetry={fetchApprovalHistory} />}
            {!loading && !error && historyData && (
              <div className="p-6 space-y-6">
                {/* Current Status Section */}
                <CurrentStatusSection
                  projectApprovals={historyData.project_approvals}
                  timesheetStatus={historyData.timesheet.status}
                />

                {/* Approval History Timeline */}
                <ApprovalHistoryTimeline
                  history={historyData.approval_history}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading State Component
const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
    <p className="text-gray-600">Loading approval history...</p>
  </div>
);

// Error State Component
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6">
    <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
    <p className="text-red-600 text-center mb-4">{error}</p>
    <Button variant="outline" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

// Current Status Section Component
interface CurrentStatusSectionProps {
  projectApprovals: TimesheetProjectApproval[];
  timesheetStatus: string;
}

const CurrentStatusSection: React.FC<CurrentStatusSectionProps> = ({
  projectApprovals,
  timesheetStatus
}) => {
  if (projectApprovals.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-indigo-600" />
        Current Approval Status
      </h3>
      <div className="space-y-3">
        {projectApprovals.map((approval) => (
          <ProjectApprovalCard key={approval.project_id} approval={approval} />
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Overall Status:</span>
          <StatusBadge status={timesheetStatus} />
        </div>
      </div>
    </Card>
  );
};

// Project Approval Card Component
interface ProjectApprovalCardProps {
  approval: TimesheetProjectApproval;
}

const ProjectApprovalCard: React.FC<ProjectApprovalCardProps> = ({ approval }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'rejected':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 text-sm">
            {approval.project_name}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {approval.total_hours} hours • {approval.entries_count} entries
          </p>
        </div>
      </div>

      <div className="space-y-2 mt-3">
        {/* Lead Approval */}
        {approval.lead_id && (
          <div className={`flex items-center justify-between p-2 rounded border ${getStatusColor(approval.lead_status)}`}>
            <div className="flex items-center gap-2">
              {getStatusIcon(approval.lead_status)}
              <div>
                <p className="text-xs font-medium">Lead</p>
                <p className="text-xs">{approval.lead_name || 'Unknown'}</p>
              </div>
            </div>
            <span className="text-xs font-semibold capitalize">{approval.lead_status}</span>
          </div>
        )}

        {/* Manager Approval */}
        <div className={`flex items-center justify-between p-2 rounded border ${getStatusColor(approval.manager_status)}`}>
          <div className="flex items-center gap-2">
            {getStatusIcon(approval.manager_status)}
            <div>
              <p className="text-xs font-medium">Manager</p>
              <p className="text-xs">{approval.manager_name || 'Unknown'}</p>
            </div>
          </div>
          <span className="text-xs font-semibold capitalize">{approval.manager_status}</span>
        </div>

        {/* Rejection Reasons */}
        {approval.lead_rejection_reason && (
          <div className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200">
            <strong>Lead Rejection:</strong> {approval.lead_rejection_reason}
          </div>
        )}
        {approval.manager_rejection_reason && (
          <div className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200">
            <strong>Manager Rejection:</strong> {approval.manager_rejection_reason}
          </div>
        )}
      </div>
    </div>
  );
};

// Approval History Timeline Component
interface ApprovalHistoryTimelineProps {
  history: ApprovalHistoryEntry[];
}

const ApprovalHistoryTimeline: React.FC<ApprovalHistoryTimelineProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No Approval History</h3>
          <p className="text-sm text-gray-500">
            This timesheet hasn't been reviewed yet
          </p>
        </div>
      </Card>
    );
  }

  // Sort history by date (newest first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-indigo-600" />
        Timeline ({history.length} {history.length === 1 ? 'action' : 'actions'})
      </h3>
      <div className="space-y-4">
        {sortedHistory.map((entry, index) => (
          <TimelineEntry
            key={entry.id}
            entry={entry}
            isLast={index === sortedHistory.length - 1}
          />
        ))}
      </div>
    </Card>
  );
};

// Timeline Entry Component
interface TimelineEntryProps {
  entry: ApprovalHistoryEntry;
  isLast: boolean;
}

const TimelineEntry: React.FC<TimelineEntryProps> = ({ entry, isLast }) => {
  const getActionDisplay = (action: string) => {
    const displays: Record<string, { icon: React.ReactNode; color: string; bgColor: string; text: string }> = {
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
    return displays[action] || displays.approved;
  };

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

  const display = getActionDisplay(entry.action);

  return (
    <div className="relative">
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
                {formatDateTime(entry.created_at)}
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
                {formatStatus(entry.status_before)}
              </span>
              <span>→</span>
              <span className="px-2 py-0.5 bg-gray-200 rounded text-xs font-medium">
                {formatStatus(entry.status_after)}
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
};

// Status Badge Component
interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      lead_approved: 'bg-green-100 text-green-800',
      manager_approved: 'bg-green-100 text-green-800',
      frozen: 'bg-indigo-100 text-indigo-800',
      billed: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {formatStatus(status)}
    </span>
  );
};

// Utility Functions
const formatDate = (date?: string | Date | null): string => {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatDateTime = (date?: Date | string | null): string => {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const formatStatus = (status: string): string => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
