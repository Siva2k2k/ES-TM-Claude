import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useCallback } from 'react';
import {
  timesheetFormSchema,
  type TimesheetFormData,
  type TimeEntry,
  getDailyTotals,
  getWeeklyTotal,
} from '../types/timesheet.schemas';
import { TimesheetApprovalService } from '../services/TimesheetApprovalService';
import { useAuth } from '../store/contexts/AuthContext';
import { useToast } from './useToast';

export interface UseTimesheetFormOptions {
  defaultValues?: Partial<TimesheetFormData>;
  onSuccess?: (timesheet: any) => void;
  onError?: (error: Error) => void;
}

export interface UseTimesheetFormReturn {
  form: UseFormReturn<TimesheetFormData>;
  isSubmitting: boolean;
  submitTimesheet: (status: 'draft' | 'submitted') => Promise<void>;
  addEntry: (entry: TimeEntry) => void;
  removeEntry: (index: number) => void;
  updateEntry: (index: number, entry: Partial<TimeEntry>) => void;
  dailyTotals: Record<string, number>;
  weeklyTotal: number;
  validationWarnings: string[];
}

/**
 * useTimesheetForm Hook
 * Manages timesheet form state and submission logic
 * Uses React Hook Form with Zod validation
 *
 * @param options - Configuration options
 * @returns Form methods and submission handlers
 *
 * @example
 * const {
 *   form,
 *   submitTimesheet,
 *   addEntry,
 *   dailyTotals,
 *   weeklyTotal
 * } = useTimesheetForm({
 *   onSuccess: () => toast.success('Timesheet saved!')
 * });
 */
export function useTimesheetForm(
  options: UseTimesheetFormOptions = {}
): UseTimesheetFormReturn {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Initialize form with React Hook Form + Zod
  const form = useForm<TimesheetFormData>({
    resolver: zodResolver(timesheetFormSchema),
    defaultValues: options.defaultValues || {
      week_start_date: getMonday(new Date()).toISOString().split('T')[0],
      entries: [],
    },
    mode: 'onChange',
  });

  const entries = form.watch('entries') || [];

  // Calculate daily and weekly totals
  const dailyTotals = getDailyTotals(entries);
  const weeklyTotal = getWeeklyTotal(entries);

  // Add a new entry
  const addEntry = useCallback(
    (entry: TimeEntry) => {
      const currentEntries = form.getValues('entries') || [];
      form.setValue('entries', [...currentEntries, entry], {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [form]
  );

  // Remove an entry
  const removeEntry = useCallback(
    (index: number) => {
      const currentEntries = form.getValues('entries') || [];
      const newEntries = currentEntries.filter((_, i) => i !== index);
      form.setValue('entries', newEntries, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [form]
  );

  // Update an entry
  const updateEntry = useCallback(
    (index: number, updates: Partial<TimeEntry>) => {
      const currentEntries = form.getValues('entries') || [];
      const newEntries = [...currentEntries];
      newEntries[index] = { ...newEntries[index], ...updates };
      form.setValue('entries', newEntries, {
        shouldValidate: true,
        shouldDirty: true,
      });
    },
    [form]
  );

  // Submit timesheet
  const submitTimesheet = useCallback(
    async (status: 'draft' | 'submitted') => {
      if (!currentUser) {
        toast.error('User not authenticated');
        return;
      }

      setIsSubmitting(true);
      setValidationWarnings([]);

      try {
        // Get form values
        const values = form.getValues();

        // For drafts, skip validation
        if (status === 'draft') {
          const result = await TimesheetApprovalService.createTimesheet(
            currentUser.id,
            {
              week_start_date: values.week_start_date,
              entries: values.entries as any,
            },
            'draft'
          );

          if (result.error) {
            throw new Error(result.error);
          }

          toast.success('Timesheet saved as draft');
          options.onSuccess?.(result.timesheet);
          return;
        }

        // For submission, validate the form
        const isValid = await form.trigger();

        if (!isValid) {
          const errors = form.formState.errors;
          const errorMessages = Object.values(errors)
            .map((error) => error.message)
            .filter(Boolean);

          setValidationWarnings(errorMessages as string[]);
          toast.error('Please fix validation errors');
          return;
        }

        // Submit timesheet
        const result = await TimesheetApprovalService.createTimesheet(
          currentUser.id,
          {
            week_start_date: values.week_start_date,
            entries: values.entries as any,
          },
          'submitted'
        );

        if (result.error) {
          throw new Error(result.error);
        }

        toast.success('Timesheet submitted successfully');
        options.onSuccess?.(result.timesheet);
        form.reset();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to submit timesheet';
        toast.error(errorMessage);
        options.onError?.(error instanceof Error ? error : new Error(errorMessage));
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentUser, form, toast, options]
  );

  return {
    form,
    isSubmitting,
    submitTimesheet,
    addEntry,
    removeEntry,
    updateEntry,
    dailyTotals,
    weeklyTotal,
    validationWarnings,
  };
}

/**
 * Helper function to get Monday of the current week
 */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
