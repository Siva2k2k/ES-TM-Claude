import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Form Error Component
 * Consistent error display for forms
 */

interface FormErrorProps {
  message?: string;
  className?: string;
}

export function FormError({ message, className = '' }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className={cn(
      'flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
      className
    )}>
      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-700 dark:text-red-300">
        {message}
      </p>
    </div>
  );
}

/**
 * Inline Form Error
 * Smaller error display for individual fields
 */
interface InlineErrorProps {
  message?: string;
  id?: string;
  className?: string;
}

export function InlineError({ message, id, className = '' }: InlineErrorProps) {
  if (!message) return null;

  return (
    <p id={id} className={cn('mt-1 text-sm text-red-600 dark:text-red-400', className)}>
      {message}
    </p>
  );
}

/**
 * Form Success Message
 * Display success feedback
 */
interface FormSuccessProps {
  message?: string;
  className?: string;
}

export function FormSuccess({ message, className = '' }: FormSuccessProps) {
  if (!message) return null;

  return (
    <div className={cn(
      'flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800',
      className
    )}>
      <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <p className="text-sm text-green-700 dark:text-green-300">
        {message}
      </p>
    </div>
  );
}
