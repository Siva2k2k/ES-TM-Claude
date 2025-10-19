/**
 * Deleted Items Page
 * Admin/Management page for managing soft-deleted items
 * SonarQube Compliant: Cognitive Complexity < 15, File < 250 lines
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/contexts/AuthContext';
import { DeletedItemsTable } from './components';
import type { DeletedItem } from './components/DeletedItemsTable';
import DeletedItemsService from '../../services/DeletedItemsService';
import {
  Shield,
  Trash2,
  Filter,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { showError, showSuccess, showWarning } from '../../utils/toast';

const ENTITY_TYPES = ['user', 'project', 'client', 'task', 'timesheet'];

export const DeletedItemsPage: React.FC = () => {
  const { currentUser, currentUserRole } = useAuth();

  // State
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DeletedItem | null>(null);
  const [actionType, setActionType] = useState<'restore' | 'hard_delete' | null>(null);

  // Permission checks
  const canViewDeletedItems = ['super_admin', 'management'].includes(currentUserRole);
  const canHardDelete = currentUserRole === 'super_admin';

  useEffect(() => {
    if (canViewDeletedItems) {
      loadDeletedItems();
    }
  }, [selectedEntityType, canViewDeletedItems]);

  const loadDeletedItems = async () => {
    setLoading(true);
    try {
      const result = await DeletedItemsService.getDeletedItems(selectedEntityType);

      if (result.error) {
        showError(result.error);
        return;
      }

      setItems(result.items || []);
    } catch (error) {
      showError('Failed to load deleted items');
      console.error('Error loading deleted items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (item: DeletedItem) => {
    if (!item.can_restore) {
      showWarning('This item cannot be restored due to dependencies');
      return;
    }
    setSelectedItem(item);
    setActionType('restore');
    setShowConfirmModal(true);
  };

  const handleHardDelete = (item: DeletedItem) => {
    if (!canHardDelete) {
      showError('Only Super Admin can permanently delete items');
      return;
    }
    if (item.has_dependencies) {
      showWarning('This item has dependencies and cannot be permanently deleted');
      return;
    }
    setSelectedItem(item);
    setActionType('hard_delete');
    setShowConfirmModal(true);
  };

  const confirmAction = async () => {
    if (!selectedItem || !actionType) return;

    try {
      const result = actionType === 'restore'
        ? await DeletedItemsService.restoreItem(selectedItem.entity_type, selectedItem._id)
        : await DeletedItemsService.hardDeleteItem(selectedItem.entity_type, selectedItem._id);

      if (!result.success || result.error) {
        showError(result.error || `Failed to ${actionType === 'restore' ? 'restore' : 'delete'} item`);
        return;
      }

      showSuccess(
        actionType === 'restore'
          ? 'Item restored successfully'
          : 'Item permanently deleted'
      );
      setShowConfirmModal(false);
      setSelectedItem(null);
      setActionType(null);
      loadDeletedItems();
    } catch (error) {
      showError(`Failed to ${actionType === 'restore' ? 'restore' : 'delete'} item`);
      console.error('Error performing action:', error);
    }
  };

  if (!canViewDeletedItems) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to view deleted items. Only Super Admin and Management roles can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Trash2 className="h-8 w-8 text-red-600" />
                Deleted Items
              </h1>
              <p className="text-gray-600 mt-1">Manage soft-deleted items - restore or permanently delete</p>
            </div>
            <button
              onClick={loadDeletedItems}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Filter className="h-4 w-4" />
              Entity Type:
            </label>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {ENTITY_TYPES.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}s
                </option>
              ))}
            </select>
            <div className="flex-1"></div>
            <div className="text-sm text-gray-600">
              {items.length} deleted {items.length === 1 ? 'item' : 'items'}
            </div>
          </div>
        </div>

        {/* Deleted Items Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Soft-Deleted Items
            </h3>
          </div>

          <DeletedItemsTable
            items={items}
            loading={loading}
            onRestore={handleRestore}
            onHardDelete={handleHardDelete}
            canHardDelete={canHardDelete}
          />
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && selectedItem && actionType && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className={`h-8 w-8 ${actionType === 'hard_delete' ? 'text-red-600' : 'text-yellow-600'}`} />
                <h3 className="text-lg font-semibold text-gray-900">
                  {actionType === 'restore' ? 'Confirm Restore' : 'Confirm Permanent Deletion'}
                </h3>
              </div>

              <p className="text-gray-600 mb-6">
                {actionType === 'restore' ? (
                  <>Are you sure you want to restore this {selectedItem.entity_type}? It will be reactivated in the system.</>
                ) : (
                  <>
                    <span className="text-red-600 font-semibold">WARNING:</span> This action cannot be undone.
                    Are you sure you want to permanently delete this {selectedItem.entity_type} from the database?
                  </>
                )}
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedItem(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className={`px-4 py-2 text-white rounded-lg ${
                    actionType === 'restore'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionType === 'restore' ? 'Restore' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
