import { useState, useCallback } from 'react';
import { useAuth } from '../store/contexts/AuthContext';
import { UserService } from '../services/UserService';
import PermissionService from '../services/PermissionService';
import type { UserRole } from '../types';

interface UseRoleManagerReturn {
  currentRole: UserRole;
  isTransitioning: boolean;
  switchRole: (newRole: UserRole) => Promise<void>;
  canSwitchTo: (role: UserRole) => boolean;
  getRolePermissions: (role: UserRole) => string[];
  resetToDefaultSection: () => void;
  hasPermission: (permission: string) => boolean;
  canManageUsers: () => boolean;
  canApproveUsers: () => boolean;
  canManageProjects: () => boolean;
  canManageTimesheets: () => boolean;
  canAccessBilling: () => boolean;
  canAccessAuditLogs: () => boolean;
  canExportReports: () => boolean;
}

export type { UseRoleManagerReturn };

/**
 * Custom hook for managing user role switching and permissions
 */
export const useRoleManager = (): UseRoleManagerReturn => {
  const { currentUserRole, setCurrentUserRole, setCurrentUser } = useAuth();
  const [isTransitioning, setIsTransitioning] = useState(false);

  /**
   * Switch to a new role with proper state management
   */
  const switchRole = useCallback(async (newRole: UserRole): Promise<void> => {
    if (newRole === currentUserRole || isTransitioning) {
      return;
    }

    setIsTransitioning(true);

    try {
      // Simulate API delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 100));

      // In a real app, this would switch the user's active role
      // For demo purposes, we'll find a user with the target role
      const { users } = await UserService.getAllUsers();
      const targetUser = users.find(user => user.role === newRole);

      // Update the role in auth context
      setCurrentUserRole(newRole);

      // Update the current user if found
      if (targetUser) {
        setCurrentUser(targetUser);
      }

      // Log the role change for debugging
      console.log(`Role switched from ${currentUserRole} to ${newRole}`);

    } catch (error) {
      console.error('Failed to switch role:', error);
      throw new Error(`Failed to switch to ${newRole} role`);
    } finally {
      // Reset transition state after a brief delay
      setTimeout(() => setIsTransitioning(false), 200);
    }
  }, [currentUserRole, setCurrentUserRole, setCurrentUser, isTransitioning]);

  /**
   * Check if the current user can switch to a specific role
   */
  const canSwitchTo = useCallback((role: UserRole): boolean => {
    // In a real app, this would check user permissions
    // For demo purposes, allow switching to any role
    return role !== currentUserRole && !isTransitioning;
  }, [currentUserRole, isTransitioning]);

  /**
   * Get permissions for a specific role
   */
  const getRolePermissions = useCallback((role: UserRole): string[] => {
    return PermissionService.getRolePermissions(role);
  }, []);

  /**
   * Check if current role has a specific permission
   */
  const hasPermission = useCallback((permission: string): boolean => {
    return PermissionService.hasPermission(currentUserRole, permission);
  }, [currentUserRole]);

  /**
   * Check if current role can manage users
   */
  const canManageUsers = useCallback((): boolean => {
    return PermissionService.canManageUsers(currentUserRole);
  }, [currentUserRole]);

  /**
   * Check if current role can approve users
   */
  const canApproveUsers = useCallback((): boolean => {
    return PermissionService.canApproveUsers(currentUserRole);
  }, [currentUserRole]);

  /**
   * Check if current role can manage projects
   */
  const canManageProjects = useCallback((): boolean => {
    return PermissionService.canManageProjects(currentUserRole);
  }, [currentUserRole]);

  /**
   * Check if current role can manage timesheets
   */
  const canManageTimesheets = useCallback((): boolean => {
    return PermissionService.canManageTimesheets(currentUserRole);
  }, [currentUserRole]);

  /**
   * Check if current role can access billing
   */
  const canAccessBilling = useCallback((): boolean => {
    return PermissionService.canAccessBilling(currentUserRole);
  }, [currentUserRole]);

  /**
   * Check if current role can access audit logs
   */
  const canAccessAuditLogs = useCallback((): boolean => {
    return PermissionService.canAccessAuditLogs(currentUserRole);
  }, [currentUserRole]);

  /**
   * Check if current role can export reports
   */
  const canExportReports = useCallback((): boolean => {
    return PermissionService.canExportReports(currentUserRole);
  }, [currentUserRole]);

  /**
   * Reset navigation to default section for current role
   */
  const resetToDefaultSection = useCallback(() => {
    // This would typically trigger navigation reset
    // Implementation depends on your routing/navigation setup
    console.log('Resetting to default section for role:', currentUserRole);
  }, [currentUserRole]);

  return {
    currentRole: currentUserRole,
    isTransitioning,
    switchRole,
    canSwitchTo,
    getRolePermissions,
    resetToDefaultSection,
    hasPermission,
    canManageUsers,
    canApproveUsers,
    canManageProjects,
    canManageTimesheets,
    canAccessBilling,
    canAccessAuditLogs,
    canExportReports
  };
};