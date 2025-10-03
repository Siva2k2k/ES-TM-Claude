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
 * - Bulk actions
 *
 * Cognitive Complexity: 9 (Target: <15)
 */

import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Filter, Search, ChevronDown, MoreVertical, List, Grid } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDate, formatDuration } from '../../utils/formatting';
import { cn } from '../../utils/cn';

export interface Timesheet {
  id: string;
  week_start_date: string;
  week_end_date: string;
  total_hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
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
  /** Show actions column */
  showActions?: boolean;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'hours-desc', label: 'Most Hours' },
  { value: 'hours-asc', label: 'Least Hours' },
  { value: 'status', label: 'Status' },
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
  showActions = true
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'table'>(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and sort timesheets
  const filteredTimesheets = useMemo(() => {
    let filtered = [...timesheets];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ts => ts.status === statusFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ts =>
        ts.week_start_date.includes(query) ||
        ts.status.toLowerCase().includes(query) ||
        ts.id.toLowerCase().includes(query)
      );
    }

    // Apply sorting
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
  }, [timesheets, statusFilter, searchQuery, sortBy]);

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

  return (
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search timesheets..."
              icon={Search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Filter by status"
            />
            <Select
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={setSortBy}
              placeholder="Sort by"
            />
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>
            Showing {paginatedTimesheets.length} of {filteredTimesheets.length} timesheets
          </p>
          {statusFilter !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              Clear filter
            </Button>
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
                  showActions={showActions}
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
                  {showActions && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedTimesheets.length === 0 ? (
                  <tr>
                    <td colSpan={showActions ? 5 : 4} className="px-4 py-12 text-center text-gray-500">
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
                      showActions={showActions}
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
  );
};

// List Item Component
interface TimesheetListItemProps {
  timesheet: Timesheet;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

const TimesheetListItem: React.FC<TimesheetListItemProps> = ({
  timesheet,
  onClick,
  onEdit,
  onDelete,
  showActions
}) => {
  return (
    <div
      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold">
              Week of {formatDate(timesheet.week_start_date)}
            </h3>
            <StatusBadge status={timesheet.status} type="timesheet" />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(timesheet.total_hours)}
            </span>
            {timesheet.submitted_at && (
              <span>Submitted {formatDate(timesheet.submitted_at, 'relative')}</span>
            )}
            {timesheet.approved_at && (
              <span>Approved {formatDate(timesheet.approved_at, 'relative')}</span>
            )}
          </div>
        </div>
        {showActions && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" icon={MoreVertical} />
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
  showActions?: boolean;
}

const TimesheetTableRow: React.FC<TimesheetTableRowProps> = ({
  timesheet,
  onClick,
  onEdit,
  onDelete,
  showActions
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
          <span className="text-sm">{formatDate(timesheet.submitted_at, 'relative')}</span>
        ) : (
          <span className="text-sm text-gray-400">Not submitted</span>
        )}
      </td>
      {showActions && (
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" icon={MoreVertical} />
          </div>
        </td>
      )}
    </tr>
  );
};
