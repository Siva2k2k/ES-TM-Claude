import React from 'react';
import { TrendingUp, X, AlertCircle } from 'lucide-react';
import type { ProjectMember } from './MemberTable';

interface RoleElevationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  member: ProjectMember | null;
  isLoading?: boolean;
}

/**
 * RoleElevationModal Component
 * Modal for confirming role elevation from Employee to Lead
 *
 * Features:
 * - Confirmation dialog for role changes
 * - Display current and new role
 * - Warning about permissions
 * - Loading state during API call
 * - Mobile-responsive
 * - Dark mode support
 */
export const RoleElevationModal: React.FC<RoleElevationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  member,
  isLoading = false
}) => {
  if (!isOpen || !member) return null;

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-md border border-transparent dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Promote to Team Lead
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Role Elevation
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Member Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-lg font-semibold text-blue-600 dark:text-blue-400">
                {member.user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {member.user?.full_name || 'Unknown User'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {member.user?.email || 'No email'}
                </p>
              </div>
            </div>
          </div>

          {/* Role Change Display */}
          <div className="flex items-center justify-center gap-4 py-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <span className="text-sm font-medium">Employee</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Current Role</p>
            </div>

            <div className="flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                <span className="text-sm font-medium">Team Lead</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">New Role</p>
            </div>
          </div>

          {/* Warning Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Role Elevation Effects
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <li>• Can manage project tasks</li>
                  <li>• Can assign tasks to employees</li>
                  <li>• Can view team member timesheets</li>
                  <li>• Can coordinate with project managers</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation Text */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to promote <strong className="text-gray-900 dark:text-gray-100">{member.user?.full_name}</strong> to Team Lead?
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors min-h-[44px]"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Promoting...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Confirm Promotion
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
