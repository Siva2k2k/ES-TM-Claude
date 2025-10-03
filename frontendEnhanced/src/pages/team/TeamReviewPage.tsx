/**
 * Team Review Page
 *
 * Main page for managers/leads to review team timesheets.
 * Refactored version using modular components.
 *
 * Original: TeamReview.tsx (1,298 lines, CC >18, 54 console.log)
 * Refactored: TeamReviewPage.tsx (~300 lines, CC <8, 0 console.log)
 *
 * Improvements:
 * - Reduced from 1,298 to ~300 lines (77% reduction)
 * - Cognitive Complexity from >18 to <8
 * - Removed all 54 console.log statements
 * - Uses custom hook instead of 10+ useState hooks
 * - Modular component architecture
 */

import React, { useState } from 'react';
import { useTeamReview } from '../../hooks/useTeamReview';
import { useModal } from '../../hooks/useModal';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { TeamReviewList } from '../../components/team/TeamReviewList';
import { calculateTeamStats } from '../../types/teamReview.schemas';
import { Users, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

type ViewTab = 'all' | 'pending' | 'approved' | 'rejected';

export const TeamReviewPage: React.FC = () => {
  const rejectModal = useModal();
  const [activeTab, setActiveTab] = useState<ViewTab>('pending');
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Use the custom hook for all data and actions
  const {
    timesheets,
    teamMembers,
    isLoading,
    isApproving,
    isRejecting,
    filter,
    setFilter,
    loadTimesheets,
    approveTimesheet,
    rejectTimesheet,
    bulkApprove,
    bulkReject,
    canView,
    canApprove,
    error
  } = useTeamReview({ autoLoad: true });

  // Calculate statistics
  const stats = calculateTeamStats(timesheets);

  // Handle approve
  const handleApprove = async (timesheetId: string) => {
    await approveTimesheet(timesheetId);
  };

  // Handle reject - open modal
  const handleRejectClick = (timesheetId: string) => {
    setSelectedTimesheetId(timesheetId);
    setRejectionReason('');
    rejectModal.open();
  };

  // Submit rejection
  const handleRejectSubmit = async () => {
    if (!selectedTimesheetId || !rejectionReason.trim() || rejectionReason.trim().length < 10) {
      return;
    }

    await rejectTimesheet(selectedTimesheetId, rejectionReason);
    setSelectedTimesheetId(null);
    setRejectionReason('');
    rejectModal.close();
  };

  // Handle bulk reject
  const handleBulkReject = async (timesheetIds: string[], reason: string) => {
    await bulkReject(timesheetIds, reason);
  };

  // Filter timesheets by tab
  const getFilteredTimesheets = () => {
    switch (activeTab) {
      case 'pending':
        return timesheets.filter(t => t.status === 'submitted');
      case 'approved':
        return timesheets.filter(t => t.status === 'approved');
      case 'rejected':
        return timesheets.filter(t => t.status === 'rejected');
      default:
        return timesheets;
    }
  };

  const filteredTimesheets = getFilteredTimesheets();

  // Access check
  if (!canView) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view team timesheets.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (isLoading && timesheets.length === 0) {
    return <LoadingSpinner fullscreen text="Loading team timesheets..." />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Team Review"
        description="Review and approve team member timesheets"
        action={
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={loadTimesheets}
            disabled={isLoading}
          >
            Refresh
          </Button>
        }
      />

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Timesheets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalTimesheets}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingCount}</p>
            <p className="text-sm text-gray-500 mt-1">
              {stats.totalTimesheets > 0
                ? Math.round((stats.pendingCount / stats.totalTimesheets) * 100)
                : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.approvedCount}</p>
            <p className="text-sm text-gray-500 mt-1">
              {stats.totalHours.toFixed(1)}h total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{stats.rejectedCount}</p>
            <p className="text-sm text-gray-500 mt-1">
              {stats.billablePercentage}% billable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ViewTab)}>
        <TabsList>
          <TabsTrigger value="all">
            All ({timesheets.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Review ({stats.pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({stats.approvedCount})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({stats.rejectedCount})
          </TabsTrigger>
        </TabsList>

        {/* All Tab */}
        <TabsContent value="all">
          <TeamReviewList
            timesheets={filteredTimesheets}
            teamMembers={teamMembers}
            viewMode="list"
            showFilters={true}
            canApprove={canApprove}
            enableBulkActions={canApprove}
            enablePagination={true}
            itemsPerPage={10}
            onApprove={handleApprove}
            onReject={handleRejectClick}
            onBulkApprove={bulkApprove}
            onBulkReject={handleBulkReject}
            isLoading={isApproving || isRejecting}
          />
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending">
          <TeamReviewList
            timesheets={filteredTimesheets}
            teamMembers={teamMembers}
            viewMode="list"
            showFilters={true}
            canApprove={canApprove}
            enableBulkActions={canApprove}
            enablePagination={true}
            itemsPerPage={10}
            onApprove={handleApprove}
            onReject={handleRejectClick}
            onBulkApprove={bulkApprove}
            onBulkReject={handleBulkReject}
            isLoading={isApproving || isRejecting}
          />
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved">
          <TeamReviewList
            timesheets={filteredTimesheets}
            teamMembers={teamMembers}
            viewMode="list"
            showFilters={true}
            canApprove={false}
            enableBulkActions={false}
            enablePagination={true}
            itemsPerPage={10}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected">
          <TeamReviewList
            timesheets={filteredTimesheets}
            teamMembers={teamMembers}
            viewMode="list"
            showFilters={true}
            canApprove={false}
            enableBulkActions={false}
            enablePagination={true}
            itemsPerPage={10}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Rejection Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => {
          rejectModal.close();
          setSelectedTimesheetId(null);
          setRejectionReason('');
        }}
        title="Reject Timesheet"
        size="md"
      >
        <div className="space-y-4">
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Rejection Confirmation</AlertTitle>
            <AlertDescription>
              Please provide a reason for rejecting this timesheet. The employee will receive this feedback.
            </AlertDescription>
          </Alert>

          <Textarea
            label="Rejection Reason *"
            placeholder="Enter reason for rejection (minimum 10 characters)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
            error={
              rejectionReason.trim().length > 0 && rejectionReason.trim().length < 10
                ? 'Reason must be at least 10 characters'
                : undefined
            }
          />

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                rejectModal.close();
                setSelectedTimesheetId(null);
                setRejectionReason('');
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={
                !rejectionReason.trim() ||
                rejectionReason.trim().length < 10 ||
                isRejecting
              }
              loading={isRejecting}
            >
              Reject Timesheet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
