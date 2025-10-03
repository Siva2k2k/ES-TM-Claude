import { useState, useEffect, useCallback } from 'react';
import { useDataFetch } from './useDataFetch';

/**
 * Permission Management Hook
 * Handles role-based and resource-specific permissions
 * Phase 4: Forms & Validation
 */

export interface Permissions {
  // Project permissions
  canViewProject?: boolean;
  canEditProject?: boolean;
  canDeleteProject?: boolean;
  canAddMembers?: boolean;
  canRemoveMembers?: boolean;
  canAssignTasks?: boolean;
  canViewAllTasks?: boolean;

  // Timesheet permissions
  canViewTimesheets?: boolean;
  canApproveTimesheets?: boolean;
  canRejectTimesheets?: boolean;
  canEditOwnTimesheet?: boolean;
  canEditOthersTimesheet?: boolean;

  // User permissions
  canViewUsers?: boolean;
  canEditUsers?: boolean;
  canDeleteUsers?: boolean;
  canManageRoles?: boolean;

  // Client permissions
  canViewClients?: boolean;
  canEditClients?: boolean;
  canDeleteClients?: boolean;

  // Report permissions
  canViewReports?: boolean;
  canExportReports?: boolean;
  canViewFinancialData?: boolean;

  // Billing permissions
  canViewBilling?: boolean;
  canEditBilling?: boolean;
  canProcessPayments?: boolean;

  // System permissions
  canAccessSettings?: boolean;
  canViewAuditLogs?: boolean;
  canManageIntegrations?: boolean;
}

export type UserRole = 'super_admin' | 'management' | 'manager' | 'lead' | 'employee';

export interface UsePermissionsOptions {
  resourceType?: 'project' | 'timesheet' | 'user' | 'client' | 'report' | 'billing';
  resourceId?: string;
  role?: UserRole;
  autoLoad?: boolean;
}

export interface UsePermissionsReturn {
  permissions: Permissions | null;
  loading: boolean;
  error: string | null;
  can: (action: string) => boolean;
  canAny: (actions: string[]) => boolean;
  canAll: (actions: string[]) => boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  loadPermissions: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for checking user permissions
 * Supports both role-based and resource-specific permissions
 */
export function usePermissions(
  options: UsePermissionsOptions = {}
): UsePermissionsReturn {
  const {
    resourceType,
    resourceId,
    role,
    autoLoad = true,
  } = options;

  const [localPermissions, setLocalPermissions] = useState<Permissions | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | undefined>(role);

  // Build API URL based on resource type and ID
  const buildPermissionsUrl = useCallback(() => {
    if (resourceType && resourceId) {
      return `/api/v1/${resourceType}s/${resourceId}/permissions`;
    }
    if (resourceType) {
      return `/api/v1/permissions/${resourceType}`;
    }
    return '/api/v1/permissions';
  }, [resourceType, resourceId]);

  const {
    data: permissionsData,
    loading,
    error,
    fetchData,
    refetch,
  } = useDataFetch<{ permissions: Permissions; role?: UserRole }>({
    url: buildPermissionsUrl(),
    autoLoad,
    cacheKey: resourceId ? `permissions-${resourceType}-${resourceId}` : `permissions-${resourceType}`,
    cacheDuration: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Update local permissions when data changes
  useEffect(() => {
    if (permissionsData) {
      setLocalPermissions(permissionsData.permissions);
      if (permissionsData.role) {
        setCurrentRole(permissionsData.role);
      }
    }
  }, [permissionsData]);

  // Set initial role-based permissions if role is provided
  useEffect(() => {
    if (role && !localPermissions) {
      setLocalPermissions(getRoleBasedPermissions(role));
      setCurrentRole(role);
    }
  }, [role, localPermissions]);

  /**
   * Check if user has a specific permission
   */
  const can = useCallback((action: string): boolean => {
    if (!localPermissions) return false;

    // Convert action to permission key (e.g., 'editProject' -> 'canEditProject')
    const permissionKey = action.startsWith('can')
      ? action
      : `can${action.charAt(0).toUpperCase()}${action.slice(1)}`;

    return !!(localPermissions as any)[permissionKey];
  }, [localPermissions]);

  /**
   * Check if user has any of the specified permissions
   */
  const canAny = useCallback((actions: string[]): boolean => {
    return actions.some(action => can(action));
  }, [can]);

  /**
   * Check if user has all of the specified permissions
   */
  const canAll = useCallback((actions: string[]): boolean => {
    return actions.every(action => can(action));
  }, [can]);

  /**
   * Check if user has a specific role or one of multiple roles
   */
  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!currentRole) return false;

    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(currentRole);
  }, [currentRole]);

  return {
    permissions: localPermissions,
    loading,
    error,
    can,
    canAny,
    canAll,
    hasRole,
    loadPermissions: fetchData,
    refresh: refetch,
  };
}

/**
 * Get default permissions based on user role
 * Fallback when API permissions are not available
 */
export function getRoleBasedPermissions(role: UserRole): Permissions {
  const basePermissions: Permissions = {
    canViewProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canAddMembers: false,
    canRemoveMembers: false,
    canAssignTasks: false,
    canViewAllTasks: false,
    canViewTimesheets: false,
    canApproveTimesheets: false,
    canRejectTimesheets: false,
    canEditOwnTimesheet: true, // All roles can edit their own
    canEditOthersTimesheet: false,
    canViewUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManageRoles: false,
    canViewClients: false,
    canEditClients: false,
    canDeleteClients: false,
    canViewReports: false,
    canExportReports: false,
    canViewFinancialData: false,
    canViewBilling: false,
    canEditBilling: false,
    canProcessPayments: false,
    canAccessSettings: false,
    canViewAuditLogs: false,
    canManageIntegrations: false,
  };

  switch (role) {
    case 'super_admin':
      // Super admin has all permissions
      return Object.keys(basePermissions).reduce((acc, key) => {
        acc[key as keyof Permissions] = true;
        return acc;
      }, {} as Permissions);

    case 'management':
      return {
        ...basePermissions,
        canViewProject: true,
        canEditProject: true,
        canDeleteProject: true,
        canAddMembers: true,
        canRemoveMembers: true,
        canAssignTasks: true,
        canViewAllTasks: true,
        canViewTimesheets: true,
        canApproveTimesheets: true,
        canRejectTimesheets: true,
        canEditOthersTimesheet: true,
        canViewUsers: true,
        canEditUsers: true,
        canViewClients: true,
        canEditClients: true,
        canViewReports: true,
        canExportReports: true,
        canViewFinancialData: true,
        canViewBilling: true,
        canEditBilling: true,
        canAccessSettings: true,
      };

    case 'manager':
      return {
        ...basePermissions,
        canViewProject: true,
        canEditProject: true,
        canAddMembers: true,
        canAssignTasks: true,
        canViewAllTasks: true,
        canViewTimesheets: true,
        canApproveTimesheets: true,
        canRejectTimesheets: true,
        canViewUsers: true,
        canViewClients: true,
        canViewReports: true,
        canExportReports: true,
        canViewBilling: true,
      };

    case 'lead':
      return {
        ...basePermissions,
        canViewProject: true,
        canEditProject: true,
        canAssignTasks: true,
        canViewAllTasks: true,
        canViewTimesheets: true,
        canViewUsers: true,
        canViewClients: true,
        canViewReports: true,
      };

    case 'employee':
    default:
      return {
        ...basePermissions,
        canViewProject: true,
        canViewTimesheets: false, // Can only view own
        canViewUsers: false, // Can only view project members
        canViewClients: false,
        canViewReports: false,
      };
  }
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    management: 'Management',
    manager: 'Manager',
    lead: 'Team Lead',
    employee: 'Employee',
  };
  return roleNames[role] || role;
}

/**
 * Get role priority (higher number = more permissions)
 */
export function getRolePriority(role: UserRole): number {
  const priorities: Record<UserRole, number> = {
    super_admin: 5,
    management: 4,
    manager: 3,
    lead: 2,
    employee: 1,
  };
  return priorities[role] || 0;
}

/**
 * Check if role has higher or equal priority than another role
 */
export function hasHigherOrEqualRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRolePriority(userRole) >= getRolePriority(requiredRole);
}
