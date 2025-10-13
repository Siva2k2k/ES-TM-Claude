import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import type { User, UserRole } from '../../../types';
import { FormField } from '../../../components/forms/FormField';

// Form schema for user creation/update
const userFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  role: z.enum(['super_admin', 'management', 'manager', 'lead', 'employee']),
  hourly_rate: z.number().min(0, 'Rate must be positive').max(1000, 'Rate seems too high'),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  user?: User | null;
  mode: 'create' | 'edit';
  availableRoles: UserRole[];
  isSubmitting?: boolean;
  title?: string;
  submitLabel?: string;
}

/**
 * UserForm Component
 * Modal form for creating/editing users with react-hook-form + Zod validation
 *
 * Features:
 * - Create and Edit modes
 * - react-hook-form integration
 * - Zod schema validation
 * - Role hierarchy enforcement
 * - Loading states
 * - Dark mode support
 * - Accessible modal
 */
export const UserForm: React.FC<UserFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  mode,
  availableRoles,
  isSubmitting = false,
  title,
  submitLabel,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    mode: 'onBlur',
    defaultValues: {
      full_name: '',
      email: '',
      role: 'employee',
      hourly_rate: 50,
    },
  });

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (mode === 'edit' && user) {
      reset({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        hourly_rate: user.hourly_rate,
      });
    } else if (mode === 'create') {
      reset({
        full_name: '',
        email: '',
        role: availableRoles[0] || 'employee',
        hourly_rate: 50,
      });
    }
  }, [user, mode, reset, availableRoles]);

  const handleFormSubmit = async (data: UserFormData) => {
    await onSubmit(data);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  if (!isOpen) return null;

  const formTitle = title || (mode === 'create' ? 'Create New User' : 'Edit User');
  const buttonLabel = submitLabel || (mode === 'create' ? 'Create User' : 'Update User');

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-md max-h-[90vh] overflow-y-auto border border-transparent dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{formTitle}</h3>
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
          {/* Full Name */}
          <FormField
            name="full_name"
            control={control}
            label="Full Name"
            type="text"
            placeholder="Enter full name"
            required
          />

          {/* Email */}
          <FormField
            name="email"
            control={control}
            label="Email"
            type="email"
            placeholder="Enter email address"
            required
          />

          {/* Role */}
          <FormField
            name="role"
            control={control}
            label="Role"
            type="select"
            required
            options={availableRoles.map((role) => ({
              value: role,
              label: role === 'lead' ? 'Team Lead' : role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' '),
            }))}
          />

          {/* Hourly Rate */}
          <FormField
            name="hourly_rate"
            control={control}
            label="Hourly Rate ($)"
            type="number"
            placeholder="Enter hourly rate"
            required
            min={0}
            max={1000}
            step={0.01}
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
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {buttonLabel}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
