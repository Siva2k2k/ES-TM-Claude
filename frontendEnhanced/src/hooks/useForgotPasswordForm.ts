import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback } from 'react';
import { forgotPasswordSchema, ForgotPasswordData } from '../types/auth.schemas';

/**
 * Forgot Password Form Hook
 * Manages password reset request form state and submission
 * Phase 4: Forms & Validation
 */

export interface UseForgotPasswordFormOptions {
  onSuccess?: (email: string) => void;
  onError?: (error: string) => void;
}

export interface UseForgotPasswordFormReturn {
  form: ReturnType<typeof useForm<ForgotPasswordData>>;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  submittedEmail: string | null;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * Hook for managing forgot password form with React Hook Form + Zod validation
 * Replaces 4 useState hooks with centralized form state
 */
export function useForgotPasswordForm(
  options: UseForgotPasswordFormOptions = {}
): UseForgotPasswordFormReturn {
  const { onSuccess, onError } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
    },
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(false);

      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }

      const formData = form.getValues();
      setIsSubmitting(true);

      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.message || data.error || 'Failed to send reset email';
          throw new Error(errorMessage);
        }

        setSuccess(true);
        setSubmittedEmail(formData.email);
        onSuccess?.(formData.email);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, onSuccess, onError]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    form.reset();
    setError(null);
    setSuccess(false);
    setSubmittedEmail(null);
    setIsSubmitting(false);
  }, [form]);

  return {
    form,
    isSubmitting,
    error,
    success,
    submittedEmail,
    handleSubmit,
    clearError,
    reset,
  };
}
