import React, { useState, useEffect } from 'react';
import {
  Building2,
  Shield,
  Calendar,
  Clock,
  CheckCircle,
  Edit,
  Save,
  Search,
  UserPlus,
  Users,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  X,
  Target,
  CheckSquare,
  Plus,
  BarChart3,
  Eye,
  Trash2,
  DollarSign,
  Briefcase,
  FolderKanban,
  AlertCircle,
  MoreVertical
} from 'lucide-react';
import { useRoleManager } from '../../hooks/useRoleManager';
import { useAuth } from '../../store/contexts/AuthContext';
import { ProjectService } from '../../services/ProjectService';
import { UserService } from '../../services/UserService';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { DeleteActionModal } from '../../components/DeleteActionModal';
import type { Project, Client, User, Task, ProjectWithClients } from '../../types';
import { DeleteButton } from '@/components/common/DeleteButton';
import TaskSlideOver from './components/TaskSlideOver';

interface ProjectFormData {
  name: string;
  client_id: string;
  primary_manager_id: string;
  status: 'active' | 'completed' | 'archived';
  start_date: string;
  end_date: string;
  budget: number;
  description: string;
  is_billable: boolean;
}

interface TaskFormData {
  name: string;
  description: string;
  assigned_to_user_id: string;
  status: string;
  estimated_hours: number;
  is_billable: boolean;
}

/**
 * ProjectListPage - Redesigned with modern UI and complete edit/delete functionality
 */
export const ProjectListPage: React.FC = () => {
  const { canManageProjects, currentRole } = useRoleManager();
  const { currentUser } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalTasks: number;
    completedTasks: number;
    budgetUtilization: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form states
  const [showEditProject, setShowEditProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [projectTasks, setProjectTasks] = useState<Record<string, Task[]>>({});
  const [projectMembersMap, setProjectMembersMap] = useState<Record<string, typeof projectMembersList>>({});

  // Member management states
  const [projectMembersList, setProjectMembersList] = useState<{
    id: string;
    user_id: string;
    project_role: string;
    is_primary_manager: boolean;
    user_name: string;
    user_email: string;
  }[]>([]);
  // Task SlideOver state
  const [showTaskSlide, setShowTaskSlide] = useState(false);
  const [taskSlideProjectId, setTaskSlideProjectId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskSlideMembers, setTaskSlideMembers] = useState<any[]>([]);
  const [selectedMemberProject, setSelectedMemberProject] = useState<Project | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('employee');

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const [projectForm, setProjectForm] = useState<ProjectFormData>({
    name: '',
    client_id: '',
    primary_manager_id: '',
    status: 'active',
    start_date: '',
    end_date: '',
    budget: 0,
    description: '',
    is_billable: true
  });

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('all');

  // Load initial data for management view
  useEffect(() => {
    const loadData = async () => {
      if (!canManageProjects()) return;

      setLoading(true);
      setError(null);

      try {
        const [projectsResult, clientsResult, usersResult, analyticsResult] = await Promise.all([
          ProjectService.getAllProjects(),
          ProjectService.getAllClients(),
          UserService.getAllUsers(),
          ProjectService.getProjectAnalytics()
        ] as const);

        if (projectsResult.error) {
          setError(projectsResult.error);
        } else {
          const raw = projectsResult.projects || [];
          const seen = new Set<string>();
          const deduped: typeof raw = [];
          for (const p of raw) {
            if (!p?.id) continue;
            if (!seen.has(p.id)) {
              seen.add(p.id);
              deduped.push(p);
            }
          }
          setProjects(deduped);
        }

        if (!clientsResult.error) {
          setClients(clientsResult.clients);
        }

        if (!usersResult.error) {
          setUsers(usersResult.users);
        }

        if (!analyticsResult.error) {
          setAnalytics(analyticsResult);
        }
      } catch (err) {
        setError('Failed to load project data');
        console.error('Error loading project data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [refreshTrigger, canManageProjects, currentRole, currentUser]);

  const loadAllProjects = async () => {
    try{
      setLoading(true);
      setError(null);

      const projectsResult = await ProjectService.getAllProjects();;

      if (projectsResult.error) {
        setError(projectsResult.error);
        setProjects([]);
      } else {
        const raw = projectsResult.projects || [];
        const seen = new Set<string>();
        const deduped: typeof raw = [];
        for (const p of raw) {
          if (!p || !p.id) continue;
          if (!seen.has(p.id)) {
            seen.add(p.id);
            deduped.push(p);
          }
        }
        setProjects(deduped);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load project data');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await ProjectService.createProject(projectForm);
      if (result.error) {
        showError(`Error creating project: ${result.error}`);
        return;
      }

      // Add primary manager
      if (result.project) {
        await ProjectService.addUserToProject(
          result.project.id,
          projectForm.primary_manager_id,
          'manager',
          true // isPrimaryManager
        );
      }

      showSuccess('Project created successfully!');
      setActiveTab('overview');
      resetProjectForm();
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      showError('Error creating project');
      console.error('Error creating project:', err);
    }
  };

  const handleDeleteClick = (project: Project) => {
    setDeletingProject(project);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (action: 'soft' | 'hard', reason?: string) => {
    if (!deletingProject) return;

    try {
      if (action === 'soft' && reason) {
        // Soft delete with reason
        const result = await ProjectService.deleteProject(deletingProject.id, reason);
        if (result.error) {
          showError(`Error deleting project: ${result.error}`);
          return;
        }
        showSuccess('Project moved to trash successfully');
      } else if (action === 'hard') {
        // Hard delete (permanent)
        const result = await ProjectService.hardDeleteProject(deletingProject.id);
        if (result.error) {
          showError(`Error permanently deleting project: ${result.error}`);
          return;
        }
        showSuccess('Project permanently deleted');
      }

      // Refresh the projects list
      await loadAllProjects();

      // Close expanded view if this project was expanded
      setExpandedProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(deletingProject.id);
        return newSet;
      });

      setShowDeleteModal(false);
      setDeletingProject(null);
    } catch (error) {
      console.error('Delete project error:', error);
      showError(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProject) return;

    try {
      const result = await ProjectService.updateProject(editingProject.id, projectForm);

      if (result.error) {
        showError(`Error updating project: ${result.error}`);
        return;
      }

      showSuccess('Project updated successfully!');
      setShowEditProject(false);
      setEditingProject(null);
      resetProjectForm();
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error updating project:', err);
      showError('Error updating project');
    }
  };

  const handleProjectExpand = async (project: Project) => {
    const isExpanded = expandedProjects.has(project.id);

    if (isExpanded) {
      setExpandedProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(project.id);
        return newSet;
      });
      setSelectedProject(null);
    } else {
      setExpandedProjects(prev => {
        const newSet = new Set(prev);
        newSet.add(project.id);
        return newSet;
      });
      setSelectedProject(project);
      await Promise.all([loadProjectMembers(project.id), loadProjectTasks(project.id)]);
    }
  };

  const loadProjectMembers = async (projectId: string) => {
    try {
      const result = await ProjectService.getProjectMembers(projectId);
      if (!result.error) {
        setProjectMembersMap(prev => ({ ...prev, [projectId]: result.members }));
        // update focused list if same project
        if (selectedMemberProject?.id === projectId) {
          setProjectMembersList(result.members);
        }
      }
    } catch (err) {
      console.error('Error loading project members:', err);
    }
  };

  const loadProjectTasks = async (projectId: string) => {
    try {
      const result = await ProjectService.getProjectTasks(projectId);
      if (!result.error) {
        setProjectTasks(prev => ({ ...prev, [projectId]: result.tasks || [] }));
      }
    } catch (err) {
      console.error('Error loading project tasks:', err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberProject || !selectedUserId) return;

    try {
      const result = await ProjectService.addUserToProject(
        selectedMemberProject.id,
        selectedUserId,
        selectedRole,
        false // isPrimaryManager
      );

      if (!result.success) {
        showError(`Error adding member: ${result.error || 'Unknown error'}`);
        return;
      }
      showSuccess('Employee added successfully!');
      setShowAddMember(false);
      setSelectedUserId('');
      setSelectedRole('employee');
      await loadProjectMembers(selectedMemberProject.id);
    } catch (err) {
      showError('Error adding member');
      console.error('Error adding member:', err);
    }
  };

  const handleRemoveMember = async (projectId: string, userId: string) => {
    if (confirm('Are you sure you want to remove this member from the project?')) {
      try {
        await ProjectService.removeUserFromProject(projectId, userId);
        showSuccess('Employee removed successfully!');
        await loadProjectMembers(projectId);
      } catch (err) {
        showError('Error removing employee');
        console.error('Error removing employee:', err);
      }
    }
  };

  const handleDeleteTask = async (projectId: string, taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await ProjectService.deleteTask(taskId);
        showSuccess('Task deleted successfully!');
        await loadProjectTasks(projectId);
      } catch (err) {
        showError('Error deleting task');
        console.error('Error deleting task:', err);
      }
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const result = await UserService.getAllUsers();
      setAvailableUsers(result.users.filter((user: User) => user.is_active));
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const openTaskSlideForProject = async (projectId: string, task?: Task | null) => {
    setTaskSlideProjectId(projectId);
    setEditingTask(task || null);
    // load users and project members so Assigned To shows project members first
    await loadAvailableUsers();
    try {
      const membersRes = await ProjectService.getProjectMembers(projectId);
      if (!membersRes.error) {
        setTaskSlideMembers(membersRes.members || []);
      } else {
        setTaskSlideMembers([]);
      }
    } catch (err) {
      console.error('Error loading project members for task slide:', err);
      setTaskSlideMembers([]);
    }
    setShowTaskSlide(true);
  };

  const resetProjectForm = () => {
    setProjectForm({
      name: '',
      client_id: '',
      primary_manager_id: '',
      status: 'active',
      start_date: '',
      end_date: '',
      budget: 0,
      description: '',
      is_billable: true
    });
  };

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get managers for project assignment (manager, management, super_admin)
  const managers = users.filter(user =>
    ['manager', 'management', 'super_admin'].includes(user.role) && user.is_active
  );

  const getManagerDisplayName = (project: Project) => {
    const pm = project.primary_manager_id;
    if (!pm) return 'Unassigned';

    if (typeof pm === 'object' && pm !== null) {
      const managerObj = pm as { full_name?: string; name?: string; _id?: string };
      if (managerObj.full_name) return managerObj.full_name;
      if (managerObj._id && managerObj.name) return managerObj.name;
      return String(pm);
    }

    const manager = users.find(u => {
      const userObj = u as User & { _id?: string };
      return u.id === pm || userObj._id === pm || String(u.id) === String(pm);
    });
    return manager ? manager.full_name : String(pm);
  };

  const getClientName = (project: Project) => {
    const cid = project.client_id;
    if (!cid) return 'No Client';

    if (typeof cid === 'object' && cid !== null) {
      const clientObj = cid as { name?: string; _id?: string };
      if (clientObj.name) return clientObj.name;
      return String(cid);
    }

    const client = clients.find(c => c.id === cid || String(c.id) === String(cid));
    return client ? client.name : String(cid);
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
            onClick={() => setRefreshTrigger(prev => prev + 1)}
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Project Management
              </h1>
              <p className="text-gray-600">Create and manage all projects across the organization</p>
            </div>
            {activeTab === 'overview' && (
              <button
                onClick={() => setActiveTab('create')}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium"
              >
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">New Project</span>
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-2xl shadow-sm p-2">
            <nav className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  <span>Projects ({filteredProjects.length})</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'create'
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Create</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('members')}
                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'members'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Members</span>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'analytics'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

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
              {filteredProjects.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderKanban className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Projects Found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || statusFilter !== 'all' ? 'No projects match your filters.' : 'Get started by creating your first project.'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <button
                      onClick={() => setActiveTab('create')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium inline-flex items-center gap-2"
                    >
                      <Plus className="h-5 w-5" />
                      Create First Project
                    </button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                /* GRID VIEW - Modern Card Design */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => (
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
                            <span className="font-medium">{getClientName(project)}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{getManagerDisplayName(project)}</span>
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
                            onClick={() => {
                              setEditingProject(project);
                              setProjectForm({
                                name: project.name,
                                description: project.description || '',
                                client_id: typeof project.client_id === 'string' ? project.client_id : '',
                                primary_manager_id: typeof project.primary_manager_id === 'string' ? project.primary_manager_id : '',
                                start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
                                end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '',
                                budget: project.budget || 0,
                                status: project.status as 'active' | 'completed' | 'archived',
                                is_billable: project.is_billable ?? true
                              });
                              setShowEditProject(true);
                            }}
                            className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 hover:text-blue-600 transition-all duration-200"
                            title="Edit project"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(project)}
                            className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                            title="Delete project"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Expanded Project Details */}
                        {expandedProjects.has(project.id) && (
                          <div className="mt-6 pt-6 border-t border-gray-100 space-y-4 animate-fadeIn">
                            {/* Members Section */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <Users className="h-4 w-4 text-blue-600" />
                                  Members ({(projectMembersMap[project.id] || []).length})
                                </h4>
                                <button
                                  onClick={() => {
                                    setSelectedMemberProject(project);
                                    loadAvailableUsers();
                                    setShowAddMember(true);
                                  }}
                                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                  Add
                                </button>
                              </div>
                              <div className="space-y-2">
                                {(projectMembersMap[project.id] || []).map((member) => (
                                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
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
                                          onClick={() => handleRemoveMember(project.id, member.user_id)}
                                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                          title="Remove member"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {(projectMembersMap[project.id] || []).length === 0 && (
                                  <p className="text-sm text-gray-500 text-center py-3">No members assigned</p>
                                )}
                              </div>
                            </div>

                            {/* Tasks Section */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <CheckSquare className="h-4 w-4 text-purple-600" />
                                  Tasks ({(projectTasks[project.id] || []).length})
                                </h4>
                                <button
                                  onClick={() => openTaskSlideForProject(project.id, null)}
                                  className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add
                                </button>
                              </div>
                              <div className="space-y-2">
                                {(projectTasks[project.id] || []).map((task) => (
                                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
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
                                        onClick={() => openTaskSlideForProject(project.id, task)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit task"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteTask(project.id, task.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete task"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {(projectTasks[project.id] || []).length === 0 && (
                                  <p className="text-sm text-gray-500 text-center py-3">No tasks created</p>
                                )}
                              </div>
                            </div>
                          </div>
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
                        {filteredProjects.map((project) => (
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
                                  {getClientName(project)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-700">
                                  {getManagerDisplayName(project)}
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
                                    {(projectMembersMap[project.id] || []).length}
                                  </div>
                                  <div className="flex items-center text-gray-600">
                                    <CheckSquare className="h-4 w-4 mr-1" />
                                    {(projectTasks[project.id] || []).length}
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
                                    onClick={() => {
                                      setEditingProject(project);
                                      setProjectForm({
                                        name: project.name,
                                        description: project.description || '',
                                        client_id: typeof project.client_id === 'string' ? project.client_id : '',
                                        primary_manager_id: typeof project.primary_manager_id === 'string' ? project.primary_manager_id : '',
                                        start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
                                        end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '',
                                        budget: project.budget || 0,
                                        status: project.status as 'active' | 'completed' | 'archived',
                                        is_billable: project.is_billable ?? true
                                      });
                                      setShowEditProject(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit project"
                                  >
                                    <Edit className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(project)}
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
                                          onClick={() => {
                                            setSelectedMemberProject(project);
                                            loadAvailableUsers();
                                            setShowAddMember(true);
                                          }}
                                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                        >
                                          <UserPlus className="h-3.5 w-3.5" />
                                          Add
                                        </button>
                                      </div>
                                      <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {(projectMembersMap[project.id] || []).map((member) => (
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
                                        {(projectMembersMap[project.id] || []).length === 0 && (
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
                                          onClick={() => openTaskSlideForProject(project.id, null)}
                                          className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                                        >
                                          <Plus className="h-3.5 w-3.5" />
                                          Add
                                        </button>
                                      </div>
                                      <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {(projectTasks[project.id] || []).map((task) => (
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
                                                onClick={() => openTaskSlideForProject(project.id, task)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit task"
                                              >
                                                <Edit className="h-4 w-4" />
                                              </button>
                                              <button
                                                onClick={() => handleDeleteTask(project.id, task.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete task"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                        {(projectTasks[project.id] || []).length === 0 && (
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

          {/* Task SlideOver for Add/Edit */}
          <TaskSlideOver
            open={showTaskSlide}
            onClose={() => { setShowTaskSlide(false); setTaskSlideProjectId(null); setEditingTask(null); }}
            projectId={taskSlideProjectId || ''}
            task={editingTask}
            members={taskSlideMembers}
            onSaved={async () => {
              // refresh tasks for the active project
              if (taskSlideProjectId) {
                await loadProjectTasks(taskSlideProjectId);
              }
            }}
            onDeleted={async (taskId) => {
              if (taskSlideProjectId) await loadProjectTasks(taskSlideProjectId);
            }}
          />

          {/* CREATE PROJECT TAB - Continues from previous implementation... */}
          {activeTab === 'create' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Project</h2>
              <form onSubmit={handleCreateProject} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Enter project name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Client *
                    </label>
                    <select
                      value={projectForm.client_id}
                      onChange={(e) => setProjectForm({...projectForm, client_id: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    >
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Primary Manager *
                    </label>
                    <select
                      value={projectForm.primary_manager_id}
                      onChange={(e) => setProjectForm({...projectForm, primary_manager_id: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    >
                      <option value="">Select a manager</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={projectForm.status}
                      onChange={(e) => setProjectForm({...projectForm, status: e.target.value as 'active' | 'completed' | 'archived'})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Budget ($)
                    </label>
                    <input
                      type="number"
                      value={projectForm.budget}
                      onChange={(e) => setProjectForm({...projectForm, budget: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="flex items-center pt-8">
                    <input
                      type="checkbox"
                      id="is_billable"
                      checked={projectForm.is_billable}
                      onChange={(e) => setProjectForm({...projectForm, is_billable: e.target.checked})}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="is_billable" className="ml-3 text-sm font-medium text-gray-900 cursor-pointer">
                      Billable Project
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter project description..."
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      resetProjectForm();
                      setActiveTab('overview');
                    }}
                    className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg font-medium flex items-center gap-2 transition-all"
                  >
                    <Save className="h-5 w-5" />
                    <span>Create Project</span>
                  </button>
                </div>
              </form>
            </div>
          )}

{/* MEMBERS TAB */}
{activeTab === 'members' && (
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
            value={selectedMemberProject?.id || ''}
            onChange={(e) => {
              const project = projects.find(p => p.id === e.target.value);
              setSelectedMemberProject(project || null);
              if (project) {
                loadProjectMembers(project.id);
                loadAvailableUsers();
              }
            }}
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
        {selectedMemberProject && (
          <button
            onClick={() => setShowAddMember(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center gap-2 sm:mt-7 transition-all"
          >
            <UserPlus className="h-5 w-5" />
            <span>Add Member</span>
          </button>
        )}
      </div>
    </div>

    {/* Project Members List */}
    {selectedMemberProject && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Members for "{selectedMemberProject.name}"
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {projectMembersList.length} members assigned
            </p>
          </div>
        </div>

        {projectMembersList.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Members Assigned</h4>
            <p className="text-gray-600 mb-6">This project has no members yet.</p>
            <button
              onClick={() => setShowAddMember(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium inline-flex items-center gap-2"
            >
              <UserPlus className="h-5 w-5" />
              Add First Member
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {projectMembersList.map((member) => (
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

                  {!member.is_primary_manager && selectedMemberProject && (
                    <button
                      onClick={() => handleRemoveMember(selectedMemberProject.id, member.user_id)}
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
)}

{/* ANALYTICS TAB */}
{activeTab === 'analytics' && analytics && (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium opacity-90">Total Projects</p>
            <p className="text-3xl font-bold">{analytics.totalProjects}</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Target className="h-6 w-6" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium opacity-90">Active Projects</p>
            <p className="text-3xl font-bold">{analytics.activeProjects}</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <CheckSquare className="h-6 w-6" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium opacity-90">Total Tasks</p>
            <p className="text-3xl font-bold">{analytics.totalTasks}</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Clock className="h-6 w-6" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium opacity-90">Completed Tasks</p>
            <p className="text-3xl font-bold">{analytics.completedTasks}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
        </div>

        {/* Edit Project Modal */}
        {showEditProject && editingProject && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-2xl">
                <h3 className="text-xl font-bold text-gray-900">Edit Project</h3>
                <button
                  onClick={() => {
                    setShowEditProject(false);
                    setEditingProject(null);
                    resetProjectForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditProject} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name</label>
                    <input
                      type="text"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select
                      value={projectForm.status}
                      onChange={(e) => setProjectForm({...projectForm, status: e.target.value as 'active' | 'completed' | 'archived'})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditProject(false);
                      setEditingProject(null);
                      resetProjectForm();
                    }}
                    className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-all"
                  >
                    Update Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMember && selectedMemberProject && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Add Project Member</h3>
                <button
                  onClick={() => setShowAddMember(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="p-6 space-y-4">
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
                    {(() => {
                      const existing = new Set(projectMembersList.map((m) => m.user_id));
                      return availableUsers
                        .filter((user) => !existing.has(user.id))
                        .filter((user) => {
                          if (selectedRole === 'employee') return user.role === 'employee';
                          if (selectedRole === 'lead') return user.role === 'lead';
                          return false;
                        })
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
                          </option>
                        ));
                    })()}
                  </select>
                  {(() => {
                    const existing = new Set(projectMembersList.map((m) => m.user_id));
                    const count = availableUsers.filter((user) => !existing.has(user.id)).filter((user) => selectedRole === 'employee' ? user.role === 'employee' : user.role === 'lead').length;
                    if (count === 0) {
                      return (
                        <p className="text-sm text-gray-500 mt-2">
                          No {selectedRole === 'employee' ? 'employees' : 'leads'} available to assign.
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddMember(false)}
                    className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-all"
                  >
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
