import { useState, useEffect, useCallback } from 'react';
import { ProjectService } from '../services/ProjectService';
import { UserService } from '../services/UserService';
import { deduplicateProjects } from '../utils/projectUtils';
import type { Project, Client, User } from '../types';

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
 * useProjectData Hook
 * Manages data loading for projects, clients, users, and analytics
 *
 * Features:
 * - Fetches all project-related data in parallel
 * - Deduplicates projects automatically
 * - Provides refresh mechanism
 * - Handles loading and error states
 *
 * @param dependencies - Optional dependencies to trigger refresh
 * @returns Project data, loading state, error state, and refresh function
 */
export const useProjectData = (dependencies: any[] = []) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      if (projectsResult.error) {
        setError(projectsResult.error);
        setProjects([]);
      } else {
        const raw = projectsResult.projects || [];
        const deduped = deduplicateProjects(raw);
        setProjects(deduped);
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
    } catch (err) {
      setError('Failed to load project data');
      console.error('Error loading project data:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshTrigger, ...dependencies]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

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
        setProjects(deduped);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load project data');
      setProjects([]);
    } finally {
      setLoading(false);
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
    loading,
    error,
    refresh,
    loadProjectsOnly,
    setProjects, // For optimistic updates
  };
};
