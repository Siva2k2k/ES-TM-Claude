/**
 * Billing Feature Type Definitions
 * Enterprise-level billing with adjustments and rate management
 */

export interface BillingRate {
  id: string;
  user_id: string;
  user_name?: string;
  role: string;
  hourly_rate: number;
  effective_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingAdjustment {
  id: string;
  user_id: string;
  user_name?: string;
  project_id: string;
  project_name?: string;
  task_id?: string;
  billing_period_start: string;
  billing_period_end: string;
  original_billable_hours: number;
  adjusted_billable_hours: number;
  reason?: string;
  adjusted_by: string;
  adjusted_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceBillingData {
  user_id: string;
  user_name: string;
  role: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  hourly_rate: number;
  total_amount: number;
  weekly_breakdown?: WeeklyBreakdown[];
}

export interface WeeklyBreakdown {
  week_start: string;
  week_end: string;
  total_hours: number;
  billable_hours: number;
  amount: number;
}

export interface ProjectBillingData {
  project_id: string;
  project_name: string;
  client_name?: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  total_amount: number;
  budget?: number;
  budget_utilized?: number;
  resources: ResourceBillingData[];
}

export interface BillingSummary {
  total_projects: number;
  total_hours: number;
  total_billable_hours: number;
  total_non_billable_hours: number;
  total_amount: number;
  utilization_rate: number;
}

export interface BillingPeriod {
  startDate: string;
  endDate: string;
  view: 'weekly' | 'monthly' | 'quarterly';
}

export interface ProjectBillingResponse {
  projects: ProjectBillingData[];
  summary: BillingSummary;
  period: BillingPeriod;
}

export interface TaskBillingData {
  task_id: string;
  task_name: string;
  project_id: string;
  project_name: string;
  total_hours: number;
  billable_hours: number;
  total_amount: number;
  assigned_to: string;
}

export interface BillingFilters {
  startDate: string;
  endDate: string;
  view: 'weekly' | 'monthly' | 'quarterly';
  projectIds?: string[];
  userIds?: string[];
  clientIds?: string[];
}

export interface InvoiceData {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  billing_period_start: string;
  billing_period_end: string;
  total_hours: number;
  total_amount: number;
  tax_amount?: number;
  discount_amount?: number;
  final_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  paid_date?: string;
  notes?: string;
  line_items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  project_id: string;
  project_name: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

export interface BillingRateFormData {
  user_id: string;
  role: string;
  hourly_rate: number;
  effective_date: string;
  end_date?: string;
}

export interface BillingAdjustmentFormData {
  user_id: string;
  project_id: string;
  task_id?: string;
  billing_period_start: string;
  billing_period_end: string;
  adjusted_billable_hours: number;
  reason?: string;
}
