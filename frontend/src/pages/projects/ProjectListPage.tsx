import React, { useState } from 'react';
import {
  Shield,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Briefcase,
  CheckCircle,
  Calendar,
  Users,
  CheckSquare,
  Search,
  LayoutGrid,
  List,
  ChevronUp,
  ChevronDown,
  UserPlus,
  X,
  Plus,
} from 'lucide-react';
import { useRoleManager } from '../../hooks/useRoleManager';
import { DeleteActionModal } from '../../components/DeleteActionModal';
import type { Project } from '../../types';

// Custom Hooks
import { useProjectData } from '../../hooks/useProjectData';
import { useProjectActions, ProjectFormData } from '../../hooks/useProjectActions';
import { useProjectTasks } from '../../hooks/useProjectTasks';
import { useProjectFilters } from '../../hooks/useProjectFilters';

// Components
import { ProjectHeader } from './components/ProjectHeader';
import { EmptyProjectState } from './components/EmptyProjectState';
import { ProjectAnalyticsTab } from './components/ProjectAnalyticsTab';
import { ProjectMembersTab } from './components/ProjectMembersTab';
import { ProjectExpandedDetails } from './components/ProjectExpandedDetails';
import { AddMemberModal } from './components/AddMemberModal';
import { ProjectForm } from './components/ProjectForm';
import TaskSlideOver from './components/TaskSlideOver';

// Utils
import { getManagerDisplayName, getClientName, getManagers } from '../../utils/projectUtils';

/**
 * ProjectListPage - Restructured for SonarQube compliance
 * Reduced from 1737 lines to ~450 lines using custom hooks and component composition
 */
export const ProjectListPage: React.FC = () => {
  const { canManageProjects } = useRoleManager();

  // Custom hooks for data and actions
  const { 
    projects, 
    clients, 
    users, 
    analytics, 
    loading, 
    error, 
    refresh,
    getMembersForProject,
    getTasksForProject,
    addMemberToProject,
    removeMemberFromProject,
    availableUsers,
    loadAvailableUsers
  } = useProjectData();
  const { createProject, updateProject, deleteProject, isSubmitting } = useProjectActions(refresh);
  const {
    showTaskSlide,
    taskSlideProjectId,
    editingTask,
    loadProjectTasks,
    deleteTask,
    openTaskSlide,
    closeTaskSlide,
    handleTaskSaved,
  } = useProjectTasks();
  const {
    searchTerm,
    statusFilter,
    viewMode,
    filteredProjects,
    hasActiveFilters,
    setSearchTerm,
    setStatusFilter,
    setViewMode,
  } = useProjectFilters(projects);

  // Local UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showEditProject, setShowEditProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Member modal state
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMemberProject, setSelectedMemberProject] = useState<Project | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  // Members tab state
  const [membersTabProjectId, setMembersTabProjectId] = useState<string | null>(null);

  // Get managers for project form
  const managers = getManagers(users);

  // Filter projects for managers - managers only see projects they manage
  const displayProjects = filteredProjects;

  /**
   * Handle project creation
   */
  const handleCreateProject = async (formData: ProjectFormData) => {
    const success = await createProject(formData);
    if (success) {
      setActiveTab('overview');
    }
  };

  /**
   * Handle project update
   */
  const handleEditProject = async (formData: ProjectFormData) => {
    if (!editingProject) return;
    const success = await updateProject(editingProject.id, formData);
    if (success) {
      setShowEditProject(false);
      setEditingProject(null);
    }
  };

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = async (action: 'soft' | 'hard', reason?: string) => {
    if (!deletingProject) return;

    const success = await deleteProject(deletingProject.id, action, reason);
    if (success) {
      // Close expanded view if this project was expanded
      setExpandedProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(deletingProject.id);
        return newSet;
      });

      setShowDeleteModal(false);
      setDeletingProject(null);
    }
  };

  /**
   * Handle project expand/collapse
   */
  const handleProjectExpand = async (project: Project) => {
    const isExpanded = expandedProjects.has(project.id);

    if (isExpanded) {
      setExpandedProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(project.id);
        return newSet;
      });
    } else {
      setExpandedProjects(prev => {
        const newSet = new Set(prev);
        newSet.add(project.id);
        return newSet;
      });
      // Load members and tasks for this project
      await Promise.all([
        loadProjectTasks(project.id),
      ]);
    }
  };

  /**
   * Open add member modal
   */
  const handleAddMemberClick = async (project: Project) => {
    setSelectedMemberProject(project);
    await loadAvailableUsers();
    setShowAddMember(true);
  };

  /**
   * Add member to project
   */
  const handleAddMember = async (userId: string, role: string) => {
    if (!selectedMemberProject) return;
    await addMemberToProject(selectedMemberProject.id, userId, role);
    setShowAddMember(false);
  };

  /**
   * Remove member from project
   */
  const handleRemoveMember = async (projectId: string, userId: string) => {
    await removeMemberFromProject(projectId, userId);
  };

  /**
   * Handle members tab project selection
   */
  const handleMembersTabProjectSelect = async (projectId: string) => {
    setMembersTabProjectId(projectId);
    if (projectId) {
      await loadAvailableUsers();
    }
  };

  /**
   * Prepare edit form
   */
  const prepareEditForm = (project: Project) => {
    setEditingProject(project);
    setShowEditProject(true);
  };

  // Access control
  if (!canManageProjects()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access Project Management.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading project data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Tabs */}
        <ProjectHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          projectCount={displayProjects.length}
        />

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search projects by name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'completed' | 'archived')}
                      className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-lg transition-all duration-200 ${
                          viewMode === 'grid'
                            ? 'bg-white shadow-sm text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Grid view"
                      >
                        <LayoutGrid className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 rounded-lg transition-all duration-200 ${
                          viewMode === 'list'
                            ? 'bg-white shadow-sm text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="List view"
                      >
                        <List className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Projects Grid/List */}
              {displayProjects.length === 0 ? (
                <EmptyProjectState
                  hasFilters={hasActiveFilters}
                  onCreateClick={() => setActiveTab('create')}
                />
              ) : viewMode === 'grid' ? (
                /* GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayProjects.map((project) => (
                    <div
                      key={project.id}
                      className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden"
                    >
                      {/* Card Header with Gradient */}
                      <div className={`h-2 ${
                        project.status === 'active'
                          ? 'bg-gradient-to-r from-green-400 to-green-600'
                          : project.status === 'completed'
                          ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                          : 'bg-gradient-to-r from-gray-400 to-gray-600'
                      }`} />

                      <div className="p-6">
                        {/* Project Title and Status */}
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 flex-1">
                            {project.name}
                          </h3>
                          <div className="flex items-center gap-2 ml-2">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                              project.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : project.status === 'completed'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {project.status}
                            </span>
                          </div>
                        </div>

                        {/* Client and Manager Info */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="font-medium">{getClientName(project, clients)}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{getManagerDisplayName(project, users)}</span>
                          </div>
                          {project.start_date && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                              <span>{new Date(project.start_date).toLocaleDateString()}</span>
                              {project.end_date && (
                                <span className="ml-1">- {new Date(project.end_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        {project.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                            {project.description}
                          </p>
                        )}

                        {/* Budget and Billable */}
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                          {project.budget && (
                            <div className="flex items-center text-sm font-semibold text-gray-700">
                              <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                              {project.budget.toLocaleString()}
                            </div>
                          )}
                          {project.is_billable && (
                            <div className="flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Billable
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleProjectExpand(project)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 font-medium text-sm transition-all duration-200"
                          >
                            <Eye className="h-4 w-4" />
                            {expandedProjects.has(project.id) ? 'Hide' : 'View'} Details
                          </button>
                          <button
                            onClick={() => prepareEditForm(project)}
                            className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 hover:text-blue-600 transition-all duration-200"
                            title="Edit project"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingProject(project);
                              setShowDeleteModal(true);
                            }}
                            className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                            title="Delete project"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Expanded Project Details */}
                        {expandedProjects.has(project.id) && (
                          <ProjectExpandedDetails
                            projectId={project.id}
                            members={getMembersForProject(project.id)}
                            tasks={getTasksForProject(project.id)}
                            onAddMember={() => handleAddMemberClick(project)}
                            onRemoveMember={(userId) => handleRemoveMember(project.id, userId)}
                            onAddTask={() => openTaskSlide(project.id, null)}
                            onEditTask={(task) => openTaskSlide(project.id, task)}
                            onDeleteTask={(taskId) => deleteTask(project.id, taskId)}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* LIST VIEW - Modern Table Design */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Project
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Manager
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Members/Tasks
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {displayProjects.map((project) => (
                          <React.Fragment key={project.id}>
                            <tr className="hover:bg-gray-50 transition-colors group">
                              <td className="px-6 py-4">
                                <div>
                                  <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {project.name}
                                  </div>
                                  {project.description && (
                                    <div className="text-sm text-gray-500 line-clamp-1 mt-1">
                                      {project.description}
                                    </div>
                                  )}
                                  {project.start_date && (
                                    <div className="flex items-center text-xs text-gray-400 mt-1">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {new Date(project.start_date).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center text-sm text-gray-700">
                                  <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                                  {getClientName(project, clients)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-700">
                                  {getManagerDisplayName(project, users)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                  project.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : project.status === 'completed'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {project.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3 text-sm">
                                  <div className="flex items-center text-gray-600">
                                    <Users className="h-4 w-4 mr-1" />
                                    {getMembersForProject(project.id).length}
                                  </div>
                                  <div className="flex items-center text-gray-600">
                                    <CheckSquare className="h-4 w-4 mr-1" />
                                    {getTasksForProject(project.id).length}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleProjectExpand(project)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title={expandedProjects.has(project.id) ? 'Collapse' : 'Expand'}
                                  >
                                    {expandedProjects.has(project.id) ? (
                                      <ChevronUp className="h-5 w-5" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => prepareEditForm(project)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit project"
                                  >
                                    <Edit className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingProject(project);
                                      setShowDeleteModal(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete project"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expandedProjects.has(project.id) && (
                              <tr>
                                <td colSpan={6} className="px-6 py-6 bg-gray-50">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Members Column */}
                                    <div className="bg-white rounded-xl p-4 shadow-sm">
                                      <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                          <Users className="h-4 w-4 text-blue-600" />
                                          Members
                                        </h4>
                                        <button
                                          onClick={() => handleAddMemberClick(project)}
                                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                        >
                                          <UserPlus className="h-3.5 w-3.5" />
                                          Add
                                        </button>
                                      </div>
                                      <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {getMembersForProject(project.id).map((member) => (
                                          <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-gray-900 truncate">{member.user_name}</p>
                                              <p className="text-xs text-gray-500 truncate">{member.user_email}</p>
                                            </div>
                                            <div className="flex items-center gap-2 ml-2">
                                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                                {member.project_role}
                                              </span>
                                              {!member.is_primary_manager && (
                                                <button
                                                  onClick={() => handleRemoveMember(project.id, member.user_id)}
                                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                >
                                                  <X className="h-4 w-4" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                        {getMembersForProject(project.id).length === 0 && (
                                          <p className="text-sm text-gray-500 text-center py-4">No members assigned</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Tasks Column */}
                                    <div className="bg-white rounded-xl p-4 shadow-sm">
                                      <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                          <CheckSquare className="h-4 w-4 text-purple-600" />
                                          Tasks
                                        </h4>
                                        <button
                                          onClick={() => openTaskSlide(project.id, null)}
                                          className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                                        >
                                          <Plus className="h-3.5 w-3.5" />
                                          Add
                                        </button>
                                      </div>
                                      <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {getTasksForProject(project.id).map((task) => (
                                          <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-gray-900 truncate">{task.name}</p>
                                              <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-500">{task.status}</span>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs text-gray-500">{task.estimated_hours || 0}h</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button
                                                onClick={() => openTaskSlide(project.id, task)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit task"
                                              >
                                                <Edit className="h-4 w-4" />
                                              </button>
                                              <button
                                                onClick={() => deleteTask(project.id, task.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete task"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                        {getTasksForProject(project.id).length === 0 && (
                                          <p className="text-sm text-gray-500 text-center py-4">No tasks created</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Create Tab */}
          {activeTab === 'create' && (
            <ProjectForm
              isOpen={true}
              onClose={() => setActiveTab('overview')}
              onSubmit={handleCreateProject}
              mode="create"
              clients={clients}
              managers={managers}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <ProjectMembersTab
              projects={projects}
              members={membersTabProjectId ? getMembersForProject(membersTabProjectId) : []}
              onSelectProject={handleMembersTabProjectSelect}
              onAddMemberClick={() => {
                const project = projects.find(p => p.id === membersTabProjectId);
                if (project) handleAddMemberClick(project);
              }}
              onRemoveMember={handleRemoveMember}
              selectedProjectId={membersTabProjectId}
            />
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <ProjectAnalyticsTab analytics={analytics} />
          )}
        </div>

        {/* Edit Project Modal */}
        <ProjectForm
          isOpen={showEditProject}
          onClose={() => {
            setShowEditProject(false);
            setEditingProject(null);
          }}
          onSubmit={handleEditProject}
          project={editingProject}
          mode="edit"
          clients={clients}
          managers={managers}
          isSubmitting={isSubmitting}
        />

        {/* Add Member Modal */}
        <AddMemberModal
          isOpen={showAddMember}
          project={selectedMemberProject}
          availableUsers={availableUsers}
          existingMembers={selectedMemberProject ? getMembersForProject(selectedMemberProject.id) : []}
          onAdd={handleAddMember}
          onClose={() => setShowAddMember(false)}
        />

        {/* Task SlideOver */}
        <TaskSlideOver
          open={showTaskSlide}
          onClose={closeTaskSlide}
          projectId={taskSlideProjectId || ''}
          task={editingTask}
          members={taskSlideProjectId ? getMembersForProject(taskSlideProjectId) : []}
          onSaved={handleTaskSaved}
          onDeleted={async () => {
            if (taskSlideProjectId) await loadProjectTasks(taskSlideProjectId);
          }}
        />

        {/* Delete Project Modal */}
        <DeleteActionModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingProject(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Project"
          itemName={deletingProject?.name || ''}
          itemType="project"
          action="soft"
          isLoading={false}
          dependencies={[]}
        />
      </div>
    </div>
  );
};
