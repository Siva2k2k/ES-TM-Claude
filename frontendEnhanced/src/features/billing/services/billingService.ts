/**
 * Billing Service
 * API communication for billing operations
 * Cognitive Complexity: 6
 */
import { apiClient } from '../../../core/api/client';
import type {
  BillingRate,
  BillingAdjustment,
  ProjectBillingResponse,
  TaskBillingData,
  InvoiceData,
  BillingFilters,
  BillingRateFormData,
  BillingAdjustmentFormData,
} from '../types/billing.types';

export const billingService = {
  // Project Billing
  async getProjectBilling(filters: BillingFilters): Promise<ProjectBillingResponse> {
    const params = new URLSearchParams({
      startDate: filters.startDate,
      endDate: filters.endDate,
      view: filters.view,
    });

    if (filters.projectIds && filters.projectIds.length > 0) {
      params.append('projectIds', filters.projectIds.join(','));
    }

    if (filters.userIds && filters.userIds.length > 0) {
      params.append('userIds', filters.userIds.join(','));
    }

    if (filters.clientIds && filters.clientIds.length > 0) {
      params.append('clientIds', filters.clientIds.join(','));
    }

    return apiClient.get<ProjectBillingResponse>(`/billing/projects?${params}`);
  },

  async getTaskBilling(filters: BillingFilters): Promise<TaskBillingData[]> {
    const params = new URLSearchParams({
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    return apiClient.get<TaskBillingData[]>(`/billing/tasks?${params}`);
  },

  // Billing Rates
  async getBillingRates(): Promise<BillingRate[]> {
    return apiClient.get<BillingRate[]>('/billing/rates');
  },

  async getUserBillingRate(userId: string): Promise<BillingRate> {
    return apiClient.get<BillingRate>(`/billing/rates/user/${userId}`);
  },

  async createBillingRate(data: BillingRateFormData): Promise<BillingRate> {
    return apiClient.post<BillingRate>('/billing/rates', data);
  },

  async updateBillingRate(id: string, data: Partial<BillingRateFormData>): Promise<BillingRate> {
    return apiClient.patch<BillingRate>(`/billing/rates/${id}`, data);
  },

  async deleteBillingRate(id: string): Promise<void> {
    return apiClient.delete(`/billing/rates/${id}`);
  },

  // Billing Adjustments
  async getBillingAdjustments(filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    projectId?: string;
  }): Promise<BillingAdjustment[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.projectId) params.append('projectId', filters.projectId);

    return apiClient.get<BillingAdjustment[]>(`/billing/adjustments?${params}`);
  },

  async createBillingAdjustment(data: BillingAdjustmentFormData): Promise<BillingAdjustment> {
    return apiClient.post<BillingAdjustment>('/billing/adjustments', data);
  },

  async updateBillingAdjustment(
    id: string,
    data: Partial<BillingAdjustmentFormData>
  ): Promise<BillingAdjustment> {
    return apiClient.patch<BillingAdjustment>(`/billing/adjustments/${id}`, data);
  },

  async deleteBillingAdjustment(id: string): Promise<void> {
    return apiClient.delete(`/billing/adjustments/${id}`);
  },

  // Invoices
  async getInvoices(filters?: {
    startDate?: string;
    endDate?: string;
    clientId?: string;
    status?: string;
  }): Promise<InvoiceData[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.clientId) params.append('clientId', filters.clientId);
    if (filters?.status) params.append('status', filters.status);

    return apiClient.get<InvoiceData[]>(`/billing/invoices?${params}`);
  },

  async getInvoiceById(id: string): Promise<InvoiceData> {
    return apiClient.get<InvoiceData>(`/billing/invoices/${id}`);
  },

  async createInvoice(data: Partial<InvoiceData>): Promise<InvoiceData> {
    return apiClient.post<InvoiceData>('/billing/invoices', data);
  },

  async updateInvoice(id: string, data: Partial<InvoiceData>): Promise<InvoiceData> {
    return apiClient.patch<InvoiceData>(`/billing/invoices/${id}`, data);
  },

  async deleteInvoice(id: string): Promise<void> {
    return apiClient.delete(`/billing/invoices/${id}`);
  },

  async sendInvoice(id: string): Promise<InvoiceData> {
    return apiClient.post<InvoiceData>(`/billing/invoices/${id}/send`, {});
  },

  async markInvoicePaid(id: string, paidDate: string): Promise<InvoiceData> {
    return apiClient.post<InvoiceData>(`/billing/invoices/${id}/paid`, { paidDate });
  },

  // Export
  async exportBillingData(filters: BillingFilters, format: 'csv' | 'pdf' | 'excel'): Promise<Blob> {
    const params = new URLSearchParams({
      startDate: filters.startDate,
      endDate: filters.endDate,
      view: filters.view,
      format,
    });

    return apiClient.get<Blob>(`/billing/export?${params}`, {
      responseType: 'blob',
    } as any);
  },
};
