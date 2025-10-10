import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Loading Spinner Component
 * Reusable loading indicator with different sizes and variants
 */

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'white';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  text,
  fullScreen = false,
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const variantClasses = {
    default: 'text-slate-600 dark:text-gray-400',
    primary: 'text-blue-600 dark:text-blue-400',
    white: 'text-white'
  };

  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size], variantClasses[variant])} />
      {text && (
        <p className={cn(
          'text-sm font-medium',
          variant === 'white' ? 'text-white' : 'text-slate-600 dark:text-gray-400'
        )}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Inline Loading Spinner (for inline content loading)
 */
export function InlineSpinner({ className = '' }: { className?: string }) {
  return (
    <Loader2 className={cn('w-4 h-4 animate-spin text-slate-600 dark:text-gray-400', className)} />
  );
}

/**
 * Loading Skeleton (for content placeholders)
 */
interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = '', count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'animate-pulse bg-slate-200 dark:bg-gray-700 rounded',
            className
          )}
        />
      ))}
    </>
  );
}
