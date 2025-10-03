/**
 * useTaskForm Hook
 *
 * Custom hook for task form management with React Hook Form + Zod
 */

import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback } from 'react';
import { taskFormSchema, TaskFormData } from '../types/project.schemas';
import { ProjectService } from '../services/ProjectService';
import { showSuccess, showError } from '../utils/toast';

export interface UseTaskFormOptions {
  taskId?: string;
  projectId?: string;
  defaultValues?: Partial<TaskFormData>;
  onSuccess?: (taskId: string) => void;
  onError?: (error: Error) => void;
}

export interface UseTaskFormReturn {
  form: UseFormReturn<TaskFormData>;
  isSubmitting: boolean;
  error: string | null;
  submitTask: () => Promise<void>;
  resetForm: () => void;
}

export function useTaskForm(options: UseTaskFormOptions = {}): UseTaskFormReturn {
  const { taskId, projectId, defaultValues, onSuccess, onError } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      project_id: projectId || '',
      assigned_to_user_id: '',
      status: 'open',
      estimated_hours: 0,
      actual_hours: 0,
      due_date: '',
      is_billable: true,
      priority: 'medium',
      ...defaultValues
    }
  });

  // Submit handler
  const submitTask = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const isValid = await form.trigger();
      if (!isValid) {
        setError('Please fix validation errors');
        setIsSubmitting(false);
        return;
      }

      const values = form.getValues();

      let result;
      if (taskId) {
        result = await ProjectService.updateTask(taskId, values);
        showSuccess('Task updated successfully');
      } else {
        result = await ProjectService.createTask(values);
        showSuccess('Task created successfully');
      }

      onSuccess?.(result.id || taskId!);

      if (!taskId) {
        form.reset();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save task';
      setError(errorMessage);
      showError(errorMessage);
      onError?.(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, taskId, onSuccess, onError]);

  const resetForm = useCallback(() => {
    form.reset();
    setError(null);
  }, [form]);

  return {
    form,
    isSubmitting,
    error,
    submitTask,
    resetForm
  };
}
