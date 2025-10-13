import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import type { Project, Client, User } from '../../../types';
import { FormField } from '../../../components/forms/FormField';

// Simplified schema for form (string dates for inputs)
const projectFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description too long'),
  client_id: z.string().min(1, 'Client is required'),
  primary_manager_id: z.string().min(1, 'Manager is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  budget: z.number().min(0, 'Budget cannot be negative').optional(),
  status: z.enum(['active', 'completed', 'on_hold', 'archived', 'cancelled']),
  is_billable: z.boolean(),
}).refine((data) => {
  if (data.end_date && data.start_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  project?: Project | null;
  mode: 'create' | 'edit';
  clients: Client[];
  managers: User[];
  isSubmitting?: boolean;
}

/**
 * ProjectForm Component
 * Modal form for creating/editing projects with react-hook-form + Zod
 *
 * Features:
 * - Create and Edit modes
 * - react-hook-form integration
 * - Zod schema validation
 * - Mobile-friendly layout
 * - Loading states
 * - Dark mode support
 */
export const ProjectForm: React.FC<ProjectFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  project,
  mode,
  clients,
  managers,
  isSubmitting = false,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      description: '',
      client_id: '',
      primary_manager_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      budget: 0,
      status: 'active',
      is_billable: true,
    },
  });

  // Reset form when project changes or modal opens
  useEffect(() => {
    if (mode === 'edit' && project) {
      const startDate = project.start_date
        ? new Date(project.start_date).toISOString().split('T')[0]
        : '';
      const endDate = project.end_date
        ? new Date(project.end_date).toISOString().split('T')[0]
        : '';

      reset({
        name: project.name,
        description: project.description || '',
        client_id: typeof project.client_id === 'string' ? project.client_id : project.client_id?.id || '',
        primary_manager_id: typeof project.primary_manager_id === 'string' ? project.primary_manager_id : project.primary_manager_id?.id || '',
        start_date: startDate,
        end_date: endDate,
        budget: project.budget || 0,
        status: project.status as any,
        is_billable: project.is_billable !== undefined ? project.is_billable : true,
      });
    } else if (mode === 'create') {
      reset({
        name: '',
        description: '',
        client_id: '',
        primary_manager_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        budget: 0,
        status: 'active',
        is_billable: true,
      });
    }
  }, [project, mode, reset]);

  const handleFormSubmit = async (data: ProjectFormData) => {
    await onSubmit(data);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  if (!isOpen) return null;

  const title = mode === 'create' ? 'Create New Project' : 'Edit Project';
  const submitLabel = mode === 'create' ? 'Create Project' : 'Update Project';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-transparent dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          {/* Project Name */}
          <FormField
            name="name"
            control={control}
            label="Project Name"
            type="text"
            placeholder="Enter project name"
            required
          />

          {/* Description */}
          <FormField
            name="description"
            control={control}
            label="Description"
            type="textarea"
            placeholder="Enter project description"
            required
            rows={3}
          />

          {/* Client & Manager - Side by Side on Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="client_id"
              control={control}
              label="Client"
              type="select"
              required
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
            />

            <FormField
              name="primary_manager_id"
              control={control}
              label="Primary Manager"
              type="select"
              required
              options={managers.map((m) => ({ value: m.id, label: m.full_name }))}
            />
          </div>

          {/* Dates - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="start_date"
              control={control}
              label="Start Date"
              type="date"
              required
            />

            <FormField
              name="end_date"
              control={control}
              label="End Date"
              type="date"
            />
          </div>

          {/* Budget & Status - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="budget"
              control={control}
              label="Budget ($)"
              type="number"
              placeholder="0.00"
              min={0}
              step={0.01}
            />

            <FormField
              name="status"
              control={control}
              label="Status"
              type="select"
              required
              options={[
                { value: 'active', label: 'Active' },
                { value: 'on_hold', label: 'On Hold' },
                { value: 'completed', label: 'Completed' },
                { value: 'archived', label: 'Archived' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>

          {/* Billable Checkbox */}
          <FormField
            name="is_billable"
            control={control}
            label="Billable Project"
            type="checkbox"
          />

          {/* Form Error Summary */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                Please fix the errors above before submitting.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {submitLabel}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
