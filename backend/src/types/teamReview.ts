/**
 * Team Review Types
 * Types for project-week based timesheet approval system
 */

export interface ProjectWeekGroup {
  project_id: string;
  project_name: string;
  project_status: string;
  week_start: string; // ISO date string
  week_end: string; // ISO date string
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
  rejected_reason?: string; // If status is rejected
  rejected_by?: string;
  rejected_at?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface ProjectWeekUser {
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  project_role: string;
  timesheet_id: string;
  timesheet_status: string;
  total_hours_for_project: number;
  entries: TimeEntryDetail[];
  approval_status: 'pending' | 'approved' | 'rejected';
}

export interface TimeEntryDetail {
  entry_id: string;
  date: string; // ISO date string
  task_id?: string;
  task_name: string;
  hours: number;
  description?: string;
  is_billable: boolean;
}

export interface ProjectWeekFilters {
  project_id?: string | string[]; // Can filter by multiple projects
  week_start?: string;
  week_end?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  sort_by?: 'week_date' | 'project_name' | 'pending_count';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string; // Search by project or user name
}

export interface ProjectWeekResponse {
  project_weeks: ProjectWeekGroup[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  filters_applied: ProjectWeekFilters;
}

export interface BulkProjectWeekApprovalRequest {
  project_id: string;
  week_start: string;
  week_end: string;
  action: 'approve' | 'reject';
  reason?: string; // Required for reject
}

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
