/**
 * Team Members Component
 * Manage project team members and roles
 * Cognitive Complexity: 6
 * File Size: ~190 LOC
 */
import React, { useState } from 'react';
import { UserPlus, Trash2, Edit, Shield, User, Mail } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
} from '../../../../shared/components/ui';
import type { ProjectMember, ProjectRole } from '../../types/project.types';

interface TeamMembersProps {
  projectId: string;
  members?: ProjectMember[];
  onAddMember?: () => void;
  onEditMember?: (member: ProjectMember) => void;
  onRemoveMember?: (memberId: string) => void;
}

const roleConfig: Record<ProjectRole, { variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'gray', icon: React.ElementType }> = {
  admin: { variant: 'error', icon: Shield },
  manager: { variant: 'warning', icon: Shield },
  lead: { variant: 'info', icon: User },
  employee: { variant: 'gray', icon: User },
};

export const TeamMembers: React.FC<TeamMembersProps> = ({
  projectId,
  members = [],
  onAddMember,
  onEditMember,
  onRemoveMember,
}) => {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const roleStats = members.reduce((acc, member) => {
    acc[member.project_role] = (acc[member.project_role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const primaryManager = members.find(m => m.is_primary_manager);
  const secondaryManagers = members.filter(m => m.is_secondary_manager);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {members.length} member{members.length !== 1 ? 's' : ''} on this project
              </p>
            </div>
            {onAddMember && (
              <Button
                variant="primary"
                leftIcon={<UserPlus className="h-4 w-4" />}
                onClick={onAddMember}
              >
                Add Member
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Role Distribution */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(roleConfig).map(([role, config]) => {
          const count = roleStats[role] || 0;
          const Icon = config.icon;
          return (
            <Card key={role}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {count}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {role}{count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Manager Information */}
      {primaryManager && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Primary Manager
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {primaryManager.user_name}
                  </p>
                </div>
              </div>
              {secondaryManagers.length > 0 && (
                <Badge variant="info" size="sm">
                  +{secondaryManagers.length} secondary manager{secondaryManagers.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="p-12 text-center">
              <User className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">No team members yet</p>
              {onAddMember && (
                <Button variant="primary" onClick={onAddMember}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Member
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {members.map((member) => {
                    const config = roleConfig[member.project_role];
                    const RoleIcon = config.icon;

                    return (
                      <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {member.user_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {member.user_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={config.variant} size="sm">
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {member.project_role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(member.joined_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {member.is_primary_manager && (
                            <Badge variant="primary" size="sm">Primary</Badge>
                          )}
                          {member.is_secondary_manager && !member.is_primary_manager && (
                            <Badge variant="info" size="sm">Secondary</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            {onEditMember && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditMember(member)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {onRemoveMember && !member.is_primary_manager && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemoveMember(member.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
