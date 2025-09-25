import { supabase } from './supabase';

/**
 * Backend API Client for Timesheet Service
 * Handles communication with the Node.js/MongoDB backend with optional Supabase auth
 */

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/';

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
   * Get authorization token from Supabase or local storage
   */
  private async getAuthToken(): Promise<string | null> {
    // Try to get token from Supabase first (if configured)
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          return session.access_token;
        }
      } catch (error) {
        console.warn('Supabase session error:', error);
      }
    }
    
    // Fallback to local storage for backend JWT token
    return localStorage.getItem('accessToken');
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
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
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
        error instanceof Error ? error.message : 'Network error occurred'
      );
    }
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
    return this.request('/api/v1/timesheets');
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
    const endpoint = `/api/v1/timesheets/user${queryString ? '?' + queryString : ''}`;

    return this.request(endpoint);
  }

  /**
   * Create new timesheet
   */
  async createTimesheet(data: {
    userId: string;
    weekStartDate: string;
  }): Promise<{ success: boolean; data: any }> {
    return this.request('/api/v1/timesheets', {
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
    return this.request(`/api/v1/timesheets/${userId}/${weekStartDate}`);
  }

  /**
   * Submit timesheet for approval
   */
  async submitTimesheet(timesheetId: string): Promise<{ success: boolean; message?: string }> {
    return this.request(`/api/v1/timesheets/${timesheetId}/submit`, {
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
    return this.request(`/api/v1/timesheets/${timesheetId}/manager-action`, {
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
    return this.request(`/api/v1/timesheets/${timesheetId}/management-action`, {
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
    return this.request(`/api/v1/timesheets/${timesheetId}/entries`, {
      method: 'POST',
      body: JSON.stringify(entryData)
    });
  }
}

// Create singleton instance
export const backendApi = new BackendApiClient();