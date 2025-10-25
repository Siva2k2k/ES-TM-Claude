import { useState, useCallback } from 'react';
import { ProjectService } from '../services/ProjectService';
import { UserService } from '../services/UserService';
import { showSuccess, showError } from '../utils/toast';
import type { User } from '../types';

/**
 * Project member data structure
 */
export interface ProjectMember {
  id: string;
  user_id: string;
  project_role: string;
  is_primary_manager: boolean;
  user_name: string;
  user_email: string;
}

/**
 * useProjectMembers Hook
 * Manages project member operations
 *
 * Features:
 * - Load project members
 * - Add members to projects
 * - Remove members from projects
 * - Load available users for assignment
 * - Cache members by project ID
 *
 * @returns Member management functions and state
 */
export const useProjectMembers = () => {
  const [projectMembersMap, setProjectMembersMap] = useState<Record<string, ProjectMember[]>>({});
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  /**
   * Load members for a specific project
   */
  const loadProjectMembers = useCallback(async (projectId: string): Promise<ProjectMember[]> => {
    setIsLoadingMembers(true);
    try {
      const result = await ProjectService.getProjectMembers(projectId);
      if (!result.error) {
        const members = result.members || [];
        setProjectMembersMap(prev => ({ ...prev, [projectId]: members }));
        return members;
      }
      return [];
    } catch (err) {
      console.error('Error loading project members:', err);
      return [];
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  /**
   * Load all active users available for assignment
   */
  const loadAvailableUsers = useCallback(async () => {
    try {
      const result = await UserService.getAllUsers();
      if (!result.error) {
        const activeUsers = result.users.filter((user: User) => user.is_active);
        setAvailableUsers(activeUsers);
        return activeUsers;
      }
      return [];
    } catch (err) {
      console.error('Error loading users:', err);
      return [];
    }
  }, []);

  /**
   * Add a member to a project
   */
  const addMemberToProject = useCallback(async (
    projectId: string,
    userId: string,
    role: string = 'employee'
  ): Promise<boolean> => {
    setIsAddingMember(true);
    try {
      const result = await ProjectService.addUserToProject(
        projectId,
        userId,
        role,
        false // isPrimaryManager
      );

      if (!result.success) {
        showError(`Error adding member: ${result.error || 'Unknown error'}`);
        return false;
      }

      showSuccess('Employee added successfully!');

      // Reload members for this project
      await loadProjectMembers(projectId);
      return true;
    } catch (err) {
      showError('Error adding member');
      console.error('Error adding member:', err);
      return false;
    } finally {
      setIsAddingMember(false);
    }
  }, [loadProjectMembers]);

  /**
   * Remove a member from a project
   */
  const removeMemberFromProject = useCallback(async (
    projectId: string,
    userId: string
  ): Promise<boolean> => {
    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return false;
    }

    setIsRemovingMember(true);
    try {
      await ProjectService.removeUserFromProject(projectId, userId);
      showSuccess('Employee removed successfully!');

      // Reload members for this project
      await loadProjectMembers(projectId);
      return true;
    } catch (err) {
      showError('Error removing employee');
      console.error('Error removing employee:', err);
      return false;
    } finally {
      setIsRemovingMember(false);
    }
  }, [loadProjectMembers]);

  /**
   * Get members for a specific project from cache
   */
  const getMembersForProject = useCallback((projectId: string): ProjectMember[] => {
    return projectMembersMap[projectId] || [];
  }, [projectMembersMap]);

  /**
   * Clear cached members
   */
  const clearMembersCache = useCallback(() => {
    setProjectMembersMap({});
  }, []);

  return {
    projectMembersMap,
    availableUsers,
    isLoadingMembers,
    isAddingMember,
    isRemovingMember,
    loadProjectMembers,
    loadAvailableUsers,
    addMemberToProject,
    removeMemberFromProject,
    getMembersForProject,
    clearMembersCache,
  };
};
