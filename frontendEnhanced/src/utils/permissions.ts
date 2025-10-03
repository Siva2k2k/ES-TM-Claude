/**
 * Permission checking utilities
 * Centralized permission logic for role-based access control
 */

import { USER_ROLES, ROLE_HIERARCHY, UserRole } from './constants';

/**
 * Check if user has required role
 * @param userRole - Current user's role
 * @param requiredRole - Required role
 * @returns True if user has required role or higher
 */
export function hasRole(userRole: UserRole | string, requiredRole: UserRole | string): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole as UserRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole as UserRole);

  // If role not found in hierarchy, deny access
  if (userIndex === -1 || requiredIndex === -1) return false;

  // User has required role if their role index is >= required role index
  return userIndex >= requiredIndex;
}

/**
 * Check if user has any of the required roles
 * @param userRole - Current user's role
 * @param requiredRoles - Array of acceptable roles
 * @returns True if user has any of the required roles
 */
export function hasAnyRole(userRole: UserRole | string, requiredRoles: (UserRole | string)[]): boolean {
  return requiredRoles.some(role => hasRole(userRole, role));
}

/**
 * Check if user can manage other users
 * @param userRole - Current user's role
 * @returns True if user can manage users
 */
export function canManageUsers(userRole: UserRole | string): boolean {
  return hasAnyRole(userRole, [USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.MANAGER]);
}

/**
 * Check if user can manage projects
 * @param userRole - Current user's role
 * @returns True if user can manage projects
 */
export function canManageProjects(userRole: UserRole | string): boolean {
  return hasAnyRole(userRole, [USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.MANAGER]);
}

/**
 * Check if user can manage clients
 * @param userRole - Current user's role
 * @returns True if user can manage clients
 */
export function canManageClients(userRole: UserRole | string): boolean {
  return hasAnyRole(userRole, [USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.MANAGER]);
}

/**
 * Check if user can approve timesheets
 * @param userRole - Current user's role
 * @returns True if user can approve timesheets
 */
export function canApproveTimesheets(userRole: UserRole | string): boolean {
  return hasAnyRole(userRole, [USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.MANAGER, USER_ROLES.LEAD]);
}

/**
 * Check if user can view team data
 * @param userRole - Current user's role
 * @returns True if user can view team data
 */
export function canViewTeamData(userRole: UserRole | string): boolean {
  return hasAnyRole(userRole, [USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.MANAGER, USER_ROLES.LEAD]);
}

/**
 * Check if user can manage billing
 * @param userRole - Current user's role
 * @returns True if user can manage billing
 */
export function canManageBilling(userRole: UserRole | string): boolean {
  return hasAnyRole(userRole, [USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.MANAGER]);
}

/**
 * Check if user can view reports
 * @param userRole - Current user's role
 * @param reportType - Type of report
 * @returns True if user can view the report type
 */
export function canViewReport(userRole: UserRole | string, reportType: string): boolean {
  const reportPermissions: Record<string, (UserRole | string)[]> = {
    personal: [USER_ROLES.EMPLOYEE, USER_ROLES.LEAD, USER_ROLES.MANAGER, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN],
    team: [USER_ROLES.LEAD, USER_ROLES.MANAGER, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN],
    project: [USER_ROLES.MANAGER, USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN],
    financial: [USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN],
    executive: [USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN],
    system: [USER_ROLES.SUPER_ADMIN]
  };

  const allowedRoles = reportPermissions[reportType.toLowerCase()];
  if (!allowedRoles) return false;

  return hasAnyRole(userRole, allowedRoles);
}

/**
 * Check if user can create custom reports
 * @param userRole - Current user's role
 * @returns True if user can create custom reports
 */
export function canCreateCustomReports(userRole: UserRole | string): boolean {
  return hasAnyRole(userRole, [USER_ROLES.MANAGEMENT, USER_ROLES.SUPER_ADMIN]);
}

/**
 * Check if user can view audit logs
 * @param userRole - Current user's role
 * @returns True if user can view audit logs
 */
export function canViewAuditLogs(userRole: UserRole | string): boolean {
  return hasAnyRole(userRole, [USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT]);
}

/**
 * Check if user can modify system settings
 * @param userRole - Current user's role
 * @returns True if user can modify system settings
 */
export function canModifySystemSettings(userRole: UserRole | string): boolean {
  return userRole === USER_ROLES.SUPER_ADMIN;
}

/**
 * Check if user can delete records
 * @param userRole - Current user's role
 * @param recordType - Type of record (user, project, client, etc.)
 * @returns True if user can delete the record type
 */
export function canDeleteRecord(userRole: UserRole | string, recordType: string): boolean {
  // Only super admin and management can delete most records
  if (recordType === 'user' || recordType === 'project' || recordType === 'client') {
    return hasAnyRole(userRole, [USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT]);
  }

  // Managers can delete their own timesheets and tasks
  if (recordType === 'timesheet' || recordType === 'task') {
    return hasAnyRole(userRole, [USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.MANAGER]);
  }

  return false;
}

/**
 * Check if user can edit a specific user's data
 * @param currentUserRole - Current user's role
 * @param currentUserId - Current user's ID
 * @param targetUserId - Target user's ID
 * @param targetUserRole - Target user's role
 * @returns True if user can edit the target user's data
 */
export function canEditUser(
  currentUserRole: UserRole | string,
  currentUserId: string,
  targetUserId: string,
  targetUserRole?: UserRole | string
): boolean {
  // Users can always edit their own data
  if (currentUserId === targetUserId) return true;

  // Super admin can edit anyone
  if (currentUserRole === USER_ROLES.SUPER_ADMIN) return true;

  // Management can edit anyone except super admin
  if (currentUserRole === USER_ROLES.MANAGEMENT) {
    return targetUserRole !== USER_ROLES.SUPER_ADMIN;
  }

  // Managers can edit employees and leads
  if (currentUserRole === USER_ROLES.MANAGER) {
    return hasAnyRole(targetUserRole || '', [USER_ROLES.EMPLOYEE, USER_ROLES.LEAD]);
  }

  return false;
}

/**
 * Get accessible navigation items based on user role
 * @param userRole - Current user's role
 * @returns Array of accessible navigation item IDs
 */
export function getAccessibleNavItems(userRole: UserRole | string): string[] {
  const baseItems = ['dashboard'];

  if (userRole === USER_ROLES.SUPER_ADMIN) {
    return [...baseItems, 'users', 'projects', 'clients', 'timesheet', 'reports', 'billing', 'audit'];
  }

  if (userRole === USER_ROLES.MANAGEMENT) {
    return [...baseItems, 'users', 'projects', 'clients', 'timesheet-team', 'reports', 'billing'];
  }

  if (userRole === USER_ROLES.MANAGER) {
    return [...baseItems, 'users', 'projects', 'clients', 'timesheet', 'timesheet-team', 'reports'];
  }

  if (userRole === USER_ROLES.LEAD) {
    return [...baseItems, 'tasks', 'projects', 'timesheet', 'timesheet-team', 'timesheet-status', 'reports'];
  }

  // Employee
  return [...baseItems, 'tasks', 'projects', 'timesheet', 'timesheet-status', 'reports'];
}
