/**
 * useClientManagement Hook
 * Custom hook for client management state
 */

import { useState, useCallback } from 'react';
import { AdminService } from '../services/adminService';
import type { Client, ClientFormData } from '../types/admin.types';

export interface UseClientManagementReturn {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  loadClients: (includeInactive?: boolean) => Promise<void>;
  createClient: (data: ClientFormData) => Promise<{ error?: string }>;
  updateClient: (clientId: string, data: Partial<ClientFormData>) => Promise<{ error?: string }>;
  deleteClient: (clientId: string) => Promise<{ error?: string }>;
}

/**
 * Custom hook for managing clients
 * Complexity: 6
 */
export const useClientManagement = (): UseClientManagementReturn => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all clients
   */
  const loadClients = useCallback(async (includeInactive = false): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await AdminService.getAllClients(includeInactive);

      if (result.error) {
        setError(result.error);
      } else {
        setClients(result.clients || []);
      }
    } catch (err) {
      console.error('[useClientManagement] Error loading clients:', err);
      setError('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create new client
   */
  const createClient = useCallback(async (data: ClientFormData): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await AdminService.createClient(data);

      if (result.error) {
        setError(result.error);
        return { error: result.error };
      }

      // Add new client to local state
      if (result.client) {
        setClients(prev => [...prev, result.client!]);
      }

      return {};
    } catch (err) {
      console.error('[useClientManagement] Error creating client:', err);
      const errorMsg = 'Failed to create client';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  /**
   * Update client information
   */
  const updateClient = useCallback(async (
    clientId: string,
    data: Partial<ClientFormData>
  ): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await AdminService.updateClient(clientId, data);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to update client';
        setError(errorMsg);
        return { error: errorMsg };
      }

      // Update local state
      setClients(prev => prev.map(client =>
        client.id === clientId && result.client ? result.client : client
      ));

      return {};
    } catch (err) {
      console.error('[useClientManagement] Error updating client:', err);
      const errorMsg = 'Failed to update client';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  /**
   * Delete a client
   */
  const deleteClient = useCallback(async (clientId: string): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await AdminService.deleteClient(clientId);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to delete client';
        setError(errorMsg);
        return { error: errorMsg };
      }

      // Remove from local state
      setClients(prev => prev.filter(client => client.id !== clientId));

      return {};
    } catch (err) {
      console.error('[useClientManagement] Error deleting client:', err);
      const errorMsg = 'Failed to delete client';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  return {
    clients,
    isLoading,
    error,
    loadClients,
    createClient,
    updateClient,
    deleteClient,
  };
};
