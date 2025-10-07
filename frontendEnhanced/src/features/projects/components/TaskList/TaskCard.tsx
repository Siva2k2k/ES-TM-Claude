/**
 * Task Card Component
 * Individual task card display
 * Cognitive Complexity: 3
 */
import React from 'react';
import { User, Calendar, Clock, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge, Button } from '../../../../shared/components/ui';
import { cn } from '../../../../shared/utils/cn';
import type { Task } from '../../types/project.types';

interface TaskCardProps {
  task: Task;
  showProject?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusConfig = {
  open: { variant: 'gray' as const, label: 'Open' },
  in_progress: { variant: 'warning' as const, label: 'In Progress' },
  completed: { variant: 'success' as const, label: 'Completed' },
  blocked: { variant: 'error' as const, label: 'Blocked' },
};

const priorityConfig = {
  low: 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300',
  medium: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
  urgent: 'border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300',
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  showProject,
  compact,
  onClick,
  onEdit,
  onDelete,
}) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div
      className={cn(
        'border border-gray-200 dark:border-gray-700 rounded-lg p-4',
        'hover:shadow-md transition-shadow cursor-pointer',
        'bg-white dark:bg-gray-800',
        compact && 'p-3'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-medium truncate text-gray-900 dark:text-gray-100', compact ? 'text-sm' : 'text-base')}>
            {task.name}
          </h4>
          {!compact && task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
              {task.description}
            </p>
          )}
        </div>
        {!compact && (
          <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <Badge variant={statusConfig[task.status].variant} size="sm">
          {statusConfig[task.status].label}
        </Badge>
        <div className={cn('px-2 py-1 rounded text-xs font-medium border', priorityConfig[task.priority || 'medium'])}>
          {(task.priority || 'medium').toUpperCase()}
        </div>
        {task.is_billable && <Badge variant="success" size="sm">Billable</Badge>}
        {isOverdue && (
          <Badge variant="error" size="sm">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-3">
          {task.assigned_to_user_name && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{task.assigned_to_user_name}</span>
            </div>
          )}
          {task.due_date && (
            <div className={cn('flex items-center gap-1', isOverdue && 'text-red-600 dark:text-red-400 font-medium')}>
              <Calendar className="h-3 w-3" />
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
        </div>
        {(task.estimated_hours || task.actual_hours) && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{task.actual_hours || 0}/{task.estimated_hours || 0}h</span>
          </div>
        )}
      </div>

      {showProject && task.project_name && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Project: {task.project_name}
        </p>
      )}
    </div>
  );
};
