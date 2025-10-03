/**
 * TimesheetReviewCard Component
 *
 * Displays a single timesheet for review with actions.
 *
 * Features:
 * - Compact and detailed view modes
 * - Approve/reject actions
 * - Hours breakdown
 * - Status indicators
 * - Employee information
 *
 * Cognitive Complexity: 6 (Target: <15)
 */

import React, { useState } from 'react';
import {
  User,
  Calendar,
  Clock,
  Check,
  X,
  Eye,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  DollarSign
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card, CardContent } from '../ui/Card';
import { StatusBadge } from '../shared/StatusBadge';
import {
  TimesheetReviewSummary,
  getBillablePercentage,
  isPendingReview,
  validateWeeklyHours
} from '../../types/teamReview.schemas';
import { formatDate, formatDuration } from '../../utils/formatting';
import { cn } from '../../utils/cn';

export interface TimesheetReviewCardProps {
  /** Timesheet data */
  timesheet: TimesheetReviewSummary;
  /** Compact view mode */
  compact?: boolean;
  /** Show actions */
  showActions?: boolean;
  /** Can approve */
  canApprove?: boolean;
  /** Approve handler */
  onApprove?: (timesheetId: string) => void;
  /** Reject handler */
  onReject?: (timesheetId: string) => void;
  /** View details handler */
  onViewDetails?: (timesheetId: string) => void;
  /** Loading state */
  isLoading?: boolean;
}

export const TimesheetReviewCard: React.FC<TimesheetReviewCardProps> = ({
  timesheet,
  compact = false,
  showActions = true,
  canApprove = false,
  onApprove,
  onReject,
  onViewDetails,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const billablePercentage = getBillablePercentage(
    timesheet.billableHours,
    timesheet.totalHours
  );
  const isPending = isPendingReview(timesheet.status);
  const hoursValidation = validateWeeklyHours(timesheet.totalHours);

  if (compact) {
    return (
      <div
        className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer bg-white"
        onClick={() => onViewDetails?.(timesheet.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium truncate">{timesheet.employeeName}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(timesheet.weekStartDate, 'MMM DD')}</span>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold">
              <Clock className="h-3 w-3" />
              <span>{timesheet.totalHours}h</span>
            </div>
            <StatusBadge status={timesheet.status} type="timesheet" size="sm" />
          </div>

          {showActions && canApprove && isPending && (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                icon={Check}
                onClick={() => onApprove?.(timesheet.id)}
                disabled={isLoading}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={() => onReject?.(timesheet.id)}
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
              {timesheet.employeeName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{timesheet.employeeName}</h3>
              <p className="text-sm text-gray-500">{timesheet.employeeEmail}</p>
            </div>
          </div>
          <StatusBadge status={timesheet.status} type="timesheet" />
        </div>

        {/* Week Info */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(timesheet.weekStartDate, 'MMM DD')} - {formatDate(timesheet.weekEndDate, 'MMM DD, YYYY')}
            </span>
          </div>
        </div>

        {/* Hours Breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Total Hours</p>
            <p className="text-xl font-bold">{formatDuration(timesheet.totalHours)}</p>
            {!hoursValidation.valid && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {hoursValidation.message}
              </p>
            )}
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Billable</p>
            <p className="text-xl font-bold text-green-700">
              {formatDuration(timesheet.billableHours)}
            </p>
            <p className="text-xs text-gray-600 mt-1">{billablePercentage}%</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Entries</p>
            <p className="text-xl font-bold text-blue-700">{timesheet.entriesCount}</p>
            <p className="text-xs text-gray-600 mt-1">{timesheet.projectsCount} projects</p>
          </div>
        </div>

        {/* Submitted Info */}
        {timesheet.submittedAt && (
          <div className="text-sm text-gray-600 mb-4">
            Submitted {formatDate(timesheet.submittedAt, 'relative')}
          </div>
        )}

        {/* Review Info */}
        {timesheet.reviewedAt && timesheet.reviewerName && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm">
              <span className="text-gray-600">Reviewed by </span>
              <span className="font-medium">{timesheet.reviewerName}</span>
              <span className="text-gray-600"> on {formatDate(timesheet.reviewedAt, 'MMM DD, YYYY')}</span>
            </p>
            {timesheet.rejectionReason && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-gray-600 mb-1">Rejection Reason:</p>
                <p className="text-sm text-red-700">{timesheet.rejectionReason}</p>
              </div>
            )}
          </div>
        )}

        {/* Expandable Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Billable Hours</p>
                <p className="font-medium">{timesheet.billableHours}h ({billablePercentage}%)</p>
              </div>
              <div>
                <p className="text-gray-500">Non-Billable Hours</p>
                <p className="font-medium">{timesheet.totalHours - timesheet.billableHours}h</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Eye}
              onClick={() => onViewDetails?.(timesheet.id)}
            >
              View Details
            </Button>
            {!isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                icon={ChevronDown}
                onClick={() => setIsExpanded(true)}
              >
                More
              </Button>
            )}
            {isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                icon={ChevronUp}
                onClick={() => setIsExpanded(false)}
              >
                Less
              </Button>
            )}
          </div>

          {showActions && canApprove && isPending && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={X}
                onClick={() => onReject?.(timesheet.id)}
                disabled={isLoading}
              >
                Reject
              </Button>
              <Button
                size="sm"
                icon={Check}
                onClick={() => onApprove?.(timesheet.id)}
                disabled={isLoading}
              >
                Approve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
