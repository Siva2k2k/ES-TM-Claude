import React, { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

let toastId = 0;

const generateId = () => `toast-${++toastId}`;

// Global toast store
let toasts: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

const notify = (listeners: Array<(toasts: Toast[]) => void>) => {
  listeners.forEach(listener => listener([...toasts]));
};

const addToast = (toast: Omit<Toast, 'id'>) => {
  const newToast: Toast = {
    id: generateId(),
    duration: 5000,
    ...toast,
  };
  
  toasts.push(newToast);
  notify(listeners);

  // Auto remove toast after duration
  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      removeToast(newToast.id);
    }, newToast.duration);
  }

  return newToast.id;
};

const removeToast = (id: string) => {
  toasts = toasts.filter(toast => toast.id !== id);
  notify(listeners);
};

const clearToasts = () => {
  toasts = [];
  notify(listeners);
};

// Toast functions
export const toast = {
  success: (message: string, options?: Partial<Toast>) => 
    addToast({ ...options, message, type: 'success' }),
  
  error: (message: string, options?: Partial<Toast>) => 
    addToast({ ...options, message, type: 'error' }),
  
  warning: (message: string, options?: Partial<Toast>) => 
    addToast({ ...options, message, type: 'warning' }),
  
  info: (message: string, options?: Partial<Toast>) => 
    addToast({ ...options, message, type: 'info' }),
  
  custom: (toast: Omit<Toast, 'id'>) => addToast(toast),
  
  dismiss: removeToast,
  clear: clearToasts,
};

// Hook for components to use toasts
export const useToast = () => {
  const [toastList, setToastList] = useState<Toast[]>([...toasts]);

  const subscribe = useCallback((callback: (toasts: Toast[]) => void) => {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(listener => listener !== callback);
    };
  }, []);

  // Subscribe to toast changes
  React.useEffect(() => {
    return subscribe(setToastList);
  }, [subscribe]);

  return {
    toasts: toastList,
    toast,
  };
};

export default useToast;