import React from 'react';
import { CheckSquare, Square, Trash2, UserCheck, Users } from 'lucide-react';
import type { User } from '../../../types';

interface BulkActionsProps {
  users: User[];
  selectedUsers: Set<string>;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: (userIds: string[]) => void;
  onBulkActivate: (userIds: string[]) => void;
  onBulkDeactivate: (userIds: string[]) => void;
  onBulkApprove?: (userIds: string[]) => void;
  canApprove?: boolean;
  canManageStatus: boolean;
}

/**
 * BulkActions Component
 * Provides bulk operations for user management
 *
 * Features:
 * - Select all / Clear selection
 * - Bulk delete (with confirmation)
 * - Bulk activate/deactivate
 * - Bulk approve (for super admin)
 * - Selected count display
 * - Dark mode support
 * - Disabled states for better UX
 */
export const BulkActions: React.FC<BulkActionsProps> = ({
  users,
  selectedUsers,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkActivate,
  onBulkDeactivate,
  onBulkApprove,
  canApprove = false,
  canManageStatus,
}) => {
  const allSelected = users.length > 0 && selectedUsers.size === users.length;
  const someSelected = selectedUsers.size > 0 && selectedUsers.size < users.length;
  const hasSelection = selectedUsers.size > 0;

  const selectedUserIds = Array.from(selectedUsers);

  // Get pending users for bulk approve
  const pendingUserIds = selectedUserIds.filter((id) => {
    const user = users.find((u) => u.id === id);
    return user && !user.is_approved_by_super_admin;
  });

  const handleBulkDelete = () => {
    if (hasSelection) {
      const confirmation = window.confirm(
        `Are you sure you want to delete ${selectedUsers.size} user(s)? This action cannot be undone.`
      );
      if (confirmation) {
        onBulkDelete(selectedUserIds);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4 border border-transparent dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-4">
        {/* Selection Info */}
        <div className="flex items-center space-x-3">
          <button
            onClick={allSelected || someSelected ? onClearSelection : onSelectAll}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title={allSelected || someSelected ? 'Clear selection' : 'Select all'}
          >
            {allSelected ? (
              <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            ) : someSelected ? (
              <CheckSquare className="h-5 w-5 text-blue-400 dark:text-blue-500" />
            ) : (
              <Square className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            )}
          </button>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {hasSelection ? (
              <>
                <span className="text-blue-600 dark:text-blue-400">{selectedUsers.size}</span> selected
              </>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">No users selected</span>
            )}
          </div>
        </div>

        {/* Bulk Actions Divider */}
        {hasSelection && (
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
        )}

        {/* Bulk Actions */}
        {hasSelection && (
          <>
            {/* Bulk Approve */}
            {canApprove && pendingUserIds.length > 0 && onBulkApprove && (
              <button
                onClick={() => onBulkApprove(pendingUserIds)}
                className="inline-flex items-center px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors text-sm font-medium"
                title={`Approve ${pendingUserIds.length} pending user(s)`}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Approve {pendingUserIds.length > 1 ? `(${pendingUserIds.length})` : ''}
              </button>
            )}

            {/* Bulk Activate */}
            {canManageStatus && (
              <button
                onClick={() => onBulkActivate(selectedUserIds)}
                className="inline-flex items-center px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm font-medium"
                title="Activate selected users"
              >
                <Users className="h-4 w-4 mr-2" />
                Activate
              </button>
            )}

            {/* Bulk Deactivate */}
            {canManageStatus && (
              <button
                onClick={() => onBulkDeactivate(selectedUserIds)}
                className="inline-flex items-center px-3 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors text-sm font-medium"
                title="Deactivate selected users"
              >
                <Users className="h-4 w-4 mr-2" />
                Deactivate
              </button>
            )}

            {/* Bulk Delete */}
            {canManageStatus && (
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors text-sm font-medium"
                title="Delete selected users"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            )}

            {/* Clear Selection */}
            <button
              onClick={onClearSelection}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              title="Clear selection"
            >
              Clear
            </button>
          </>
        )}

        {/* No Actions Available Message */}
        {hasSelection && !canManageStatus && !canApprove && (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
            You don't have permission to perform bulk actions
          </div>
        )}
      </div>
    </div>
  );
};
