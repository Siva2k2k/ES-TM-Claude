/**
 * usePermissions Hook
 * Centralized permission checking for RBAC
 * Cognitive Complexity: 5
 */
import { useMemo } from 'react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import type { UserRole } from '../../features/auth/types/auth.types';
import {
  hasRole,
  hasAnyRole,
  canManageUsers,
  canManageProjects,
  canManageClients,
  canApproveTimesheets,
  canViewTeamData,
  canManageBilling,
  canViewReport,
  canCreateCustomReports,
  canViewAuditLogs,
  canModifySystemSettings,
  canDeleteRecord,
  canEditUser,
  getAccessibleNavItems,
} from '../utils/permissions';

export interface UsePermissionsReturn {
  userRole: UserRole | string;
  userId: string;
  hasRole: (requiredRole: UserRole | string) => boolean;
  hasAnyRole: (requiredRoles: (UserRole | string)[]) => boolean;
  canManageUsers: boolean;
  canManageProjects: boolean;
  canManageClients: boolean;
  canApproveTimesheets: boolean;
  canViewTeamData: boolean;
  canManageBilling: boolean;
  canViewReport: (reportType: string) => boolean;
  canCreateCustomReports: boolean;
  canViewAuditLogs: boolean;
  canModifySystemSettings: boolean;
  canDeleteRecord: (recordType: string) => boolean;
  canEditUser: (targetUserId: string, targetUserRole?: UserRole | string) => boolean;
  accessibleNavItems: string[];
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    const role = user?.role || 'employee';
    const id = user?.id || '';

    return {
      userRole: role,
      userId: id,
      hasRole: (requiredRole: UserRole | string) => hasRole(role, requiredRole),
      hasAnyRole: (requiredRoles: (UserRole | string)[]) => hasAnyRole(role, requiredRoles),
      canManageUsers: canManageUsers(role),
      canManageProjects: canManageProjects(role),
      canManageClients: canManageClients(role),
      canApproveTimesheets: canApproveTimesheets(role),
      canViewTeamData: canViewTeamData(role),
      canManageBilling: canManageBilling(role),
      canViewReport: (reportType: string) => canViewReport(role, reportType),
      canCreateCustomReports: canCreateCustomReports(role),
      canViewAuditLogs: canViewAuditLogs(role),
      canModifySystemSettings: canModifySystemSettings(role),
      canDeleteRecord: (recordType: string) => canDeleteRecord(role, recordType),
      canEditUser: (targetUserId: string, targetUserRole?: UserRole | string) =>
        canEditUser(role, id, targetUserId, targetUserRole),
      accessibleNavItems: getAccessibleNavItems(role),
    };
  }, [user]);

  return permissions;
};
