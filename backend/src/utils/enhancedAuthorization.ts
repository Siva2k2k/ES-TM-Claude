/**
 * Enhanced Role Permission Utilities for MongoDB-based System
 * Handles both system-wide and project-specific permissions
 * 
 * Usage in Express controllers:
 * const permissions = getUserEffectivePermissions(req.user.role, projectRole, projectId);
 * if (!permissions.canApproveTimesheets) { return res.status(403).json({error: 'Permission denied'}); }
 */

// Project role types
export type ProjectRole = 'secondary_manager' | 'lead' | 'employee';
export type SystemRole = 'super_admin' | 'management' | 'manager' | 'lead' | 'employee';

// Role elevation eligibility matrix
export const ROLE_PROJECT_ELIGIBILITY: Record<SystemRole, ProjectRole[] | null> = {
  super_admin: null,     // No project roles needed
  management: null,      // No project roles needed  
  manager: ['secondary_manager', 'lead', 'employee'], // Can take any project role
  lead: ['secondary_manager', 'lead', 'employee'],    // Can be elevated or demoted
  employee: ['lead', 'employee']                      // Can be elevated to lead only
};

// System-level permissions by role
const SYSTEM_PERMISSIONS: Record<SystemRole, string[]> = {
  super_admin: [
    'manage_users', 'approve_users', 'manage_projects', 'access_billing', 
    'approve_timesheets', 'access_audit_logs', 'export_reports', 'system_config'
  ],
  management: [
    'manage_users', 'approve_users', 'manage_projects', 'access_billing',
    'approve_timesheets', 'view_analytics', 'export_reports'
  ],
  manager: [
    'manage_projects', 'approve_timesheets', 'view_team_data', 
    'assign_tasks', 'manage_project_members'
  ],
  lead: [
    'view_employee_timesheets', 'guide_team_members', 'assign_tasks_to_employees',
    'coordinate_team', 'view_project_analytics'
  ],
  employee: [
    'submit_timesheets', 'complete_tasks', 'view_own_data'
  ]
};

// Project-specific permission enhancements
const PROJECT_ROLE_PERMISSIONS: Record<ProjectRole, string[]> = {
  secondary_manager: [
    'manage_project_members', 'approve_project_timesheets', 'assign_project_tasks',
    'view_project_analytics', 'manage_project_settings'
  ],
  lead: [
    'assign_project_tasks', 'coordinate_project_team', 'view_project_tasks',
    'guide_project_members'
  ],
  employee: [
    'submit_project_timesheets', 'complete_project_tasks', 'view_assigned_tasks'
  ]
};

/**
 * Get effective permissions combining system and project roles
 * @param systemRole - User's system-wide role
 * @param projectRole - User's role in specific project (optional)
 * @param projectId - Specific project ID (optional, for future use)
 * @returns Combined permissions object
 */
export function getUserEffectivePermissions(
  systemRole: SystemRole,
  projectRole?: ProjectRole,
  projectId?: string
) {
  const systemPermissions = SYSTEM_PERMISSIONS[systemRole] || [];
  
  // Manager role maintains same high-level access regardless of project role
  if (['super_admin', 'management', 'manager'].includes(systemRole)) {
    return {
      systemPermissions,
      projectPermissions: [],
      effectivePermissions: systemPermissions,
      canApproveTimesheets: true,
      canManageProjectMembers: true,
      canAssignTasks: true,
      canViewTeamData: true,
      systemRoleOverrides: true
    };
  }
  
  // For Lead and Employee, project role can enhance permissions
  let projectPermissions: string[] = [];
  let canApproveTimesheets = false;
  let canManageProjectMembers = false;
  
  if (projectRole) {
    projectPermissions = PROJECT_ROLE_PERMISSIONS[projectRole] || [];
    
    // Project-specific permission enhancements
    if (projectRole === 'secondary_manager') {
      canApproveTimesheets = true;
      canManageProjectMembers = true;
    }
  }
  
  // Lead can always assign tasks and view team data
  const canAssignTasks = systemRole === 'lead' || projectRole === 'secondary_manager' || projectRole === 'lead';
  const canViewTeamData = ['lead'].includes(systemRole) || projectRole === 'secondary_manager';
  
  return {
    systemPermissions,
    projectPermissions,
    effectivePermissions: [...new Set([...systemPermissions, ...projectPermissions])],
    canApproveTimesheets,
    canManageProjectMembers,
    canAssignTasks,
    canViewTeamData,
    systemRoleOverrides: false
  };
}

/**
 * Check if user can be elevated to a specific project role
 * @param systemRole - User's current system role
 * @param targetProjectRole - Desired project role
 * @returns Boolean indicating if elevation is allowed
 */
export function canUserBeElevated(systemRole: SystemRole, targetProjectRole: ProjectRole): boolean {
  const eligibleRoles = ROLE_PROJECT_ELIGIBILITY[systemRole];
  
  // Super admin and management don't need project roles
  if (eligibleRoles === null) {
    return false;
  }
  
  return eligibleRoles.includes(targetProjectRole);
}

/**
 * Get available project roles for a system role
 * @param systemRole - User's system role
 * @returns Array of available project roles
 */
export function getAvailableProjectRoles(systemRole: SystemRole): ProjectRole[] {
  return ROLE_PROJECT_ELIGIBILITY[systemRole] || [];
}

/**
 * Middleware helper for Express.js route protection
 * @param requiredPermission - Permission needed for the route
 * @returns Middleware function
 */
export function requirePermission(requiredPermission: string) {
  return (req: any, res: any, next: any) => {
    const { systemRole, projectRole, projectId } = req.user || {};
    const permissions = getUserEffectivePermissions(systemRole, projectRole, projectId);
    
    if (!permissions.effectivePermissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        error: 'Permission denied',
        required: requiredPermission,
        userPermissions: permissions.effectivePermissions
      });
    }
    
    next();
  };
}

/**
 * Check specific permission combinations for common use cases
 */
export const PermissionCheckers = {
  // Can user approve timesheets (system-wide or project-specific)
  canApproveTimesheets: (systemRole: SystemRole, projectRole?: ProjectRole) => {
    const perms = getUserEffectivePermissions(systemRole, projectRole);
    return perms.canApproveTimesheets;
  },
  
  // Can user manage project members
  canManageProjectMembers: (systemRole: SystemRole, projectRole?: ProjectRole) => {
    const perms = getUserEffectivePermissions(systemRole, projectRole);
    return perms.canManageProjectMembers;
  },
  
  // Can user assign tasks (Lead permission)
  canAssignTasks: (systemRole: SystemRole, projectRole?: ProjectRole) => {
    const perms = getUserEffectivePermissions(systemRole, projectRole);
    return perms.canAssignTasks;
  },
  
  // Can user view team timesheets (Lead read-only access)
  canViewTeamTimesheets: (systemRole: SystemRole) => {
    return ['super_admin', 'management', 'manager', 'lead'].includes(systemRole);
  },
  
  // Can user guide team members (Lead capability)
  canGuideTeamMembers: (systemRole: SystemRole) => {
    return ['super_admin', 'management', 'manager', 'lead'].includes(systemRole);
  }
};

// Example usage patterns:
// const permissions = getUserEffectivePermissions('lead', 'secondary_manager', projectId);
// const canApprove = PermissionCheckers.canApproveTimesheets('lead', 'secondary_manager');
// const availableRoles = getAvailableProjectRoles('employee'); // ['lead', 'employee']