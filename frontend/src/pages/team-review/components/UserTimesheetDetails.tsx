/**
 * UserTimesheetDetails Component
 * Displays user's timesheet entries for a project-week
 */

import React from 'react';
import { Clock, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { ProjectWeekUser } from '../../../types/timesheetApprovals';

interface UserTimesheetDetailsProps {
  user: ProjectWeekUser;
  isExpanded: boolean;
  onToggle: () => void;
}

export const UserTimesheetDetails: React.FC<UserTimesheetDetailsProps> = ({
  user,
  isExpanded,
  onToggle
}) => {
  const getStatusIcon = () => {
    switch (user.approval_status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = () => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (user.approval_status) {
      case 'approved':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Approved</span>;
      case 'rejected':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Rejected</span>;
      default:
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Pending</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    }).format(date);
  };

  const groupedEntries = user.entries.reduce((acc, entry) => {
    const date = entry.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, typeof user.entries>);

  return (
    <div className="border-t border-gray-200">
      {/* User Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Status Icon */}
          <div>{getStatusIcon()}</div>

          {/* User Info */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{user.user_name}</span>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span>{user.user_email}</span>
              <span className="text-gray-400">•</span>
              <span className="capitalize">{user.project_role}</span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {user.total_hours_for_project.toFixed(1)}h
              </div>
              <div className="text-xs text-gray-500">Total Hours</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {user.entries.length}
              </div>
              <div className="text-xs text-gray-500">Entries</div>
            </div>
          </div>

          {/* Expand Icon */}
          <div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isExpanded ? 'transform rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 bg-gray-50">
          {user.entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No time entries found for this project-week
            </div>
          ) : (
            <div className="space-y-4">
              {/* Entries Grouped by Date */}
              {Object.entries(groupedEntries).map(([date, entries]) => {
                const dayTotal = entries.reduce((sum, e) => sum + e.hours, 0);
                return (
                  <div key={date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* Date Header */}
                    <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-900">
                          {formatDate(date)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {dayTotal.toFixed(1)}h
                      </span>
                    </div>

                    {/* Entries for this date */}
                    <div className="divide-y divide-gray-200">
                      {entries.map(entry => (
                        <div key={entry.entry_id} className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            {/* Task Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">
                                  {entry.task_name}
                                </span>
                                {entry.is_billable && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                    Billable
                                  </span>
                                )}
                              </div>
                              {entry.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {entry.description}
                                </p>
                              )}
                            </div>

                            {/* Hours */}
                            <div className="flex items-center gap-1 text-gray-900 font-medium">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>{entry.hours.toFixed(1)}h</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Timesheet Status Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Timesheet Status:</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {user.timesheet_status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
