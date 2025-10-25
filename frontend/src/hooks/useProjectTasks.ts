import { useState, useCallback } from 'react';
import { ProjectService } from '../services/ProjectService';
import { showSuccess, showError } from '../utils/toast';
import type { Task } from '../types';

/**
 * useProjectTasks Hook
 * Manages project task operations
 *
 * Features:
 * - Load tasks for a project
 * - Delete tasks
 * - Manage task slide-over state
 * - Cache tasks by project ID
 *
 * @returns Task management functions and state
 */
export const useProjectTasks = () => {
  const [projectTasks, setProjectTasks] = useState<Record<string, Task[]>>({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Task slide-over state
  const [showTaskSlide, setShowTaskSlide] = useState(false);
  const [taskSlideProjectId, setTaskSlideProjectId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  /**
   * Load tasks for a specific project
   */
  const loadProjectTasks = useCallback(async (projectId: string): Promise<Task[]> => {
    setIsLoadingTasks(true);
    try {
      const result = await ProjectService.getProjectTasks(projectId);
      if (!result.error) {
        const tasks = result.tasks || [];
        setProjectTasks(prev => ({ ...prev, [projectId]: tasks }));
        return tasks;
      }
      return [];
    } catch (err) {
      console.error('Error loading project tasks:', err);
      return [];
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  /**
   * Delete a task
   */
  const deleteTask = useCallback(async (projectId: string, taskId: string): Promise<boolean> => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return false;
    }

    setIsDeletingTask(true);
    try {
      await ProjectService.deleteTask(taskId);
      showSuccess('Task deleted successfully!');

      // Reload tasks for this project
      await loadProjectTasks(projectId);
      return true;
    } catch (err) {
      showError('Error deleting task');
      console.error('Error deleting task:', err);
      return false;
    } finally {
      setIsDeletingTask(false);
    }
  }, [loadProjectTasks]);

  /**
   * Open task slide-over for creating or editing a task
   */
  const openTaskSlide = useCallback((projectId: string, task?: Task | null) => {
    setTaskSlideProjectId(projectId);
    setEditingTask(task || null);
    setShowTaskSlide(true);
  }, []);

  /**
   * Close task slide-over
   */
  const closeTaskSlide = useCallback(() => {
    setShowTaskSlide(false);
    setTaskSlideProjectId(null);
    setEditingTask(null);
  }, []);

  /**
   * Handle task saved (create or update)
   */
  const handleTaskSaved = useCallback(async () => {
    if (taskSlideProjectId) {
      await loadProjectTasks(taskSlideProjectId);
    }
    closeTaskSlide();
  }, [taskSlideProjectId, loadProjectTasks, closeTaskSlide]);

  /**
   * Get tasks for a specific project from cache
   */
  const getTasksForProject = useCallback((projectId: string): Task[] => {
    return projectTasks[projectId] || [];
  }, [projectTasks]);

  /**
   * Clear cached tasks
   */
  const clearTasksCache = useCallback(() => {
    setProjectTasks({});
  }, []);

  return {
    projectTasks,
    isLoadingTasks,
    isDeletingTask,
    showTaskSlide,
    taskSlideProjectId,
    editingTask,
    loadProjectTasks,
    deleteTask,
    openTaskSlide,
    closeTaskSlide,
    handleTaskSaved,
    getTasksForProject,
    clearTasksCache,
  };
};
