import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

/**
 * Empty State Component
 * Displays when there's no data to show
 * Provides consistent UX across the application
 */

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      <div className="rounded-full bg-slate-100 dark:bg-gray-800 p-6 mb-4">
        <Icon className="w-12 h-12 text-slate-400 dark:text-gray-500" />
      </div>

      <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100 mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-slate-600 dark:text-gray-400 max-w-md mb-6">
          {description}
        </p>
      )}

      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * No Results State
 * Specific empty state for search/filter scenarios
 */
interface NoResultsProps {
  searchTerm?: string;
  onClear?: () => void;
  className?: string;
}

export function NoResults({ searchTerm, onClear, className = '' }: NoResultsProps) {
  return (
    <EmptyState
      title="No results found"
      description={
        searchTerm
          ? `We couldn't find anything matching "${searchTerm}". Try adjusting your search or filters.`
          : 'No items match your current filters. Try adjusting your criteria.'
      }
      action={onClear ? { label: 'Clear filters', onClick: onClear } : undefined}
      className={className}
    />
  );
}
