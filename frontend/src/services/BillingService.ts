import { backendApi } from '../lib/backendApi';
import type { BillingSnapshot } from '../types';
import type {
  BillingDashboardMetrics,
  BillingInvoice,
  BillingPeriodView,
  BillingRate,
  BillingSummary,
  CreateRateData,
  ProjectBillingResponse,
  RevenueByProject,
  TaskBillingResponse,
  UserBillingResponse,
  ProjectBillingParams,
  TaskBillingParams,
  UserBillingParams,
  UpdateBillingHoursPayload
} from '../types/billing';


export class BillingService {
  /**
   * Generate weekly billing snapshot (Management)
   */
  static async generateWeeklySnapshot(weekStartDate: string): Promise<{
    snapshots: BillingSnapshot[];
    error?: string;
  }> {
    try {
      const response = await backendApi.post('/billing/snapshots/generate', {
        weekStartDate
      });

      if (response.success && Array.isArray(response.data)) {
        return { snapshots: response.data as BillingSnapshot[] };
      }

      return {
        snapshots: [],
        error: response.message || 'Failed to generate weekly snapshot'
      };
    } catch (error: unknown) {
      console.error('Error in generateWeeklySnapshot:', error);
      return {
        snapshots: [],
        error: error instanceof Error ? error.message : 'Failed to generate weekly snapshot'
      };
    }
  }

  /**
   * Get all billing snapshots
   */
  static async getAllBillingSnapshots(): Promise<{ snapshots: BillingSnapshot[]; error?: string }> {
    try {
      const response = await backendApi.get('/billing/snapshots');
      if (response.success && Array.isArray(response.data)) {
        return { snapshots: response.data as BillingSnapshot[] };
      }

      return {
        snapshots: [],
        error: response.message || 'Failed to fetch billing snapshots'
      };
    } catch (error: unknown) {
      console.error('Error in getAllBillingSnapshots:', error);
      return {
        snapshots: [],
        error: error instanceof Error ? error.message : 'Failed to fetch billing snapshots'
      };
    }
  }

  /**
   * Get billing dashboard metrics
   */
  static async getBillingDashboard(): Promise<BillingDashboardMetrics & { error?: string }> {
    try {
      const response = await backendApi.get('/billing/dashboard');

      if (response.success && response.dashboard) {
        const metrics = response.dashboard as Partial<BillingDashboardMetrics>;
        return {
          totalRevenue: metrics.totalRevenue ?? 0,
          weeklyRevenue: metrics.weeklyRevenue ?? 0,
          monthlyRevenue: metrics.monthlyRevenue ?? 0,
          pendingApprovals: metrics.pendingApprovals ?? 0,
          totalBillableHours: metrics.totalBillableHours ?? 0,
          averageHourlyRate: metrics.averageHourlyRate ?? 0,
          revenueGrowth: metrics.revenueGrowth ?? 0
        };
      }

      return {
        totalRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        pendingApprovals: 0,
        totalBillableHours: 0,
        averageHourlyRate: 0,
        revenueGrowth: 0,
        error: response.message || 'Failed to fetch billing dashboard data'
      };
    } catch (error: unknown) {
      console.error('Error in getBillingDashboard:', error);
      return {
        totalRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        pendingApprovals: 0,
        totalBillableHours: 0,
        averageHourlyRate: 0,
        revenueGrowth: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch billing dashboard data'
      };
    }
  }

  /**
   * Approve monthly billing (Management)
   */
  static async approveMonthlyBilling(year: number, month: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.post('/billing/approve-monthly', {
        year,
        month
      });

      return {
        success: Boolean(response.success),
        error: response.success ? undefined : (response.message || 'Failed to approve monthly billing')
      };
    } catch (error: unknown) {
      console.error('Error in approveMonthlyBilling:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve monthly billing'
      };
    }
  }

  /**
   * Get revenue by project
   */
  static async getRevenueByProject(): Promise<{ projects: RevenueByProject[]; error?: string }> {
    try {
      const response = await backendApi.get('/billing/revenue-by-project');
      if (response.success && Array.isArray(response.data)) {
        return {
          projects: (response.data as any[]).map((project) => ({
            projectId: project.projectId ?? project.project_id ?? '',
            projectName: project.projectName ?? project.project_name ?? 'Unknown project',
            revenue: Number(project.revenue ?? 0),
            hours: Number(project.hours ?? 0),
            rate: Number(project.rate ?? 0)
          }))
        };
      }

      return {
        projects: [],
        error: response.message || 'Failed to fetch revenue by project'
      };
    } catch (error: unknown) {
      console.error('Error in getRevenueByProject:', error);
      return {
        projects: [],
        error: error instanceof Error ? error.message : 'Failed to fetch revenue by project'
      };
    }
  }

  /**
   * Get billing summary with filters
   */
  static async getBillingSummary(
    period: BillingPeriodView,
    filterType: 'project' | 'employee',
    filterId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ summary?: BillingSummary; error?: string }> {
    try {
      const params = new URLSearchParams({
        period,
        filterType,
        ...(filterId && { filterId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      });

      const response = await backendApi.get(`/billing/summary?${params}`);
      if (response.success && response.data) {
        return { summary: response.data as BillingSummary };
      }

      return { error: response.message || 'Failed to fetch billing summary' };
    } catch (error: unknown) {
      console.error('Error in getBillingSummary:', error);
      return { error: error instanceof Error ? error.message : 'Failed to fetch billing summary' };
    }
  }

  /**
   * Update billable hours by entry identifier
   */
  static async updateBillableHours(
    entryId: string,
    newHours: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.patch(`/billing/hours/${entryId}`, {
        hours: newHours
      });

      return {
        success: Boolean(response.success),
        error: response.success ? undefined : (response.message || 'Failed to update billable hours')
      };
    } catch (error: unknown) {
      console.error('Error in updateBillableHours:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update billable hours'
      };
    }
  }

  /**
   * Export billing report
   */
  static async exportBillingReport(
    startDate: string,
    endDate: string,
    format: 'csv' | 'pdf' | 'excel',
    options: {
      projectIds?: string[];
      clientIds?: string[];
      view?: BillingPeriodView | 'custom';
      roles?: string[];
      search?: string;
    } = {}
  ): Promise<{ success: boolean; filename?: string; deliveredFormat?: 'csv' | 'pdf'; error?: string }> {
    try {
      const response = await backendApi.exportBillingReport(startDate, endDate, format, options);

      if (!response.success) {
        return {
          success: false,
          error: response.message || response.error || 'Failed to export billing report'
        };
      }

      const downloadUrl: string | undefined = response.downloadUrl;
      const deliveredFormat: ('csv' | 'pdf') | undefined = response.deliveredFormat;

      if (!downloadUrl) {
        return {
          success: true,
          deliveredFormat
        };
      }

      const downloadResult = await this.fetchAndDownloadBillingReport(
        downloadUrl,
        deliveredFormat ?? (format === 'pdf' ? 'pdf' : 'csv')
      );

      if (!downloadResult.success) {
        return {
          success: false,
          error: downloadResult.error
        };
      }

      return {
        success: true,
        filename: downloadResult.filename,
        deliveredFormat: downloadResult.format as 'csv' | 'pdf'
      };
    } catch (error: unknown) {
      console.error('Error in exportBillingReport:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export billing report'
      };
    }
  }

  private static async fetchAndDownloadBillingReport(
    downloadUrl: string,
    fallbackFormat: 'csv' | 'pdf'
  ): Promise<{ success: boolean; filename?: string; format?: 'csv' | 'pdf'; error?: string }> {
    try {
      const token = localStorage.getItem('accessToken');
      const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1').replace(
        /\/+$/,
        ''
      );

      const resolvedUrl = downloadUrl.startsWith('http')
        ? downloadUrl
        : `${baseURL}${downloadUrl.startsWith('/') ? downloadUrl : `/${downloadUrl}`}`;

      const response = await fetch(resolvedUrl, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        let message = `Failed to download billing report (${response.status})`;
        try {
          const errorPayload = await response.json();
          if (errorPayload?.error) {
            message = errorPayload.error;
          }
        } catch {
          // ignore JSON parse errors
        }
        return { success: false, error: message };
      }

      const deliveredFormatHeader = response.headers.get('X-Delivered-Format');
      const normalizedFormat = (deliveredFormatHeader || fallbackFormat || 'csv').toLowerCase();
      const deliveredFormat = (normalizedFormat === 'pdf' ? 'pdf' : 'csv') as 'csv' | 'pdf';
      const contentDisposition = response.headers.get('Content-Disposition');
      const blob = await response.blob();

      if (blob.size === 0) {
        return { success: false, error: 'Received empty billing report file' };
      }

      let filename = `project-billing-report.${deliveredFormat}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      }

      this.triggerBrowserDownload(blob, filename);

      return {
        success: true,
        filename,
        format: deliveredFormat
      };
    } catch (error: unknown) {
      console.error('Failed while downloading billing report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download billing report'
      };
    }
  }

  private static triggerBrowserDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get project billing data
   */
  static async getProjectBilling(params: ProjectBillingParams): Promise<{ data?: ProjectBillingResponse; error?: string }> {
    try {
      const query = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
        view: params.view,
        ...(params.projectIds && params.projectIds.length > 0
          ? { projectIds: params.projectIds.join(',') }
          : {}),
        ...(params.clientIds && params.clientIds.length > 0
          ? { clientIds: params.clientIds.join(',') }
          : {})
      });

      const response = await backendApi.get(`/project-billing/projects?${query}`);
      if (response.success && response.data) {
        return { data: response.data as ProjectBillingResponse };
      }

      return {
        error: response.message || 'Failed to fetch project billing data'
      };
    } catch (error: unknown) {
      console.error('Error in getProjectBilling:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch project billing data'
      };
    }
  }

  /**
   * Update project/task billable hours with additional context
   */
  static async updateProjectBillingHours(payload: UpdateBillingHoursPayload): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.updateBillableHours({
        user_id: payload.userId,
        project_id: payload.projectId,
        task_id: payload.taskId,
        date: payload.startDate,
        start_date: payload.startDate,
        end_date: payload.endDate,
        billable_hours: payload.billableHours,
        total_hours: payload.totalHours,
        reason: payload.reason
      } as any);

      return {
        success: Boolean(response.success),
        error: response.success ? undefined : (response.message || 'Failed to update billable hours')
      };
    } catch (error: unknown) {
      console.error('Error in updateProjectBillingHours:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update billable hours'
      };
    }
  }

  static async updateProjectTotalBillableHours(
    projectId: string,
    startDate: string,
    endDate: string,
    billableHours: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.put(`/project-billing/projects/${projectId}/billable-total`, {
        start_date: startDate,
        end_date: endDate,
        billable_hours: billableHours
      });

      return {
        success: Boolean(response.success),
        error: response.success ? undefined : (response.message || 'Failed to update project billable hours')
      };
    } catch (error: unknown) {
      console.error('Error in updateProjectTotalBillableHours:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update project billable hours'
      };
    }
  }

  /**
   * Get task-level billing data
   */
  static async getTaskBilling(params: TaskBillingParams): Promise<{ data?: TaskBillingResponse; error?: string }> {
    try {
      const query = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
        ...(params.projectIds && params.projectIds.length > 0
          ? { projectIds: params.projectIds.join(',') }
          : {}),
        ...(params.taskIds && params.taskIds.length > 0
          ? { taskIds: params.taskIds.join(',') }
          : {})
      });

      const response = await backendApi.get(`/project-billing/tasks?${query}`);
      if (response.success && response.data) {
        return { data: response.data as TaskBillingResponse };
      }

      return {
        error: response.message || 'Failed to fetch task billing data'
      };
    } catch (error: unknown) {
      console.error('Error in getTaskBilling:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch task billing data'
      };
    }
  }

  /**
   * Get user-level billing data with project and task breakdowns
   */
  static async getUserBilling(params: UserBillingParams): Promise<{ data?: UserBillingResponse; error?: string }> {
    try {
      const query = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
        view: params.view,
        ...(params.projectIds && params.projectIds.length > 0
          ? { projectIds: params.projectIds.join(',') }
          : {}),
        ...(params.clientIds && params.clientIds.length > 0
          ? { clientIds: params.clientIds.join(',') }
          : {}),
        ...(params.roles && params.roles.length > 0
          ? { roles: params.roles.join(',') }
          : {}),
        ...(params.search && params.search.trim().length > 0
          ? { search: params.search.trim() }
          : {})
      });

      const response = await backendApi.get(`/project-billing/users?${query.toString()}`);
      if (response.success && response.data) {
        return { data: response.data as UserBillingResponse };
      }

      return {
        error: response.message || 'Failed to fetch user billing data'
      };
    } catch (error: unknown) {
      console.error('Error in getUserBilling:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch user billing data'
      };
    }
  }

  /**
   * Get invoice list
   */
  static async getInvoices(): Promise<{ invoices: BillingInvoice[]; error?: string }> {
    try {
      const response = await backendApi.get('/billing/invoices');
      if (response.success) {
        const invoices: BillingInvoice[] = Array.isArray(response.invoices)
          ? response.invoices
          : (response.data as BillingInvoice[]) ?? [];
        return { invoices };
      }

      return {
        invoices: [],
        error: response.message || 'Failed to fetch invoices'
      };
    } catch (error: unknown) {
      console.error('Error in getInvoices:', error);
      return {
        invoices: [],
        error: error instanceof Error ? error.message : 'Failed to fetch invoices'
      };
    }
  }

  /**
   * Approve invoice
   */
  static async approveInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.post(`/billing/invoices/${invoiceId}/approve`, {});
      return {
        success: Boolean(response.success),
        error: response.success ? undefined : (response.message || 'Failed to approve invoice')
      };
    } catch (error: unknown) {
      console.error('Error in approveInvoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve invoice'
      };
    }
  }

  /**
   * Reject invoice with reason
   */
  static async rejectInvoice(invoiceId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.post(`/billing/invoices/${invoiceId}/reject`, { reason });
      return {
        success: Boolean(response.success),
        error: response.success ? undefined : (response.message || 'Failed to reject invoice')
      };
    } catch (error: unknown) {
      console.error('Error in rejectInvoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject invoice'
      };
    }
  }

  /**
   * Generate invoice for client and period
   */
  static async generateInvoice(clientId: string, weekStartDate: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.post('/billing/invoices/generate', {
        client_id: clientId,
        week_start_date: weekStartDate
      });

      return {
        success: Boolean(response.success),
        error: response.success ? undefined : (response.message || 'Failed to generate invoice')
      };
    } catch (error: unknown) {
      console.error('Error in generateInvoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate invoice'
      };
    }
  }

  /**
   * Get billing rates
   */
  static async getBillingRates(): Promise<{ rates: BillingRate[]; error?: string }> {
    try {
      const response = await backendApi.get('/billing/rates');

      if (response.success && Array.isArray(response.rates)) {
        return { rates: response.rates as BillingRate[] };
      }

      if (response.success && Array.isArray(response.data)) {
        return { rates: response.data as BillingRate[] };
      }

      return {
        rates: [],
        error: response.message || 'Failed to fetch billing rates'
      };
    } catch (error: unknown) {
      console.error('Error in getBillingRates:', error);
      return {
        rates: [],
        error: error instanceof Error ? error.message : 'Failed to fetch billing rates'
      };
    }
  }

  /**
   * Create or update billing rate
   */
  static async createBillingRate(payload: CreateRateData): Promise<{ rate?: BillingRate; error?: string }> {
    try {
      const response = await backendApi.post('/billing/rates', payload);
      if (response.success && response.rate) {
        return { rate: response.rate as BillingRate };
      }

      return {
        error: response.message || 'Failed to save billing rate'
      };
    } catch (error: unknown) {
      console.error('Error in createBillingRate:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to save billing rate'
      };
    }
  }

  /**
   * Delete billing rate
   */
  static async deleteBillingRate(rateId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.delete(`/billing/rates/${rateId}`);
      return {
        success: Boolean(response.success),
        error: response.success ? undefined : (response.message || 'Failed to delete billing rate')
      };
    } catch (error: unknown) {
      console.error('Error in deleteBillingRate:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete billing rate'
      };
    }
  }
}

export default BillingService;
