/**
 * useUserManagement Hook
 * Custom hook for user management state
 */

import { useState, useCallback, useEffect } from 'react';
import { AdminService } from '../services/adminService';
import type { AdminUser, UserFormData } from '../types/admin.types';

export interface UseUserManagementReturn {
  users: AdminUser[];
  pendingUsers: AdminUser[];
  isLoading: boolean;
  error: string | null;
  loadUsers: () => Promise<void>;
  approveUser: (userId: string) => Promise<{ error?: string }>;
  updateUser: (userId: string, data: Partial<UserFormData>) => Promise<{ error?: string }>;
  deactivateUser: (userId: string) => Promise<{ error?: string }>;
}

/**
 * Custom hook for managing users
 * Complexity: 6
 */
export const useUserManagement = (): UseUserManagementReturn => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all users and pending approvals
   */
  const loadUsers = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const [allUsersResult, pendingResult] = await Promise.all([
        AdminService.getAllUsers(),
        AdminService.getPendingApprovals(),
      ]);

      if (allUsersResult.error) {
        setError(allUsersResult.error);
      } else {
        setUsers(allUsersResult.users || []);
      }

      if (!pendingResult.error) {
        setPendingUsers(pendingResult.users || []);
      }
    } catch (err) {
      console.error('[useUserManagement] Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Approve a pending user
   */
  const approveUser = useCallback(async (userId: string): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await AdminService.approveUser(userId);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to approve user';
        setError(errorMsg);
        return { error: errorMsg };
      }

      // Reload users to reflect changes
      await loadUsers();

      return {};
    } catch (err) {
      console.error('[useUserManagement] Error approving user:', err);
      const errorMsg = 'Failed to approve user';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, [loadUsers]);

  /**
   * Update user information
   */
  const updateUser = useCallback(async (
    userId: string,
    data: Partial<UserFormData>
  ): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await AdminService.updateUser(userId, data);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to update user';
        setError(errorMsg);
        return { error: errorMsg };
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId && result.user ? result.user : user
      ));

      return {};
    } catch (err) {
      console.error('[useUserManagement] Error updating user:', err);
      const errorMsg = 'Failed to update user';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  /**
   * Deactivate a user
   */
  const deactivateUser = useCallback(async (userId: string): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await AdminService.deactivateUser(userId);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to deactivate user';
        setError(errorMsg);
        return { error: errorMsg };
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, is_active: false } : user
      ));

      return {};
    } catch (err) {
      console.error('[useUserManagement] Error deactivating user:', err);
      const errorMsg = 'Failed to deactivate user';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  return {
    users,
    pendingUsers,
    isLoading,
    error,
    loadUsers,
    approveUser,
    updateUser,
    deactivateUser,
  };
};
