import * as React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
}

/**
 * ConfirmDialog Component
 * Reusable confirmation dialog for delete, submit, and other actions
 * Replaces multiple inline confirmation modals
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  loading = false,
}) => {
  const [isConfirming, setIsConfirming] = React.useState(false);

  const handleConfirm = async (): Promise<void> => {
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

  const getVariantConfig = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: XCircle,
          bgColor: 'bg-red-100',
          iconColor: 'text-red-600',
          buttonVariant: 'destructive' as const,
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          buttonVariant: 'default' as const,
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-100',
          iconColor: 'text-blue-600',
          buttonVariant: 'default' as const,
        };
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600',
          buttonVariant: 'default' as const,
        };
    }
  };

  const config = getVariantConfig();
  const Icon = config.icon;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={cn('flex-shrink-0 p-2 rounded-full', config.bgColor)}>
            <Icon className={cn('w-6 h-6', config.iconColor)} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {title}
            </h3>
            <p className="text-slate-600 text-sm mb-6">
              {message}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isConfirming || loading}
              >
                {cancelText}
              </Button>
              <Button
                variant={config.buttonVariant}
                onClick={handleConfirm}
                loading={isConfirming || loading}
                disabled={isConfirming || loading}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
