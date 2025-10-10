import { useForm, UseFormProps, UseFormReturn, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';
import { useEffect } from 'react';

/**
 * Enhanced Form Validation Hook
 * Wraps react-hook-form with Zod schema validation
 *
 * Features:
 * - Type-safe form handling with Zod schemas
 * - Auto-focus on first error field
 * - Consistent validation behavior (on blur + on submit)
 * - Built-in error handling
 *
 * Usage:
 *   const { control, handleSubmit, formState } = useFormValidation({
 *     schema: loginSchema,
 *     onSubmit: async (data) => { await signIn(data); }
 *   });
 */

interface UseFormValidationProps<TFieldValues extends FieldValues>
  extends Omit<UseFormProps<TFieldValues>, 'resolver'> {
  schema: ZodSchema;
  onSubmit: (data: TFieldValues) => Promise<void> | void;
  focusOnError?: boolean;
  defaultValues?: UseFormProps<TFieldValues>['defaultValues'];
}

export function useFormValidation<TFieldValues extends FieldValues>({
  schema,
  onSubmit,
  focusOnError = true,
  defaultValues,
  ...formProps
}: UseFormValidationProps<TFieldValues>): UseFormReturn<TFieldValues> & {
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
} {
  const form = useForm<TFieldValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur', // Validate on blur for better UX (immediate feedback)
    reValidateMode: 'onChange', // Re-validate on change after first validation
    defaultValues,
    ...formProps
  });

  // Auto-focus on first error field for better accessibility
  useEffect(() => {
    if (focusOnError && form.formState.errors && Object.keys(form.formState.errors).length > 0) {
      const firstErrorField = Object.keys(form.formState.errors)[0];
      const element = document.getElementsByName(firstErrorField)[0];
      if (element && 'focus' in element) {
        (element as HTMLElement).focus();
      }
    }
  }, [form.formState.errors, focusOnError, form.formState.isSubmitted]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
      // You can add global error handling here if needed
      // For example, showing a toast notification
    }
  });

  return {
    ...form,
    handleSubmit,
    isSubmitting: form.formState.isSubmitting
  };
}

/**
 * Simple form state hook without validation
 * Use when you don't need Zod validation
 */
export function useSimpleForm<TFieldValues extends FieldValues>(
  defaultValues?: UseFormProps<TFieldValues>['defaultValues']
) {
  return useForm<TFieldValues>({
    defaultValues,
    mode: 'onChange'
  });
}
