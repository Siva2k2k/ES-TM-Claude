import * as React from 'react';
import { cn } from '../../utils/cn';
import {
  getTimesheetStatusColor,
  getProjectStatusColor,
  getUserStatusColor,
  getBillingStatusColor,
  getPriorityColor,
  getRoleColor,
  getTimesheetStatusLabel,
  getProjectStatusLabel,
  getUserStatusLabel,
  getBillingStatusLabel,
} from '../../utils/statusUtils';

export type BadgeType = 'timesheet' | 'project' | 'user' | 'billing' | 'priority' | 'role';

export interface StatusBadgeProps {
  status: string;
  type?: BadgeType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

/**
 * StatusBadge Component
 * Displays a status badge with appropriate colors and labels
 * Replaces 15+ duplicate status badge implementations
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'timesheet',
  className,
  size = 'md',
  showDot = true,
}) => {
  const getColorClasses = (): string => {
    switch (type) {
      case 'timesheet':
        return getTimesheetStatusColor(status);
      case 'project':
        return getProjectStatusColor(status);
      case 'user':
        return getUserStatusColor(status);
      case 'billing':
        return getBillingStatusColor(status);
      case 'priority':
        return getPriorityColor(status);
      case 'role':
        return getRoleColor(status);
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getLabel = (): string => {
    switch (type) {
      case 'timesheet':
        return getTimesheetStatusLabel(status);
      case 'project':
        return getProjectStatusLabel(status);
      case 'user':
        return getUserStatusLabel(status);
      case 'billing':
        return getBillingStatusLabel(status);
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        getColorClasses(),
        sizeClasses[size],
        className
      )}
    >
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      )}
      {getLabel()}
    </span>
  );
};

export default StatusBadge;
