/**
 * Admin Service
 * Handles all admin-related API calls (users, clients, audit logs)
 */

import type {
  AdminUser,
  Client,
  AuditLog,
  UserFormData,
  ClientFormData,
  ClientStats,
  UserStats,
  AuditLogFilters,
} from '../types/admin.types';

/**
 * Admin service class
 * Manages admin API interactions
 */
export class AdminService {
  private static readonly baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

  /**
   * Get authorization headers with access token
   */
  private static getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * Get all users
   */
  static async getAllUsers(): Promise<{ users?: AdminUser[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/users`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to fetch users' };
      }

      return { users: result.data || result.users || [] };
    } catch (error) {
      console.error('[AdminService] Error fetching users:', error);
      return { error: 'Failed to fetch users' };
    }
  }

  /**
   * Get pending user approvals
   */
  static async getPendingApprovals(): Promise<{ users?: AdminUser[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/users/pending-approvals`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to fetch pending approvals' };
      }

      return { users: result.data || result.users || [] };
    } catch (error) {
      console.error('[AdminService] Error fetching pending approvals:', error);
      return { error: 'Failed to fetch pending approvals' };
    }
  }

  /**
   * Approve user
   */
  static async approveUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}/approve`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to approve user' };
      }

      return { success: true };
    } catch (error) {
      console.error('[AdminService] Error approving user:', error);
      return { success: false, error: 'Failed to approve user' };
    }
  }

  /**
   * Update user
   */
  static async updateUser(userId: string, data: Partial<UserFormData>): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to update user' };
      }

      return { success: true, user: result.data || result.user };
    } catch (error) {
      console.error('[AdminService] Error updating user:', error);
      return { success: false, error: 'Failed to update user' };
    }
  }

  /**
   * Deactivate user
   */
  static async deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/users/${userId}/deactivate`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to deactivate user' };
      }

      return { success: true };
    } catch (error) {
      console.error('[AdminService] Error deactivating user:', error);
      return { success: false, error: 'Failed to deactivate user' };
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{ stats?: UserStats; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/users/stats`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to fetch user statistics' };
      }

      return { stats: result.data || result.stats };
    } catch (error) {
      console.error('[AdminService] Error fetching user stats:', error);
      return { error: 'Failed to fetch user statistics' };
    }
  }

  // ============================================================================
  // CLIENT MANAGEMENT
  // ============================================================================

  /**
   * Get all clients
   */
  static async getAllClients(includeInactive = false): Promise<{ clients?: Client[]; error?: string }> {
    try {
      const queryParams = includeInactive ? '?includeInactive=true' : '';
      const response = await fetch(`${this.baseURL}/clients${queryParams}`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to fetch clients' };
      }

      return { clients: result.data || result.clients || [] };
    } catch (error) {
      console.error('[AdminService] Error fetching clients:', error);
      return { error: 'Failed to fetch clients' };
    }
  }

  /**
   * Create client
   */
  static async createClient(data: ClientFormData): Promise<{ client?: Client; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/clients`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || result.message || 'Failed to create client' };
      }

      return { client: result.data || result.client };
    } catch (error) {
      console.error('[AdminService] Error creating client:', error);
      return { error: 'Failed to create client' };
    }
  }

  /**
   * Update client
   */
  static async updateClient(clientId: string, data: Partial<ClientFormData>): Promise<{ success: boolean; client?: Client; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to update client' };
      }

      return { success: true, client: result.data || result.client };
    } catch (error) {
      console.error('[AdminService] Error updating client:', error);
      return { success: false, error: 'Failed to update client' };
    }
  }

  /**
   * Delete client
   */
  static async deleteClient(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/clients/${clientId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete client' };
      }

      return { success: true };
    } catch (error) {
      console.error('[AdminService] Error deleting client:', error);
      return { success: false, error: 'Failed to delete client' };
    }
  }

  /**
   * Get client statistics
   */
  static async getClientStats(): Promise<{ stats?: ClientStats; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/clients/stats`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to fetch client statistics' };
      }

      return { stats: result.data || result.stats };
    } catch (error) {
      console.error('[AdminService] Error fetching client stats:', error);
      return { error: 'Failed to fetch client statistics' };
    }
  }

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  /**
   * Get audit logs
   */
  static async getAuditLogs(filters?: AuditLogFilters): Promise<{ logs?: AuditLog[]; total?: number; error?: string }> {
    try {
      const params = new URLSearchParams();

      if (filters?.user_id) params.append('user_id', filters.user_id);
      if (filters?.action) params.append('action', filters.action);
      if (filters?.entity_type) params.append('entity_type', filters.entity_type);
      if (filters?.start_date) params.append('start_date', filters.start_date);
      if (filters?.end_date) params.append('end_date', filters.end_date);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const queryString = params.toString();
      const url = `${this.baseURL}/audit-logs${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to fetch audit logs' };
      }

      return {
        logs: result.data || result.logs || [],
        total: result.total || 0,
      };
    } catch (error) {
      console.error('[AdminService] Error fetching audit logs:', error);
      return { error: 'Failed to fetch audit logs' };
    }
  }
}
