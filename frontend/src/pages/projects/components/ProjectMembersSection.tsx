import React from 'react';
import { Users, UserPlus, X } from 'lucide-react';
import type { ProjectMember } from '../../../hooks/useProjectMembers';

interface ProjectMembersSectionProps {
  projectId: string;
  members: ProjectMember[];
  onAddMember: () => void;
  onRemoveMember: (userId: string) => void;
}

/**
 * ProjectMembersSection Component
 * Displays members in project expanded details
 *
 * Features:
 * - Member list with roles
 * - Add member button
 * - Remove member action
 * - Primary manager indication
 * - Empty state
 */
export const ProjectMembersSection: React.FC<ProjectMembersSectionProps> = ({
  projectId,
  members,
  onAddMember,
  onRemoveMember,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          Members ({members.length})
        </h4>
        <button
          onClick={onAddMember}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{member.user_name}</p>
              <p className="text-xs text-gray-500 truncate">{member.user_email}</p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                {member.project_role}
              </span>
              {!member.is_primary_manager && (
                <button
                  onClick={() => onRemoveMember(member.user_id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove member"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-3">No members assigned</p>
        )}
      </div>
    </div>
  );
};
