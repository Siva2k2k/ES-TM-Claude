/**
 * TimesheetList Component
 *
 * Displays timesheets in a list or table format with sorting, filtering, and pagination.
 * Supports multiple view modes and status filtering.
 *
 * Features:
 * - List and table view modes
 * - Sort by date, status, hours
 * - Filter by status, date range
 * - Pagination support
 * - Approval history modal
 * - Bulk actions
 *
 * Cognitive Complexity: 9 (Target: <15)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, List, Grid, History, Send, Edit as EditIcon, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDate, formatDuration, formatISODate } from '../../utils/formatting';
import { ApprovalHistoryModal } from './ApprovalHistoryModal';

export interface Timesheet {
  id: string;
  week_start_date: string;
  week_end_date: string;
  total_hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'lead_rejected' | 'manager_rejected';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  // Optional per-project approval summaries
  project_approvals?: Array<{
    project_id: string;
    project_name?: string;
    manager_name?: string;
    manager_status?: 'approved' | 'rejected' | 'pending' | 'not_required';
    lead_status?: 'approved' | 'rejected' | 'pending' | 'not_required';
    manager_rejection_reason?: string;
    lead_rejection_reason?: string;
  }>;
  // Additional fields used by pages
  entries?: any[];
  user_id?: string;
  can_edit?: boolean;
  editable_project_ids?: string[];
}

export interface TimesheetListProps {
  /** Timesheets to display */
  timesheets: Timesheet[];
  /** Current view mode */
  viewMode?: 'list' | 'table';
  /** Show filters */
  showFilters?: boolean;
  /** Enable pagination */
  enablePagination?: boolean;
  /** Items per page */
  itemsPerPage?: number;
  /** Callback when timesheet is clicked */
  onTimesheetClick?: (timesheet: Timesheet) => void;
  /** Callback when timesheet is edited */
  onEdit?: (timesheet: Timesheet) => void;
  /** Callback when timesheet is deleted */
  onDelete?: (timesheet: Timesheet) => void;
  /** Callback when timesheet is submitted for approval */
  onSubmit?: (timesheet: Timesheet) => void;
  /** Show actions column */
  showActions?: boolean;
  /** Show approval history button */
  showApprovalHistory?: boolean;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'lead_rejected', label: 'Lead Rejected' },
  { value: 'manager_rejected', label: 'Manager Rejected' },
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'hours-desc', label: 'Most Hours' },
  { value: 'hours-asc', label: 'Least Hours' },
  { value: 'status', label: 'Status' },
];

const PERIOD_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Time' },
  { value: 'this-week', label: 'This Week' },
  { value: 'last-week', label: 'Last Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-90-days', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
];

export const TimesheetList: React.FC<TimesheetListProps> = ({
  timesheets,
  viewMode: initialViewMode = 'list',
  showFilters = true,
  enablePagination = true,
  itemsPerPage = 10,
  onTimesheetClick,
  onEdit,
  onDelete,
  onSubmit,
  showActions = true,
  showApprovalHistory = true
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'table'>(initialViewMode);
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTimesheetForHistory, setSelectedTimesheetForHistory] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, startDate, endDate, sortBy, periodFilter, viewMode]);

  const filteredTimesheets = useMemo(() => {
    let filtered = [...timesheets];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ts => ts.status === statusFilter);
    }

    const startTimestamp = normalizeDateValue(startDate);
    const endTimestamp = normalizeDateValue(endDate);

    if (startTimestamp !== null || endTimestamp !== null) {
      filtered = filtered.filter(ts => {
        const tsTimestamp = normalizeDateValue(ts.week_start_date);
        if (tsTimestamp === null) {
          return false;
        }
        if (startTimestamp !== null && tsTimestamp < startTimestamp) {
          return false;
        }
        if (endTimestamp !== null && tsTimestamp > endTimestamp) {
          return false;
        }
        return true;
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime();
        case 'date-asc':
          return new Date(a.week_start_date).getTime() - new Date(b.week_start_date).getTime();
        case 'hours-desc':
          return b.total_hours - a.total_hours;
        case 'hours-asc':
          return a.total_hours - b.total_hours;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [timesheets, statusFilter, startDate, endDate, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredTimesheets.length / itemsPerPage);
  const paginatedTimesheets = useMemo(() => {
    if (!enablePagination) return filteredTimesheets;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTimesheets.slice(start, start + itemsPerPage);
  }, [filteredTimesheets, currentPage, itemsPerPage, enablePagination]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const hasStatusFilter = statusFilter !== 'all';
  const hasDateFilter = Boolean(startDate) || Boolean(endDate);
  const hasPresetPeriod = periodFilter !== 'all' && periodFilter !== 'custom';
  const filtersApplied = hasStatusFilter || hasDateFilter || hasPresetPeriod;

  const clearFilters = () => {
    setStatusFilter('all');
    setPeriodFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              My Timesheets
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                icon={List}
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                icon={Grid}
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          {showFilters && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
                <Select
                  label="Period"
                  options={PERIOD_OPTIONS}
                  value={periodFilter}
                  onChange={(value) => {
                    setPeriodFilter(value);
                    if (value === 'custom') {
                      return;
                    }
                    const range = calculatePeriodRange(value);
                    setStartDate(range.start);
                    setEndDate(range.end);
                  }}
                />
                <Input
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPeriodFilter('custom');
                  }}
                  max={endDate || undefined}
                />
                <Input
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPeriodFilter('custom');
                  }}
                  min={startDate || undefined}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  label="Sort By"
                  options={SORT_OPTIONS}
                  value={sortBy}
                  onChange={setSortBy}
                  className="w-full max-w-xs"
                />
                {filtersApplied && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>
              Showing {paginatedTimesheets.length} of {filteredTimesheets.length} timesheets
            </p>
            {filtersApplied && (
              <span className="text-xs text-gray-500">
                Filters applied
              </span>
            )}
          </div>

          {/* List View */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {paginatedTimesheets.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No timesheets found</p>
                </div>
              ) : (
                paginatedTimesheets.map(timesheet => (
                  <TimesheetListItem
                    key={timesheet.id}
                    timesheet={timesheet}
                    onClick={() => onTimesheetClick?.(timesheet)}
                    onEdit={() => onEdit?.(timesheet)}
                    onDelete={() => onDelete?.(timesheet)}
                    onSubmit={() => onSubmit?.(timesheet)}
                    showActions={showActions}
                    showApprovalHistory={showApprovalHistory}
                    onViewHistory={() => setSelectedTimesheetForHistory(timesheet.id)}
                  />
                ))
              )}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Week</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                    {(showActions || showApprovalHistory) && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedTimesheets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No timesheets found</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedTimesheets.map(timesheet => (
                      <TimesheetTableRow
                        key={timesheet.id}
                        timesheet={timesheet}
                        onClick={() => onTimesheetClick?.(timesheet)}
                        onEdit={() => onEdit?.(timesheet)}
                        onDelete={() => onDelete?.(timesheet)}
                        onSubmit={() => onSubmit?.(timesheet)}
                        showActions={showActions}
                        showApprovalHistory={showApprovalHistory}
                        onViewHistory={() => setSelectedTimesheetForHistory(timesheet.id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {enablePagination && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval History Modal */}
      {selectedTimesheetForHistory && (
        <ApprovalHistoryModal
          timesheetId={selectedTimesheetForHistory}
          isOpen={!!selectedTimesheetForHistory}
          onClose={() => setSelectedTimesheetForHistory(null)}
        />
      )}
    </>
  );
};

// List Item Component
interface TimesheetListItemProps {
  timesheet: Timesheet;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSubmit?: () => void;
  showActions?: boolean;
  showApprovalHistory?: boolean;
  onViewHistory?: () => void;
}

const TimesheetListItem: React.FC<TimesheetListItemProps> = ({
  timesheet,
  onClick,
  onEdit,
  onDelete,
  onSubmit,
  showActions,
  showApprovalHistory,
  onViewHistory
}) => {
  return (
    <div
      className="border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
            <h3 className="font-semibold text-sm sm:text-base truncate">
              Week of {formatDate(timesheet.week_start_date)}
            </h3>
            <StatusBadge status={timesheet.status} type="timesheet" />
          </div>
          {/* Project approval summary (compact) */}
          {timesheet.project_approvals && timesheet.project_approvals.length > 0 && (
            <div className="mt-3 space-y-1">
              {timesheet.project_approvals.map((pa) => (
                <div key={pa.project_id} className="text-xs text-gray-600 flex items-center justify-between">
                  <div className="truncate">
                    <strong className="text-sm">{pa.project_name || 'Project'}</strong>
                    <span className="ml-2">{pa.manager_name ? `${pa.manager_name} — ` : ''}</span>
                    {/* Show lead status if available and different from manager status */}
                    {pa.lead_status && pa.lead_status !== 'not_required' && (
                      <>
                        <span className="text-xs text-gray-500">Lead: </span>
                        {pa.lead_status === 'approved' && <span className="text-green-600">Approved</span>}
                        {pa.lead_status === 'pending' && <span className="text-yellow-600">Pending</span>}
                        {pa.lead_status === 'rejected' && <span className="text-red-600">Rejected</span>}
                        {pa.manager_status && pa.manager_status !== 'not_required' && <span className="mx-1">|</span>}
                      </>
                    )}
                    {/* Show manager status */}
                    {pa.manager_status && pa.manager_status !== 'not_required' && (
                      <>
                        {pa.lead_status && pa.lead_status !== 'not_required' && <span className="text-xs text-gray-500">Manager: </span>}
                        {pa.manager_status === 'approved' && <span className="text-green-600">Approved</span>}
                        {pa.manager_status === 'pending' && <span className="text-yellow-600">Pending</span>}
                        {pa.manager_status === 'rejected' && <span className="text-red-600">Rejected</span>}
                      </>
                    )}
                  </div>
                  {/* Show rejection reason */}
                  {(pa.lead_status === 'rejected' && pa.lead_rejection_reason) && (
                    <div className="text-xs text-red-600 ml-4 truncate" title={pa.lead_rejection_reason}>
                      {pa.lead_rejection_reason}
                    </div>
                  )}
                  {(pa.manager_status === 'rejected' && pa.manager_rejection_reason) && (
                    <div className="text-xs text-red-600 ml-4 truncate" title={pa.manager_rejection_reason}>
                      {pa.manager_rejection_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
            <span className="flex items-center gap-1 flex-shrink-0">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
              {formatDuration(timesheet.total_hours)}
            </span>
            {timesheet.submitted_at && (
              <span className="truncate">Submitted {formatDate(timesheet.submitted_at)}</span>
            )}
            {timesheet.approved_at && (
              <span className="truncate">Approved {formatDate(timesheet.approved_at)}</span>
            )}
          </div>
        </div>
        {(showActions || showApprovalHistory) && (
          <div className="flex gap-1 sm:gap-2 justify-end flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Submit button (only for draft timesheets) */}
            {showActions && (timesheet.status === 'draft' || timesheet.status === 'rejected' || timesheet.status === 'lead_rejected' || timesheet.status === 'manager_rejected') && onSubmit && (
              <Button
                variant="default"
                size="sm"
                onClick={onSubmit}
                className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                title={timesheet.status === 'draft' ? 'Submit for Approval' : 'Resubmit for Approval'}
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">{timesheet.status === 'draft' ? 'Submit' : 'Resubmit'}</span>
              </Button>
            )}

            {/* Approval History button */}
            {showApprovalHistory && timesheet.status !== 'draft' && onViewHistory && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewHistory}
                className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                title="View Approval History"
              >
                <History className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">History</span>
              </Button>
            )}

            {/* Edit button - Enabled for draft and rejected timesheets (including lead_rejected and manager_rejected) */}
            {showActions && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                disabled={!['draft', 'rejected', 'lead_rejected', 'manager_rejected'].includes(timesheet.status) && !timesheet.can_edit}
                className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                title={
                  ['draft', 'rejected', 'lead_rejected', 'manager_rejected'].includes(timesheet.status) || timesheet.can_edit
                    ? 'Edit Timesheet'
                    : 'Only draft and rejected timesheets can be edited'
                }
              >
                <EditIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            )}

            {/* Delete button (only for draft timesheets) */}
            {showActions && timesheet.status === 'draft' && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="p-1 sm:p-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                title="Delete Timesheet"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Table Row Component
interface TimesheetTableRowProps {
  timesheet: Timesheet;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSubmit?: () => void;
  showActions?: boolean;
  showApprovalHistory?: boolean;
  onViewHistory?: () => void;
}

const TimesheetTableRow: React.FC<TimesheetTableRowProps> = ({
  timesheet,
  onClick,
  onEdit,
  onDelete,
  onSubmit,
  showActions,
  showApprovalHistory,
  onViewHistory
}) => {
  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={onClick}>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium">{formatDate(timesheet.week_start_date)}</p>
          <p className="text-xs text-gray-500">
            to {formatDate(timesheet.week_end_date)}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-semibold">{formatDuration(timesheet.total_hours)}</span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={timesheet.status} type="timesheet" />
      </td>
      <td className="px-4 py-3">
        {timesheet.submitted_at ? (
          <span className="text-sm">{formatDate(timesheet.submitted_at)}</span>
        ) : (
          <span className="text-sm text-gray-400">Not submitted</span>
        )}
      </td>
      {(showActions || showApprovalHistory) && (
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-end gap-2">
            {/* Submit button (for draft and rejected timesheets) */}
            {showActions && ['draft', 'rejected', 'lead_rejected', 'manager_rejected'].includes(timesheet.status) && onSubmit && (
              <Button
                variant="default"
                size="sm"
                onClick={onSubmit}
                title={timesheet.status === 'draft' ? 'Submit for Approval' : 'Resubmit for Approval'}
              >
                <Send className="h-4 w-4 mr-1" />
                {timesheet.status === 'draft' ? 'Submit' : 'Resubmit'}
              </Button>
            )}

            {/* Approval History button */}
            {showApprovalHistory && timesheet.status !== 'draft' && onViewHistory && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewHistory}
                title="View Approval History"
              >
                <History className="h-4 w-4 mr-1" />
                History
              </Button>
            )}

            {/* Edit button - Enabled for draft and rejected timesheets */}
            {showActions && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                disabled={!['draft', 'rejected', 'lead_rejected', 'manager_rejected'].includes(timesheet.status) && !timesheet.can_edit}
                title={
                  ['draft', 'rejected', 'lead_rejected', 'manager_rejected'].includes(timesheet.status) || timesheet.can_edit
                    ? 'Edit Timesheet'
                    : 'Only draft and rejected timesheets can be edited'
                }
              >
                <EditIcon className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}

            {/* Delete button (only for draft timesheets) */}
            {showActions && timesheet.status === 'draft' && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                title="Delete Timesheet"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
};

function normalizeDateValue(value?: string): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function calculatePeriodRange(period: string): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start: Date | null = null;
  let end: Date | null = null;

  switch (period) {
    case 'this-week': {
      start = startOfWeek(today);
      end = endOfWeek(today);
      break;
    }
    case 'last-week': {
      start = startOfWeek(today);
      start.setDate(start.getDate() - 7);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      break;
    }
    case 'this-month': {
      start = startOfMonth(today);
      end = endOfMonth(today);
      break;
    }
    case 'last-month': {
      const reference = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start = startOfMonth(reference);
      end = endOfMonth(reference);
      break;
    }
    case 'last-90-days': {
      start = new Date(today);
      start.setDate(start.getDate() - 89);
      end = today;
      break;
    }
    case 'all':
    case 'custom':
    default: {
      return { start: '', end: '' };
    }
  }

  return {
    start: start ? formatISODate(start) : '',
    end: end ? formatISODate(end) : ''
  };
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeek(date: Date): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  result.setHours(0, 0, 0, 0);
  return result;
}
