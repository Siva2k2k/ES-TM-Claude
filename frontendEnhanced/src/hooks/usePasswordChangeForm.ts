import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback, useMemo } from 'react';
import {
  passwordChangeSchema,
  PasswordChangeData,
  calculatePasswordStrength,
  PasswordStrength,
} from '../types/auth.schemas';

/**
 * Password Change Form Hook
 * Manages password change form state, validation, and submission
 * Phase 4: Forms & Validation
 */

export interface UsePasswordChangeFormOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface UsePasswordChangeFormReturn {
  form: ReturnType<typeof useForm<PasswordChangeData>>;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  passwordStrength: PasswordStrength;
  passwordsMatch: boolean;
  canSubmit: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;
}

/**
 * Hook for managing password change form with React Hook Form + Zod validation
 * Replaces 6 useState hooks with centralized form state
 * Includes password strength calculation and matching validation
 */
export function usePasswordChangeForm(
  options: UsePasswordChangeFormOptions = {}
): UsePasswordChangeFormReturn {
  const { onSuccess, onError } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<PasswordChangeData>({
    resolver: zodResolver(passwordChangeSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = form.watch('newPassword');
  const confirmPassword = form.watch('confirmPassword');

  // Calculate password strength
  const passwordStrength = useMemo(
    () => calculatePasswordStrength(newPassword || ''),
    [newPassword]
  );

  // Check if passwords match
  const passwordsMatch = useMemo(
    () => !!(newPassword && confirmPassword && newPassword === confirmPassword),
    [newPassword, confirmPassword]
  );

  // Check if form can be submitted
  const canSubmit = useMemo(() => {
    return (
      !isSubmitting &&
      passwordsMatch &&
      passwordStrength.score >= 4 && // Require at least 'Good' strength
      !form.formState.errors.currentPassword &&
      !form.formState.errors.newPassword &&
      !form.formState.errors.confirmPassword
    );
  }, [isSubmitting, passwordsMatch, passwordStrength.score, form.formState.errors]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(false);

      const isValid = await form.trigger();
      if (!isValid || !canSubmit) {
        return;
      }

      const formData = form.getValues();
      setIsSubmitting(true);

      try {
        const response = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.message || data.error || 'Failed to change password';
          throw new Error(errorMessage);
        }

        setSuccess(true);

        // Call success callback after a short delay to show success message
        setTimeout(() => {
          onSuccess?.();
          form.reset();
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
    [form, canSubmit, onSuccess, onError]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess(false);
  }, []);

  return {
    form,
    isSubmitting,
    error,
    success,
    passwordStrength,
    passwordsMatch,
    canSubmit,
    handleSubmit,
    clearError,
    clearSuccess,
  };
}
