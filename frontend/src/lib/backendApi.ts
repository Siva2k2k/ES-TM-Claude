/**
 * Backend API Client for Timesheet Service
 * Axios-based HTTP client with centralized error handling and interceptors
 * Handles communication with the Node.js/MongoDB backend
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import axiosInstance from '../config/axios.config';

// In production (when VITE_API_URL is not set or empty), use relative URLs (same domain)
// In development, use localhost:3001
const BACKEND_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001');

export class BackendApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

/**
 * API Client for backend timesheet operations
 * Now using Axios with interceptors for production-ready error handling and token management
 */
export class BackendApiClient {
  private baseURL: string;

  constructor(baseURL: string = BACKEND_URL) {
    this.baseURL = baseURL.replace(/\/+$/, ''); // Remove trailing slashes
  }

  /**
   * Handle Axios errors consistently
   */
  private handleAxiosError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{
        error?: string | Record<string, unknown>;
        message?: string;
        code?: string;
      }>;

      let errorMessage = 'An unexpected error occurred';

      // Extract error message from response
      if (axiosError.response?.data) {
        const data = axiosError.response.data;

        if (typeof data.error === 'string' && data.error) {
          errorMessage = data.error;
        } else if (data.error && typeof data.error === 'object') {
          errorMessage = JSON.stringify(data.error);
        } else if (typeof data.message === 'string' && data.message) {
          errorMessage = data.message;
        }
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }

      throw new BackendApiError(
        errorMessage,
        axiosError.response?.status,
        axiosError.response?.data?.code
      );
    }

    // Network or other errors
    throw new BackendApiError(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }

  /**
   * Make authenticated request to backend using Axios
   */
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await axiosInstance.request({
        baseURL: this.baseURL,
        ...config
      });
      return response.data;
    } catch (error) {
      return this.handleAxiosError(error);
    }
  }

  /**
   * Generic HTTP methods
   */
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'GET',
      url: endpoint,
      ...config
    });
  }

  async post<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'POST',
      url: endpoint,
      data,
      ...config
    });
  }

  async put<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'PUT',
      url: endpoint,
      data,
      ...config
    });
  }

  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'DELETE',
      url: endpoint,
      ...config
    });
  }

  async deleteWithBody<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'DELETE',
      url: endpoint,
      data,
      ...config
    });
  }

  async patch<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      method: 'PATCH',
      url: endpoint,
      data,
      ...config
    });
  }

  /**
   * Upload file(s) with multipart/form-data
   */
  async upload<T>(
    endpoint: string,
    formData: FormData,
    onUploadProgress?: (progressEvent: unknown) => void
  ): Promise<T> {
    return this.request<T>({
      method: 'POST',
      url: endpoint,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    });
  }

  /**
   * Download file
   */
  async download(endpoint: string, filename: string): Promise<void> {
    try {
      const response = await axiosInstance.get(endpoint, {
        baseURL: this.baseURL,
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    return this.get('/health');
  }

  /**
   * Get all timesheets (Super Admin and Management only)
   */
  async getAllTimesheets(): Promise<{ success: boolean; data: unknown[] }> {
    return this.get('/timesheets');
  }

  /**
   * Get user timesheets with filters
   */
  async getUserTimesheets(params: {
    userId?: string;
    status?: string[];
    weekStartDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data: unknown[]; total: number }> {
    return this.get('/timesheets/user', { params });
  }

  /**
   * Create new timesheet
   */
  async createTimesheet(data: {
    userId: string;
    weekStartDate: string;
  }): Promise<{ success: boolean; data: unknown }> {
    return this.post('/timesheets', data);
  }

  /**
   * Get timesheet by user and week
   */
  async getTimesheetByUserAndWeek(
    userId: string,
    weekStartDate: string
  ): Promise<{ success: boolean; data: unknown }> {
    return this.get(`/timesheets/${userId}/${weekStartDate}`);
  }

  /**
   * Check if timesheet can be submitted (Lead validation)
   */
  async checkCanSubmit(timesheetId: string): Promise<{
    success: boolean;
    canSubmit: boolean;
    message: string;
    pendingReviews: Array<{
      projectName: string;
      employeeName: string;
      employeeId: string;
    }>;
  }> {
    return this.get(`/timesheets/${timesheetId}/can-submit`);
  }

  /**
   * Submit timesheet for approval
   */
  async submitTimesheet(timesheetId: string): Promise<{ success: boolean; message?: string }> {
    return this.post(`/timesheets/${timesheetId}/submit`);
  }

  /**
   * Manager approve/reject timesheet
   */
  async managerApproveRejectTimesheet(
    timesheetId: string,
    action: 'approve' | 'reject',
    options: {
      reason?: string;
      approverRole?: 'lead' | 'manager';
      finalize?: boolean;
      notify?: boolean;
    } = {}
  ): Promise<{ success: boolean; message?: string }> {
    return this.post(`/timesheets/${timesheetId}/manager-action`, {
      action,
      reason: options.reason,
      approverRole: options.approverRole,
      finalize: options.finalize,
      notify: options.notify
    });
  }

  /**
   * Management approve/reject timesheet
   */
  async managementApproveRejectTimesheet(
    timesheetId: string,
    action: 'approve' | 'reject',
    options: {
      reason?: string;
      approverRole?: 'management' | 'manager';
      finalize?: boolean;
      notify?: boolean;
    } = {}
  ): Promise<{ success: boolean; message?: string }> {
    return this.post(`/timesheets/${timesheetId}/management-action`, {
      action,
      reason: options.reason,
      approverRole: options.approverRole,
      finalize: options.finalize,
      notify: options.notify
    });
  }

  /**
   * Add time entry to timesheet
   */
  async addTimeEntry(
    timesheetId: string,
    entryData: {
      date: string;
      hours: number;
      entry_type: 'project_task' | 'custom_task';
      is_billable: boolean;
      project_id?: string;
      task_id?: string;
      description?: string;
      custom_task_description?: string;
    }
  ): Promise<{ success: boolean; data: unknown }> {
    return this.post(`/timesheets/${timesheetId}/entries`, entryData);
  }

  /**
   * Get timesheet dashboard statistics
   */
  async getTimesheetDashboard(): Promise<{
    success: boolean;
    data: {
      totalTimesheets: number;
      pendingApproval: number;
      pendingManagement: number;
      pendingBilling: number;
      verified: number;
      billed: number;
      totalHours: number;
      averageHoursPerWeek: number;
      completionRate: number;
    };
  }> {
    return this.get('/timesheets/dashboard');
  }

  // === BILLING SERVICE METHODS ===

  /**
   * Generate weekly billing snapshot
   */
  async generateWeeklyBillingSnapshot(weekStartDate: string): Promise<unknown> {
    return this.post('/billing/snapshots/generate', { weekStartDate });
  }

  /**
   * Get all billing snapshots
   */
  async getAllBillingSnapshots(): Promise<unknown> {
    return this.get('/billing/snapshots');
  }

  // === PROJECT BILLING METHODS ===

  /**
   * Get project-based billing view
   */
  async getProjectBillingView(params: {
    startDate: string;
    endDate: string;
    view?: 'weekly' | 'monthly' | 'custom';
    projectIds?: string;
    clientIds?: string;
  }): Promise<unknown> {
    return this.get('/project-billing/projects', { params });
  }

  /**
   * Get user-based billing view
   */
  async getUserBillingView(params: {
    startDate: string;
    endDate: string;
    view?: 'weekly' | 'monthly' | 'custom';
    projectIds?: string;
    clientIds?: string;
    roles?: string;
    search?: string;
  }): Promise<unknown> {
    return this.get('/project-billing/users', { params });
  }

  /**
   * Get task-based billing view
   */
  async getTaskBillingView(params: {
    startDate: string;
    endDate: string;
    projectIds?: string;
    taskIds?: string;
  }): Promise<unknown> {
    return this.get('/project-billing/tasks', { params });
  }

  /**
   * Update billable hours for a specific entry
   */
  async updateBillableHours(data: {
    user_id: string;
    project_id?: string;
    task_id?: string;
    date: string;
    start_date?: string;
    end_date?: string;
    billable_hours: number;
    total_hours?: number;
    reason?: string;
  }): Promise<unknown> {
    return this.put('/project-billing/billable-hours', data);
  }

  /**
   * Get billing dashboard
   */
  async getBillingDashboard(): Promise<unknown> {
    return this.get('/billing/dashboard');
  }

  /**
   * Approve monthly billing
   */
  async approveMonthlyBilling(year: number, month: number): Promise<unknown> {
    return this.post('/billing/approve-monthly', { year, month });
  }

  /**
   * Get revenue by project
   */
  async getRevenueByProject(): Promise<unknown> {
    return this.get('/billing/revenue-by-project');
  }

  /**
   * Export billing report
   */
  async exportBillingReport(
    startDate: string,
    endDate: string,
    format: string,
    options: {
      projectIds?: string[];
      clientIds?: string[];
      view?: string;
      roles?: string[];
      search?: string;
    } = {}
  ): Promise<unknown> {
    const payload: Record<string, unknown> = { startDate, endDate, format };

    if (options.view) {
      payload.view = options.view;
    }
    if (options.projectIds && options.projectIds.length > 0) {
      payload.projectIds = options.projectIds;
    }
    if (options.clientIds && options.clientIds.length > 0) {
      payload.clientIds = options.clientIds;
    }
    if (options.roles && options.roles.length > 0) {
      payload.roles = options.roles;
    }
    if (options.search && options.search.trim().length > 0) {
      payload.search = options.search.trim();
    }

    return this.post('/billing/export', payload);
  }

  // === TIMESHEET SERVICE METHODS ===

  /**
   * Get timesheets by status
   */
  async getTimesheetsByStatus(status: string): Promise<unknown> {
    return this.get(`/timesheets/status/${status}`);
  }

  /**
   * Escalate timesheet to management
   */
  async escalateTimesheet(timesheetId: string): Promise<unknown> {
    return this.post(`/timesheets/${timesheetId}/escalate`);
  }

  /**
   * Mark timesheet as billed
   */
  async markTimesheetBilled(timesheetId: string): Promise<unknown> {
    return this.post(`/timesheets/${timesheetId}/mark-billed`);
  }

  /**
   * Get time entries for timesheet
   */
  async getTimesheetEntries(timesheetId: string): Promise<unknown> {
    return this.get(`/timesheets/${timesheetId}/entries`);
  }

  /**
   * Delete timesheet entries
   */
  async deleteTimesheetEntries(timesheetId: string): Promise<unknown> {
    return this.delete(`/timesheets/${timesheetId}/entries`);
  }

  /**
   * Update timesheet entries
   */
  async updateTimesheetEntries(timesheetId: string, entries: unknown[]): Promise<unknown> {
    return this.put(`/timesheets/${timesheetId}/entries`, { entries });
  }

  /**
   * Get timesheet details by ID
   */
  async getTimesheetDetails(timesheetId: string): Promise<unknown> {
    return this.get(`/timesheets/details/${timesheetId}`);
  }

  /**
   * Get calendar data for user
   */
  async getCalendarData(userId: string, year: number, month: number): Promise<unknown> {
    return this.get(`/timesheets/calendar/${userId}/${year}/${month}`);
  }

  /**
   * Get timesheets for approval
   */
  async getTimesheetsForApproval(queryParams: string): Promise<unknown> {
    return this.get(`/timesheets/for-approval?${queryParams}`);
  }

  /**
   * Create weekly billing snapshot
   */
  async createWeeklyBillingSnapshot(weekStartDate: string): Promise<unknown> {
    return this.post('/billing/snapshots/weekly', { weekStartDate });
  }

  // === CLIENT SERVICE METHODS ===

  /**
   * Create client
   */
  async createClient(clientData: unknown): Promise<unknown> {
    return this.post('/clients', clientData);
  }

  /**
   * Get all clients
   */
  async getAllClients(includeInactive?: boolean): Promise<unknown> {
    const params = includeInactive ? { includeInactive: true } : {};
    return this.get('/clients', { params });
  }

  /**
   * Get client by ID
   */
  async getClientById(clientId: string): Promise<unknown> {
    return this.get(`/clients/${clientId}`);
  }

  /**
   * Update client
   */
  async updateClient(clientId: string, updates: unknown): Promise<unknown> {
    return this.put(`/clients/${clientId}`, updates);
  }

  /**
   * Delete client
   */
  async deleteClient(clientId: string): Promise<unknown> {
    return this.delete(`/clients/${clientId}`);
  }

  /**
   * Deactivate client
   */
  async deactivateClient(clientId: string): Promise<unknown> {
    return this.patch(`/clients/${clientId}/deactivate`);
  }

  /**
   * Reactivate client
   */
  async reactivateClient(clientId: string): Promise<unknown> {
    return this.patch(`/clients/${clientId}/reactivate`);
  }

  /**
   * Get client statistics
   */
  async getClientStats(): Promise<unknown> {
    return this.get('/clients/stats');
  }

  // === DASHBOARD SERVICE METHODS ===

  /**
   * Get role-specific dashboard
   */
  async getRoleSpecificDashboard(): Promise<unknown> {
    return this.get('/dashboard');
  }

  /**
   * Get Super Admin dashboard
   */
  async getSuperAdminDashboard(): Promise<unknown> {
    return this.get('/dashboard/super-admin');
  }

  /**
   * Get Management dashboard
   */
  async getManagementDashboard(): Promise<unknown> {
    return this.get('/dashboard/management');
  }

  /**
   * Get Manager dashboard
   */
  async getManagerDashboard(): Promise<unknown> {
    return this.get('/dashboard/manager');
  }

  /**
   * Get Lead dashboard
   */
  async getLeadDashboard(): Promise<unknown> {
    return this.get('/dashboard/lead');
  }

  /**
   * Get Employee dashboard
   */
  async getEmployeeDashboard(): Promise<unknown> {
    return this.get('/dashboard/employee');
  }

  // === ENHANCED BILLING SERVICE METHODS ===

  /**
   * Get billing summary
   */
  async getBillingSummary(params: {
    period: 'weekly' | 'monthly';
    filterType: 'project' | 'employee';
    filterId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<unknown> {
    return this.get('/billing/summary', { params });
  }
}

// Create singleton instance
export const backendApi = new BackendApiClient();

// Export error class for use in services
export { BackendApiError as default };
