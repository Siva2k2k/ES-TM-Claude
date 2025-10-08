/**
 * Permissions Utility
 * Role-based access control helpers
 * Cognitive Complexity: 10
 */
import type { UserRole } from '../../features/auth/types/auth.types';

// Role hierarchy: employee < team_lead < manager < management < super_admin
const roleHierarchy: Record<UserRole, number> = {
  employee: 1,
  team_lead: 2,
  manager: 3,
  management: 4,
  super_admin: 5,
};

export const hasRole = (userRole: UserRole | string, requiredRole: UserRole | string): boolean => {
  const userLevel = roleHierarchy[userRole as UserRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole as UserRole] || 0;
  return userLevel >= requiredLevel;
};

export const hasAnyRole = (userRole: UserRole | string, requiredRoles: (UserRole | string)[]): boolean => {
  return requiredRoles.some(role => hasRole(userRole, role));
};

export const canManageUsers = (userRole: UserRole | string): boolean => {
  return hasRole(userRole, 'management');
};

export const canManageProjects = (userRole: UserRole | string): boolean => {
  return hasRole(userRole, 'manager');
};

export const canManageClients = (userRole: UserRole | string): boolean => {
  return hasRole(userRole, 'management');
};

export const canApproveTimesheets = (userRole: UserRole | string): boolean => {
  return hasRole(userRole, 'team_lead');
};

export const canViewTeamData = (userRole: UserRole | string): boolean => {
  return hasRole(userRole, 'team_lead');
};

export const canManageBilling = (userRole: UserRole | string): boolean => {
  return hasRole(userRole, 'management');
};

export const canViewReport = (userRole: UserRole | string, reportType: string): boolean => {
  if (reportType === 'team' || reportType === 'project') {
    return hasRole(userRole, 'team_lead');
  }
  if (reportType === 'financial' || reportType === 'executive') {
    return hasRole(userRole, 'management');
  }
  return true; // Personal reports accessible to all
};

export const canCreateCustomReports = (userRole: UserRole | string): boolean => {
  return hasRole(userRole, 'manager');
};

export const canViewAuditLogs = (userRole: UserRole | string): boolean => {
  return hasRole(userRole, 'super_admin');
};

export const canModifySystemSettings = (userRole: UserRole | string): boolean => {
  return hasRole(userRole, 'super_admin');
};

export const canDeleteRecord = (userRole: UserRole | string, recordType: string): boolean => {
  if (recordType === 'user' || recordType === 'client') {
    return hasRole(userRole, 'management');
  }
  if (recordType === 'project' || recordType === 'task') {
    return hasRole(userRole, 'manager');
  }
  if (recordType === 'timesheet') {
    return hasRole(userRole, 'team_lead');
  }
  return false;
};

export const canEditUser = (
  userRole: UserRole | string,
  userId: string,
  targetUserId: string,
  targetUserRole?: UserRole | string
): boolean => {
  // Users can edit themselves
  if (userId === targetUserId) return true;

  // Management can edit users below them in hierarchy
  if (targetUserRole && hasRole(userRole, 'management')) {
    const userLevel = roleHierarchy[userRole as UserRole] || 0;
    const targetLevel = roleHierarchy[targetUserRole as UserRole] || 0;
    return userLevel > targetLevel;
  }

  return false;
};

export const getAccessibleNavItems = (userRole: UserRole | string): string[] => {
  const items = ['dashboard', 'timesheets'];

  if (hasRole(userRole, 'team_lead')) {
    items.push('team');
  }

  if (hasRole(userRole, 'manager')) {
    items.push('projects', 'reports');
  }

  if (hasRole(userRole, 'management')) {
    items.push('clients', 'billing', 'users');
  }

  if (hasRole(userRole, 'super_admin')) {
    items.push('admin', 'audit-logs', 'settings');
  }

  return items;
};
