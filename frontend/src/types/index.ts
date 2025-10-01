// ==========================================================================
// COMMON TYPES AND INTERFACES
// ==========================================================================
// Central type definitions used across the timesheet application
// Updated to match new database schema with enhanced workflow
// ==========================================================================

// ==========================================================================
// USER TYPES
// ==========================================================================

export type UserRole = 'super_admin' | 'management' | 'manager' | 'lead' | 'employee';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  hourly_rate: number;
  is_active: boolean;
  is_approved_by_super_admin: boolean;
  manager_id?: string; // NEW: Added manager hierarchy support
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ==========================================================================
// PROJECT TYPES
// ==========================================================================

export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Client {
  id: string;
  name: string;
  contact_person?: string;
  contact_email?: string;
  is_active?: boolean; // NEW: Added active status for clients
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Project {
  id: string;
  name: string;
  client_id: string | {
    _id: string;
    name: string;
    contact_person?: string;
    contact_email?: string;
  };
  primary_manager_id: string;
  status: ProjectStatus;
  start_date: string;
  end_date?: string;
  budget?: number;
  description?: string;
  is_billable?: boolean; // NEW: Added project-level billable flag
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Populated client information (from joins/lookups)
  client_name?: string;
  client_contact_person?: string;
  client_contact_email?: string;
  // Enriched client data (from service layer merging)
  client?: Client;
}

export interface ProjectWithClients extends Project {
  client_name?: string;
  client_contact_person?: string;
  client_contact_email?: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  project_role: UserRole;
  is_primary_manager: boolean;
  is_secondary_manager: boolean;
  assigned_at: string;
  removed_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Task {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  assigned_to_user_id?: string;
  status: string;
  estimated_hours?: number; // NEW: Added estimated hours for better planning
  is_billable?: boolean; // NEW: Added task-level billable flag
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ==========================================================================
// TIMESHEET TYPES (ENHANCED WORKFLOW)
// ==========================================================================

// UPDATED: Enhanced timesheet workflow with new statuses
export type TimesheetStatus = 
  | 'draft' 
  | 'submitted' 
  | 'manager_approved' 
  | 'manager_rejected' 
  | 'management_pending'  // NEW: Escalated to management for approval
  | 'management_rejected'
  | 'frozen'              // Management approved and verified
  | 'billed';             // NEW: Final state - timesheet has been billed

export interface Timesheet {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  total_hours: number;
  status: TimesheetStatus;
  approved_by_manager_id?: string;
  approved_by_manager_at?: string;
  manager_rejection_reason?: string;
  manager_rejected_at?: string; // NEW: Added rejection timestamp
  approved_by_management_id?: string;
  approved_by_management_at?: string;
  management_rejection_reason?: string;
  management_rejected_at?: string; // NEW: Added rejection timestamp
  verified_by_id?: string;
  is_verified: boolean;
  verified_at?: string;
  is_frozen?: boolean;
  billing_snapshot_id?: string;
  submitted_at?: string; // NEW: Added submission timestamp
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export type EntryType = 'project_task' | 'custom_task';

export interface TimeEntry {
  id: string;
  timesheet_id: string;
  project_id?: string;
  task_id?: string;
  date: string;
  hours: number;
  description?: string;
  is_billable: boolean;
  custom_task_description?: string;
  entry_type: EntryType;
  hourly_rate?: number; // NEW: Rate snapshot at time of entry
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ==========================================================================
// ENHANCED TIMESHEET TYPES (FOR UI)
// ==========================================================================

// Project breakdown for timesheet summaries
export interface ProjectBreakdown {
  project_id: string;
  project_name: string;
  hours: number;
  is_billable: boolean;
}

export interface TimesheetWithDetails extends Timesheet {
  user_name: string;
  user_email?: string;
  time_entries: TimeEntry[];
  can_edit: boolean;
  can_submit: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_verify?: boolean;
  can_escalate?: boolean; // NEW: Permission to escalate to management
  can_bill?: boolean; // NEW: Permission to mark as billed
  next_action: string;
  entries?: TimeEntry[];
  user?: User;
  billableHours?: number;
  nonBillableHours?: number;
  projectBreakdown?: ProjectBreakdown[];
  verified?: boolean;
  approval_history?: TimesheetApprovalHistory[]; // NEW: Approval history
}

export interface TimesheetWithEntries {
  timesheet: Timesheet;
  entries: TimeEntry[];
  user?: User;
}

export interface CalendarDay {
  date: string;
  hours: number;
  status: string;
  entries: TimeEntry[];
  isCurrentMonth: boolean;
}

export interface CalendarData {
  [date: string]: {
    hours: number;
    status: string;
    entries: TimeEntry[];
  };
}

// ==========================================================================
// FORM TYPES
// ==========================================================================

export interface TimeEntryForm {
  id?: string;
  project_id?: string;
  task_id?: string;
  date: string;
  hours: number;
  description?: string;
  is_billable: boolean;
  custom_task_description?: string;
  entry_type: EntryType;
  hourly_rate?: number; // NEW: Rate at time of entry
}

export interface TimesheetFormData {
  week_start_date: string;
  entries: TimeEntryForm[];
}

// ==========================================================================
// BILLING TYPES (ENHANCED)
// ==========================================================================

export interface BillingSnapshot {
  id: string;
  timesheet_id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  total_hours: number;
  billable_hours: number;
  hourly_rate: number;
  total_amount: number;
  billable_amount: number;
  snapshot_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ==========================================================================
// AUDIT TYPES (ENHANCED)
// ==========================================================================

// UPDATED: Enhanced audit actions to match database
export type AuditAction = 
  | 'INSERT' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'VERIFY' 
  | 'FREEZE'
  | 'SUBMIT'
  | 'ESCALATE' // NEW: Escalation action
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATED'
  | 'USER_APPROVED'
  | 'USER_DEACTIVATED'
  | 'USER_ROLE_CHANGED'
  | 'TIMESHEET_SUBMITTED'
  | 'TIMESHEET_APPROVED'
  | 'TIMESHEET_VERIFIED'
  | 'TIMESHEET_REJECTED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'BILLING_SNAPSHOT_GENERATED'
  | 'BILLING_APPROVED' // Enhanced for new billing workflow
  | 'ROLE_SWITCHED'
  | 'PERMISSION_DENIED'
  | 'DATA_EXPORT'
  | 'SYSTEM_CONFIG_CHANGED';

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  actor_id?: string; // UPDATED: Changed from changed_by to match migration
  actor_name: string; // NEW: Added actor name field
  timestamp: string; // UPDATED: Changed from changed_at to match migration
  details?: Record<string, unknown>; // NEW: Added details field
  metadata?: Record<string, unknown>; // NEW: Added metadata field
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface TimesheetApprovalHistory {
  id: string;
  timesheet_id: string;
  action: AuditAction;
  performed_by: string;
  performer_name: string; // NEW: Added performer name
  from_status?: TimesheetStatus;
  to_status: TimesheetStatus;
  reason?: string;
  performed_at: string;
  created_at: string;
}

// ==========================================================================
// DASHBOARD TYPES
// ==========================================================================

export interface DashboardStats {
  total_timesheets: number;
  pending_approval: number;
  pending_management: number; // NEW: Separate management pending count
  pending_billing: number; // NEW: Frozen timesheets pending billing
  total_hours: number;
  average_hours_per_timesheet: number;
  completion_rate: number;
}

export interface StatusSummary {
  status: TimesheetStatus;
  count: number;
  total_hours: number;
}

export interface UserSummary {
  user_id: string;
  user_name: string;
  total_timesheets: number;
  total_hours: number;
  pending_count: number;
}

export interface TeamDashboard {
  summary: DashboardStats;
  by_status: StatusSummary[];
  by_user: UserSummary[];
}

// ==========================================================================
// API RESPONSE TYPES
// ==========================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface BulkActionResult {
  success_count: number;
  error_count: number;
  errors: Array<{
    timesheet_id: string;
    error: string;
  }>;
  total_processed: number;
}

// ==========================================================================
// WORKFLOW TYPES (NEW)
// ==========================================================================

// NEW: Enhanced workflow support
export interface WorkflowStep {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'skipped' | 'rejected';
  description: string;
  required_role: UserRole[];
  can_execute: boolean;
}

export interface WorkflowState {
  current_step: number;
  total_steps: number;
  steps: WorkflowStep[];
  can_escalate: boolean;
  can_rollback: boolean;
}

// ==========================================================================
// BILLING WORKFLOW TYPES (NEW)
// ==========================================================================

export interface BillingWorkflow {
  timesheet_id: string;
  current_stage: 'frozen' | 'snapshot_created' | 'billed';
  can_generate_snapshot: boolean;
  can_mark_billed: boolean;
  snapshot_id?: string;
  billing_period: {
    start_date: string;
    end_date: string;
  };
}

// ==========================================================================
// UTILITY TYPES
// ==========================================================================

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface FilterOptions {
  status?: TimesheetStatus[];
  user_id?: string;
  date_range?: DateRange;
  limit?: number;
  offset?: number;
}

export interface ViewModeOptions {
  mode: 'calendar' | 'list' | 'analytics' | 'team-review' | 'my-timesheet';
  sub_mode?: 'calendar' | 'list' | 'analytics';
}

// ==========================================================================
// NAVIGATION TYPES
// ==========================================================================

export interface NavigationSubItem {
  id: string;
  label: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  subItems: NavigationSubItem[];
}

// ==========================================================================
// COMPONENT PROP TYPES
// ==========================================================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface TimesheetComponentProps extends BaseComponentProps {
  initialViewMode?: ViewModeOptions['mode'];
}

export interface DashboardComponentProps extends BaseComponentProps {
  userRole: UserRole;
  userId: string;
}

// ==========================================================================
// PERMISSION TYPES (ENHANCED)
// ==========================================================================

export interface UserPermissions {
  can_view_timesheets: boolean;
  can_edit_timesheets: boolean;
  can_submit_timesheets: boolean;
  can_approve_timesheets: boolean;
  can_reject_timesheets: boolean;
  can_verify_timesheets: boolean;
  can_escalate_timesheets: boolean; // NEW: Escalation permission
  can_bill_timesheets: boolean; // NEW: Billing permission
  can_manage_users: boolean;
  can_manage_projects: boolean;
  can_access_billing: boolean;
  can_access_audit_logs: boolean;
}

// ==========================================================================
// EXPORT ALL TYPES
// ==========================================================================

// All types are already exported above