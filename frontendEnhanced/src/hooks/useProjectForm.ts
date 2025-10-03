/**
 * useProjectForm Hook
 *
 * Custom hook for project form management with React Hook Form + Zod
 * Replaces multiple useState hooks with centralized form state
 */

import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback } from 'react';
import { projectFormSchema, ProjectFormData } from '../types/project.schemas';
import { ProjectService } from '../services/ProjectService';
import { showSuccess, showError } from '../utils/toast';

export interface UseProjectFormOptions {
  projectId?: string;
  defaultValues?: Partial<ProjectFormData>;
  onSuccess?: (projectId: string) => void;
  onError?: (error: Error) => void;
}

export interface UseProjectFormReturn {
  form: UseFormReturn<ProjectFormData>;
  isSubmitting: boolean;
  error: string | null;
  submitProject: () => Promise<void>;
  resetForm: () => void;
}

export function useProjectForm(options: UseProjectFormOptions = {}): UseProjectFormReturn {
  const { projectId, defaultValues, onSuccess, onError } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with React Hook Form + Zod
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      client_id: '',
      primary_manager_id: '',
      status: 'active',
      start_date: '',
      end_date: '',
      budget: 0,
      description: '',
      is_billable: true,
      ...defaultValues
    }
  });

  // Submit handler
  const submitProject = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate form
      const isValid = await form.trigger();
      if (!isValid) {
        setError('Please fix validation errors');
        setIsSubmitting(false);
        return;
      }

      const values = form.getValues();

      let result;
      if (projectId) {
        // Update existing project
        result = await ProjectService.updateProject(projectId, values);
        showSuccess('Project updated successfully');
      } else {
        // Create new project
        result = await ProjectService.createProject(values);
        showSuccess('Project created successfully');
      }

      // Call success callback
      onSuccess?.(result.id || projectId!);

      // Reset form after successful submission
      if (!projectId) {
        form.reset();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save project';
      setError(errorMessage);
      showError(errorMessage);
      onError?.(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, projectId, onSuccess, onError]);

  // Reset form
  const resetForm = useCallback(() => {
    form.reset();
    setError(null);
  }, [form]);

  return {
    form,
    isSubmitting,
    error,
    submitProject,
    resetForm
  };
}
