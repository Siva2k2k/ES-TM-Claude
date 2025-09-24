import React, { useState, useEffect } from 'react';
import { useRoleManager } from '../hooks/useRoleManager';
import { UserService } from '../services/UserService';
import { Users, UserPlus, UserCheck, Shield, Edit, Trash2, X, Save, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import type { User } from '../types';

interface UserFormData {
  full_name: string;
  email: string;
  role: 'super_admin' | 'management' | 'manager' | 'lead' | 'employee';
  hourly_rate: number;
}

interface UserManagementProps {
  defaultTab?: 'create' | 'pending' | 'all';
}

export const UserManagement: React.FC<UserManagementProps> = ({ defaultTab = 'all' }) => {
  const { canManageUsers, canApproveUsers, currentRole } = useRoleManager();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showCreateForm, setShowCreateForm] = useState(defaultTab === 'create');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    role: 'employee',
    hourly_rate: 50
  });
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load users data
  useEffect(() => {
    loadUsers();
  }, [refreshTrigger]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [allUsersResult, pendingResult] = await Promise.all([
        UserService.getAllUsers(),
        UserService.getPendingApprovals()
      ]);

      if (allUsersResult.error) {
        setError(allUsersResult.error);
      } else {
        setUsers(allUsersResult.users);
      }

      if (pendingResult.error) {
        console.error('Error loading pending users:', pendingResult.error);
      } else {
        setPendingUsers(pendingResult.users);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  if (!canManageUsers()) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access User Management.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Users</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const approvedUsers = users.filter(u => u.is_approved_by_super_admin);

  const getFilteredUsers = () => {
    switch (activeTab) {
      case 'pending':
        return pendingUsers;
      case 'create':
        return [];
      default:
        return users;
    }
  };

  const filteredUsers = getFilteredUsers();

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      hourly_rate: user.hourly_rate
    });
    setShowEditForm(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    try {
      const result = await UserService.updateUser(editingUser.id, formData);
      if (result.success) {
        alert('User updated successfully!');
        setShowEditForm(false);
        setEditingUser(null);
        setFormData({
          full_name: '',
          email: '',
          role: 'employee',
          hourly_rate: 50
        });
        await loadUsers();
      } else {
        alert(`Error updating user: ${result.error}`);
      }
    } catch (err) {
      alert('Error updating user');
      console.error('Error updating user:', err);
    }
  };

  const resetEditForm = () => {
    setShowEditForm(false);
    setEditingUser(null);
    setFormData({
      full_name: '',
      email: '',
      role: 'employee',
      hourly_rate: 50
    });
  };

  const handleApproveUser = async (userId: string) => {
    try {
      if (canApproveUsers()) {
        const result = await UserService.approveUser(userId);
        if (result.success) {
          alert('User approved successfully');
          setRefreshTrigger(prev => prev + 1);
        } else {
          alert(`Error approving user: ${result.error}`);
        }
      } else {
        alert('You can only create users for Super Admin approval');
      }
    } catch (err) {
      alert('Error approving user');
      console.error('Error approving user:', err);
    }
  };

  const handleSubmitUser = async () => {
    try {
      let result;
      
      if (currentRole === 'super_admin') {
        // Super Admin can create users directly
        result = await UserService.createUser(formData);
        if (result.error) {
          alert(`Error creating user: ${result.error}`);
          return;
        }
        alert('User created and activated successfully');
      } else {
        // Management creates for approval
        result = await UserService.createUserForApproval(formData);
        if (result.error) {
          alert(`Error creating user: ${result.error}`);
          return;
        }
        alert('User created and submitted for Super Admin approval');
      }
      
      setShowCreateForm(false);
      setFormData({
        full_name: '',
        email: '',
        role: 'employee',
        hourly_rate: 50
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      alert('Error creating user');
      console.error('Error creating user:', err);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      if (currentRole === 'super_admin') {
        const result = await UserService.setUserStatus(userId, !currentStatus);
        if (result.success) {
          alert(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
          setRefreshTrigger(prev => prev + 1);
        } else {
          alert(`Error updating user status: ${result.error}`);
        }
      } else {
        alert('Only Super Admin can activate/deactivate users');
      }
    } catch (err) {
      alert('Error updating user status');
      console.error('Error updating user status:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">
            {currentRole === 'super_admin' 
              ? 'Complete user control and approval'
              : 'Create users and recommend for approval'
            }
          </p>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Users ({users.length})
              </button>
              
              {canApproveUsers() && (
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'pending'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pending Approval ({pendingUsers.length})
                  {pendingUsers.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {pendingUsers.length}
                    </span>
                  )}
                </button>
              )}
              
              {canManageUsers() && (
                <button
                  onClick={() => {
                    setActiveTab('create');
                    setShowCreateForm(true);
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'create'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Create New User
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Stats Cards - Updated for active tab */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {activeTab === 'pending' ? 'Pending Users' : 'Total Users'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeTab === 'pending' ? pendingUsers.length : users.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {activeTab === 'pending' ? 'Awaiting Approval' : 'Pending Approval'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{pendingUsers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {activeTab === 'pending' ? 'Can Approve' : 'Active Users'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeTab === 'pending' 
                    ? (canApproveUsers() ? 'Yes' : 'No')
                    : approvedUsers.filter(u => u.is_active).length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {activeTab !== 'create' && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-4">
              {canManageUsers() && (
                <button 
                  onClick={() => {
                    setActiveTab('create');
                    setShowCreateForm(true);
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {currentRole === 'super_admin' ? 'Create New User' : 'Create User for Approval'}
                </button>
              )}
              
              {canApproveUsers() && pendingUsers.length > 0 && (
                <button 
                  onClick={() => {
                    // Approve all pending users with single alert
                    const count = pendingUsers.length;
                    pendingUsers.forEach(user => UserService.approveUser(user.id));
                    setRefreshTrigger(prev => prev + 1);
                    alert(`Successfully approved ${count} pending users`);
                  }}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Approve All Pending ({pendingUsers.length})
                </button>
              )}
              
              {activeTab === 'pending' && pendingUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No pending users</p>
                  <p>All users have been approved</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create User Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentRole === 'super_admin' ? 'Create New User' : 'Create User for Approval'}
                </h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitUser(); }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value as UserFormData['role']})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="employee">Employee</option>
                      <option value="lead">Lead</option>
                      <option value="manager">Manager</option>
                      {currentRole === 'super_admin' && (
                        <>
                          <option value="management">Management</option>
                          <option value="super_admin">Super Admin</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hourly Rate</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {currentRole === 'super_admin' ? 'Create User' : 'Submit for Approval'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Form Modal */}
        {showEditForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit User
                </h3>
                <button
                  onClick={resetEditForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as 'super_admin' | 'management' | 'manager' | 'lead' | 'employee'})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="employee">Employee</option>
                    <option value="lead">Team Lead</option>
                    <option value="manager">Manager</option>
                    <option value="management">Management</option>
                    {currentRole === 'super_admin' && (
                      <option value="super_admin">Super Admin</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({...formData, hourly_rate: Number(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetEditForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users Table */}
        {activeTab !== 'create' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {activeTab === 'pending' ? 'Pending Users' : 'All Users'}
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hourly Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {user.is_approved_by_super_admin ? (
                            <span className="inline-flex p-1 rounded-full bg-green-100" title="Approved">
                              <UserCheck className="h-4 w-4 text-green-600" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded-full bg-yellow-100" title="Pending Approval">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            </span>
                          )}
                          
                          {user.is_active ? (
                            <span className="inline-flex p-1 rounded-full bg-blue-100" title="Active">
                              <ToggleRight className="h-4 w-4 text-blue-600" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded-full bg-red-100" title="Inactive">
                              <ToggleLeft className="h-4 w-4 text-red-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${user.hourly_rate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {/* Approve Button - Only for Super Admin and pending users */}
                          {canApproveUsers() && !user.is_approved_by_super_admin && (
                            <button
                              onClick={() => handleApproveUser(user.id)}
                              className="flex items-center px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              title="Approve User"
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Approve
                            </button>
                          )}
                          
                          {/* Activate/Deactivate Button - Only for Super Admin */}
                          {currentRole === 'super_admin' && (
                            <button
                              onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.is_active 
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
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
                          <button 
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit User"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          {/* Delete Button - Only for Super Admin */}
                          {canApproveUsers() && (
                            <button 
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
