import { useState, useCallback } from 'react';
import { useAuth } from '../store/contexts/AuthContext';
import { UserService } from '../services/UserService';
import PermissionService from '../services/PermissionService';
import type { UserRole } from '../types';

// Project role types for role elevation
export type ProjectRole = 'secondary_manager' | 'lead' | 'employee';

// Role project assignment eligibility
export const ROLE_PROJECT_ELIGIBILITY: Record<UserRole, ProjectRole[] | null> = {
  super_admin: null,     // No project roles needed - system access overrides
  management: null,      // No project roles needed - system access overrides  
  manager: ['secondary_manager', 'lead', 'employee'], // Can take any project role
  lead: ['secondary_manager', 'lead', 'employee'],    // Can be elevated or demoted
  employee: ['lead', 'employee']                      // Can be elevated to lead only
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
   * Check if current role can manage project members (with project context)
   */
  const canManageProjectMembers = useCallback((projectId?: string): boolean => {
    // Super admin, management, and manager always can
    if (['super_admin', 'management', 'manager'].includes(currentUserRole)) {
      return true;
    }
    
    // For project-specific roles, need to check project role
    // This would typically fetch user's role in the specific project
    // For now, return false for lead/employee unless elevated
    return false; // Will be enhanced when project context is available
  }, [currentUserRole]);

  /**
   * Check if current role can assign tasks (with project context)
   */
  const canAssignTasks = useCallback((projectId?: string): boolean => {
    // System roles that can always assign tasks
    if (['super_admin', 'management', 'manager'].includes(currentUserRole)) {
      return true;
    }
    
    // Lead can assign tasks to employees
    if (currentUserRole === 'lead') {
      return true;
    }
    
    return false;
  }, [currentUserRole]);

  /**
   * Check if current role can approve timesheets in projects
   */
  const canApproveProjectTimesheets = useCallback((projectId?: string): boolean => {
    // System roles that can approve timesheets
    if (['super_admin', 'management', 'manager'].includes(currentUserRole)) {
      return true;
    }
    
    // Project-specific: only if elevated to secondary_manager
    // This would check user's project role for the specific project
    return false; // Will be enhanced with project context
  }, [currentUserRole]);

  /**
   * Check if current role can view team timesheets (Lead permission)
   */
  const canViewTeamTimesheets = useCallback((): boolean => {
    // Manager+ can always view
    if (['super_admin', 'management', 'manager'].includes(currentUserRole)) {
      return true;
    }
    
    // Lead can view employee timesheets (read-only)
    return currentUserRole === 'lead';
  }, [currentUserRole]);

  /**
   * Check if current role can guide team members (Lead permission)
   */
  const canGuideTeamMembers = useCallback((): boolean => {
    // Manager+ can always guide
    if (['super_admin', 'management', 'manager'].includes(currentUserRole)) {
      return true;
    }
    
    // Lead can guide employees
    return currentUserRole === 'lead';
  }, [currentUserRole]);

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
    
    // Project role enhancements
    if (projectRole) {
      switch (projectRole) {
        case 'secondary_manager':
          projectPermissions = ['manage_project_members', 'approve_project_timesheets', 'assign_tasks'];
          break;
        case 'lead':
          projectPermissions = ['assign_tasks', 'guide_team', 'view_project_tasks'];
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