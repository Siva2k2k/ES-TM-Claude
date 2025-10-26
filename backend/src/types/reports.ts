/**
 * Report Types
 * Types for report generation and management
 */

/**
 * Report request parameters
 */
export interface ReportRequest {
  report_type: 'timesheet' | 'billing' | 'project' | 'user' | 'audit';
  format: 'pdf' | 'excel' | 'csv';
  start_date: string | Date;
  end_date: string | Date;
  filters?: ReportFilters;
  requested_by: string;
  requested_at?: Date;
}

/**
 * Report filters
 */
export interface ReportFilters {
  project_ids?: string[];
  client_ids?: string[];
  user_ids?: string[];
  roles?: string[];
  statuses?: string[];
  include_billable_only?: boolean;
  include_verified_only?: boolean;
  search?: string;
}

/**
 * Report data structure
 */
export interface ReportData {
  report_id: string;
  report_type: string;
  title: string;
  generated_at: Date;
  generated_by: string;
  date_range: {
    start: Date;
    end: Date;
  };
  summary: ReportSummary;
  details: any[];
  metadata?: Record<string, any>;
}

/**
 * Report summary metrics
 */
export interface ReportSummary {
  total_records: number;
  total_hours?: number;
  total_billable_hours?: number;
  total_amount?: number;
  breakdown_by_status?: Record<string, number>;
  breakdown_by_project?: Record<string, number>;
  breakdown_by_user?: Record<string, number>;
}

/**
 * Report history entry
 */
export interface ReportHistory {
  report_id: string;
  report_type: string;
  format: string;
  generated_at: Date;
  generated_by: string;
  generated_by_name?: string;
  file_size?: number;
  download_url?: string;
  expires_at?: Date;
  status: 'generating' | 'completed' | 'failed' | 'expired';
}

/**
 * Report generation result
 */
export interface ReportGenerationResult {
  success: boolean;
  report_id?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  download_url?: string;
  error?: string;
}
