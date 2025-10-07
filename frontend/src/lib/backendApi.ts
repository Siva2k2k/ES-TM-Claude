/**
 * Backend API Client for Timesheet Service
 * Handles communication with the Node.js/MongoDB backend with optional Supabase auth
 */

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
 */
export class BackendApiClient {
  private baseURL: string;

  constructor(baseURL: string = BACKEND_URL) {
    this.baseURL = baseURL.replace(/\/+$/, ''); // Remove trailing slashes
  }

  /**
   * Get authorization token from local storage (MongoDB backend)
   */
  private async getAuthToken(): Promise<string | null> {
    // Get token from local storage (our MongoDB backend auth system)
    const token = localStorage.getItem('accessToken');
    console.log('Retrieved token from localStorage:', token ? `${token.substring(0, 20)}...` : 'null');
    return token;
  }

  /**
   * Make authenticated request to backend
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    const url = `${this.baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorData;

        try {
          errorData = await response.json();
          console.log('Error response data:', errorData);
          
          if (errorData && errorData.error) {
            errorMessage = typeof errorData.error === 'string' && errorData.error ? 
              errorData.error : 
              (errorData.error ? JSON.stringify(errorData.error) : 'Unknown error');
          } else if (errorData && errorData.message) {
            errorMessage = typeof errorData.message === 'string' && errorData.message ? 
              errorData.message : 
              (errorData.message ? JSON.stringify(errorData.message) : 'Unknown error');
          }
        } catch {
          // Response is not JSON, keep the HTTP error message
        }

        throw new BackendApiError(
          errorMessage,
          response.status,
          errorData?.code
        );
      }

      // Handle empty responses (204 No Content, etc.)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof BackendApiError) {
        throw error;
      }

      // Network or other errors
      throw new BackendApiError(
        error instanceof Error && error.message ? error.message : 'Network error occurred'
      );
    }
  }

  /**
   * Generic HTTP methods
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async deleteWithBody<T>(endpoint: string, data?: any): Promise<T> {
    return this.request(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    return this.request('/health');
  }

  /**
   * Get all timesheets (Super Admin and Management only)
   */
  async getAllTimesheets(): Promise<{ success: boolean; data: any[] }> {
    return this.request('/timesheets');
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
  }): Promise<{ success: boolean; data: any[]; total: number }> {
    const searchParams = new URLSearchParams();

    if (params.userId) searchParams.append('userId', params.userId);
    if (params.status && params.status.length > 0) {
      params.status.forEach(s => searchParams.append('status', s));
    }
    if (params.weekStartDate) searchParams.append('weekStartDate', params.weekStartDate);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    const queryString = searchParams.toString();
    const endpoint = `/timesheets/user${queryString ? '?' + queryString : ''}`;

    return this.request(endpoint);
  }

  /**
   * Create new timesheet
   */
  async createTimesheet(data: {
    userId: string;
    weekStartDate: string;
  }): Promise<{ success: boolean; data: any }> {
    return this.request('/timesheets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Get timesheet by user and week
   */
  async getTimesheetByUserAndWeek(
    userId: string,
    weekStartDate: string
  ): Promise<{ success: boolean; data: any }> {
    return this.request(`/timesheets/${userId}/${weekStartDate}`);
  }

  /**
   * Submit timesheet for approval
   */
  async submitTimesheet(timesheetId: string): Promise<{ success: boolean; message?: string }> {
    return this.request(`/timesheets/${timesheetId}/submit`, {
      method: 'POST'
    });
  }

  /**
   * Manager approve/reject timesheet
   */
  async managerApproveRejectTimesheet(
    timesheetId: string,
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<{ success: boolean; message?: string }> {
    return this.request(`/timesheets/${timesheetId}/manager-action`, {
      method: 'POST',
      body: JSON.stringify({ action, reason })
    });
  }

  /**
   * Management approve/reject timesheet
   */
  async managementApproveRejectTimesheet(
    timesheetId: string,
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<{ success: boolean; message?: string }> {
    return this.request(`/timesheets/${timesheetId}/management-action`, {
      method: 'POST',
      body: JSON.stringify({ action, reason })
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
  ): Promise<{ success: boolean; data: any }> {
    return this.request(`/timesheets/${timesheetId}/entries`, {
      method: 'POST',
      body: JSON.stringify(entryData)
    });
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
    return this.request('/timesheets/dashboard');
  }

  // === BILLING SERVICE METHODS ===

  /**
   * Generate weekly billing snapshot
   */
  async generateWeeklyBillingSnapshot(weekStartDate: string): Promise<any> {
    return this.post('/billing/snapshots/generate', { weekStartDate });
  }

  /**
   * Get all billing snapshots
   */
  async getAllBillingSnapshots(): Promise<any> {
    return this.get('/billing/snapshots');
  }

  // === PROJECT BILLING METHODS ===

  /**
   * Get project-based billing view
   */
  async getProjectBillingView(params: {
    startDate: string;
    endDate: string;
    view?: 'weekly' | 'monthly';
    projectIds?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams(params as any);
    return this.get(`/project-billing/projects?${queryParams}`);
  }

  /**
   * Get task-based billing view
   */
  async getTaskBillingView(params: {
    startDate: string;
    endDate: string;
    projectIds?: string;
    taskIds?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams(params as any);
    return this.get(`/project-billing/tasks?${queryParams}`);
  }

  /**
   * Update billable hours for a specific entry
   */
  async updateBillableHours(data: {
    user_id: string;
    project_id?: string;
    task_id?: string;
    date: string;
    billable_hours: number;
    reason?: string;
  }): Promise<any> {
    return this.request('/project-billing/billable-hours', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Get billing dashboard
   */
  async getBillingDashboard(): Promise<any> {
    return this.get('/billing/dashboard');
  }

  /**
   * Approve monthly billing
   */
  async approveMonthlyBilling(year: number, month: number): Promise<any> {
    return this.post('/billing/approve-monthly', { year, month });
  }

  /**
   * Get revenue by project
   */
  async getRevenueByProject(): Promise<any> {
    return this.get('/billing/revenue-by-project');
  }

  /**
   * Export billing report
   */
  async exportBillingReport(startDate: string, endDate: string, format: string): Promise<any> {
    return this.post('/billing/export', { startDate, endDate, format });
  }

  // === TIMESHEET SERVICE METHODS ===

  /**
   * Get timesheets by status
   */
  async getTimesheetsByStatus(status: string): Promise<any> {
    return this.get(`/timesheets/status/${status}`);
  }

  /**
   * Escalate timesheet to management
   */
  async escalateTimesheet(timesheetId: string): Promise<any> {
    return this.post(`/timesheets/${timesheetId}/escalate`);
  }

  /**
   * Mark timesheet as billed
   */
  async markTimesheetBilled(timesheetId: string): Promise<any> {
    return this.post(`/timesheets/${timesheetId}/mark-billed`);
  }

  /**
   * Get time entries for timesheet
   */
  async getTimesheetEntries(timesheetId: string): Promise<any> {
    return this.get(`/timesheets/${timesheetId}/entries`);
  }

  /**
   * Delete timesheet entries
   */
  async deleteTimesheetEntries(timesheetId: string): Promise<any> {
    return this.delete(`/timesheets/${timesheetId}/entries`);
  }

  /**
   * Update timesheet entries
   */
  async updateTimesheetEntries(timesheetId: string, entries: any[]): Promise<any> {
    return this.put(`/timesheets/${timesheetId}/entries`, { entries });
  }

  /**
   * Get timesheet details by ID
   */
  async getTimesheetDetails(timesheetId: string): Promise<any> {
    return this.get(`/timesheets/details/${timesheetId}`);
  }

  /**
   * Get calendar data for user
   */
  async getCalendarData(userId: string, year: number, month: number): Promise<any> {
    return this.get(`/timesheets/calendar/${userId}/${year}/${month}`);
  }

  /**
   * Get timesheets for approval
   */
  async getTimesheetsForApproval(queryParams: string): Promise<any> {
    return this.get(`/timesheets/for-approval?${queryParams}`);
  }

  /**
   * Create weekly billing snapshot
   */
  async createWeeklyBillingSnapshot(weekStartDate: string): Promise<any> {
    return this.post('/billing/snapshots/weekly', { weekStartDate });
  }

  // === CLIENT SERVICE METHODS ===

  /**
   * Create client
   */
  async createClient(clientData: any): Promise<any> {
    return this.post('/clients', clientData);
  }

  /**
   * Get all clients
   */
  async getAllClients(includeInactive?: boolean): Promise<any> {
    const queryParams = includeInactive ? '?includeInactive=true' : '';
    return this.get(`/clients${queryParams}`);
  }

  /**
   * Get client by ID
   */
  async getClientById(clientId: string): Promise<any> {
    return this.get(`/clients/${clientId}`);
  }

  /**
   * Update client
   */
  async updateClient(clientId: string, updates: any): Promise<any> {
    return this.put(`/clients/${clientId}`, updates);
  }

  /**
   * Delete client
   */
  async deleteClient(clientId: string): Promise<any> {
    return this.delete(`/clients/${clientId}`);
  }

  /**
   * Deactivate client
   */
  async deactivateClient(clientId: string): Promise<any> {
    return this.patch(`/clients/${clientId}/deactivate`);
  }

  /**
   * Reactivate client
   */
  async reactivateClient(clientId: string): Promise<any> {
    return this.patch(`/clients/${clientId}/reactivate`);
  }

  /**
   * Get client statistics
   */
  async getClientStats(): Promise<any> {
    return this.get('/clients/stats');
  }

  // === DASHBOARD SERVICE METHODS ===

  /**
   * Get role-specific dashboard
   */
  async getRoleSpecificDashboard(): Promise<any> {
    return this.get('/dashboard');
  }

  /**
   * Get Super Admin dashboard
   */
  async getSuperAdminDashboard(): Promise<any> {
    return this.get('/dashboard/super-admin');
  }

  /**
   * Get Management dashboard
   */
  async getManagementDashboard(): Promise<any> {
    return this.get('/dashboard/management');
  }

  /**
   * Get Manager dashboard
   */
  async getManagerDashboard(): Promise<any> {
    return this.get('/dashboard/manager');
  }

  /**
   * Get Lead dashboard
   */
  async getLeadDashboard(): Promise<any> {
    return this.get('/dashboard/lead');
  }

  /**
   * Get Employee dashboard
   */
  async getEmployeeDashboard(): Promise<any> {
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
  }): Promise<any> {
    const searchParams = new URLSearchParams(params as any);
    return this.get(`/billing/summary?${searchParams}`);
  }
}

// Create singleton instance
export const backendApi = new BackendApiClient();

// Export error class for use in services
// export { BackendApiError };