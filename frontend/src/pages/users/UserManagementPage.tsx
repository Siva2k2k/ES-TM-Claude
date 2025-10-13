import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, UserCheck } from 'lucide-react';
import { useRoleManager } from '../../hooks/useRoleManager';
import { useAuth } from '../../store/contexts/AuthContext';
import { UserService } from '../../services/UserService';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { DeleteActionModal, type DeleteAction } from '../../components/DeleteActionModal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import type { User, UserRole } from '../../types';
import { UserTable, UserForm, UserFilters, BulkActions, type UserFilterState } from './components';
import { StatsCard } from '../dashboard/components';

/**
 * UserManagementPage
 * Main page for user management with modular components
 *
 * Features:
 * - Tabbed interface (All Users, Pending, Create)
 * - Advanced filtering
 * - Bulk operations
 * - Role-based permissions
 * - Create/Edit users with modal form
 * - Delete with dependency checking
 * - Stats cards
 */
export const UserManagementPage: React.FC = () => {
  const { canManageUsers, canApproveUsers, currentRole } = useRoleManager();
  const { currentUser } = useAuth();

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDependencies, setDeleteDependencies] = useState<string[]>([]);

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Load users
  useEffect(() => {
    loadUsers();
  }, [refreshTrigger]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await UserService.getAllUsers();
      if (result.error) {
        showError(result.error);
      } else {
        setUsers(result.users);
        setFilteredUsers(result.users);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Filter handling
  const handleFilterChange = useCallback((filters: UserFilterState) => {
    let filtered = [...users];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.full_name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter((u) => u.role === filters.role);
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((u) =>
        filters.status === 'active' ? u.is_active : !u.is_active
      );
    }

    // Approval filter
    if (filters.approval !== 'all') {
      filtered = filtered.filter((u) =>
        filters.approval === 'approved'
          ? u.is_approved_by_super_admin
          : !u.is_approved_by_super_admin
      );
    }

    setFilteredUsers(filtered);
  }, [users]);

  // Permission helpers
  const canEditUser = (user: User): boolean => {
    if (!currentUser || !canManageUsers()) return false;
    if (currentUser.id === user.id) return false;

    const roleHierarchy = ['super_admin', 'management', 'manager', 'lead', 'employee'];
    const currentRoleIndex = roleHierarchy.indexOf(currentUser.role);
    const targetRoleIndex = roleHierarchy.indexOf(user.role);

    return currentRoleIndex < targetRoleIndex;
  };

  const canManageUserStatus = (user: User): boolean => {
    return canApproveUsers() && canEditUser(user);
  };

  const getAvailableRoles = (): UserRole[] => {
    if (!currentUser) return [];
    switch (currentUser.role) {
      case 'super_admin':
        return ['management', 'manager', 'lead', 'employee'];
      case 'management':
        return ['manager', 'lead', 'employee'];
      default:
        return [];
    }
  };

  // CRUD operations
  const handleCreateUser = () => {
    setFormMode('create');
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEditUser = (user: User) => {
    if (!canEditUser(user)) {
      showWarning('You do not have permission to edit this user.');
      return;
    }
    setFormMode('edit');
    setEditingUser(user);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (formMode === 'create') {
        const result =
          currentRole === 'super_admin'
            ? await UserService.createUser(data)
            : await UserService.createUserForApproval(data);

        if (result.error) {
          showError(`Error creating user: ${result.error}`);
        } else {
          showSuccess(
            currentRole === 'super_admin'
              ? 'User created successfully'
              : 'User created and submitted for approval'
          );
          setShowForm(false);
          setRefreshTrigger((prev) => prev + 1);
        }
      } else if (editingUser) {
        const result = await UserService.updateUser(editingUser.id, data);
        if (result.error) {
          showError(`Error updating user: ${result.error}`);
        } else {
          showSuccess('User updated successfully');
          setShowForm(false);
          setRefreshTrigger((prev) => prev + 1);
        }
      }
    } catch (err) {
      showError('An error occurred');
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveUser = async (user: User) => {
    try {
      const result = await UserService.approveUser(user.id);
      if (result.success) {
        showSuccess('User approved successfully');
        setRefreshTrigger((prev) => prev + 1);
      } else {
        showError(`Error approving user: ${result.error}`);
      }
    } catch (err) {
      showError('Error approving user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (!canManageUserStatus(user)) {
      showWarning('You do not have permission to manage this user\'s status.');
      return;
    }

    try {
      const result = await UserService.setUserStatus(user.id, !user.is_active);
      if (result.success) {
        showSuccess(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        showError(`Error updating user status: ${result.error}`);
      }
    } catch (err) {
      showError('Error updating user status');
    }
  };

  const handleDeleteClick = async (user: User) => {
    if (!canManageUserStatus(user)) {
      showWarning('You do not have permission to delete this user.');
      return;
    }

    setDeletingUser(user);

    try {
      const result = await UserService.checkUserDependencies(user.id);
      setDeleteDependencies(result.dependencies || []);
    } catch (err) {
      console.error('Error checking dependencies:', err);
      setDeleteDependencies([]);
    }

    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (action: DeleteAction, reason?: string) => {
    if (!deletingUser) return;

    setDeleteLoading(true);
    try {
      let result;
      if (action === 'soft') {
        result = await UserService.softDeleteUser(deletingUser.id, reason || 'No reason provided');
        if (result.success) showSuccess('User deleted successfully');
      } else if (action === 'hard') {
        result = await UserService.hardDeleteUser(deletingUser.id);
        if (result.success) showSuccess('User permanently deleted');
      }

      if (result && result.success) {
        setShowDeleteModal(false);
        setDeletingUser(null);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        showError(`Error: ${result?.error}`);
      }
    } catch (err) {
      showError('Error processing delete request');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Bulk operations
  const handleSelectAll = () => {
    setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
  };

  const handleClearSelection = () => {
    setSelectedUsers(new Set());
  };

  const handleBulkDelete = async (userIds: string[]) => {
    // Implement bulk delete
    showWarning('Bulk delete not yet implemented');
  };

  const handleBulkActivate = async (userIds: string[]) => {
    // Implement bulk activate
    showWarning('Bulk activate not yet implemented');
  };

  const handleBulkDeactivate = async (userIds: string[]) => {
    // Implement bulk deactivate
    showWarning('Bulk deactivate not yet implemented');
  };

  const handleBulkApprove = async (userIds: string[]) => {
    for (const userId of userIds) {
      await UserService.approveUser(userId);
    }
    showSuccess(`Approved ${userIds.length} users`);
    setRefreshTrigger((prev) => prev + 1);
    setSelectedUsers(new Set());
  };

  // Loading state
  if (loading) {
    return <LoadingSpinner fullScreen text="Loading users..." />;
  }

  // Permission check
  if (!canManageUsers()) {
    return (
      <EmptyState
        icon={Users}
        title="Access Denied"
        description="You don't have permission to access User Management."
      />
    );
  }

  const pendingUsers = users.filter((u) => !u.is_approved_by_super_admin);
  const activeUsers = users.filter((u) => u.is_active && u.is_approved_by_super_admin);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {currentRole === 'super_admin'
              ? 'Complete user control and approval'
              : 'Create users and recommend for approval'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard title="Total Users" value={users.length} icon={Users} color="blue" />
          <StatsCard title="Pending Approval" value={pendingUsers.length} icon={UserCheck} color="yellow" />
          <StatsCard title="Active Users" value={activeUsers.length} icon={UserPlus} color="green" />
        </div>

        {/* Create User Button */}
        {canManageUsers() && (
          <div className="flex justify-end">
            <button
              onClick={handleCreateUser}
              className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create New User
            </button>
          </div>
        )}

        {/* Filters */}
        <UserFilters onFilterChange={handleFilterChange} />

        {/* Bulk Actions */}
        <BulkActions
          users={filteredUsers}
          selectedUsers={selectedUsers}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkActivate={handleBulkActivate}
          onBulkDeactivate={handleBulkDeactivate}
          onBulkApprove={handleBulkApprove}
          canApprove={canApproveUsers()}
          canManageStatus={canApproveUsers()}
        />

        {/* Users Table */}
        <UserTable
          users={filteredUsers}
          currentUserId={currentUser?.id}
          onEdit={handleEditUser}
          onDelete={handleDeleteClick}
          onToggleStatus={handleToggleStatus}
          onApprove={handleApproveUser}
          canEdit={canEditUser}
          canManageStatus={canManageUserStatus}
          canApprove={canApproveUsers()}
        />

        {/* User Form Modal */}
        <UserForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleFormSubmit}
          user={editingUser}
          mode={formMode}
          availableRoles={getAvailableRoles()}
          isSubmitting={isSubmitting}
        />

        {/* Delete Modal */}
        {deletingUser && (
          <DeleteActionModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setDeletingUser(null);
            }}
            onConfirm={handleDeleteConfirm}
            title="Delete User"
            itemName={deletingUser.full_name}
            itemType="user"
            action="soft"
            isLoading={deleteLoading}
            dependencies={deleteDependencies}
            isSoftDeleted={false}
            canHardDelete={currentRole === 'super_admin'}
          />
        )}
      </div>
    </div>
  );
};
