/**
 * UserTimesheetDetails Component
 * Displays user's timesheet entries for a project-week
 */

import React, { useState } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, AlertCircle, Save } from 'lucide-react';
import type { ProjectWeekUser } from '../../../types/timesheetApprovals';
import { TeamReviewService } from '../../../services/TeamReviewService';
import * as formatting from '../../../utils/formatting';

interface UserTimesheetDetailsProps {
  user: ProjectWeekUser;
  projectId: string;
  projectType?: string; // 'regular' | 'internal' | 'training'
  isExpanded: boolean;
  onToggle: () => void;
  onApproveUser?: () => void;
  onRejectUser?: () => void;
  onBillableUpdate?: (data: {
    worked_hours: number;
    billable_hours: number;
    billable_adjustment: number;
  }) => void;
  canApprove?: boolean;
  approvalRole?: 'lead' | 'manager' | 'management';
}

export const UserTimesheetDetails: React.FC<UserTimesheetDetailsProps> = ({
  user,
  projectId,
  projectType,
  isExpanded,
  onToggle,
  onApproveUser,
  onRejectUser,
  onBillableUpdate,
  canApprove = false,
  approvalRole = 'manager'
}) => {
  const [adjustmentInput, setAdjustmentInput] = useState<string>(user.billable_adjustment?.toString() || '0');
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
  const [localBillableData, setLocalBillableData] = useState({
    worked_hours: user.worked_hours || 0,
    billable_hours: user.billable_hours || 0,
    billable_adjustment: user.billable_adjustment || 0
  });
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

  const groupedEntries = user.entries.reduce((acc, entry) => {
    const date = entry.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, typeof user.entries>);

  // Handler for saving billable adjustment
  const handleSaveAdjustment = async () => {
    const adjustment = Number.parseFloat(adjustmentInput);
    
    if (Number.isNaN(adjustment)) {
      setAdjustmentError('Please enter a valid number');
      return;
    }

    setIsSavingAdjustment(true);
    setAdjustmentError(null);

    try {
      console.log('Updating billable adjustment:', {
        timesheet_id: user.timesheet_id,
        project_id: projectId,
        adjustment
      });

      const result = await TeamReviewService.updateBillableAdjustment(
        user.timesheet_id,
        projectId,
        adjustment
      );

      console.log('Update result:', result);

      if (result.success) {
        // Update local state with new values
        const updatedData = {
          worked_hours: result.approval.worked_hours,
          billable_hours: result.approval.billable_hours,
          billable_adjustment: result.approval.billable_adjustment
        };
        setLocalBillableData(updatedData);
        setAdjustmentInput(result.approval.billable_adjustment.toString());
        
        // Notify parent component to update aggregated hours
        onBillableUpdate?.(updatedData);
        
        console.log('Successfully updated billable hours');
      } else {
        console.error('Failed to update:', result.error);
        setAdjustmentError(result.error || 'Failed to update adjustment');
      }
    } catch (error) {
      console.error('Error updating billable adjustment:', error);
      setAdjustmentError(error instanceof Error ? error.message : 'Failed to update adjustment');
    } finally {
      setIsSavingAdjustment(false);
    }
  };

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

              {/* Approval Path Indicator for Manager role */}
              {approvalRole === 'manager' && user.timesheet_status === 'lead_approved' && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded border border-blue-300">
                  Via Lead
                </span>
              )}
              {approvalRole === 'manager' && user.timesheet_status === 'submitted' && user.user_role === 'employee' && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded border border-purple-300">
                  Direct
                </span>
              )}

              {/* Per-user Approve/Reject buttons - Hide for Management role */}
              {user.approval_status === 'pending' && canApprove && approvalRole !== 'management' && (
                <div className="ml-3 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onApproveUser?.(); }}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRejectUser?.(); }}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span>{user.user_email}</span>
              <span className="text-gray-400">•</span>
              <span className="capitalize">{user.project_role}</span>
              {approvalRole === 'manager' && user.user_role === 'lead' && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-green-600 font-medium">Team Lead</span>
                </>
              )}
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
            
            {/* Billable Hours (Manager/Management only, not for training projects) */}
            {(approvalRole === 'manager' || approvalRole === 'management') && projectType !== 'training' && (
              <>
                <div className="text-center">
                  <div className="font-semibold text-blue-900">
                    {localBillableData.worked_hours.toFixed(1)}h
                  </div>
                  <div className="text-xs text-gray-500">Worked</div>
                </div>
                <div className="text-center">
                  <div className={`font-semibold ${
                    localBillableData.billable_adjustment >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {localBillableData.billable_adjustment >= 0 ? '+' : ''}
                    {localBillableData.billable_adjustment.toFixed(1)}h
                  </div>
                  <div className="text-xs text-gray-500">Adjust</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-700">
                    {localBillableData.billable_hours.toFixed(1)}h
                  </div>
                  <div className="text-xs text-gray-500">Billable</div>
                </div>
                
                {/* Quick Adjustment Input */}
                <div className="flex items-center gap-1 ml-2">
                  <input
                    type="number"
                    step="0.5"
                    value={adjustmentInput}
                    onChange={(e) => setAdjustmentInput(e.target.value)}
                    className={`w-16 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      adjustmentError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="±h"
                    disabled={isSavingAdjustment}
                    title={adjustmentError || "Adjust billable hours"}
                  />
                  <button
                    onClick={handleSaveAdjustment}
                    disabled={isSavingAdjustment}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:text-gray-400 transition-colors"
                    title="Save adjustment"
                  >
                    {isSavingAdjustment ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </>
            )}
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
                          {formatting.formatDate(date, 'long')}
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
