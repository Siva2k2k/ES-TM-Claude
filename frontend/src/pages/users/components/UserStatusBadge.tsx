import React from 'react';
import { UserCheck, AlertTriangle, ToggleRight, ToggleLeft } from 'lucide-react';

interface UserStatusBadgeProps {
  isApproved: boolean;
  isActive: boolean;
  showLabels?: boolean;
}

/**
 * UserStatusBadge Component
 * Displays user approval and active status with color-coded badges
 *
 * Features:
 * - Approval status (approved/pending)
 * - Active status (active/inactive)
 * - Dark mode support
 * - Optional text labels
 */
export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({
  isApproved,
  isActive,
  showLabels = false,
}) => {
  return (
    <div className="flex items-center space-x-2">
      {/* Approval Status */}
      {isApproved ? (
        <span
          className="inline-flex items-center p-1 rounded-full bg-green-100 dark:bg-green-900"
          title="Approved"
        >
          <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
          {showLabels && (
            <span className="ml-1 text-xs font-medium text-green-700 dark:text-green-300 pr-2">
              Approved
            </span>
          )}
        </span>
      ) : (
        <span
          className="inline-flex items-center p-1 rounded-full bg-yellow-100 dark:bg-yellow-900"
          title="Pending Approval"
        >
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          {showLabels && (
            <span className="ml-1 text-xs font-medium text-yellow-700 dark:text-yellow-300 pr-2">
              Pending
            </span>
          )}
        </span>
      )}

      {/* Active Status */}
      {isActive ? (
        <span
          className="inline-flex items-center p-1 rounded-full bg-blue-100 dark:bg-blue-900"
          title="Active"
        >
          <ToggleRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          {showLabels && (
            <span className="ml-1 text-xs font-medium text-blue-700 dark:text-blue-300 pr-2">
              Active
            </span>
          )}
        </span>
      ) : (
        <span
          className="inline-flex items-center p-1 rounded-full bg-red-100 dark:bg-red-900"
          title="Inactive"
        >
          <ToggleLeft className="h-4 w-4 text-red-600 dark:text-red-400" />
          {showLabels && (
            <span className="ml-1 text-xs font-medium text-red-700 dark:text-red-300 pr-2">
              Inactive
            </span>
          )}
        </span>
      )}
    </div>
  );
};
