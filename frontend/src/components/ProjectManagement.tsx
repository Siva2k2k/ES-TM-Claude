import React, { useState, useEffect } from 'react';
import { useRoleManager } from '../hooks/useRoleManager';
import { useAuth } from '../store/contexts/AuthContext';
import { ProjectService } from '../services/ProjectService';
import { UserService } from '../services/UserService';
import { 
  Building2, 
  Plus, 
  BarChart3, 
  Shield, 
  Calendar, 
  Target, 
  Clock, 
  CheckCircle, 
  Edit,
  X,
  Save,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Eye,
  UserPlus
} from 'lucide-react';
import type { Project, Client, User, Task } from '../types';

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

export const ProjectManagement: React.FC = () => {
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
  
  // State for employee/lead view
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [userLoading, setUserLoading] = useState(true);

  // Form states
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  // store tasks keyed by project id so multiple expanded projects render correct tasks
  const [projectTasks, setProjectTasks] = useState<Record<string, Task[]>>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  // Member management states
  const [projectMembersList, setProjectMembersList] = useState<{
    id: string;
    user_id: string;
    project_role: string;
    is_primary_manager: boolean;
    is_secondary_manager: boolean;
    user_name: string;
    user_email: string;
  }[]>([]);
  const [selectedMemberProject, setSelectedMemberProject] = useState<Project | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('employee');

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

  const [taskForm, setTaskForm] = useState<TaskFormData>({
    name: '',
    description: '',
    assigned_to_user_id: '',
    status: 'open',
    estimated_hours: 0,
    is_billable: true
  });

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('all');

  // Get the actual user role (includes employee and lead)
  const actualUserRole = currentUser?.role;

  // Load data for employee/lead view
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser || canManageProjects()) return; // Skip if admin or manager
      
      try {
        setUserLoading(true);
        
        if (actualUserRole === 'employee') {
          const [userProjectsData, userTasksData] = await Promise.all([
            ProjectService.getUserProjects(currentUser.id),
            ProjectService.getUserTasks(currentUser.id)
          ]);
          setUserProjects(userProjectsData.projects || []);
          setUserTasks(userTasksData.tasks || []);
        } else if (actualUserRole === 'lead') {
          const [userProjectsData, leadTasksData] = await Promise.all([
            ProjectService.getUserProjects(currentUser.id),
            ProjectService.getLeadTasks(currentUser.id)
          ]);
          setUserProjects(userProjectsData.projects || []);
          setUserTasks(leadTasksData.tasks || []);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load your projects and tasks');
      } finally {
        setUserLoading(false);
      }
    };

    loadUserData();
  }, [currentUser, actualUserRole, canManageProjects]);

  // Load initial data for management view
  useEffect(() => {
    const loadData = async () => {
      if (!canManageProjects()) return;

      setLoading(true);
      setError(null);

      try {
        // For "manager" role prefer user-scoped projects (use currentUser.id).
        // For other management roles, load all projects.
        const projectsPromise = (currentRole === 'manager' && currentUser?.id)
          ? ProjectService.getUserProjects(currentUser.id)
          : ProjectService.getAllProjects();

        const [projectsResult, clientsResult, usersResult, analyticsResult] = await Promise.all([
          projectsPromise,
          ProjectService.getAllClients(),
          UserService.getAllUsers(),
          ProjectService.getProjectAnalytics()
        ] as const);

        // Projects endpoint (especially project_members join) can return duplicate project rows
        // when a project has multiple members. Deduplicate by id to avoid repeated rendering
        // and React key conflicts.
        if (projectsResult.error) {
          setError(projectsResult.error);
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await ProjectService.createProject(projectForm);
      if (result.error) {
        alert(`Error creating project: ${result.error}`);
        return;
      }

      // Add project members
      if (result.project) {
        // Add primary manager
        await ProjectService.addUserToProject(
          result.project.id,
          projectForm.primary_manager_id,
          'manager',
          true, // isPrimaryManager
          false // isSecondaryManager
        );
      }

      alert('Project created successfully!');
      setActiveTab('overview');
      resetProjectForm();
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      alert('Error creating project');
      console.error('Error creating project:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProject) return;

    try {
      const result = await ProjectService.createTask({
        project_id: selectedProject.id,
        name: taskForm.name,
        description: taskForm.description,
        assigned_to_user_id: taskForm.assigned_to_user_id || undefined,
        status: taskForm.status,
        estimated_hours: taskForm.estimated_hours,
        is_billable: taskForm.is_billable,
        created_by_user_id: '' // Will be set by RLS
      });

      if (result.error) {
        alert(`Error creating task: ${result.error}`);
        return;
      }

      alert('Task created successfully!');
      setShowCreateTask(false);
      resetTaskForm();
      await loadProjectTasks(selectedProject.id);
    } catch (err) {
      alert('Error creating task');
      console.error('Error creating task:', err);
    }
  };

  const loadProjectTasks = async (projectId: string) => {
    try {
      const result = await ProjectService.getProjectTasks(projectId);
      if (!result.error) {
  setProjectTasks(prev => ({ ...prev, [projectId]: result.tasks }));
      }
    } catch (err) {
      console.error('Error loading project tasks:', err);
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
      // remove tasks for this project from the map
      setProjectTasks(prev => {
        const copy = { ...prev };
        delete copy[project.id];
        return copy;
      });
    } else {
      setExpandedProjects(prev => {
        const newSet = new Set(prev);
        newSet.add(project.id);
        return newSet;
      });
      setSelectedProject(project);
  await loadProjectTasks(project.id);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const result = await ProjectService.updateTask(taskId, { status: newStatus });
      if (result.success) {
        // Refresh tasks for current project
        if (selectedProject) {
          await loadProjectTasks(selectedProject.id);
        }
      } else {
        alert(`Error updating task: ${result.error}`);
      }
    } catch (err) {
      alert('Error updating task status');
      console.error('Error updating task status:', err);
    }
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

  const resetTaskForm = () => {
    setTaskForm({
      name: '',
      description: '',
      assigned_to_user_id: '',
      status: 'open',
      estimated_hours: 0,
      is_billable: true
    });
  };

  // Load project members
  const loadProjectMembers = async (projectId: string) => {
    try {
      const result = await ProjectService.getProjectMembers(projectId);
      if (!result.error) {
        setProjectMembersList(result.members);
      }
    } catch (err) {
      console.error('Error loading project members:', err);
    }
  };

  // Handle edit project form submission
  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProject) return;

    try {
      const result = await ProjectService.updateProject(editingProject.id, projectForm);
      if (result.error) {
        alert(`Error updating project: ${result.error}`);
        return;
      }

      alert('Project updated successfully!');
      setShowEditProject(false);
      setEditingProject(null);
      resetProjectForm();
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      alert('Error updating project');
      console.error('Error updating project:', err);
    }
  };

  // Handle edit task form submission
  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTask) return;

    try {
      const result = await ProjectService.updateTask(editingTask.id, {
        name: taskForm.name,
        description: taskForm.description,
        assigned_to_user_id: taskForm.assigned_to_user_id || undefined,
        status: taskForm.status,
        estimated_hours: taskForm.estimated_hours,
        is_billable: taskForm.is_billable
      });

      if (!result.success) {
        alert(`Error updating task: ${result.error}`);
        return;
      }

      alert('Task updated successfully!');
      setShowEditTask(false);
      setEditingTask(null);
      resetTaskForm();
      if (selectedProject) {
        await loadProjectTasks(selectedProject.id);
      }
    } catch (err) {
      alert('Error updating task');
      console.error('Error updating task:', err);
    }
  };

  // Add member handler
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberProject || !selectedUserId) return;

    try {
      await ProjectService.addProjectMember(selectedMemberProject.id, selectedUserId, selectedRole);
      alert('Employee added successfully!');
      setShowAddMember(false);
      setSelectedUserId('');
      setSelectedRole('employee');
      await loadProjectMembers(selectedMemberProject.id);
    } catch (err) {
      alert('Error adding member');
      console.error('Error adding member:', err);
    }
  };

  // Remove member handler
  const handleRemoveMember = async (userId: string) => {
    if (!selectedMemberProject) return;
    
    if (confirm('Are you sure you want to remove this member from the project?')) {
      try {
        await ProjectService.removeProjectMember(selectedMemberProject.id, userId);
        alert('Employee removed successfully!');
        await loadProjectMembers(selectedMemberProject.id);
      } catch (err) {
        alert('Error removing employee');
        console.error('Error removing employee:', err);
      }
    }
  };

  // Load available users for adding members
  const loadAvailableUsers = async () => {
    try {
      const result = await UserService.getAllUsers();
      setAvailableUsers(result.users.filter((user: User) => user.is_active));
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get managers for project assignment
  const managers = users.filter(user => user.role === 'manager' && user.is_active);
  const projectMembers = users.filter(user => 
    ['manager', 'lead', 'employee'].includes(user.role) && user.is_active
  );

  // Access control
  if (!canManageProjects() && actualUserRole !== 'employee' && actualUserRole !== 'lead') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access Project Management.</p>
        </div>
      </div>
    );
  }

  // Loading state for employee/lead
  if ((actualUserRole === 'employee' || actualUserRole === 'lead') && userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your projects and tasks...</p>
        </div>
      </div>
    );
  }

  // Loading state for management
  if (canManageProjects() && loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Project Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {actualUserRole === 'employee' || actualUserRole === 'lead' 
              ? 'My Projects & Tasks' 
              : 'Project Management'
            }
          </h1>
          <p className="text-gray-600">
            {actualUserRole === 'employee' 
              ? 'View your assigned projects and tasks'
              : actualUserRole === 'lead'
              ? 'Manage your assigned projects and lead tasks'
              : currentRole === 'management' 
              ? 'Create and manage all projects across the organization'
              : 'Manage your assigned projects and team tasks'
            }
          </p>

          {/* Navigation Tabs - Only show for management */}
          {canManageProjects() && (
            <div className="mt-6">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Project Overview ({filteredProjects.length})
                </button>
                
                {currentRole === 'management' && (
                  <>
                    <button
                      onClick={() => setActiveTab('create')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'create'
                          ? 'border-green-500 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Create Project
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('members')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'members'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Member Management
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'analytics'
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Analytics
                    </button>
                  </>
                )}
              </nav>
            </div>
          )}
        </div>

        {/* Employee/Lead View */}
        {(actualUserRole === 'employee' || actualUserRole === 'lead') && (
          <div className="space-y-8">
            {/* Projects Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                My Projects ({userProjects.length})
              </h2>
              {userProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userProjects.map((project) => (
                    <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          project.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : project.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.description}</p>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-2" />
                          {project.start_date && new Date(project.start_date).toLocaleDateString()}
                          {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString()}`}
                        </div>
                        {project.is_billable && (
                          <div className="flex items-center text-sm text-green-600">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Billable Project
                          </div>
                        )}
                        <hr />
                        <div>
                          <h4 className="text-md font-semibold text-gray-900">
                            Tasks ({userTasks.filter((task) => task.project_id === project.id).length})
                          </h4>
                          {userTasks.filter((task) => task.project_id === project.id).length > 0 ? (
                            <div className='mt-3 space-y-1'>
                              {userTasks.filter((task) => task.project_id === project.id).map((task) => (
                                <div key={task.id} className="text-sm font-light text-gray-600 flex items-center justify-between">
                                  <span>{task.name}</span>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    task.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : task.status === 'in_progress'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {task.status.replace('_', ' ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ):(
                            <div className="mt-3 text-sm font-light text-gray-600">No Tasks available</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Assigned</h3>
                  <p className="text-gray-600">You don't have any projects assigned to you yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Management View */}
        {canManageProjects() && (
          <div className="space-y-6">
            {/* Analytics Tab */}
            {activeTab === 'analytics' && analytics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Projects</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.totalProjects}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Target className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Projects</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.activeProjects}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <CheckSquare className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.totalTasks}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.budgetUtilization.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Performance</h3>
                  <div className="space-y-4">
                    {projects.slice(0, 5).map(project => (
                      <div key={project.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">{project.name}</h4>
                          <p className="text-sm text-gray-600">{project.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {project.budget ? `$${project.budget.toLocaleString()}` : 'No budget set'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(project.start_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Create Project Tab */}
            {activeTab === 'create' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Create New Project</h3>
                
                <form onSubmit={handleCreateProject} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter project name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client *
                      </label>
                      <select
                        required
                        value={projectForm.client_id}
                        onChange={(e) => setProjectForm({...projectForm, client_id: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select a client</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Manager *
                      </label>
                      <select
                        required
                        value={projectForm.primary_manager_id}
                        onChange={(e) => setProjectForm({...projectForm, primary_manager_id: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select a manager</option>
                        {managers.map(manager => (
                          <option key={manager.id} value={manager.id}>
                            {manager.full_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={projectForm.status}
                        onChange={(e) => setProjectForm({...projectForm, status: e.target.value as 'active' | 'completed' | 'archived'})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={projectForm.start_date}
                        onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={projectForm.end_date}
                        onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Budget ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={projectForm.budget}
                        onChange={(e) => setProjectForm({...projectForm, budget: parseFloat(e.target.value) || 0})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={projectForm.is_billable}
                          onChange={(e) => setProjectForm({...projectForm, is_billable: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Billable Project</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter project description"
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('overview');
                        resetProjectForm();
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Create Project
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Member Management Tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Member Management</h3>
                  
                  {/* Project Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Project
                    </label>
                    <select
                      value={selectedMemberProject?.id || ''}
                      onChange={(e) => {
                        const project = projects.find(p => p.id === e.target.value);
                        setSelectedMemberProject(project || null);
                        if (project) {
                          loadProjectMembers(project.id);
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Choose a project...</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedMemberProject && (
                    <div className="space-y-6">
                      {/* Project Info */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">{selectedMemberProject.name}</h4>
                        <p className="text-sm text-gray-600">{selectedMemberProject.description}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span>Status: <span className="font-medium">{selectedMemberProject.status}</span></span>
                          {selectedMemberProject.budget && (
                            <span>Budget: <span className="font-medium">${selectedMemberProject.budget.toLocaleString()}</span></span>
                          )}
                        </div>
                      </div>

                      {/* Current Members */}
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium text-gray-900">Current Members</h4>
                          <button
                            onClick={() => {
                              loadAvailableUsers();
                              setShowAddMember(true);
                            }}
                            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Member
                          </button>
                        </div>
                        
                        {projectMembersList.length > 0 ? (
                          <div className="space-y-3">
                            {projectMembersList.map((member) => (
                              <div key={member.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <h5 className="font-medium text-gray-900">{member.user_name}</h5>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      member.project_role === 'manager' 
                                        ? 'bg-blue-100 text-blue-800'
                                        : member.project_role === 'lead'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {member.project_role}
                                    </span>
                                    {member.is_primary_manager && (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                        Primary Manager
                                      </span>
                                    )}
                                    {member.is_secondary_manager && (
                                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                        Secondary Manager
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{member.user_email}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleRemoveMember(member.user_id)}
                                    className="text-red-600 hover:text-red-900 p-1"
                                    title="Remove member"
                                    disabled={member.is_primary_manager}
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No members assigned</p>
                            <p>Add team members to this project</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Analytics Cards */}
                {analytics && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Projects</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.totalProjects}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Target className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Active Projects</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.activeProjects}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <CheckSquare className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.totalTasks}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <BarChart3 className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                          <p className="text-2xl font-bold text-gray-900">{analytics.budgetUtilization.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="flex flex-wrap gap-4">
                    {currentRole === 'management' && (
                      <button 
                        onClick={() => setActiveTab('create')}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Project
                      </button>
                    )}
                    
                    <button 
                      onClick={() => setActiveTab('analytics')}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Analytics
                    </button>

                    {selectedProject && (
                      <button 
                        onClick={() => setShowCreateTask(true)}
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Add Task to {selectedProject.name}
                      </button>
                    )}
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search projects..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div className="relative">
                      <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'completed' | 'archived')}
                        className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Projects List */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Projects ({filteredProjects.length})
                    </h3>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {filteredProjects.map((project) => (
                      <div key={project.id} className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <button
                              onClick={() => handleProjectExpand(project)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {expandedProjects.has(project.id) ? (
                                <ChevronDown className="w-5 h-5" />
                              ) : (
                                <ChevronRight className="w-5 h-5" />
                              )}
                            </button>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-900">{project.name}</h4>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  project.status === 'active' 
                                    ? 'bg-green-100 text-green-800'
                                    : project.status === 'completed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {project.status}
                                </span>
                                {project.is_billable && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                    Billable
                                  </span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Start:</span> {new Date(project.start_date).toLocaleDateString()}
                                </div>
                                {project.end_date && (
                                  <div>
                                    <span className="font-medium">End:</span> {new Date(project.end_date).toLocaleDateString()}
                                  </div>
                                )}
                                {project.budget && (
                                  <div>
                                    <span className="font-medium">Budget:</span> ${project.budget.toLocaleString()}
                                  </div>
                                )}
                              </div>
                              
                              {project.description && (
                                <p className="text-gray-600 mt-2">{project.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleProjectExpand(project)}
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View project details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {currentRole === 'management' && (
                              <button
                                onClick={() => {
                                  setEditingProject(project);
                                  setProjectForm({
                                    name: project.name,
                                    client_id: project.client_id,
                                    primary_manager_id: project.primary_manager_id,
                                    status: project.status,
                                    start_date: project.start_date,
                                    end_date: project.end_date || '',
                                    budget: project.budget || 0,
                                    description: project.description || '',
                                    is_billable: project.is_billable ?? true
                                  });
                                  setShowEditProject(true);
                                }}
                                className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edit project"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded Project Details */}
                        {expandedProjects.has(project.id) && (
                          <div className="mt-6 ml-9 space-y-6">
                            {/* Project Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center">
                                  <CheckSquare className="h-5 w-5 text-blue-600 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                                    <p className="text-lg font-bold text-gray-900">{(projectTasks[project.id] || []).length}</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-green-50 p-4 rounded-lg">
                                <div className="flex items-center">
                                  <Target className="h-5 w-5 text-green-600 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-600">Completed</p>
                                    <p className="text-lg font-bold text-gray-900">
                                      {(projectTasks[project.id] || []).filter(t => t.status === 'completed').length}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="bg-yellow-50 p-4 rounded-lg">
                                <div className="flex items-center">
                                  <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-600">In Progress</p>
                                    <p className="text-lg font-bold text-gray-900">
                                      {(projectTasks[project.id] || []).filter(t => t.status === 'in_progress').length}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Tasks List */}
                            <div>
                              <div className="flex justify-between items-center mb-4">
                                <h5 className="font-semibold text-gray-900">Project Tasks</h5>
                                <button 
                                  onClick={() => setShowCreateTask(true)}
                                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Task
                                </button>
                              </div>
                              
                              {(projectTasks[project.id] || []).length > 0 ? (
                                <div className="space-y-3">
                                  {(projectTasks[project.id] || []).map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-1">
                                          <h6 className="font-medium text-gray-900">{task.name}</h6>
                                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            task.status === 'completed' 
                                              ? 'bg-green-100 text-green-800'
                                              : task.status === 'in_progress'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-gray-100 text-gray-800'
                                          }`}>
                                            {task.status.replace('_', ' ')}
                                          </span>
                                        </div>
                                        {task.description && (
                                          <p className="text-sm text-gray-600">{task.description}</p>
                                        )}
                                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                                          {task.estimated_hours && (
                                            <span className="flex items-center">
                                              <Clock className="w-3 h-3 mr-1" />
                                              {task.estimated_hours}h estimated
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center space-x-2">
                                        {task.status !== 'completed' && (
                                          <button
                                            onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                            className="text-green-600 hover:text-green-900 p-1"
                                            title="Mark as completed"
                                          >
                                            <CheckCircle className="h-4 w-4" />
                                          </button>
                                        )}
                                        
                                        <button
                                          onClick={() => {
                                            setEditingTask(task);
                                            setTaskForm({
                                              name: task.name,
                                              description: task.description || '',
                                              assigned_to_user_id: task.assigned_to_user_id || '',
                                              status: task.status,
                                              estimated_hours: task.estimated_hours || 0,
                                              is_billable: task.is_billable ?? true
                                            });
                                            setShowEditTask(true);
                                          }}
                                          className="text-blue-600 hover:text-blue-900 p-1"
                                          title="Edit task"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                  <p className="text-lg font-medium">No tasks yet</p>
                                  <p>Create the first task for this project</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {filteredProjects.length === 0 && (
                      <div className="p-12 text-center">
                        <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
                        <p className="text-gray-600 mb-6">
                          {searchTerm || statusFilter !== 'all'
                            ? 'Try adjusting your search or filters.'
                            : currentRole === 'management'
                            ? 'Create your first project to get started.'
                            : 'No projects have been assigned to you yet.'}
                        </p>
                        {currentRole === 'management' && (
                          <button 
                            onClick={() => setActiveTab('create')}
                            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Project
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateTask && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Create Task for {selectedProject.name}
                </h3>
                <button
                  onClick={() => setShowCreateTask(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskForm.name}
                    onChange={(e) => setTaskForm({...taskForm, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To
                  </label>
                  <select
                    value={taskForm.assigned_to_user_id}
                    onChange={(e) => setTaskForm({...taskForm, assigned_to_user_id: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {projectMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={taskForm.estimated_hours}
                      onChange={(e) => setTaskForm({...taskForm, estimated_hours: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({...taskForm, status: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={taskForm.is_billable}
                      onChange={(e) => setTaskForm({...taskForm, is_billable: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Billable Task</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTask(false);
                      resetTaskForm();
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {showEditProject && editingProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit Project: {editingProject.name}
                </h3>
                <button
                  onClick={() => {
                    setShowEditProject(false);
                    setEditingProject(null);
                    resetProjectForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleEditProject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client *
                    </label>
                    <select
                      required
                      value={projectForm.client_id}
                      onChange={(e) => setProjectForm({...projectForm, client_id: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={projectForm.status}
                      onChange={(e) => setProjectForm({...projectForm, status: e.target.value as 'active' | 'completed' | 'archived'})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Budget ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={projectForm.budget}
                      onChange={(e) => setProjectForm({...projectForm, budget: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditProject(false);
                      setEditingProject(null);
                      resetProjectForm();
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Update Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {showEditTask && editingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit Task: {editingTask.name}
                </h3>
                <button
                  onClick={() => {
                    setShowEditTask(false);
                    setEditingTask(null);
                    resetTaskForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleEditTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskForm.name}
                    onChange={(e) => setTaskForm({...taskForm, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To
                  </label>
                  <select
                    value={taskForm.assigned_to_user_id}
                    onChange={(e) => setTaskForm({...taskForm, assigned_to_user_id: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {projectMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={taskForm.estimated_hours}
                      onChange={(e) => setTaskForm({...taskForm, estimated_hours: parseFloat(e.target.value) || 0})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({...taskForm, status: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={taskForm.is_billable}
                      onChange={(e) => setTaskForm({...taskForm, is_billable: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Billable Task</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditTask(false);
                      setEditingTask(null);
                      resetTaskForm();
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Update Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMember && selectedMemberProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Member to {selectedMemberProject.name}</h3>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setSelectedUserId('');
                    setSelectedRole('employee');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select User
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Choose a user...</option>
                    {availableUsers
                      .filter(user => !projectMembersList.some(member => member.user_id === user.id))
                      .map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.email}) - {user.role}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="employee">Employee</option>
                    <option value="lead">Project Lead</option>
                    <option value="manager">Secondary Manager</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMember(false);
                      setSelectedUserId('');
                      setSelectedRole('member');
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                    disabled={!selectedUserId}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};