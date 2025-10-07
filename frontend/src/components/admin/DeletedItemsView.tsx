import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Calendar, User, Clock, Users } from 'lucide-react';
import { TimesheetService } from '../../services/TimesheetService';
import { UserService } from '../../services/UserService';
import { useAuth } from '../../store/contexts/AuthContext';
import type { Timesheet, User as UserType } from '../../types';

// Type for deleted timesheets with additional fields from backend
type DeletedTimesheet = Timesheet & {
  _id: string;
  deleted_at?: string;
  deleted_by?: {
    _id: string;
    full_name: string;
  };
  deleted_reason?: string;
  user_id?: {
    _id: string;
    full_name: string;
    email: string;
  };
};

// Type for deleted users with additional fields from backend
type DeletedUser = UserType & {
  id: string;
  deleted_at?: string;
  deleted_by?: {
    _id: string;
    full_name: string;
  };
  deleted_reason?: string;
};

// Types for different tab views
type TabType = 'timesheets' | 'users';

// Combined type for deleted items
type DeletedItem = (DeletedTimesheet & { type: 'timesheet' }) | (DeletedUser & { type: 'user' });

interface DeletedItemsViewProps {
  className?: string;
}

/**
 * DeletedItemsView - Management interface for deleted timesheets
 * Only accessible by management and super admin roles
 */
export const DeletedItemsView: React.FC<DeletedItemsViewProps> = ({ className = '' }) => {
  const { currentUserRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('timesheets');
  const [deletedTimesheets, setDeletedTimesheets] = useState<DeletedTimesheet[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');

  // Check if user has permission to view deleted items
  const canViewDeleted = currentUserRole && ['management', 'super_admin'].includes(currentUserRole);
  const canHardDelete = currentUserRole === 'super_admin';

  useEffect(() => {
    if (canViewDeleted) {
      if (activeTab === 'timesheets') {
        loadDeletedTimesheets();
      } else if (activeTab === 'users') {
        loadDeletedUsers();
      }
    }
  }, [canViewDeleted, activeTab]);

  const loadDeletedTimesheets = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await TimesheetService.getDeletedTimesheets();
      if (result.error) {
        setError(result.error);
      } else {
        setDeletedTimesheets(result.timesheets as DeletedTimesheet[]);
      }
    } catch (err) {
      console.error('Failed to load deleted timesheets:', err);
      setError('Failed to load deleted timesheets');
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await UserService.getDeletedUsers();
      if (result.error) {
        setError(result.error);
      } else {
        setDeletedUsers(result.users as DeletedUser[]);
      }
    } catch (err) {
      console.error('Failed to load deleted users:', err);
      setError('Failed to load deleted users');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (timesheetId: string) => {
    const confirmed = window.confirm('Are you sure you want to restore this timesheet?');
    if (!confirmed) return;

    try {
      const result = await TimesheetService.restoreTimesheet(timesheetId);
      if (result.success) {
        setDeletedTimesheets(prev => prev.filter(ts => ts._id !== timesheetId));
        alert('Timesheet restored successfully');
      } else {
        alert(`Failed to restore: ${result.error}`);
      }
    } catch (error) {
      console.error('Restore error:', error);
      alert('Failed to restore timesheet');
    }
  };

  const handleHardDelete = async (timesheetId: string) => {
    if (!canHardDelete) {
      alert('Only super admin can permanently delete timesheets');
      return;
    }

    const reason = prompt(
      '⚠️ PERMANENT DELETION\\n\\nThis action CANNOT be undone. Please provide a reason:'
    );
    if (!reason) return;

    const finalConfirm = prompt(
      'Type "DELETE PERMANENTLY" to confirm permanent deletion:'
    );
    if (finalConfirm !== 'DELETE PERMANENTLY') return;

    try {
      const result = await TimesheetService.hardDeleteTimesheet(timesheetId, reason);
      if (result.success) {
        setDeletedTimesheets(prev => prev.filter(ts => ts._id !== timesheetId));
        alert('Timesheet permanently deleted');
      } else {
        alert(`Failed to delete permanently: ${result.error}`);
      }
    } catch (error) {
      console.error('Hard delete error:', error);
      alert('Failed to permanently delete timesheet');
    }
  };

  // User-specific handlers
  const handleRestoreUser = async (userId: string) => {
    const confirmed = window.confirm('Are you sure you want to restore this user?');
    if (!confirmed) return;

    try {
      const result = await UserService.restoreUser(userId);
      if (result.success) {
        setDeletedUsers(prev => prev.filter(user => user.id !== userId));
        alert('User restored successfully');
      } else {
        alert(`Failed to restore: ${result.error}`);
      }
    } catch (error) {
      console.error('Restore user error:', error);
      alert('Failed to restore user');
    }
  };

  const handleHardDeleteUser = async (userId: string) => {
    if (!canHardDelete) {
      alert('Only super admin can permanently delete users');
      return;
    }

    const finalConfirm = prompt(
      '⚠️ PERMANENT USER DELETION\\n\\nType "DELETE USER PERMANENTLY" to confirm permanent deletion:'
    );
    if (finalConfirm !== 'DELETE USER PERMANENTLY') return;

    try {
      const result = await UserService.hardDeleteUser(userId);
      if (result.success) {
        setDeletedUsers(prev => prev.filter(user => user.id !== userId));
        alert('User permanently deleted');
      } else {
        alert(`Failed to delete permanently: ${result.error}`);
      }
    } catch (error) {
      console.error('Hard delete user error:', error);
      alert('Failed to permanently delete user');
    }
  };

  const handleBulkRestore = async () => {
    if (selectedItems.size === 0) return;

    const itemType = activeTab === 'timesheets' ? 'timesheet' : 'user';
    const confirmed = window.confirm(
      `Restore ${selectedItems.size} selected ${itemType}(s)?`
    );
    if (!confirmed) return;

    let successCount = 0;
    const errors: string[] = [];

    for (const itemId of selectedItems) {
      try {
        const result = activeTab === 'timesheets' 
          ? await TimesheetService.restoreTimesheet(itemId)
          : await UserService.restoreUser(itemId);
        if (result.success) {
          successCount++;
        } else {
          errors.push(`${itemId}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`${itemId}: Failed to restore`);
      }
    }

    // Refresh the list
    if (activeTab === 'timesheets') {
      loadDeletedTimesheets();
    } else {
      loadDeletedUsers();
    }
    setSelectedItems(new Set());

    if (errors.length > 0) {
      alert(`Restored ${successCount} items. Errors:\\n${errors.join('\\n')}`);
    } else {
      alert(`Successfully restored ${successCount} ${itemType}(s)`);
    }
  };

  const toggleSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const currentItems = activeTab === 'timesheets' ? deletedTimesheets : deletedUsers;
    if (selectedItems.size === currentItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentItems.map(item => 
        activeTab === 'timesheets' ? (item as DeletedTimesheet)._id : (item as DeletedUser).id
      )));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!canViewDeleted) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="max-w-md mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            Only management and super admin can view deleted items.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deleted Items</h1>
          <p className="text-gray-600 mt-1">
            Manage soft-deleted {activeTab} • {activeTab === 'timesheets' ? deletedTimesheets.length : deletedUsers.length} item(s)
          </p>
        </div>
        
        <div className="flex gap-2">
          {selectedItems.size > 0 && (
            <button
              onClick={handleBulkRestore}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore Selected ({selectedItems.size})
            </button>
          )}
          
          <button
            onClick={() => activeTab === 'timesheets' ? loadDeletedTimesheets() : loadDeletedUsers()}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('timesheets')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'timesheets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Timesheets ({deletedTimesheets.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Users ({deletedUsers.length})
          </button>
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading deleted {activeTab}...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && (
        (activeTab === 'timesheets' && deletedTimesheets.length === 0) ||
        (activeTab === 'users' && deletedUsers.length === 0)
      ) && (
        <div className="text-center py-12">
          <Trash2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Deleted Items</h3>
          <p className="text-gray-600">No deleted {activeTab} found.</p>
        </div>
      )}

      {/* Deleted Items List */}
      {!loading && (
        (activeTab === 'timesheets' && deletedTimesheets.length > 0) ||
        (activeTab === 'users' && deletedUsers.length > 0)
      ) && (
        <div className="space-y-4">
          {/* Select All Header */}
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              checked={
                activeTab === 'timesheets'
                  ? selectedItems.size === deletedTimesheets.length && deletedTimesheets.length > 0
                  : selectedItems.size === deletedUsers.length && deletedUsers.length > 0
              }
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="ml-3 text-sm font-medium text-gray-700">
              Select All ({activeTab === 'timesheets' ? deletedTimesheets.length : deletedUsers.length} items)
            </label>
          </div>

          {/* Items */}
          {activeTab === 'timesheets' && deletedTimesheets.map((timesheet) => (
            <div
              key={timesheet._id}
              className={`p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                selectedItems.has(timesheet._id) ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(timesheet._id)}
                    onChange={() => toggleSelection(timesheet._id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  <div className="flex-1 min-w-0">
                    {/* Timesheet Info */}
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-1" />
                        Week of {formatDate(timesheet.week_start_date)}
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <User className="w-4 h-4 mr-1" />
                        {timesheet.user_id?.full_name || 'Unknown User'}
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        {timesheet.total_hours}h
                      </div>
                    </div>

                    {/* Status and Deletion Info */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        timesheet.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                        timesheet.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {timesheet.status.replace('_', ' ')}
                      </span>
                      
                      {timesheet.deleted_at && (
                        <span>
                          Deleted: {formatDate(timesheet.deleted_at)} at {formatTime(timesheet.deleted_at)}
                        </span>
                      )}
                      
                      {timesheet.deleted_by?.full_name && (
                        <span>
                          by {timesheet.deleted_by.full_name}
                        </span>
                      )}
                    </div>

                    {/* Deletion Reason */}
                    {timesheet.deleted_reason && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                        <strong>Reason:</strong> {timesheet.deleted_reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleRestore(timesheet._id)}
                    className="flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    title="Restore timesheet"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Restore
                  </button>
                  
                  {canHardDelete && (
                    <button
                      onClick={() => handleHardDelete(timesheet._id)}
                      className="flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                      title="Delete permanently (cannot be undone)"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete Forever
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Users */}
          {activeTab === 'users' && deletedUsers.map((user) => (
            <div
              key={user.id}
              className={`p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                selectedItems.has(user.id) ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(user.id)}
                    onChange={() => toggleSelection(user.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  <div className="flex-1 min-w-0">
                    {/* User Info */}
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center text-gray-600">
                        <User className="w-4 h-4 mr-1" />
                        <strong>{user.full_name}</strong>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <span>{user.email}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <span className="capitalize">{user.role}</span>
                      </div>
                    </div>

                    {/* Status and Deletion Info */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                      
                      {user.deleted_at && (
                        <span>
                          Deleted: {formatDate(user.deleted_at)} at {formatTime(user.deleted_at)}
                        </span>
                      )}
                      
                      {user.deleted_by?.full_name && (
                        <span>
                          by {user.deleted_by.full_name}
                        </span>
                      )}
                    </div>

                    {/* Deletion Reason */}
                    {user.deleted_reason && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                        <strong>Reason:</strong> {user.deleted_reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleRestoreUser(user.id)}
                    className="flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    title="Restore user"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Restore
                  </button>
                  
                  {canHardDelete && (
                    <button
                      onClick={() => handleHardDeleteUser(user.id)}
                      className="flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                      title="Delete permanently (cannot be undone)"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete Forever
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};