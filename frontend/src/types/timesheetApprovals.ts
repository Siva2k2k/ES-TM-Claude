/**
 * Phase 7: Timesheet Approval Types
 * Project-wise approval tracking with multi-manager support
 */

import type { TimeEntry, UserRole, User } from './index';

/**
 * Project role types (NO secondary_manager - removed in Phase 6)
 */
export type ProjectRole = 'lead' | 'employee';

/**
 * Timesheet approval statuses
 */
export type ApprovalStatus = 'approved' | 'rejected' | 'pending' | 'not_required';

/**
 * Timesheet workflow statuses (3-Tier Hierarchy)
 */
export type TimesheetStatus =
  | 'draft'                // Employee creating timesheet
  | 'submitted'            // Submitted, awaiting Lead/Manager review
  | 'lead_approved'        // Tier 1: Lead approved employee timesheet
  | 'lead_rejected'        // Tier 1: Lead rejected employee timesheet
  | 'manager_approved'     // Tier 2: Manager approved
  | 'manager_rejected'     // Tier 2: Manager rejected
  | 'management_pending'   // Manager's own timesheet waiting for Management
  | 'management_rejected'  // Tier 3: Management rejected
  | 'frozen'               // Tier 3: Management verified and frozen
  | 'billed';              // Final: Marked as billed

/**
 * Project-specific approval tracking (3-Tier Hierarchy)
 * Tracks approval status per project for multi-manager scenarios
 */
export interface TimesheetProjectApproval {
  project_id: string;
  project_name: string;

  // Tier 1: Lead approval (if project has a lead)
  lead_id?: string;
  lead_name?: string;
  lead_status: ApprovalStatus;
  lead_approved_at?: Date;
  lead_rejection_reason?: string;

  // Tier 2: Manager approval (required for all projects)
  manager_id: string;
  manager_name: string;
  manager_status: ApprovalStatus;
  manager_approved_at?: Date;
  manager_rejection_reason?: string;

  // Tier 3: Management verification (NEW)
  management_status: ApprovalStatus;
  management_approved_at?: Date;
  management_rejection_reason?: string;

  // Project-specific time tracking
  entries_count: number;
  total_hours: number;
}

/**
 * Timesheet with project-wise approval tracking
 * Used for multi-manager approval workflows
 */
export interface TimesheetWithProjectApprovals {
  timesheet_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  week_start: string;
  week_end: string;

  // Overall status (changes when ALL projects approve)
  status: TimesheetStatus;

  // Total hours across all projects
  total_hours: number;

  // Project-wise approval breakdown
  project_approvals: TimesheetProjectApproval[];

  // Management verification
  verified_by?: string;
  verified_at?: Date;
  billed_by?: string;
  billed_at?: Date;

  // Timestamps
  submitted_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Member's timesheet summary within a project context
 */
export interface ProjectMemberTimesheet {
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  project_role: ProjectRole;

  // Current week timesheet (if exists)
  current_week_timesheet?: {
    timesheet_id: string;
    week_start: string;
    week_end: string;
    status: TimesheetStatus;

    // Project-filtered data
    total_hours_for_project: number;
    entries_count: number;
    entries: TimeEntry[]; // Only entries for THIS project

    // Approval status for THIS project
    lead_status: ApprovalStatus;
    manager_status: ApprovalStatus;
    rejection_reason?: string;
  };

  // Statistics
  pending_timesheets_count: number;
  approved_timesheets_count: number;
  rejected_timesheets_count: number;
}

/**
 * Project-wise timesheet grouping for Manager/Management view
 * Hierarchical structure: Projects → Members → Timesheets
 */
export interface ProjectTimesheetGroup {
  project_id: string;
  project_name: string;
  project_status: string;

  // Project manager (who sees this group)
  manager_id: string;
  manager_name: string;

  // Project lead (if exists)
  lead_id?: string;
  lead_name?: string;

  // Members working on this project
  members: ProjectMemberTimesheet[];

  // Aggregated statistics
  total_members: number;
  pending_approvals_count: number;
  approved_this_week: number;
  rejected_this_week: number;
}

/**
 * Approval history entry for timeline display
 */
export interface ApprovalHistoryEntry {
  id: string;
  timesheet_id: string;
  project_id: string;
  project_name: string;

  // Approver details
  approver_id: string;
  approver_name: string;
  approver_role: UserRole;

  // Action details
  action: 'approved' | 'rejected' | 'verified' | 'billed';
  status_before: TimesheetStatus;
  status_after: TimesheetStatus;

  // Optional reason (for rejections)
  reason?: string;

  // Timestamp
  created_at: Date;
}

/**
 * Timesheet with full approval history
 * Used for employee's timesheet detail view
 */
export interface TimesheetWithHistory {
  timesheet: TimesheetWithProjectApprovals;
  entries: TimeEntry[];
  approval_history: ApprovalHistoryEntry[];
}

/**
 * Bulk approval request payload
 * Used by Management for bulk verify operations
 */
export interface BulkApprovalRequest {
  timesheet_ids: string[];
  project_id?: string; // Optional: verify all in a specific project
  action: 'verify' | 'bill';
  verification_notes?: string;
}

/**
 * Bulk approval response
 */
export interface BulkApprovalResponse {
  success: boolean;
  processed_count: number;
  failed_count: number;
  errors?: Array<{
    timesheet_id: string;
    error: string;
  }>;
}

/**
 * Approval action request (single timesheet, single project)
 */
export interface ApprovalActionRequest {
  timesheet_id: string;
  project_id: string;
  action: 'approve' | 'reject';
  reason?: string; // Required for rejection
}

/**
 * Approval action response
 */
export interface ApprovalActionResponse {
  success: boolean;
  message: string;

  // Updated approval status
  project_approval: TimesheetProjectApproval;

  // Whether all required approvals are now complete
  all_approved: boolean;

  // New overall timesheet status
  new_status: TimesheetStatus;
}

/**
 * Approval requirements for a timesheet
 * Tracks which approvals are needed and which are done
 */
export interface TimesheetApprovalRequirement {
  project_id: string;
  project_name: string;

  // Lead requirement
  requires_lead_approval: boolean;
  lead_id?: string;
  lead_name?: string;
  lead_status: ApprovalStatus;

  // Manager requirement (always required)
  manager_id: string;
  manager_name: string;
  manager_status: ApprovalStatus;

  // Completion flags
  is_lead_complete: boolean;
  is_manager_complete: boolean;
}

/**
 * Filter options for team review page
 */
export interface TeamReviewFilters {
  status?: TimesheetStatus | 'all';
  project_id?: string | 'all';
  member_role?: UserRole | 'all';
  week_start?: string;
  week_end?: string;
  search?: string;
}

// ============================================================================
// V2 Types: Project-Week Based Approval System
// ============================================================================

/**
 * Time entry detail for project-week view
 */
export interface TimeEntryDetail {
  entry_id: string;
  date: string;
  task_id?: string;
  task_name: string;
  hours: number;
  description?: string;
  is_billable: boolean;
}

/**
 * User's timesheet data for a specific project-week
 */
export interface ProjectWeekUser {
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  project_role: string;
  timesheet_id: string;
  timesheet_status: TimesheetStatus;
  total_hours_for_project: number;
  entries: TimeEntryDetail[];
  approval_status: 'pending' | 'approved' | 'rejected';
}

/**
 * Project-week group for approval view
 * Represents one project for one specific week with all users
 */
export interface ProjectWeekGroup {
  project_id: string;
  project_name: string;
  project_status: string;
  week_start: string;
  week_end: string;
  week_label: string; // e.g., "Oct 6-12, 2025"
  manager_id: string;
  manager_name: string;
  lead_id?: string;
  lead_name?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  users: ProjectWeekUser[];
  total_users: number;
  total_hours: number;
  total_entries: number;
  rejected_reason?: string;
  rejected_by?: string;
  rejected_at?: string;
  approved_by?: string;
  approved_at?: string;
}

/**
 * Filters for project-week view
 */
export interface ProjectWeekFilters {
  project_id?: string | string[];
  week_start?: string;
  week_end?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  sort_by?: 'week_date' | 'project_name' | 'pending_count';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Response for project-week groups API
 */
export interface ProjectWeekResponse {
  project_weeks: ProjectWeekGroup[];
  pagination: PaginationInfo;
  filters_applied: ProjectWeekFilters;
}

/**
 * Request for bulk project-week approval
 */
export interface BulkProjectWeekApprovalRequest {
  project_id: string;
  week_start: string;
  week_end: string;
  action: 'approve' | 'reject';
  reason?: string;
}

/**
 * Response for bulk project-week approval
 */
export interface BulkProjectWeekApprovalResponse {
  success: boolean;
  message: string;
  affected_users: number;
  affected_timesheets: number;
  project_week: {
    project_name: string;
    week_label: string;
  };
}
