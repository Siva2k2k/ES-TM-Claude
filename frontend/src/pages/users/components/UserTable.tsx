import React from 'react';
import { Edit, Trash2, UserCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import type { User } from '../../../types';
import { UserStatusBadge } from './UserStatusBadge';

interface UserTableProps {
  users: User[];
  currentUserId?: string;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onApprove: (user: User) => void;
  canEdit: (user: User) => boolean;
  canManageStatus: (user: User) => boolean;
  canApprove: boolean;
  showEmptyState?: boolean;
}

/**
 * UserTable Component
 * Displays users in a sortable table with action buttons
 *
 * Features:
 * - Sortable columns (future enhancement)
 * - Role-based action buttons
 * - Row highlighting for current user and editable users
 * - Status badges
 * - Responsive design
 * - Dark mode support
 * - Security policy notice
 */
export const UserTable: React.FC<UserTableProps> = ({
  users,
  currentUserId,
  onEdit,
  onDelete,
  onToggleStatus,
  onApprove,
  canEdit,
  canManageStatus,
  canApprove: canApproveUsers,
  showEmptyState = true,
}) => {
  if (users.length === 0 && showEmptyState) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-12 text-center border border-transparent dark:border-gray-700">
        <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">No users found</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your filters or create a new user</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 overflow-hidden border border-transparent dark:border-gray-700">
      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Security Policy:</strong> You can only edit users with lower roles than yours, and you cannot edit your own role or rate for security reasons.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Hourly Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => {
              const isCurrentUser = currentUserId === user.id;
              const isEditable = canEdit(user);
              const canManage = canManageStatus(user);

              return (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
                    isCurrentUser
                      ? 'bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 dark:border-yellow-500'
                      : isEditable
                      ? 'bg-green-50 dark:bg-green-900/10'
                      : ''
                  }`}
                >
                  {/* User Info */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.full_name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                            (You)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                    </div>
                  </td>

                  {/* Role Badge */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {user.role === 'lead' ? 'Team Lead' : user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')}
                    </span>
                  </td>

                  {/* Status Badges */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <UserStatusBadge
                      isApproved={user.is_approved_by_super_admin}
                      isActive={user.is_active}
                    />
                  </td>

                  {/* Hourly Rate */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${user.hourly_rate}
                  </td>

                  {/* Action Buttons */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {/* Approve Button */}
                      {canApproveUsers && !user.is_approved_by_super_admin && (
                        <button
                          onClick={() => onApprove(user)}
                          className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                          title="Approve User"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve
                        </button>
                      )}

                      {/* Activate/Deactivate Button */}
                      {canManage && (
                        <button
                          onClick={() => onToggleStatus(user)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_active
                              ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                              : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                          }`}
                          title={user.is_active ? 'Deactivate User' : 'Activate User'}
                        >
                          {user.is_active ? (
                            <ToggleLeft className="h-4 w-4" />
                          ) : (
                            <ToggleRight className="h-4 w-4" />
                          )}
                        </button>
                      )}

                      {/* Edit Button */}
                      {isEditable && (
                        <button
                          onClick={() => onEdit(user)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Edit User"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}

                      {/* Delete Button */}
                      {canManage && canApproveUsers && (
                        <button
                          onClick={() => onDelete(user)}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/10 border-l-4 border-yellow-400 dark:border-yellow-500 mr-2"></div>
            <span className="text-gray-600 dark:text-gray-400">Your Account (Cannot Edit)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 dark:bg-green-900/10 mr-2"></div>
            <span className="text-gray-600 dark:text-gray-400">Editable Users</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 mr-2"></div>
            <span className="text-gray-600 dark:text-gray-400">Protected Users (Cannot Edit)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
