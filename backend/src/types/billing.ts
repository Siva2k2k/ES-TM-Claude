/**
 * Billing Types
 * Types for billing operations and rate management
 */

/**
 * Rate calculation result from BillingRateService
 */
export interface RateCalculation {
  base_rate: number;
  effective_rate: number;
  rate_source: 'user_default' | 'project_override' | 'client_override' | 'system_default';
  multiplier?: number;
  adjustments?: RateAdjustment[];
  total_amount?: number;
}

/**
 * Rate adjustment details
 */
export interface RateAdjustment {
  type: 'overtime' | 'weekend' | 'holiday' | 'custom';
  multiplier: number;
  description?: string;
}

/**
 * Rate search criteria for BillingRateService
 */
export interface RateSearchCriteria {
  user_id?: string;
  project_id?: string;
  client_id?: string;
  effective_date?: Date;
  is_billable?: boolean;
}

/**
 * Invoice draft from InvoiceWorkflowService
 */
export interface InvoiceDraft {
  invoice_number?: string;
  client_id: string;
  client_name?: string;
  project_ids: string[];
  billing_period_start: Date;
  billing_period_end: Date;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  notes?: string;
  status: 'draft' | 'pending_review' | 'approved' | 'sent' | 'paid' | 'cancelled';
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  project_id?: string;
  user_id?: string;
  timesheet_ids?: string[];
}

/**
 * Invoice line item summary from InvoiceWorkflowService
 */
export interface InvoiceLineItemSummary {
  project_id: string;
  project_name: string;
  total_hours: number;
  hourly_rate: number;
  subtotal: number;
  users: Array<{
    user_id: string;
    user_name: string;
    hours: number;
    rate: number;
    amount: number;
  }>;
}

/**
 * Invoice approval thresholds from InvoiceWorkflowService
 */
export interface InvoiceApprovalThresholds {
  auto_approve_under?: number;
  requires_management_over?: number;
  requires_super_admin_over?: number;
}

/**
 * Billing verification status
 */
export interface BillingVerificationStatus {
  is_verified: boolean;
  verified_by?: string;
  verified_by_name?: string;
  verified_at?: Date;
  verification_notes?: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  adjustments: number;
}

/**
 * Billing period summary
 */
export interface BillingPeriodSummary {
  period_start: Date;
  period_end: Date;
  total_projects: number;
  total_hours: number;
  total_billable_hours: number;
  total_revenue: number;
  by_project: Record<string, number>;
  by_client: Record<string, number>;
  by_status: Record<string, number>;
}
