import React from 'react';
import { CheckCircle, Clock, AlertTriangle, Circle } from 'lucide-react';
import * as formatting from '../../../utils/formatting';

// ============================================================================
// TYPES
// ============================================================================

export type ProgressStatus = 'completed' | 'in_progress' | 'at_risk' | 'not_started';

export interface ProgressItem {
  id: string;
  title: string;
  subtitle?: string;
  progress: number;
  status: ProgressStatus;
  target?: number;
  dueDate?: string;
  owner?: string;
}

interface ProgressTrackerProps {
  title: string;
  items: ProgressItem[];
  showPercentage?: boolean;
  showTarget?: boolean;
  showDueDate?: boolean;
  maxItems?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusConfig = (status: ProgressStatus) => {
  const configs = {
    completed: {
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      label: 'Completed',
    },
    in_progress: {
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      label: 'In Progress',
    },
    at_risk: {
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      label: 'At Risk',
    },
    not_started: {
      icon: Circle,
      color: 'text-gray-400 dark:text-gray-500',
      bgColor: 'bg-gray-100 dark:bg-gray-700',
      label: 'Not Started',
    },
  };
  return configs[status];
};

const getProgressColor = (progress: number, status: ProgressStatus) => {
  if (status === 'completed') return 'bg-green-600';
  if (status === 'at_risk') return 'bg-red-600';
  if (progress >= 75) return 'bg-green-600';
  if (progress >= 50) return 'bg-yellow-600';
  if (progress >= 25) return 'bg-blue-600';
  return 'bg-gray-400';
};

const formatDueDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays} days`;
  return formatting.formatDate(date, 'short');
};

// ============================================================================
// PROGRESS TRACKER COMPONENT
// ============================================================================

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  title,
  items,
  showPercentage = true,
  showTarget = false,
  showDueDate = true,
  maxItems = 10,
}) => {
  const displayItems = items.slice(0, maxItems);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 border border-transparent dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>

      {/* Progress Items */}
      <div className="p-6 space-y-6">
        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No items to track
          </div>
        ) : (
          displayItems.map((item) => {
            const statusConfig = getStatusConfig(item.status);
            const Icon = statusConfig.icon;
            const progressColor = getProgressColor(item.progress, item.status);

            return (
              <div key={item.id} className="space-y-2">
                {/* Item Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${statusConfig.color}`} />
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.title}
                      </h4>
                    </div>
                    {item.subtitle && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`ml-2 flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    {showPercentage && (
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.progress}% complete
                      </span>
                    )}
                    {showTarget && item.target && (
                      <span className="text-gray-600 dark:text-gray-400">
                        Target: {item.target}%
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full ${progressColor} transition-all duration-500`}
                      style={{ width: `${Math.min(item.progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  {item.owner && (
                    <span className="flex items-center space-x-1">
                      <span>Owner:</span>
                      <span className="font-medium">{item.owner}</span>
                    </span>
                  )}
                  {showDueDate && item.dueDate && (
                    <span
                      className={`font-medium ${
                        new Date(item.dueDate) < new Date()
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {formatDueDate(item.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {items.length > maxItems && (
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View all {items.length} items
          </button>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
