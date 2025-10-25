import { useState, useCallback } from 'react';
import { ProjectService } from '../services/ProjectService';
import { showSuccess, showError } from '../utils/toast';
import type { Project } from '../types';

/**
 * Project form data structure
 */
export interface ProjectFormData {
  name: string;
  client_id: string;
  primary_manager_id: string;
  status: 'active' | 'completed' | 'archived';
  start_date: string;
  end_date: string;
  budget: number;
  description: string;
  is_billable: boolean;
}

/**
 * useProjectActions Hook
 * Manages project CRUD operations (Create, Update, Delete)
 *
 * Features:
 * - Create project with primary manager assignment
 * - Update project details
 * - Soft and hard delete operations
 * - Automatic toast notifications
 * - Loading states for each operation
 *
 * @param onSuccess - Callback to execute after successful operations (e.g., refresh data)
 * @returns Action handlers and loading states
 */
export const useProjectActions = (onSuccess?: () => void) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Create a new project
   */
  const createProject = useCallback(async (formData: ProjectFormData): Promise<boolean> => {
    setIsCreating(true);
    try {
      const result = await ProjectService.createProject(formData);

      if (result.error) {
        showError(`Error creating project: ${result.error}`);
        return false;
      }

      // Add primary manager to the project
      if (result.project) {
        await ProjectService.addUserToProject(
          result.project.id,
          formData.primary_manager_id,
          'manager',
          true // isPrimaryManager
        );
      }

      showSuccess('Project created successfully!');
      onSuccess?.();
      return true;
    } catch (err) {
      showError('Error creating project');
      console.error('Error creating project:', err);
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [onSuccess]);

  /**
   * Update an existing project
   */
  const updateProject = useCallback(async (
    projectId: string,
    formData: ProjectFormData
  ): Promise<boolean> => {
    setIsUpdating(true);
    try {
      const result = await ProjectService.updateProject(projectId, formData);

      if (result.error) {
        showError(`Error updating project: ${result.error}`);
        return false;
      }

      showSuccess('Project updated successfully!');
      onSuccess?.();
      return true;
    } catch (err) {
      console.error('Error updating project:', err);
      showError('Error updating project');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [onSuccess]);

  /**
   * Delete a project (soft or hard delete)
   */
  const deleteProject = useCallback(async (
    projectId: string,
    action: 'soft' | 'hard',
    reason?: string
  ): Promise<boolean> => {
    setIsDeleting(true);
    try {
      if (action === 'soft' && reason) {
        // Soft delete with reason
        const result = await ProjectService.deleteProject(projectId, reason);
        if (result.error) {
          showError(`Error deleting project: ${result.error}`);
          return false;
        }
        showSuccess('Project moved to trash successfully');
      } else if (action === 'hard') {
        // Hard delete (permanent)
        const result = await ProjectService.hardDeleteProject(projectId);
        if (result.error) {
          showError(`Error permanently deleting project: ${result.error}`);
          return false;
        }
        showSuccess('Project permanently deleted');
      }

      onSuccess?.();
      return true;
    } catch (error) {
      console.error('Delete project error:', error);
      showError(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [onSuccess]);

  return {
    createProject,
    updateProject,
    deleteProject,
    isCreating,
    isUpdating,
    isDeleting,
    isSubmitting: isCreating || isUpdating || isDeleting,
  };
};
