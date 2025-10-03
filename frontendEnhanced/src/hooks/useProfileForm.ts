import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback, useEffect } from 'react';
import { profileUpdateSchema, ProfileUpdateData } from '../types/auth.schemas';

/**
 * Profile Update Form Hook
 * Manages user profile update form state and submission
 * Phase 4: Forms & Validation
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  hourly_rate?: number | null;
  created_at?: string;
  updated_at?: string;
  manager_id?: string;
}

export interface UseProfileFormOptions {
  user?: User;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export interface UseProfileFormReturn {
  form: ReturnType<typeof useForm<ProfileUpdateData>>;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  hasChanges: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;
  resetForm: () => void;
}

/**
 * Hook for managing profile update form with React Hook Form + Zod validation
 * Replaces 4 useState hooks with centralized form state
 * Includes change detection to prevent unnecessary API calls
 */
export function useProfileForm(
  options: UseProfileFormOptions = {}
): UseProfileFormReturn {
  const { user, onSuccess, onError } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ProfileUpdateData>({
    resolver: zodResolver(profileUpdateSchema),
    mode: 'onChange',
    defaultValues: {
      full_name: user?.full_name || '',
      hourly_rate: user?.hourly_rate || null,
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name || '',
        hourly_rate: user.hourly_rate || null,
      });
    }
  }, [user, form]);

  // Check if form has changes using React Hook Form's isDirty
  const hasChanges = form.formState.isDirty;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(false);

      // Validate form
      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }

      // Check if there are changes
      if (!hasChanges) {
        setError('No changes to save');
        return;
      }

      const formData = form.getValues();
      setIsSubmitting(true);

      try {
        // Build update payload
        const updateData: Partial<ProfileUpdateData> = {
          full_name: formData.full_name.trim(),
        };

        // Only include hourly_rate if it's not null
        if (formData.hourly_rate !== null && formData.hourly_rate !== undefined) {
          updateData.hourly_rate = formData.hourly_rate;
        }

        const response = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify(updateData),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.message || data.error || 'Failed to update profile';
          throw new Error(errorMessage);
        }

        setSuccess(true);

        // Call success callback after a short delay to show success message
        setTimeout(() => {
          onSuccess?.(data);

          // Reset form with new values to clear isDirty state
          form.reset({
            full_name: data.user?.full_name || formData.full_name,
            hourly_rate: data.user?.hourly_rate || formData.hourly_rate,
          });

          setSuccess(false);
        }, 2000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, hasChanges, onSuccess, onError]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess(false);
  }, []);

  const resetForm = useCallback(() => {
    if (user) {
      form.reset({
        full_name: user.full_name || '',
        hourly_rate: user.hourly_rate || null,
      });
    }
    setError(null);
    setSuccess(false);
  }, [user, form]);

  return {
    form,
    isSubmitting,
    error,
    success,
    hasChanges,
    handleSubmit,
    clearError,
    clearSuccess,
    resetForm,
  };
}
