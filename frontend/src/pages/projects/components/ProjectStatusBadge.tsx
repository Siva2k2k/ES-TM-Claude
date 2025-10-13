import React from 'react';
import { CheckCircle, Clock, Pause, XCircle } from 'lucide-react';

type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'archived' | 'cancelled';

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ProjectStatusBadge Component
 * Displays project status with color-coded badges
 *
 * Features:
 * - 5 Status types with icons
 * - 3 Sizes (sm, md, lg)
 * - Dark mode support
 * - Mobile-friendly touch targets
 */
export const ProjectStatusBadge: React.FC<ProjectStatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          icon: Clock,
          label: 'Active',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-700 dark:text-blue-300',
          borderColor: 'border-blue-200 dark:border-blue-700',
        };
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Completed',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-700 dark:text-green-300',
          borderColor: 'border-green-200 dark:border-green-700',
        };
      case 'on_hold':
        return {
          icon: Pause,
          label: 'On Hold',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          textColor: 'text-yellow-700 dark:text-yellow-300',
          borderColor: 'border-yellow-200 dark:border-yellow-700',
        };
      case 'archived':
        return {
          icon: XCircle,
          label: 'Archived',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-700 dark:text-gray-300',
          borderColor: 'border-gray-200 dark:border-gray-600',
        };
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'Cancelled',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          textColor: 'text-red-700 dark:text-red-300',
          borderColor: 'border-red-200 dark:border-red-700',
        };
      default:
        return {
          icon: Clock,
          label: 'Unknown',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-700 dark:text-gray-300',
          borderColor: 'border-gray-200 dark:border-gray-600',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      badge: 'px-2 py-0.5 text-xs',
      icon: 'h-3 w-3',
    },
    md: {
      badge: 'px-2.5 py-1 text-sm',
      icon: 'h-4 w-4',
    },
    lg: {
      badge: 'px-3 py-1.5 text-base',
      icon: 'h-5 w-5',
    },
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses[size].badge}`}
    >
      {showIcon && <Icon className={sizeClasses[size].icon} />}
      {config.label}
    </span>
  );
};
