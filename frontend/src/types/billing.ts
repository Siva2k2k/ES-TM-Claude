export type BillingPeriodView = 'weekly' | 'monthly' | 'custom';

export interface VerificationInfo {
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  verified_by_name?: string;
  worked_hours: number;
  billable_hours: number;
  manager_adjustment: number;
  user_count: number;
}

export interface BillingDashboardMetrics {
  totalRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  pendingApprovals: number;
  totalBillableHours: number;
  averageHourlyRate: number;
  revenueGrowth: number;
}

export interface BillingSummaryEntry {
  id: string;
  name: string;
  hours: number;
  billable_hours: number;
  revenue: number;
  week_start: string;
  is_editable: boolean;
}

export interface BillingSummary {
  total_revenue: number;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  average_rate: number;
  entries: BillingSummaryEntry[];
}

export interface RevenueByProject {
  projectId: string;
  projectName: string;
  revenue: number;
  hours: number;
  rate: number;
}

export interface ProjectBillingResource {
  user_id: string;
  user_name: string;
  role: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  hourly_rate: number;
  total_amount: number;
  weekly_breakdown?: Array<{
    week_start: string;
    total_hours: number;
    billable_hours: number;
    amount: number;
  }>;
  tasks?: ProjectBillingResourceTask[];
  verified_worked_hours?: number;
  verified_billable_hours?: number;
  manager_adjustment?: number;
  verified_at?: string;
}

export interface ProjectBillingResourceTask {
  task_id: string;
  task_name: string;
  project_id: string;
  project_name: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  amount: number;
}

export interface ProjectBillingRecord {
  project_id: string;
  project_name: string;
  client_name?: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  total_amount: number;
  resources: ProjectBillingResource[];
  verification_info?: VerificationInfo;
}

export interface ProjectBillingSummary {
  total_projects: number;
  total_hours: number;
  total_billable_hours: number;
  total_amount: number;
}

export interface ProjectBillingPeriod {
  startDate: string;
  endDate: string;
  view: BillingPeriodView;
}

export interface ProjectBillingResponse {
  projects: ProjectBillingRecord[];
  summary: ProjectBillingSummary;
  period: ProjectBillingPeriod;
}

export interface TaskBillingResource {
  user_id: string;
  user_name: string;
  hours: number;
  billable_hours: number;
  rate: number;
  amount: number;
}

export interface TaskBillingRecord {
  task_id: string;
  task_name: string;
  project_id: string;
  project_name: string;
  total_hours: number;
  billable_hours: number;
  resources: TaskBillingResource[];
}

export interface TaskBillingSummary {
  total_tasks: number;
  total_hours: number;
  total_billable_hours: number;
  total_amount: number;
}

export interface TaskBillingResponse {
  tasks: TaskBillingRecord[];
  summary: TaskBillingSummary;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface UserBillingProjectSummary {
  project_id: string;
  project_name: string;
  client_name?: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  amount: number;
}

export interface UserBillingTaskSummary {
  task_id: string;
  task_name: string;
  project_id: string;
  project_name: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  amount: number;
}

export interface UserBillingRecord {
  user_id: string;
  user_name: string;
  role: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  total_amount: number;
  projects: UserBillingProjectSummary[];
  tasks: UserBillingTaskSummary[];
}

export interface UserBillingSummary {
  total_users: number;
  total_hours: number;
  total_billable_hours: number;
  total_non_billable_hours: number;
  total_amount: number;
}

export interface UserBillingResponse {
  users: UserBillingRecord[];
  summary: UserBillingSummary;
  period: {
    startDate: string;
    endDate: string;
    view: 'weekly' | 'monthly' | 'custom';
  };
}

export type BillingInvoiceStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface BillingInvoiceLineItem {
  id: string;
  type: 'timesheet' | 'expense' | 'fixed_fee';
  description: string;
  quantity: number;
  rate: number;
  total: number;
  timesheet_ids?: string[];
}

export interface BillingInvoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  status: BillingInvoiceStatus;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  line_items: BillingInvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export interface BillingClient {
  id: string;
  name: string;
  email?: string;
}

export interface BillingRate {
  id: string;
  entity_type: 'global' | 'user' | 'project' | 'client' | 'role';
  entity_id?: string;
  entity_name?: string;
  hourly_rate: number;
  overtime_multiplier: number;
  holiday_multiplier: number;
  weekend_multiplier: number;
  minimum_increment_minutes: number;
  effective_from: string;
  effective_until?: string;
}

export interface CreateRateData {
  entity_type: BillingRate['entity_type'];
  entity_id?: string;
  role?: string;
  hourly_rate: number;
  overtime_multiplier: number;
  holiday_multiplier: number;
  weekend_multiplier: number;
  minimum_increment_minutes: number;
  effective_from: string;
  effective_until?: string;
}
