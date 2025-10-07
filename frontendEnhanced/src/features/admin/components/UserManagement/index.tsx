/**
 * UserManagement Component
 * Admin interface for managing users
 * Simplified version focusing on core functionality
 */

import React, { useEffect, useState } from 'react';
import { Users, UserCheck, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { useUserManagement } from '../../hooks/useUserManagement';
import { useAuthContext } from '../../../auth';
import type { AdminUser } from '../../types/admin.types';

export interface UserManagementProps {
  /**
   * Default tab to show
   */
  defaultTab?: 'all' | 'pending';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * User management component
 * Complexity: 8
 * LOC: ~250
 */
export const UserManagement: React.FC<UserManagementProps> = ({
  defaultTab = 'all',
  className = '',
}) => {
  const { user: currentUser } = useAuthContext();
  const {
    users,
    pendingUsers,
    isLoading,
    error,
    loadUsers,
    approveUser,
    deactivateUser,
  } = useUserManagement();

  const [activeTab, setActiveTab] = useState<'all' | 'pending'>(defaultTab);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Permission check - only super_admin and admin can manage users
  const canManageUsers = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  if (!canManageUsers) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-error-500 dark:text-error-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">
            Access Denied
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary">
            You don't have permission to access User Management.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400 mx-auto mb-4" />
          <p className="text-text-secondary dark:text-dark-text-secondary">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-error-500 dark:text-error-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">
            Error Loading Users
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary mb-4">{error}</p>
          <Button onClick={loadUsers} variant="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const handleApproveUser = async (userId: string) => {
    setActionLoading(userId);
    await approveUser(userId);
    setActionLoading(null);
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    setActionLoading(userId);
    await deactivateUser(userId);
    setActionLoading(null);
  };

  const displayUsers = activeTab === 'pending' ? pendingUsers : users;
  const approvedUsers = users.filter(u => u.is_approved_by_super_admin);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary flex items-center">
            <Users className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" />
            User Management
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary mt-1">
            Manage users, approvals, and permissions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-dark-border">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'all'
                ? 'border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary'
            }`}
          >
            All Users ({approvedUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
              activeTab === 'pending'
                ? 'border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary'
            }`}
          >
            Pending Approvals ({pendingUsers.length})
            {pendingUsers.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-error-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingUsers.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* User List */}
      {displayUsers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-dark-700 rounded-lg">
          <Users className="h-12 w-12 text-text-tertiary dark:text-dark-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary mb-2">
            {activeTab === 'pending' ? 'No Pending Approvals' : 'No Users Found'}
          </h3>
          <p className="text-text-secondary dark:text-dark-text-secondary">
            {activeTab === 'pending'
              ? 'All users have been approved.'
              : 'No users available in the system.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-800 shadow-sm rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
            <thead className="bg-gray-50 dark:bg-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  Hourly Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {displayUsers.map((user: AdminUser) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                        {user.full_name}
                      </div>
                      <div className="text-sm text-text-secondary dark:text-dark-text-secondary">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 capitalize">
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_approved_by_super_admin ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300">
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-dark-text-primary">
                    ${user.hourly_rate}/hr
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {!user.is_approved_by_super_admin && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApproveUser(user.id)}
                        disabled={actionLoading === user.id}
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                    )}
                    {user.is_active && user.is_approved_by_super_admin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeactivateUser(user.id)}
                        disabled={actionLoading === user.id}
                      >
                        Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
