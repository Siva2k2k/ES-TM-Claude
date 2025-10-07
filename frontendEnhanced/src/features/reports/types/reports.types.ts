/**
 * Reports Types
 * Type definitions for reports feature
 */

/**
 * Report category
 */
export type ReportCategory = 'timesheet' | 'project' | 'user' | 'billing' | 'analytics' | 'custom';

/**
 * Report format
 */
export type ReportFormat = 'pdf' | 'excel' | 'csv';

/**
 * Report template
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  category: ReportCategory;
  template_data: ReportTemplateData;
  access_level: 'personal' | 'team' | 'organization' | 'system';
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Report template data structure
 */
export interface ReportTemplateData {
  fields: string[];
  filters: Record<string, unknown>;
  format: ReportFormat;
  groupBy?: string[];
  sortBy?: { field: string; order: 'asc' | 'desc' }[];
}

/**
 * Report generation request
 */
export interface ReportGenerationRequest {
  template_id?: string;
  category: ReportCategory;
  fields: string[];
  filters: ReportFilters;
  format: ReportFormat;
  groupBy?: string[];
  sortBy?: { field: string; order: 'asc' | 'desc' }[];
}

/**
 * Report filters
 */
export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  user_ids?: string[];
  project_ids?: string[];
  client_ids?: string[];
  status?: string;
  is_billable?: boolean;
  [key: string]: unknown;
}

/**
 * Generated report
 */
export interface GeneratedReport {
  id: string;
  name: string;
  category: ReportCategory;
  format: ReportFormat;
  file_url?: string;
  generated_by: string;
  generated_at: string;
  expires_at?: string;
  file_size?: number;
}

/**
 * Report statistics
 */
export interface ReportStats {
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  total_revenue?: number;
  projects_count?: number;
  users_count?: number;
}

/**
 * Available report fields by category
 */
export interface ReportFieldDefinition {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  category: ReportCategory[];
}

/**
 * Report schedule
 */
export interface ReportSchedule {
  id: string;
  template_id: string;
  template_name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week?: number;
  day_of_month?: number;
  recipients: string[];
  is_active: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
}

/**
 * Report builder state
 */
export interface ReportBuilderState {
  category: ReportCategory;
  selectedFields: string[];
  filters: ReportFilters;
  format: ReportFormat;
  groupBy: string[];
  sortBy: { field: string; order: 'asc' | 'desc' }[];
}
