import React from 'react';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { Modal } from './Modal';

/**
 * Confirm Dialog Component
 * Reusable confirmation dialog for destructive actions
 */

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  isLoading = false
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);

  const icons = {
    danger: AlertTriangle,
    warning: AlertTriangle,
    info: Info
  };

  const iconColors = {
    danger: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  const buttonVariants = {
    danger: 'destructive' as const,
    warning: 'destructive' as const,
    info: 'default' as const
  };

  const Icon = icons[variant];

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation error:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
            variant === 'danger' && 'bg-red-100 dark:bg-red-900/20',
            variant === 'warning' && 'bg-yellow-100 dark:bg-yellow-900/20',
            variant === 'info' && 'bg-blue-100 dark:bg-blue-900/20'
          )}>
            <Icon className={cn('w-6 h-6', iconColors[variant])} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-700 dark:text-gray-300">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isConfirming || isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={buttonVariants[variant]}
            onClick={handleConfirm}
            disabled={isConfirming || isLoading}
            loading={isConfirming || isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * useConfirmDialog Hook
 * Hook for easier confirmation dialog management
 */
interface UseConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
}

export function useConfirmDialog() {
  const [dialogState, setDialogState] = React.useState<UseConfirmDialogOptions | null>(null);

  const confirm = React.useCallback((options: UseConfirmDialogOptions) => {
    setDialogState(options);
  }, []);

  const closeDialog = React.useCallback(() => {
    setDialogState(null);
  }, []);

  const ConfirmDialogComponent = React.useMemo(() => {
    if (!dialogState) return null;

    return (
      <ConfirmDialog
        isOpen={true}
        onClose={closeDialog}
        onConfirm={dialogState.onConfirm}
        title={dialogState.title}
        message={dialogState.message}
        confirmLabel={dialogState.confirmLabel}
        variant={dialogState.variant}
      />
    );
  }, [dialogState, closeDialog]);

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}
