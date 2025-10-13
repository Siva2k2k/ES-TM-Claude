import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users as UsersIcon } from 'lucide-react';
import { useRoleManager } from '../../hooks/useRoleManager';
import { ProjectService } from '../../services/ProjectService';
import { UserService } from '../../services/UserService';
import { showSuccess, showError } from '../../utils/toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { MemberTable, type ProjectMember } from './components/MemberTable';
import { RoleElevationModal } from './components/RoleElevationModal';
import type { Project, User } from '../../types';

/**
 * ProjectMembersPage
 * Manage project members with Lead and Employee roles
 *
 * Features:
 * - Add members (Leads from 'lead' role, Employees from 'employee' role)
 * - Remove members (soft delete)
 * - Role elevation (Employee → Lead)
 * - Role-based permissions
 * - Mobile-responsive
 * - Dark mode support
 *
 * NEW LOGIC:
 * - No secondary manager concept
 * - Only Lead and Employee project roles
 * - Leads selected from users with system role 'lead'
 * - Employees selected from users with system role 'employee'
 */
export const ProjectMembersPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { canManageProjects, currentRole } = useRoleManager();

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [availableLeads, setAvailableLeads] = useState<User[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Add Member Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState<'lead' | 'employee'>('employee');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Role Elevation state
  const [showElevationModal, setShowElevationModal] = useState(false);
  const [elevatingMember, setElevatingMember] = useState<ProjectMember | null>(null);

  // Remove Member state
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const canManage = canManageProjects();

  // Load data
  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId, refreshTrigger]);

  const loadData = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const [projectResult, membersResult, usersResult] = await Promise.all([
        ProjectService.getProjectById(projectId),
        ProjectService.getProjectMembers?.(projectId) || Promise.resolve({ members: [] }),
        UserService.getAllUsers()
      ]);

      if (projectResult.error) {
        showError(projectResult.error);
        return;
      }

      if (projectResult.project) {
        setProject(projectResult.project);
      }

      if (membersResult.members) {
        setMembers(membersResult.members);
      }

      if (usersResult.users) {
        // Get member user IDs for filtering
        const memberUserIds = new Set((membersResult.members || []).map((m: ProjectMember) => m.user_id));

        // Filter leads: system role 'lead' and not already a member
        const leads = usersResult.users.filter(
          (u: User) => u.role === 'lead' && u.is_active && !memberUserIds.has(u.id)
        );

        // Filter employees: system role 'employee' and not already a member
        const employees = usersResult.users.filter(
          (u: User) => u.role === 'employee' && u.is_active && !memberUserIds.has(u.id)
        );

        setAvailableLeads(leads);
        setAvailableEmployees(employees);
      }
    } catch (err) {
      console.error('Error loading project data:', err);
      showError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  // Add Member
  const handleAddMember = async () => {
    if (!projectId || !selectedUser || !selectedRole) return;

    setIsSubmitting(true);
    try {
      const result = await ProjectService.addProjectMember?.(projectId, {
        user_id: selectedUser,
        project_role: selectedRole
      });

      if (result?.error) {
        showError(result.error);
      } else {
        showSuccess(`Member added as ${selectedRole === 'lead' ? 'Team Lead' : 'Employee'}`);
        setShowAddModal(false);
        setSelectedUser('');
        setSelectedRole('employee');
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error adding member:', err);
      showError('Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role Elevation
  const handleRoleElevation = (member: ProjectMember) => {
    setElevatingMember(member);
    setShowElevationModal(true);
  };

  const handleConfirmElevation = async () => {
    if (!projectId || !elevatingMember) return;

    setIsSubmitting(true);
    try {
      const result = await ProjectService.updateProjectMemberRole?.(
        projectId,
        elevatingMember.user_id,
        'lead'
      );

      if (result?.error) {
        showError(result.error);
      } else {
        showSuccess(`${elevatingMember.user?.full_name} promoted to Team Lead`);
        setShowElevationModal(false);
        setElevatingMember(null);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error elevating role:', err);
      showError('Failed to promote member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove Member
  const handleRemoveMember = (memberId: string) => {
    setRemovingMemberId(memberId);
    setShowRemoveDialog(true);
  };

  const handleConfirmRemove = async () => {
    if (!projectId || !removingMemberId) return;

    setIsSubmitting(true);
    try {
      const result = await ProjectService.removeProjectMember?.(projectId, removingMemberId);

      if (result?.error) {
        showError(result.error);
      } else {
        showSuccess('Member removed from project');
        setShowRemoveDialog(false);
        setRemovingMemberId(null);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error removing member:', err);
      showError('Failed to remove member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return <LoadingSpinner fullScreen text="Loading project members..." />;
  }

  // Permission check
  if (!canManage) {
    return (
      <EmptyState
        icon={UsersIcon}
        title="Access Denied"
        description="You don't have permission to manage project members."
      />
    );
  }

  // Project not found
  if (!project) {
    return (
      <EmptyState
        icon={UsersIcon}
        title="Project Not Found"
        description="The requested project could not be found."
      />
    );
  }

  const availableUsers = selectedRole === 'lead' ? availableLeads : availableEmployees;
  const removingMember = members.find(m => m.id === removingMemberId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <button
            onClick={() => navigate(`/dashboard/projects/${projectId}`)}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Project</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                {project.name}
              </h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
                Manage project members and roles
              </p>
            </div>

            {/* Add Member Button */}
            {canManage && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium text-sm md:text-base min-h-[44px] w-full sm:w-auto"
              >
                <Plus className="h-5 w-5" />
                <span>Add Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Member Table */}
        <MemberTable
          members={members}
          onRemove={handleRemoveMember}
          onRoleElevation={handleRoleElevation}
          canManageMembers={canManage}
        />

        {/* Add Member Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmitting) {
                setShowAddModal(false);
              }
            }}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-md border border-transparent dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Add Project Member
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Add a lead or employee to this project
                </p>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      setSelectedRole(e.target.value as 'lead' | 'employee');
                      setSelectedUser(''); // Reset user selection when role changes
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="employee">Employee</option>
                    <option value="lead">Team Lead</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {selectedRole === 'lead'
                      ? 'Leads can manage tasks and coordinate team members'
                      : 'Employees work on assigned tasks'}
                  </p>
                </div>

                {/* User Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select {selectedRole === 'lead' ? 'Lead' : 'Employee'}
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  >
                    <option value="">Choose a user...</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                  {availableUsers.length === 0 && (
                    <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                      No available {selectedRole === 'lead' ? 'leads' : 'employees'} to add
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedUser('');
                  }}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUser || isSubmitting}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors min-h-[44px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Member
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Role Elevation Modal */}
        <RoleElevationModal
          isOpen={showElevationModal}
          onClose={() => {
            setShowElevationModal(false);
            setElevatingMember(null);
          }}
          onConfirm={handleConfirmElevation}
          member={elevatingMember}
          isLoading={isSubmitting}
        />

        {/* Remove Member Confirmation */}
        <ConfirmDialog
          isOpen={showRemoveDialog}
          onClose={() => {
            setShowRemoveDialog(false);
            setRemovingMemberId(null);
          }}
          onConfirm={handleConfirmRemove}
          title="Remove Member"
          message={`Are you sure you want to remove ${removingMember?.user?.full_name || 'this member'} from the project?`}
          confirmLabel="Remove"
          confirmVariant="danger"
          isLoading={isSubmitting}
        />
      </div>
    </div>
  );
};
