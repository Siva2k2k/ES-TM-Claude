import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserPlus, Crown, CheckCircle, Settings, Eye, 
  Badge, Clock, Shield 
} from 'lucide-react';
import { showSuccess, showError } from '../utils/toast';

interface ProjectPermissions {
  systemRole: string;
  projectRole: string | null;
  isElevated: boolean;
  canAddMembers: boolean;
  canApproveTimesheets: boolean;
  canAssignTasks: boolean;
  canViewAllTasks: boolean;
  effectivePermissions: string[];
}

interface ProjectMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_system_role: string;
  project_role: string;
  is_secondary_manager: boolean;
  assigned_at: string;
}

interface EnhancedProjectDashboardProps {
  projectId: string;
  projectName: string;
}

export const EnhancedProjectDashboard: React.FC<EnhancedProjectDashboardProps> = ({ 
  projectId, 
  projectName 
}) => {
  const { currentRole } = useRoleManager();
  const [permissions, setPermissions] = useState<ProjectPermissions | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const [permissionsRes, membersRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/permissions`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        }),
        fetch(`/api/v1/projects/${projectId}/members`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        })
      ]);

      const permissionsData = await permissionsRes.json();
      const membersData = await membersRes.json();

      if (permissionsRes.ok) {
        setPermissions(permissionsData.permissions);
      }

      if (membersRes.ok) {
        setMembers(membersData.members);
      }
    } catch (error) {
      console.error('Error loading project data:', error);
      showError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberElevation = async (memberId: string, targetRole: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/members/${memberId}/elevate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ targetProjectRole: targetRole })
      });

      if (response.ok) {
        showSuccess(`Member role updated to ${targetRole}`);
        loadProjectData(); // Refresh data
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to update member role');
      }
    } catch (error) {
      showError('Failed to update member role');
    }
  };

  const PermissionCard: React.FC<{
    icon: React.ElementType;
    title: string;
    enabled: boolean;
    description: string;
  }> = ({ icon: Icon, title, enabled, description }) => (
    <div className={`p-4 rounded-lg border-2 transition-all ${
      enabled 
        ? 'border-green-200 bg-green-50' 
        : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-center mb-2">
        <Icon className={`h-5 w-5 mr-2 ${enabled ? 'text-green-600' : 'text-gray-400'}`} />
        <h3 className={`font-semibold ${enabled ? 'text-green-900' : 'text-gray-600'}`}>
          {title}
        </h3>
      </div>
      <p className={`text-sm ${enabled ? 'text-green-700' : 'text-gray-500'}`}>
        {description}
      </p>
    </div>
  );

  const RoleElevationBanner: React.FC = () => {
    if (!permissions?.isElevated) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Crown className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-semibold text-blue-900">
              Enhanced Project Role
            </h3>
            <div className="mt-2 text-blue-800">
              <p className="text-sm">
                You have been elevated to <span className="font-semibold text-blue-900">
                  {permissions.projectRole}
                </span> in this project, giving you additional permissions beyond your 
                system role (<span className="font-medium">{permissions.systemRole}</span>).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {permissions.effectivePermissions.map((perm, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {perm.replace('_', ' ').toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MemberRow: React.FC<{ member: ProjectMember }> = ({ member }) => (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {member.user_name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="ml-4">
          <h4 className="text-sm font-medium text-gray-900">{member.user_name}</h4>
          <p className="text-sm text-gray-600">{member.user_email}</p>
          <div className="flex items-center space-x-2 mt-1">
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              System: {member.user_system_role}
            </span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              member.is_secondary_manager 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              Project: {member.is_secondary_manager ? 'Secondary Manager' : member.project_role}
            </span>
            {member.is_secondary_manager && (
              <Badge className="h-4 w-4 text-purple-600" title="Elevated Role" />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Role Elevation Controls - Only if current user can manage members */}
        {permissions?.canAddMembers && member.user_system_role === 'lead' && !member.is_secondary_manager && (
          <button
            onClick={() => handleMemberElevation(member.id, 'secondary_manager')}
            className="px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-full hover:bg-purple-200 transition-colors"
            title="Elevate to Secondary Manager"
          >
            <Crown className="h-3 w-3 inline mr-1" />
            Elevate
          </button>
        )}
        
        {permissions?.canAddMembers && member.is_secondary_manager && (
          <button
            onClick={() => handleMemberElevation(member.id, 'lead')}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            title="Remove elevation"
          >
            Demote
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Project Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{projectName}</h1>
            <p className="text-gray-600 mt-2">
              Your role: <span className="font-semibold">{permissions?.systemRole}</span>
              {permissions?.projectRole && permissions.projectRole !== permissions.systemRole && (
                <span className="ml-2">
                  → Project: <span className="font-semibold text-blue-600">{permissions.projectRole}</span>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {permissions?.isElevated && (
              <div className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <Crown className="h-4 w-4 mr-1" />
                Enhanced Role
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role Elevation Banner */}
      <RoleElevationBanner />

      {/* Permission Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <PermissionCard
          icon={Users}
          title="Manage Members"
          enabled={permissions?.canAddMembers || false}
          description={permissions?.canAddMembers ? "Add/remove project members" : "View members only"}
        />
        <PermissionCard
          icon={CheckCircle}
          title="Approve Timesheets"
          enabled={permissions?.canApproveTimesheets || false}
          description={permissions?.canApproveTimesheets ? "Approve team timesheets" : "Submit timesheets only"}
        />
        <PermissionCard
          icon={Settings}
          title="Assign Tasks"
          enabled={permissions?.canAssignTasks || false}
          description={permissions?.canAssignTasks ? "Create and assign tasks" : "Complete assigned tasks"}
        />
        <PermissionCard
          icon={Eye}
          title="View All Tasks"
          enabled={permissions?.canViewAllTasks || false}
          description={permissions?.canViewAllTasks ? "See all project tasks" : "View assigned tasks only"}
        />
      </div>

      {/* Project Team Management */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Project Team</h2>
            {permissions?.canAddMembers && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </button>
            )}
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {members.length > 0 ? (
            members.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No team members found</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions for Enhanced Roles */}
      {permissions?.isElevated && (
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Enhanced Actions Available</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {permissions.canApproveTimesheets && (
              <button className="flex items-center justify-center px-4 py-3 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
                <Clock className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-purple-700 font-medium">Review Timesheets</span>
              </button>
            )}
            {permissions.canAddMembers && (
              <button className="flex items-center justify-center px-4 py-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-blue-700 font-medium">Project Settings</span>
              </button>
            )}
            <button className="flex items-center justify-center px-4 py-3 bg-white border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
              <Eye className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-700 font-medium">Advanced Analytics</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedProjectDashboard;