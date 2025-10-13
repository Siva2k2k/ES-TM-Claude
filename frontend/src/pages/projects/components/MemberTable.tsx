import React, { useState } from 'react';
import { Users, Trash2, Shield, TrendingUp, User as UserIcon, Search } from 'lucide-react';
import type { User } from '../../../types';

export interface ProjectMember {
  id: string;
  user_id: string;
  project_id: string;
  project_role: 'lead' | 'employee';
  user?: User;
  assigned_at: string;
}

interface MemberTableProps {
  members: ProjectMember[];
  onRemove: (memberId: string) => void;
  onRoleElevation: (member: ProjectMember) => void;
  canManageMembers: boolean;
  loading?: boolean;
}

/**
 * MemberTable Component
 * Displays project members with Lead and Employee roles only
 *
 * Features:
 * - Display members with role badges
 * - Search/filter members
 * - Remove members (soft delete)
 * - Role elevation (Employee → Lead)
 * - Mobile-responsive table
 * - Dark mode support
 */
export const MemberTable: React.FC<MemberTableProps> = ({
  members,
  onRemove,
  onRoleElevation,
  canManageMembers,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter members by search term
  const filteredMembers = members.filter(member => {
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    return (
      member.user?.full_name.toLowerCase().includes(query) ||
      member.user?.email.toLowerCase().includes(query) ||
      member.project_role.toLowerCase().includes(query)
    );
  });

  const getRoleBadge = (role: 'lead' | 'employee') => {
    if (role === 'lead') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <TrendingUp className="h-3 w-3" />
          Team Lead
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300">
        <UserIcon className="h-3 w-3" />
        Employee
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="ml-3 text-gray-600 dark:text-gray-400">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Project Members
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Members List */}
      <div className="p-4 md:p-6">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {searchTerm ? 'No members found' : 'No members yet'}
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Try a different search term' : 'Add members to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {/* Member Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {member.user?.full_name || 'Unknown User'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {member.user?.email || 'No email'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Role Badge */}
                  {getRoleBadge(member.project_role)}

                  {/* Role Elevation Button - Only for employees */}
                  {canManageMembers && member.project_role === 'employee' && (
                    <button
                      onClick={() => onRoleElevation(member)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors min-h-[36px]"
                      title="Promote to Lead"
                    >
                      <TrendingUp className="h-3 w-3" />
                      <span className="hidden sm:inline">Promote</span>
                    </button>
                  )}

                  {/* Remove Button */}
                  {canManageMembers && (
                    <button
                      onClick={() => onRemove(member.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors min-h-[36px]"
                      title="Remove member"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
