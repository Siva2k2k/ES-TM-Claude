/**
 * Team Review Validation Schemas
 *
 * Zod schemas for team timesheet review and approval
 * Centralizes all review-related validation logic
 */

import { z } from 'zod';

// Timesheet Status Enum
export const timesheetStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected']);
export type TimesheetStatus = z.infer<typeof timesheetStatusSchema>;

// User Role Enum (for team review context)
export const userRoleSchema = z.enum(['employee', 'lead', 'manager', 'management', 'super_admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Review Action Schema
export const reviewActionSchema = z.object({
  timesheetId: z.string().min(1, 'Timesheet ID is required'),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  reviewedBy: z.string().min(1, 'Reviewer ID is required'),
  reviewedAt: z.date().default(() => new Date())
}).refine(
  (data) => {
    // Rejection requires a reason
    if (data.action === 'reject') {
      return data.reason && data.reason.trim().length >= 10;
    }
    return true;
  },
  {
    message: 'Rejection reason must be at least 10 characters',
    path: ['reason']
  }
);

export type ReviewAction = z.infer<typeof reviewActionSchema>;

// Bulk Review Action Schema
export const bulkReviewActionSchema = z.object({
  timesheetIds: z.array(z.string()).min(1, 'At least one timesheet must be selected'),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  reviewedBy: z.string().min(1, 'Reviewer ID is required')
}).refine(
  (data) => {
    // Bulk rejection requires a reason
    if (data.action === 'reject') {
      return data.reason && data.reason.trim().length >= 10;
    }
    return true;
  },
  {
    message: 'Rejection reason must be at least 10 characters for bulk actions',
    path: ['reason']
  }
);

export type BulkReviewAction = z.infer<typeof bulkReviewActionSchema>;

// Team Review Filter Schema
export const teamReviewFilterSchema = z.object({
  status: z.union([timesheetStatusSchema, z.literal('all')]).default('all'),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  searchTerm: z.string().optional()
});

export type TeamReviewFilter = z.infer<typeof teamReviewFilterSchema>;

// Timesheet Review Summary (for display)
export interface TimesheetReviewSummary {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  weekStartDate: string;
  weekEndDate: string;
  totalHours: number;
  billableHours: number;
  status: TimesheetStatus;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerName?: string;
  rejectionReason?: string;
  entriesCount: number;
  projectsCount: number;
}

// Helper Functions

/**
 * Check if user can view team timesheets
 */
export function canViewTeamTimesheets(role: UserRole): boolean {
  return ['lead', 'manager', 'management', 'super_admin'].includes(role);
}

/**
 * Check if user can approve/reject timesheets
 */
export function canApproveTimesheets(role: UserRole): boolean {
  return ['manager', 'management', 'super_admin'].includes(role);
}

/**
 * Check if user can approve a specific user's timesheet
 */
export function canApproveUserTimesheet(
  reviewerRole: UserRole,
  employeeId: string,
  managerProjects?: Map<string, string[]>
): boolean {
  // Management and super_admin can approve all
  if (['management', 'super_admin'].includes(reviewerRole)) {
    return true;
  }

  // Managers can approve their team
  if (reviewerRole === 'manager') {
    return true;
  }

  // Leads can approve if they manage projects with the employee
  if (reviewerRole === 'lead' && managerProjects) {
    return managerProjects.has(employeeId) && (managerProjects.get(employeeId)?.length || 0) > 0;
  }

  return false;
}

/**
 * Get status color for badges
 */
export function getTimesheetStatusColor(status: TimesheetStatus): string {
  const colors: Record<TimesheetStatus, string> = {
    draft: 'bg-gray-100 text-gray-800 border-gray-300',
    submitted: 'bg-blue-100 text-blue-800 border-blue-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300'
  };
  return colors[status] || colors.draft;
}

/**
 * Get status label
 */
export function getTimesheetStatusLabel(status: TimesheetStatus): string {
  const labels: Record<TimesheetStatus, string> = {
    draft: 'Draft',
    submitted: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected'
  };
  return labels[status] || status;
}

/**
 * Check if timesheet is pending review
 */
export function isPendingReview(status: TimesheetStatus): boolean {
  return status === 'submitted';
}

/**
 * Check if timesheet is reviewed (approved or rejected)
 */
export function isReviewed(status: TimesheetStatus): boolean {
  return status === 'approved' || status === 'rejected';
}

/**
 * Calculate billable hours percentage
 */
export function getBillablePercentage(billableHours: number, totalHours: number): number {
  if (totalHours === 0) return 0;
  return Math.round((billableHours / totalHours) * 100);
}

/**
 * Validate hours are within acceptable range
 */
export function validateWeeklyHours(hours: number): { valid: boolean; message?: string } {
  if (hours < 0) {
    return { valid: false, message: 'Hours cannot be negative' };
  }
  if (hours === 0) {
    return { valid: false, message: 'No hours logged' };
  }
  if (hours > 60) {
    return { valid: false, message: 'Exceeds maximum weekly hours (60)' };
  }
  if (hours < 40) {
    return { valid: false, message: 'Below expected weekly hours (40)' };
  }
  return { valid: true };
}

/**
 * Group timesheets by status for analytics
 */
export function groupTimesheetsByStatus(timesheets: TimesheetReviewSummary[]): Record<TimesheetStatus, TimesheetReviewSummary[]> {
  return timesheets.reduce((acc, timesheet) => {
    if (!acc[timesheet.status]) {
      acc[timesheet.status] = [];
    }
    acc[timesheet.status].push(timesheet);
    return acc;
  }, {} as Record<TimesheetStatus, TimesheetReviewSummary[]>);
}

/**
 * Calculate team review statistics
 */
export interface TeamReviewStats {
  totalTimesheets: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalHours: number;
  billableHours: number;
  billablePercentage: number;
}

export function calculateTeamStats(timesheets: TimesheetReviewSummary[]): TeamReviewStats {
  const totalTimesheets = timesheets.length;
  const pendingCount = timesheets.filter(t => t.status === 'submitted').length;
  const approvedCount = timesheets.filter(t => t.status === 'approved').length;
  const rejectedCount = timesheets.filter(t => t.status === 'rejected').length;
  const totalHours = timesheets.reduce((sum, t) => sum + t.totalHours, 0);
  const billableHours = timesheets.reduce((sum, t) => sum + t.billableHours, 0);
  const billablePercentage = getBillablePercentage(billableHours, totalHours);

  return {
    totalTimesheets,
    pendingCount,
    approvedCount,
    rejectedCount,
    totalHours,
    billableHours,
    billablePercentage
  };
}
