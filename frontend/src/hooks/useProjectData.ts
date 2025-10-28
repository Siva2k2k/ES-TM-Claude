import { useState, useEffect, useCallback } from 'react';
import { ProjectService } from '../services/ProjectService';
import { UserService } from '../services/UserService';
import { deduplicateProjects } from '../utils/projectUtils';
import { showSuccess, showError } from '../utils/toast';
import { useAuth } from '../store/contexts/AuthContext';
import type { Project, Client, User, Task } from '../types';

/**
 * Analytics data structure
 */
interface ProjectAnalytics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  budgetUtilization: number;
}

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
 * useProjectData Hook
 * Manages data loading for projects, clients, users, members, tasks, and analytics
 *
 * Features:
 * - Fetches all project-related data in parallel
 * - Preloads members and tasks for all projects
 * - Deduplicates projects automatically
 * - Provides refresh mechanism
 * - Handles loading and error states
 *
 * @param dependencies - Optional dependencies to trigger refresh
 * @returns Project data, loading state, error state, and refresh function
 */
export const useProjectData = () => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [projectMembersMap, setProjectMembersMap] = useState<Record<string, ProjectMember[]>>({});
  const [projectTasksMap, setProjectTasksMap] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  /**
   * Load members and tasks for all projects
   */
  const loadProjectDetails = useCallback(async (projectList: Project[]) => {
    if (projectList.length === 0) return;

    try {
      // Load members and tasks for all projects in parallel
      const memberPromises = projectList.map(async (project) => {
        try {
          const result = await ProjectService.getProjectMembers(project.id);
          return { projectId: project.id, members: result.members || [] };
        } catch (err) {
          console.error(`Error loading members for project ${project.id}:`, err);
          return { projectId: project.id, members: [] };
        }
      });

      const taskPromises = projectList.map(async (project) => {
        try {
          const result = await ProjectService.getProjectTasks(project.id);
          return { projectId: project.id, tasks: result.tasks || [] };
        } catch (err) {
          console.error(`Error loading tasks for project ${project.id}:`, err);
          return { projectId: project.id, tasks: [] };
        }
      });

      const [memberResults, taskResults] = await Promise.all([
        Promise.all(memberPromises),
        Promise.all(taskPromises)
      ]);

      // Build members map
      const membersMap: Record<string, ProjectMember[]> = {};
      for (const { projectId, members } of memberResults) {
        membersMap[projectId] = members;
      }

      // Build tasks map
      const tasksMap: Record<string, Task[]> = {};
      for (const { projectId, tasks } of taskResults) {
        tasksMap[projectId] = tasks;
      }

      setProjectMembersMap(membersMap);
      setProjectTasksMap(tasksMap);
    } catch (err) {
      console.error('Error loading project details:', err);
    }
  }, []);

  /**
   * Load all project data
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [projectsResult, clientsResult, usersResult, analyticsResult] = await Promise.all([
        ProjectService.getAllProjects(),
        ProjectService.getAllClients(),
        UserService.getAllUsers(),
        ProjectService.getProjectAnalytics()
      ] as const);

      // Handle projects with deduplication
      let projectList: Project[] = [];
      if (projectsResult.error) {
        setError(projectsResult.error);
        setProjects([]);
      } else {
        const raw = projectsResult.projects || [];
        const deduped = deduplicateProjects(raw);
        
        // Filter projects for managers - managers only see projects they manage
        const filteredProjects = currentUser?.role === 'manager'
          ? deduped.filter(project => {
              // Handle both string ID and populated user object cases
              const managerId = typeof project.primary_manager_id === 'object' && project.primary_manager_id
                ? (project.primary_manager_id as { id: string }).id
                : project.primary_manager_id;
              return managerId === currentUser?.id;
            })
          : deduped;
        
        setProjects(filteredProjects);
        projectList = filteredProjects;
      }

      // Handle clients
      if (!clientsResult.error) {
        setClients(clientsResult.clients);
      }

      // Handle users
      if (!usersResult.error) {
        setUsers(usersResult.users);
      }

      // Handle analytics
      if (!analyticsResult.error) {
        setAnalytics(analyticsResult);
      }

      // Load members and tasks for all projects
      await loadProjectDetails(projectList);
    } catch (err) {
      setError('Failed to load project data');
      console.error('Error loading project data:', err);
    } finally {
      setLoading(false);
    }
  }, [loadProjectDetails, currentUser]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  /**
   * Load projects only (for quick refresh after operations)
   */
  const loadProjectsOnly = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const projectsResult = await ProjectService.getAllProjects();

      if (projectsResult.error) {
        setError(projectsResult.error);
        setProjects([]);
      } else {
        const raw = projectsResult.projects || [];
        const deduped = deduplicateProjects(raw);
        
        // Filter projects for managers - managers only see projects they manage
        const filteredProjects = currentUser?.role === 'manager'
          ? deduped.filter(project => {
              // Handle both string ID and populated user object cases
              const managerId = typeof project.primary_manager_id === 'object' && project.primary_manager_id
                ? (project.primary_manager_id as { id: string }).id
                : project.primary_manager_id;
              return managerId === currentUser?.id;
            })
          : deduped;
        
        setProjects(filteredProjects);
        
        // Also reload project details
        await loadProjectDetails(filteredProjects);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load project data');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [loadProjectDetails, currentUser]);

  /**
   * Get members for a specific project from cache
   */
  const getMembersForProject = useCallback((projectId: string): ProjectMember[] => {
    return projectMembersMap[projectId] || [];
  }, [projectMembersMap]);

  /**
   * Get tasks for a specific project from cache
   */
  const getTasksForProject = useCallback((projectId: string): Task[] => {
    return projectTasksMap[projectId] || [];
  }, [projectTasksMap]);

  /**
   * Load members for a specific project and update the map
   */
  const loadMembersForProject = useCallback(async (projectId: string): Promise<ProjectMember[]> => {
    try {
      const result = await ProjectService.getProjectMembers(projectId);
      const members = result.members || [];
      setProjectMembersMap(prev => ({ ...prev, [projectId]: members }));
      return members;
    } catch (err) {
      console.error(`Error loading members for project ${projectId}:`, err);
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
      await loadMembersForProject(projectId);
      return true;
    } catch (err) {
      showError('Error adding member');
      console.error('Error adding member:', err);
      return false;
    } finally {
      setIsAddingMember(false);
    }
  }, [loadMembersForProject]);

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
      await loadMembersForProject(projectId);
      return true;
    } catch (err) {
      showError('Error removing employee');
      console.error('Error removing employee:', err);
      return false;
    } finally {
      setIsRemovingMember(false);
    }
  }, [loadMembersForProject]);

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

  // Load data on mount and when refresh is triggered
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    projects,
    clients,
    users,
    analytics,
    projectMembersMap,
    projectTasksMap,
    loading,
    error,
    refresh,
    loadProjectsOnly,
    getMembersForProject,
    getTasksForProject,
    loadMembersForProject,
    addMemberToProject,
    removeMemberFromProject,
    isAddingMember,
    isRemovingMember,
    availableUsers,
    loadAvailableUsers,
    setProjects, // For optimistic updates
  };
};
