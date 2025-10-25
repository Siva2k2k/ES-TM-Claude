import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Trash2 } from 'lucide-react';
import type { Project } from '../../../types';
import type { ProjectMember } from '../../../hooks/useProjectMembers';

interface ProjectMembersTabProps {
  projects: Project[];
  members: ProjectMember[];
  onSelectProject: (projectId: string) => void;
  onAddMemberClick: () => void;
  onRemoveMember: (projectId: string, userId: string) => void;
  selectedProjectId: string | null;
}

/**
 * ProjectMembersTab Component
 * Full tab interface for managing project members
 *
 * Features:
 * - Project selection dropdown
 * - Member list with roles
 * - Add/remove member actions
 * - Primary manager indication
 * - Empty state handling
 */
export const ProjectMembersTab: React.FC<ProjectMembersTabProps> = ({
  projects,
  members,
  onSelectProject,
  onAddMemberClick,
  onRemoveMember,
  selectedProjectId,
}) => {
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Project Member Management</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Project to Manage
            </label>
            <select
              value={selectedProjectId || ''}
              onChange={(e) => onSelectProject(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="">Select a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          {selectedProject && (
            <button
              onClick={onAddMemberClick}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center gap-2 sm:mt-7 transition-all"
            >
              <UserPlus className="h-5 w-5" />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Project Members List */}
      {selectedProject && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Members for "{selectedProject.name}"
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {members.length} members assigned
              </p>
            </div>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Members Assigned</h4>
              <p className="text-gray-600 mb-6">This project has no members yet.</p>
              <button
                onClick={onAddMemberClick}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium inline-flex items-center gap-2"
              >
                <UserPlus className="h-5 w-5" />
                Add First Member
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {member.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{member.user_name}</h4>
                      <p className="text-sm text-gray-600">{member.user_email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                      member.project_role === 'manager'
                        ? 'bg-blue-100 text-blue-700'
                        : member.project_role === 'lead'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {member.project_role === 'manager' ? 'Manager' :
                       member.project_role === 'lead' ? 'Lead' : 'Employee'}
                    </span>

                    {member.is_primary_manager && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        Primary Manager
                      </span>
                    )}

                    {!member.is_primary_manager && selectedProject && (
                      <button
                        onClick={() => onRemoveMember(selectedProject.id, member.user_id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
