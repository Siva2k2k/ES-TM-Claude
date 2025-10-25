import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { User, Project } from '../../../types';
import type { ProjectMember } from '../../../hooks/useProjectMembers';

interface AddMemberModalProps {
  isOpen: boolean;
  project: Project | null;
  availableUsers: User[];
  existingMembers: ProjectMember[];
  onAdd: (userId: string, role: string) => void;
  onClose: () => void;
}

/**
 * AddMemberModal Component
 * Modal for adding members to a project
 *
 * Features:
 * - Role selection (employee/lead)
 * - User filtering by role
 * - Excludes already assigned users
 * - Shows available user count
 * - Form validation
 */
export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  project,
  availableUsers,
  existingMembers,
  onAdd,
  onClose,
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('employee');

  if (!isOpen || !project) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    onAdd(selectedUserId, selectedRole);
    setSelectedUserId('');
    setSelectedRole('employee');
  };

  // Get existing member user IDs
  const existingUserIds = new Set(existingMembers.map(m => m.user_id));

  // Filter available users by role and exclude existing members
  const filteredUsers = availableUsers
    .filter(user => !existingUserIds.has(user.id))
    .filter(user => {
      if (selectedRole === 'employee') return user.role === 'employee';
      if (selectedRole === 'lead') return user.role === 'lead';
      return false;
    });

  const availableCount = filteredUsers.length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Add Project Member</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setSelectedUserId('');
              }}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="employee">Employee</option>
              <option value="lead">Lead</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select User ({selectedRole === 'employee' ? 'Employees' : 'Leads'} only)
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            >
              <option value="">Select a user</option>
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </option>
              ))}
            </select>
            {availableCount === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                No {selectedRole === 'employee' ? 'employees' : 'leads'} available to assign.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedUserId}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
