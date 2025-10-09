import React from 'react';
import { cn } from '../../utils/cn';
import { useToast } from '../../hooks/useToast';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

const ToastProvider: React.FC = () => {
  const { toasts, toast } = useToast();

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return null;
    }
  };

  const getToastStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-white text-gray-800';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 max-w-sm">
      {toasts.map((toastItem) => (
        <div
          key={toastItem.id}
          className={cn(
            'flex items-start p-4 rounded-lg border shadow-lg transition-all duration-300 ease-in-out transform',
            getToastStyles(toastItem.type),
            'animate-in slide-in-from-top-full'
          )}
        >
          <div className="flex-shrink-0">
            {getToastIcon(toastItem.type)}
          </div>
          <div className="ml-3 flex-1">
            {toastItem.title && (
              <h4 className="font-medium text-sm">{toastItem.title}</h4>
            )}
            <p className={cn('text-sm', toastItem.title && 'mt-1')}>
              {toastItem.message}
            </p>
          </div>
          <button
            onClick={() => toast.dismiss(toastItem.id)}
            className="ml-4 inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastProvider;