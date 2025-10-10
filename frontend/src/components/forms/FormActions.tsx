import React from 'react';
import { Button } from '../ui/Button';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Form Action Buttons
 * Provides consistent Submit, Cancel, and Reset buttons with proper states
 *
 * Features:
 * - Automatic loading/disabled states
 * - Consistent styling across the app
 * - Accessible button labels
 * - Flexible layout options
 *
 * Usage:
 *   <FormActions
 *     isSubmitting={formState.isSubmitting}
 *     onCancel={() => navigate(-1)}
 *     showReset
 *     onReset={() => reset()}
 *   />
 */

interface FormActionsProps {
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  resetLabel?: string;
  showCancel?: boolean;
  showReset?: boolean;
  onCancel?: () => void;
  onReset?: () => void;
  submitDisabled?: boolean;
  cancelDisabled?: boolean;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
  submitVariant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

export function FormActions({
  isSubmitting = false,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  resetLabel = 'Reset',
  showCancel = false,
  showReset = false,
  onCancel,
  onReset,
  submitDisabled = false,
  cancelDisabled = false,
  className = '',
  align = 'right',
  submitVariant = 'default'
}: FormActionsProps) {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  };

  return (
    <div className={`flex items-center gap-3 ${alignmentClasses[align]} ${className}`}>
      {/* Cancel Button */}
      {showCancel && onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || cancelDisabled}
        >
          {cancelLabel}
        </Button>
      )}

      {/* Reset Button */}
      {showReset && onReset && (
        <Button
          type="button"
          variant="secondary"
          onClick={onReset}
          disabled={isSubmitting}
        >
          {resetLabel}
        </Button>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant={submitVariant}
        disabled={submitDisabled || isSubmitting}
        loading={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );
}

/**
 * Form Actions with Confirmation
 * Shows a confirmation dialog before executing destructive actions
 */
interface FormActionsWithConfirmProps extends FormActionsProps {
  requireConfirmation?: boolean;
  confirmationMessage?: string;
  onConfirm?: () => void;
}

export function FormActionsWithConfirm({
  requireConfirmation = false,
  confirmationMessage = 'Are you sure you want to proceed?',
  onConfirm,
  ...props
}: FormActionsWithConfirmProps) {
  const handleSubmitWithConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (requireConfirmation && !window.confirm(confirmationMessage)) {
      e.preventDefault();
      return;
    }
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <div onClick={handleSubmitWithConfirm}>
      <FormActions {...props} />
    </div>
  );
}

/**
 * Simple Submit Button
 * Use when you only need a submit button without cancel/reset
 */
interface SubmitButtonProps {
  label?: string;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  className?: string;
}

export function SubmitButton({
  label = 'Submit',
  isLoading = false,
  disabled = false,
  variant = 'default',
  className = ''
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={disabled || isLoading}
      loading={isLoading}
      className={className}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}
