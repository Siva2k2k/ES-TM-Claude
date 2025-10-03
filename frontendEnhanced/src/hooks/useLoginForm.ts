import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback } from 'react';
import { loginFormSchema, LoginFormData } from '../types/auth.schemas';

/**
 * Login Form Hook
 * Manages login form state and submission
 * Phase 4: Forms & Validation
 */

export interface UseLoginFormOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  defaultValues?: Partial<LoginFormData>;
}

export interface UseLoginFormReturn {
  form: ReturnType<typeof useForm<LoginFormData>>;
  isSubmitting: boolean;
  error: string | null;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing login form with React Hook Form + Zod validation
 * Replaces 4 useState hooks with centralized form state
 */
export function useLoginForm(options: UseLoginFormOptions = {}): UseLoginFormReturn {
  const {
    onSuccess,
    onError,
    defaultValues = {
      email: '',
      password: '',
    },
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onBlur',
    defaultValues,
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }

      const formData = form.getValues();
      setIsSubmitting(true);

      try {
        const response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.message || data.error || 'Login failed';
          throw new Error(errorMessage);
        }

        // Store tokens
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
        }
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }

        // Call success callback
        onSuccess?.(data);

        // Reset form on success
        form.reset();
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

  return {
    form,
    isSubmitting,
    error,
    handleSubmit,
    clearError,
  };
}
