import { useState, useCallback } from 'react';
import { useAuth } from '../store/contexts/AuthContext';
import { UserService } from '../services/UserService';
import PermissionService from '../services/PermissionService';
import type { UserRole, Timesheet, User } from '../types';

// Project role types (NO secondary_manager - removed in Phase 6)
export type ProjectRole = 'lead' | 'employee';

// Role hierarchy levels
export const ROLE_HIERARCHY_LEVELS: Record<UserRole, number> = {
  employee: 1,
  lead: 2,
  manager: 3,
  management: 4,
  super_admin: 5,
};

// Role project assignment eligibility (UPDATED - no secondary_manager)
export const ROLE_PROJECT_ELIGIBILITY: Record<UserRole, ProjectRole[] | null> = {
  super_admin: null,      // No project roles needed - system access overrides
  management: null,       // No project roles needed - system access overrides
  manager: ['lead', 'employee'], // Can take project roles for organizational purposes
  lead: ['lead', 'employee'],    // Can be lead or employee in projects
  employee: ['employee']          // Can only be employee (can be promoted to lead)
};

interface UseRoleManagerReturn {
  currentRole: UserRole;
  isTransitioning: boolean;
  switchRole: (newRole: UserRole) => Promise<void>;
  canSwitchTo: (role: UserRole) => boolean;
  getRolePermissions: (role: UserRole) => string[];
  resetToDefaultSection: () => void;
  hasPermission: (permission: string) => boolean;

  // System-level permissions
  canManageUsers: () => boolean;
  canApproveUsers: () => boolean;
  canManageProjects: () => boolean;
  canManageTimesheets: () => boolean;
  canAccessBilling: () => boolean;
  canAccessAuditLogs: () => boolean;
  canExportReports: () => boolean;

  // Hierarchical permissions (NEW)
  getRoleLevel: (role: UserRole) => number;
  canApproveRole: (submitterRole: UserRole) => boolean;
  isHigherRoleThan: (otherRole: UserRole) => boolean;

  // Timesheet approval permissions (NEW - Phase 7)
  canApproveTimesheets: () => boolean;
  canApproveEmployeeTimesheets: () => boolean;
  canApproveLeadTimesheets: () => boolean;
  canApproveManagerTimesheets: () => boolean;
  canVerifyTimesheets: () => boolean;
  canMarkAsBilled: () => boolean;

  // Project-specific permissions
  canManageProjectMembers: (projectId?: string) => boolean;
  canAssignTasks: (projectId?: string) => boolean;
  canApproveProjectTimesheets: (projectId?: string) => boolean;
  canViewTeamTimesheets: () => boolean;
  canGuideTeamMembers: () => boolean;

  // Role elevation utilities
  canBeElevatedInProject: (targetProjectRole: ProjectRole) => boolean;
  getAvailableProjectRoles: () => ProjectRole[];
  getEffectivePermissions: (projectId?: string, projectRole?: ProjectRole) => {
    systemLevel: string[];
    projectLevel: string[];
    effective: string[];
  };
}

export type { UseRoleManagerReturn };

/**
 * Custom hook for managing user role switching and permissions
 * ENHANCED for Phase 7 with hierarchical approval logic
 */
export const useRoleManager = (): UseRoleManagerReturn => {
  const { currentUserRole, setCurrentUserRole, setCurrentUser } = useAuth();
  const [isTransitioning, setIsTransitioning] = useState(false);

  /**
   * Get hierarchical level for a role (1-5)
   */
  const getRoleLevel = useCallback((role: UserRole): number => {
    return ROLE_HIERARCHY_LEVELS[role] || 0;
  }, []);

  /**
   * Check if current role can approve a submitter's role
   */
  const canApproveRole = useCallback((submitterRole: UserRole): boolean => {
    const currentLevel = getRoleLevel(currentUserRole);
    const submitterLevel = getRoleLevel(submitterRole);

    // Can approve if at least one level higher
    return currentLevel > submitterLevel;
  }, [currentUserRole, getRoleLevel]);

  /**
   * Check if current role is higher than another role
   */
  const isHigherRoleThan = useCallback((otherRole: UserRole): boolean => {
    return getRoleLevel(currentUserRole) > getRoleLevel(otherRole);
  }, [currentUserRole, getRoleLevel]);

  /**
   * Check if current role can approve timesheets (general)
   */
  const canApproveTimesheets = useCallback((): boolean => {
    // Lead and above can approve timesheets
    return getRoleLevel(currentUserRole) >= 2; // lead+ (Lead CAN approve team)
  }, [currentUserRole, getRoleLevel]);

  /**
   * Check if current role can approve employee timesheets
   */
  const canApproveEmployeeTimesheets = useCallback((): boolean => {
    // Lead, Manager, Management, Super Admin
    return getRoleLevel(currentUserRole) >= 2; // lead+ (Lead CAN approve team)
  }, [currentUserRole, getRoleLevel]);

  /**
   * Check if current role can approve lead timesheets
   */
  const canApproveLeadTimesheets = useCallback((): boolean => {
    // Manager, Management, Super Admin
    return getRoleLevel(currentUserRole) >= 3;
  }, [currentUserRole, getRoleLevel]);

  /**
   * Check if current role can approve manager timesheets
   */
  const canApproveManagerTimesheets = useCallback((): boolean => {
    // Management, Super Admin
    return getRoleLevel(currentUserRole) >= 4;
  }, [currentUserRole, getRoleLevel]);

  /**
   * Check if current role can verify frozen timesheets
   */
  const canVerifyTimesheets = useCallback((): boolean => {
    // Management, Super Admin
    return getRoleLevel(currentUserRole) >= 4;
  }, [currentUserRole, getRoleLevel]);

  /**
   * Check if current role can mark timesheets as billed
   */
  const canMarkAsBilled = useCallback((): boolean => {
    // Management, Super Admin
    return getRoleLevel(currentUserRole) >= 4;
  }, [currentUserRole, getRoleLevel]);

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
   * Check if current role can manage project members (with project context)
   */
  const canManageProjectMembers = useCallback((projectId?: string): boolean => {
    // Manager and above can manage project members
    return getRoleLevel(currentUserRole) >= 3;
  }, [currentUserRole, getRoleLevel]);

  /**
   * Check if current role can assign tasks (with project context)
   */
  const canAssignTasks = useCallback((projectId?: string): boolean => {
    // Lead and above can assign tasks
    return getRoleLevel(currentUserRole) >= 2;
  }, [currentUserRole, getRoleLevel]);

  /**
   * Check if current role can approve timesheets in projects
   * ENHANCED: Leads can approve employee timesheets in their projects
   */
  const canApproveProjectTimesheets = useCallback((projectId?: string): boolean => {
    // Lead and above can approve project timesheets
    return getRoleLevel(currentUserRole) >= 2;
  }, [currentUserRole, getRoleLevel]);

  /**
   * Check if current role can view team timesheets
   * ENHANCED: Leads can view employee timesheets in their projects
   */
  const canViewTeamTimesheets = useCallback((): boolean => {
    // Lead and above can view team timesheets
    return getRoleLevel(currentUserRole) >= 2;
  }, [currentUserRole, getRoleLevel]);

  /**
   * Check if current role can guide team members
   */
  const canGuideTeamMembers = useCallback((): boolean => {
    // Lead and above can guide team members
    return getRoleLevel(currentUserRole) >= 2;
  }, [currentUserRole, getRoleLevel]);

  /**
   * Check if current user can be elevated to a specific project role
   */
  const canBeElevatedInProject = useCallback((targetProjectRole: ProjectRole): boolean => {
    const eligibleRoles = ROLE_PROJECT_ELIGIBILITY[currentUserRole];

    // Super admin and management don't need project roles
    if (eligibleRoles === null) {
      return false;
    }

    return eligibleRoles.includes(targetProjectRole);
  }, [currentUserRole]);

  /**
   * Get available project roles for current system role
   */
  const getAvailableProjectRoles = useCallback((): ProjectRole[] => {
    const eligibleRoles = ROLE_PROJECT_ELIGIBILITY[currentUserRole];
    return eligibleRoles || [];
  }, [currentUserRole]);

  /**
   * Get effective permissions combining system and project roles
   */
  const getEffectivePermissions = useCallback((projectId?: string, projectRole?: ProjectRole) => {
    const systemPermissions = PermissionService.getRolePermissions(currentUserRole);

    let projectPermissions: string[] = [];

    // Project role enhancements (NO secondary_manager)
    if (projectRole) {
      switch (projectRole) {
        case 'lead':
          projectPermissions = [
            'assign_tasks',
            'guide_team',
            'view_project_tasks',
            'approve_employee_timesheets', // NEW in Phase 7
            'view_team_timesheets'
          ];
          break;
        case 'employee':
          projectPermissions = ['submit_timesheets', 'complete_tasks'];
          break;
      }
    }

    // System roles override project roles for high-level permissions
    const effective = [...systemPermissions];
    if (['lead', 'employee'].includes(currentUserRole)) {
      effective.push(...projectPermissions);
    }

    return {
      systemLevel: systemPermissions,
      projectLevel: projectPermissions,
      effective: [...new Set(effective)] // Remove duplicates
    };
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

    // System-level permissions
    canManageUsers,
    canApproveUsers,
    canManageProjects,
    canManageTimesheets,
    canAccessBilling,
    canAccessAuditLogs,
    canExportReports,

    // Hierarchical permissions (NEW)
    getRoleLevel,
    canApproveRole,
    isHigherRoleThan,

    // Timesheet approval permissions (NEW - Phase 7)
    canApproveTimesheets,
    canApproveEmployeeTimesheets,
    canApproveLeadTimesheets,
    canApproveManagerTimesheets,
    canVerifyTimesheets,
    canMarkAsBilled,

    // Project-specific permissions
    canManageProjectMembers,
    canAssignTasks,
    canApproveProjectTimesheets,
    canViewTeamTimesheets,
    canGuideTeamMembers,

    // Role elevation utilities
    canBeElevatedInProject,
    getAvailableProjectRoles,
    getEffectivePermissions
  };
};
