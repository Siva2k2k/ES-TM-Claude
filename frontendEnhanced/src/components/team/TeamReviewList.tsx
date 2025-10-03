/**
 * TeamReviewList Component
 *
 * Displays team timesheets with filtering, sorting, and bulk actions.
 *
 * Features:
 * - List/grid view toggle
 * - Advanced filtering
 * - Sorting options
 * - Bulk selection
 * - Bulk approve/reject
 * - Pagination
 *
 * Cognitive Complexity: 9 (Target: <15)
 */

import React, { useState, useMemo } from 'react';
import { List, Grid, CheckSquare, Check, X, Filter, Search } from 'lucide-react';
import { TimesheetReviewCard } from './TimesheetReviewCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Checkbox } from '../ui/Checkbox';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { TimesheetReviewSummary, TimesheetStatus } from '../../types/teamReview.schemas';

export interface TeamReviewListProps {
  /** Timesheets to display */
  timesheets: TimesheetReviewSummary[];
  /** Team members for filtering */
  teamMembers?: Array<{ id: string; name: string }>;
  /** View mode */
  viewMode?: 'list' | 'grid';
  /** Show filters */
  showFilters?: boolean;
  /** Can approve */
  canApprove?: boolean;
  /** Enable bulk actions */
  enableBulkActions?: boolean;
  /** Enable pagination */
  enablePagination?: boolean;
  /** Items per page */
  itemsPerPage?: number;
  /** Approve handler */
  onApprove?: (timesheetId: string) => void;
  /** Reject handler */
  onReject?: (timesheetId: string) => void;
  /** Bulk approve handler */
  onBulkApprove?: (timesheetIds: string[]) => void;
  /** Bulk reject handler */
  onBulkReject?: (timesheetIds: string[], reason: string) => void;
  /** View details handler */
  onViewDetails?: (timesheetId: string) => void;
  /** Loading state */
  isLoading?: boolean;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'submitted', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Draft' }
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'hours-desc', label: 'Most Hours' },
  { value: 'hours-asc', label: 'Least Hours' },
  { value: 'employee', label: 'Employee Name' },
  { value: 'status', label: 'Status' }
];

export const TeamReviewList: React.FC<TeamReviewListProps> = ({
  timesheets,
  teamMembers = [],
  viewMode: initialViewMode = 'list',
  showFilters = true,
  canApprove = false,
  enableBulkActions = true,
  enablePagination = true,
  itemsPerPage = 10,
  onApprove,
  onReject,
  onBulkApprove,
  onBulkReject,
  onViewDetails,
  isLoading = false
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');

  // User options for filter
  const userOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: 'All Employees' },
    ...teamMembers.map(m => ({ value: m.id, label: m.name }))
  ], [teamMembers]);

  // Filter and sort timesheets
  const filteredTimesheets = useMemo(() => {
    let filtered = [...timesheets];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Apply user filter
    if (userFilter !== 'all') {
      filtered = filtered.filter(t => t.employeeId === userFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.employeeName.toLowerCase().includes(query) ||
        t.employeeEmail.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime();
        case 'date-asc':
          return new Date(a.weekStartDate).getTime() - new Date(b.weekStartDate).getTime();
        case 'hours-desc':
          return b.totalHours - a.totalHours;
        case 'hours-asc':
          return a.totalHours - b.totalHours;
        case 'employee':
          return a.employeeName.localeCompare(b.employeeName);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [timesheets, statusFilter, userFilter, searchQuery, sortBy]);

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

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingIds = paginatedTimesheets
        .filter(t => t.status === 'submitted')
        .map(t => t.id);
      setSelectedIds(new Set(pendingIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const isSelected = (id: string) => selectedIds.has(id);
  const hasSelection = selectedIds.size > 0;

  // Bulk actions
  const handleBulkApprove = () => {
    if (hasSelection) {
      onBulkApprove?.(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkReject = () => {
    if (!bulkRejectionReason.trim() || bulkRejectionReason.trim().length < 10) {
      return;
    }
    if (hasSelection) {
      onBulkReject?.(Array.from(selectedIds), bulkRejectionReason);
      setSelectedIds(new Set());
      setBulkRejectionReason('');
      setShowBulkRejectModal(false);
    }
  };

  const pendingCount = filteredTimesheets.filter(t => t.status === 'submitted').length;
  const selectableCount = paginatedTimesheets.filter(t => t.status === 'submitted').length;
  const allSelected = selectableCount > 0 && selectedIds.size === selectableCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Timesheets</CardTitle>
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  icon={List}
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  icon={Grid}
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Filters */}
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Search employees..."
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
                options={userOptions}
                value={userFilter}
                onChange={setUserFilter}
                placeholder="Filter by employee"
              />
              <Select
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={setSortBy}
                placeholder="Sort by"
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                <p>
                  Showing {paginatedTimesheets.length} of {filteredTimesheets.length} timesheets
                  {pendingCount > 0 && ` • ${pendingCount} pending review`}
                </p>
              </div>
              {(statusFilter !== 'all' || userFilter !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setUserFilter('all');
                    setSearchQuery('');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bulk Actions Bar */}
      {enableBulkActions && canApprove && hasSelection && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckSquare className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{selectedIds.size} selected</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear selection
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={X}
                  onClick={() => setShowBulkRejectModal(true)}
                  disabled={isLoading}
                >
                  Reject Selected
                </Button>
                <Button
                  size="sm"
                  icon={Check}
                  onClick={handleBulkApprove}
                  disabled={isLoading}
                >
                  Approve Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timesheets Display */}
      {paginatedTimesheets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <List className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No timesheets found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedTimesheets.map(timesheet => (
            <div key={timesheet.id} className="relative">
              {enableBulkActions && canApprove && timesheet.status === 'submitted' && (
                <div className="absolute top-3 left-3 z-10">
                  <Checkbox
                    checked={isSelected(timesheet.id)}
                    onCheckedChange={(checked) => handleSelectOne(timesheet.id, !!checked)}
                  />
                </div>
              )}
              <TimesheetReviewCard
                timesheet={timesheet}
                canApprove={canApprove}
                showActions={true}
                onApprove={onApprove}
                onReject={onReject}
                onViewDetails={onViewDetails}
                isLoading={isLoading}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          {enableBulkActions && canApprove && selectableCount > 0 && (
            <Card>
              <CardContent className="py-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  label={`Select all ${selectableCount} pending timesheet(s)`}
                />
              </CardContent>
            </Card>
          )}

          {/* List Items */}
          {paginatedTimesheets.map(timesheet => (
            <div key={timesheet.id} className="flex items-center gap-3">
              {enableBulkActions && canApprove && timesheet.status === 'submitted' && (
                <Checkbox
                  checked={isSelected(timesheet.id)}
                  onCheckedChange={(checked) => handleSelectOne(timesheet.id, !!checked)}
                />
              )}
              <div className="flex-1">
                <TimesheetReviewCard
                  timesheet={timesheet}
                  compact={true}
                  canApprove={canApprove}
                  showActions={true}
                  onApprove={onApprove}
                  onReject={onReject}
                  onViewDetails={onViewDetails}
                  isLoading={isLoading}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
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
          </CardContent>
        </Card>
      )}

      {/* Bulk Reject Modal */}
      <Modal
        isOpen={showBulkRejectModal}
        onClose={() => {
          setShowBulkRejectModal(false);
          setBulkRejectionReason('');
        }}
        title="Reject Selected Timesheets"
        size="md"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            <AlertTitle>Reject {selectedIds.size} Timesheet(s)</AlertTitle>
            <AlertDescription>
              Please provide a reason for rejecting these timesheets. This will be sent to the employees.
            </AlertDescription>
          </Alert>

          <Textarea
            label="Rejection Reason *"
            placeholder="Enter reason for rejection (minimum 10 characters)"
            value={bulkRejectionReason}
            onChange={(e) => setBulkRejectionReason(e.target.value)}
            rows={4}
            error={
              bulkRejectionReason.trim().length > 0 && bulkRejectionReason.trim().length < 10
                ? 'Reason must be at least 10 characters'
                : undefined
            }
          />

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkRejectModal(false);
                setBulkRejectionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkReject}
              disabled={!bulkRejectionReason.trim() || bulkRejectionReason.trim().length < 10}
            >
              Reject {selectedIds.size} Timesheet(s)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
