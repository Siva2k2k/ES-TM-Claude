import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, AlertCircle, CheckCircle, User, Mail, Shield, X, Search } from 'lucide-react';

interface ProjectMember {
  id: string;
  user_id: string;
  project_role: string;
  is_primary_manager: boolean;
  is_secondary_manager: boolean;
  user_name: string;
  user_email: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface ProjectMemberManagementProps {
  projectId: string;
  projectName: string;
  currentUserRole: string;
  onUpdate?: () => void;
}

export const ProjectMemberManagement: React.FC<ProjectMemberManagementProps> = ({
  projectId,
  projectName,
  currentUserRole,
  onUpdate
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('employee');
  const [searchTerm, setSearchTerm] = useState('');

  const canManageMembers = ['manager', 'management', 'super_admin'].includes(currentUserRole);

  useEffect(() => {
    loadMembers();
    if (canManageMembers) {
      loadAvailableUsers();
    }
  }, [projectId]);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load project members');
      }

      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project members');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const data = await response.json();

      if (response.ok && data.users) {
        // Filter out users who are already members
        const currentMemberIds = members.map(member => member.user_id);
        const available = data.users.filter((user: User) =>
          !currentMemberIds.includes(user.id)
        );
        setAvailableUsers(available);
      }
    } catch (err) {
      console.error('Error loading available users:', err);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser || !selectedRole) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          userId: selectedUser,
          projectRole: selectedRole
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add project member');
      }

      setSuccess('Project member added successfully');
      setShowAddModal(false);
      setSelectedUser('');
      setSelectedRole('employee');
      await loadMembers();
      await loadAvailableUsers();
      onUpdate?.();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add project member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this project?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove project member');
      }

      setSuccess(`${userName} removed from project successfully`);
      await loadMembers();
      await loadAvailableUsers();
      onUpdate?.();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove project member');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'super_admin': 'Super Admin',
      'management': 'Management',
      'manager': 'Manager',
      'lead': 'Team Lead',
      'employee': 'Employee'
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colorMap: Record<string, string> = {
      'super_admin': 'bg-purple-100 text-purple-800',
      'management': 'bg-red-100 text-red-800',
      'manager': 'bg-blue-100 text-blue-800',
      'lead': 'bg-green-100 text-green-800',
      'employee': 'bg-gray-100 text-gray-800'
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800';
  };

  const filteredMembers = members.filter(member =>
    member.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAvailableUsers = availableUsers.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Project Members</h2>
              <p className="text-sm text-gray-600">{projectName}</p>
            </div>
          </div>
          {canManageMembers && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            />
          </div>
        </div>

        {/* Members List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading members...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Members Found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'No members match your search.' : 'This project has no members yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{member.user_name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{member.user_email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.project_role)}`}>
                    <Shield className="w-3 h-3 mr-1" />
                    {getRoleDisplayName(member.project_role)}
                  </span>

                  {member.is_primary_manager && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Primary Manager
                    </span>
                  )}

                  {member.is_secondary_manager && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Secondary Manager
                    </span>
                  )}

                  {canManageMembers && !member.is_primary_manager && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id, member.user_name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove member"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Project Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {/* User Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select User
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Choose a user...</option>
                    {filteredAvailableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                  {availableUsers.length === 0 && (
                    <p className="mt-1 text-sm text-gray-500">No available users to add</p>
                  )}
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="employee">Employee</option>
                    <option value="lead">Team Lead</option>
                    <option value="manager">Manager</option>
                    {currentUserRole === 'super_admin' && (
                      <>
                        <option value="management">Management</option>
                        <option value="super_admin">Super Admin</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUser || !selectedRole || loading}
                  className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                    selectedUser && selectedRole && !loading
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};