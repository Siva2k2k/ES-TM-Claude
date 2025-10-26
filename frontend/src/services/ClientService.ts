import { backendApi, BackendApiError } from '../lib/backendApi';
import type { Client } from '../types';

interface ClientWithProjects extends Client {
  projects?: Array<{
    id: string;
    name: string;
    status: string;
    start_date: string;
    end_date?: string;
    is_billable: boolean;
  }>;
  total_projects?: number;
  active_projects?: number;
}

export class ClientService {
  /**
   * Create a new client
   */
  static async createClient(clientData: Partial<Client>): Promise<{ client?: Client; error?: string; status?: number }> {
    try {
      const payload = {
        name: clientData.name!,
        contact_person: clientData.contact_person || undefined,
        contact_email: clientData.contact_email || undefined,
        is_active: clientData.is_active ?? true
      };

      const response = await backendApi.post<{ success: boolean; data: Client; message?: string }>(
        '/clients',
        payload
      );


      if (!response.success) {
        return { error: response.message || 'Failed to create client' };
      }

      return { client: response.data };
    } catch (error: unknown) {
      console.error('Error in createClient:', error);
      if (error instanceof BackendApiError) {
        return { error: error.message, status: error.status };
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to create client';
      return { error: errorMessage };
    }
  }

  /**
   * Get all clients
   */
  static async getAllClients(includeInactive: boolean = false): Promise<{ clients?: ClientWithProjects[]; error?: string }> {
    try {
      const queryParams = includeInactive ? '?includeInactive=true' : '';
      const response = await backendApi.get<{ success: boolean; data: ClientWithProjects[]; message?: string }>(
        `/clients${queryParams}`
      );

      if (!response.success) {
        return { clients: [], error: response.message || 'Failed to fetch clients' };
      }

      return { clients: response.data || [] };
    } catch (error) {
      console.error('Error in getAllClients:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch clients';
      return { clients: [], error: errorMessage };
    }
  }

  /**
   * Get client by ID
   */
  static async getClientById(clientId: string): Promise<{ client?: ClientWithProjects; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; data: ClientWithProjects; message?: string }>(
        `/clients/${clientId}`
      );

      if (!response.success) {
        return { error: response.message || 'Client not found' };
      }

      return { client: response.data };
    } catch (error) {
      console.error('Error in getClientById:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch client';
      return { error: errorMessage };
    }
  }

  /**
   * Update client
   */
  static async updateClient(clientId: string, updates: Partial<Client>): Promise<{ success: boolean; client?: Client; error?: string }> {
    try {
      const payload: Partial<Client> = {};

      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.contact_person !== undefined) payload.contact_person = updates.contact_person;
      if (updates.contact_email !== undefined) payload.contact_email = updates.contact_email;
      if (updates.is_active !== undefined) payload.is_active = updates.is_active;

      const response = await backendApi.put<{ success: boolean; data?: Client; message?: string }>(
        `/clients/${clientId}`,
        payload
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to update client' };
      }

      return { success: true, client: response.data };
    } catch (error) {
      console.error('Error in updateClient:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to update client';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Deactivate client
   */
  static async deactivateClient(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.patch<{ success: boolean; message?: string }>(
        `/clients/${clientId}/deactivate`
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to deactivate client' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deactivateClient:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to deactivate client';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Reactivate client
   */
  static async reactivateClient(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.patch<{ success: boolean; message?: string }>(
        `/clients/${clientId}/reactivate`
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to reactivate client' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in reactivateClient:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to reactivate client';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Delete client (soft delete) with reason
   */
  static async deleteClient(clientId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.deleteWithBody<{ success: boolean; message?: string }>(
        `/clients/${clientId}`,
        { reason }
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to delete client' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteClient:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to delete client';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Hard delete client (permanent deletion)
   */
  static async hardDeleteClient(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.delete<{ success: boolean; message?: string }>(
        `/clients/${clientId}/hard-delete`
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to permanently delete client' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in hardDeleteClient:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to permanently delete client';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Restore soft-deleted client
   */
  static async restoreClient(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.post<{ success: boolean; message?: string }>(
        `/clients/${clientId}/restore`
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to restore client' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in restoreClient:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to restore client';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check client dependencies before deletion
   */
  static async checkClientDependencies(clientId: string): Promise<{ dependencies: string[] }> {
    try {
      const client = await this.getClientById(clientId);
      const dependencies: string[] = [];

      if (client.client && client.client.total_projects && client.client.total_projects > 0) {
        dependencies.push(`Has ${client.client.total_projects} project(s)`);
      }

      return { dependencies };
    } catch (error) {
      console.error('Error checking client dependencies:', error);
      return { dependencies: [] };
    }
  }

  /**
   * Get client statistics
   */
  static async getClientStats(): Promise<{
    stats?: {
      total_clients: number;
      active_clients: number;
      inactive_clients: number;
      clients_with_active_projects: number;
    };
    error?: string;
  }> {
    try {
      const response = await backendApi.get<{
        success: boolean;
        data: {
          total_clients: number;
          active_clients: number;
          inactive_clients: number;
          clients_with_active_projects: number;
        };
        message?: string;
      }>('/clients/stats');

      if (!response.success) {
        return { error: response.message || 'Failed to fetch client statistics' };
      }

      return { stats: response.data };
    } catch (error) {
      console.error('Error in getClientStats:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch client statistics';
      return { error: errorMessage };
    }
  }

  /**
   * Validate client data
   */
  static validateClientData(clientData: Partial<Client>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!clientData.name || clientData.name.trim().length < 2) {
      errors.push('Client name must be at least 2 characters');
    }

    if (clientData.name && clientData.name.trim().length > 100) {
      errors.push('Client name cannot exceed 100 characters');
    }

    if (clientData.contact_email && clientData.contact_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientData.contact_email)) {
        errors.push('Invalid email format');
      }
    }

    if (clientData.contact_person && clientData.contact_person.trim().length > 100) {
      errors.push('Contact person name cannot exceed 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ClientService;