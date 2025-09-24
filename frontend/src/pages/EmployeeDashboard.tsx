import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/contexts/AuthContext';
import { ProjectService } from '../services/ProjectService';
import { TimesheetService } from '../services/TimesheetService';
import { 
  Building2, 
  CheckSquare, 
  Clock, 
  Calendar, 
  Users, 
  Target,
  Play,
  Pause,
  Plus,
  Edit,
  Eye,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  DollarSign,
  User,
  FileText,
  Activity,
  Timer,
  BarChart3,
  TrendingUp,
  X
} from 'lucide-react';
import type { Project, Task, User as UserType, TimeEntry } from '../types';

interface EmployeeDashboardProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

interface TaskWithProject extends Task {
  project?: Project;
  project_name?: string;
  client_name?: string;
}

interface ProjectWithTasks extends Project {
  tasks: Task[];
  client_name?: string;
  manager_name?: string;
  task_stats: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ activeSection, setActiveSection }) => {
  const { currentUser, currentUserRole } = useAuth();
  
  // State management
  const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Load data based on active section
  useEffect(() => {
    loadData();
  }, [activeSection, currentUser, refreshTrigger]);

  const loadData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (activeSection === 'projects') {
        await loadProjects();
      } else if (activeSection === 'tasks') {
        await loadTasks();
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    if (!currentUser) return;
    
    try {
      console.log('🔍 Loading projects for user:', currentUser.id);
      
      const result = await ProjectService.getUserProjects(currentUser.id);
      
      if (result.error) {
        setError(result.error);
        return;
      }

      console.log('📋 Projects loaded:', result.projects);

      // Enhance projects with tasks and stats
      const enhancedProjects: ProjectWithTasks[] = [];
      
      for (const project of result.projects) {
        console.log(`🔍 Loading tasks for project: ${project.name} (${project.id})`);
        
        const tasksResult = await ProjectService.getProjectTasks(project.id);
        
        if (tasksResult.error) {
          console.error(`Error loading tasks for project ${project.id}:`, tasksResult.error);
        }
        
        const projectTasks = tasksResult.tasks || [];
        console.log(`📋 Tasks loaded for ${project.name}:`, projectTasks.length);
        
        const taskStats = {
          total: projectTasks.length,
          pending: projectTasks.filter(t => t.status === 'open' || t.status === 'pending').length,
          in_progress: projectTasks.filter(t => t.status === 'in_progress').length,
          completed: projectTasks.filter(t => t.status === 'completed').length
        };

        enhancedProjects.push({
          ...project,
          tasks: projectTasks,
          task_stats: taskStats
        });
      }

      console.log('✅ Enhanced projects with tasks:', enhancedProjects);
      setProjects(enhancedProjects);
    } catch (error) {
      console.error('Error in loadProjects:', error);
      setError('Failed to load projects');
    }
  };

  const loadTasks = async () => {
    if (!currentUser) return;
    
    try {
      console.log('🔍 Loading tasks for user:', currentUser.id);
      
      let result;
      
      if (currentUserRole === 'lead') {
        // Lead can see all tasks in their projects
        result = await ProjectService.getLeadTasks(currentUser.id);
      } else {
        // Employee sees only their assigned tasks
        result = await ProjectService.getUserTasks(currentUser.id);
      }
      
      if (result.error) {
        setError(result.error);
        return;
      }

      console.log('📋 Tasks loaded:', result.tasks);
      setTasks(result.tasks as TaskWithProject[]);
    } catch (error) {
      console.error('Error in loadTasks:', error);
      setError('Failed to load tasks');
    }
  };

  const handleTaskStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      console.log(`🔄 Updating task ${taskId} status to: ${newStatus}`);
      
      const result = await ProjectService.updateTask(taskId, { status: newStatus });
      
      if (result.error) {
        alert(`Error updating task: ${result.error}`);
        return;
      }

      console.log('✅ Task status updated successfully');
      
      // Refresh data to show changes
      setRefreshTrigger(prev => prev + 1);
      
      // Show success message
      alert(`Task status updated to: ${newStatus}`);
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status');
    }
  };

  const handleStartTimer = (taskId: string) => {
    if (activeTimer && activeTimer !== taskId) {
      // Stop current timer first
      setActiveTimer(null);
      setTimerSeconds(0);
    }
    
    if (activeTimer === taskId) {
      // Stop timer
      setActiveTimer(null);
      setTimerSeconds(0);
      console.log(`⏹️ Timer stopped for task: ${taskId}`);
    } else {
      // Start timer
      setActiveTimer(taskId);
      setTimerSeconds(0);
      console.log(`▶️ Timer started for task: ${taskId}`);
    }
  };

  const handleLogTime = async (taskId: string, hours: number) => {
    try {
      console.log(`⏰ Logging ${hours} hours for task: ${taskId}`);
      
      // Find the task to get project info
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        alert('Task not found');
        return;
      }

      // Create or get current week's timesheet
      const today = new Date();
      const weekStart = new Date(today.setDate(today.getDate() - today.getDay() + 1));
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      console.log(`📅 Getting/creating timesheet for week: ${weekStartStr}`);
      
      let timesheet = await TimesheetService.getTimesheetByUserAndWeek(currentUser!.id, weekStartStr);
      
      if (!timesheet.timesheet) {
        console.log('📝 Creating new timesheet for current week');
        const createResult = await TimesheetService.createTimesheet(currentUser!.id, weekStartStr);
        if (createResult.error) {
          alert(`Error creating timesheet: ${createResult.error}`);
          return;
        }
        timesheet.timesheet = createResult.timesheet!;
      }

      // Add time entry
      const entryResult = await TimesheetService.addTimeEntry(timesheet.timesheet!.id, {
        project_id: task.project_id,
        task_id: taskId,
        date: new Date().toISOString().split('T')[0],
        hours,
        description: `Work on ${task.name}`,
        is_billable: task.is_billable ?? true,
        entry_type: 'project_task'
      });

      if (entryResult.error) {
        alert(`Error logging time: ${entryResult.error}`);
        return;
      }

      console.log('✅ Time logged successfully');
      alert(`Successfully logged ${hours} hours for "${task.name}"`);
      
      // Stop timer if it was running
      if (activeTimer === taskId) {
        setActiveTimer(null);
        setTimerSeconds(0);
      }
    } catch (error) {
      console.error('Error logging time:', error);
      alert('Failed to log time');
    }
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const viewTaskDetails = (task: TaskWithProject) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTaskStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
      case 'open':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {activeSection === 'projects' ? 'projects' : 'tasks'}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
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

  // Render My Projects Tab
  if (activeSection === 'projects') {
    const totalTasks = projects.reduce((sum, p) => sum + p.task_stats.total, 0);
    const completedTasks = projects.reduce((sum, p) => sum + p.task_stats.completed, 0);
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
            <p className="text-gray-600 mt-1">
              {currentUserRole === 'lead' 
                ? 'Projects you lead and coordinate'
                : 'Projects you are assigned to'
              }
            </p>
          </div>
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <Activity className="w-5 h-5" />
          </button>
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
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
                <p className="text-2xl font-bold text-gray-900">
                  {projects.filter(p => p.status === 'active').length}
                </p>
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
                <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion</p>
                <p className="text-2xl font-bold text-gray-900">{completionRate.toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          {projects.map((project) => {
            const isExpanded = expandedProjects.has(project.id);
            const progressPercentage = project.task_stats.total > 0 
              ? (project.task_stats.completed / project.task_stats.total) * 100 
              : 0;

            return (
              <div key={project.id} className="bg-white rounded-lg shadow border border-gray-200">
                {/* Project Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <button
                        onClick={() => toggleProjectExpansion(project.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getProjectStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Building2 className="w-4 h-4 mr-1" />
                            {project.client_name || 'Unknown Client'}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(project.start_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <CheckSquare className="w-4 h-4 mr-1" />
                            {project.task_stats.total} tasks
                          </span>
                          {currentUserRole === 'lead' && project.budget && (
                            <span className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              ${project.budget.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {project.task_stats.completed}/{project.task_stats.total} completed
                      </div>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Project Description */}
                  {project.description && (
                    <div className="mt-4 text-sm text-gray-600">
                      {project.description}
                    </div>
                  )}
                </div>

                {/* Expanded Project Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Project Info */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Project Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Start Date:</span>
                            <span className="text-gray-900">{new Date(project.start_date).toLocaleDateString()}</span>
                          </div>
                          {project.end_date && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">End Date:</span>
                              <span className="text-gray-900">{new Date(project.end_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {currentUserRole === 'lead' && project.budget && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Budget:</span>
                              <span className="text-gray-900">${project.budget.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Billable:</span>
                            <span className="text-gray-900">{project.is_billable ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Task Stats */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Task Overview</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Pending</span>
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
                              {project.task_stats.pending}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">In Progress</span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                              {project.task_stats.in_progress}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Completed</span>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                              {project.task_stats.completed}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
                        <div className="space-y-2">
                          <button 
                            onClick={() => {
                              setActiveSection('tasks');
                              // Filter tasks for this project
                            }}
                            className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            View All Tasks
                          </button>
                          <button 
                            onClick={() => {
                              setActiveSection('timesheet');
                              // Navigate to timesheet with project filter
                            }}
                            className="w-full text-left px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            Log Time
                          </button>
                          {currentUserRole === 'lead' && (
                            <button className="w-full text-left px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                              Manage Team
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Project Tasks */}
                    {project.tasks.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          {currentUserRole === 'employee' ? 'My Tasks' : 'Project Tasks'} ({project.tasks.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {project.tasks
                            .filter(task => currentUserRole === 'lead' || task.assigned_to_user_id === currentUser?.id)
                            .slice(0, 6)
                            .map((task) => (
                            <div key={task.id} className="bg-white p-4 rounded-lg border border-gray-200">
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="font-medium text-gray-900 text-sm">{task.name}</h5>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTaskStatusColor(task.status)}`}>
                                  {task.status}
                                </span>
                              </div>
                              
                              {task.description && (
                                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                              )}
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  {task.estimated_hours && (
                                    <span className="flex items-center">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {task.estimated_hours}h
                                    </span>
                                  )}
                                  {task.is_billable && (
                                    <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded text-xs">
                                      Billable
                                    </span>
                                  )}
                                </div>
                                
                                <button
                                  onClick={() => viewTaskDetails({ ...task, project })}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {project.tasks.length > 6 && (
                          <div className="mt-4 text-center">
                            <button 
                              onClick={() => setActiveSection('tasks')}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View all {project.tasks.length} tasks →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Assigned</h3>
              <p className="text-gray-600">
                You are not currently assigned to any projects. Contact your manager for project assignments.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render My Tasks Tab
  if (activeSection === 'tasks') {
    const myTasks = tasks.filter(task => task.assigned_to_user_id === currentUser?.id);
    const teamTasks = currentUserRole === 'lead' ? tasks.filter(task => task.assigned_to_user_id !== currentUser?.id) : [];
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>
            <p className="text-gray-600 mt-1">
              {currentUserRole === 'lead' 
                ? 'Tasks assigned to you and your team'
                : 'Tasks assigned to you across all projects'
              }
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {activeTimer && (
              <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg flex items-center space-x-2">
                <Timer className="w-4 h-4" />
                <span className="font-mono text-sm">{formatTime(timerSeconds)}</span>
              </div>
            )}
            <button 
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <Activity className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{myTasks.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {myTasks.filter(t => t.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {myTasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          {currentUserRole === 'lead' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Team Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{teamTasks.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* My Tasks Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              My Tasks ({myTasks.length})
            </h3>
          </div>
          
          <div className="p-6">
            {myTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTasks.map((task) => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-gray-900 text-sm">{task.name}</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTaskStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span className="flex items-center">
                        <Building2 className="w-3 h-3 mr-1" />
                        {task.project_name || 'Unknown Project'}
                      </span>
                      {task.estimated_hours && (
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {task.estimated_hours}h
                        </span>
                      )}
                    </div>

                    {/* Task Actions */}
                    <div className="flex items-center space-x-2">
                      {task.status !== 'completed' && (
                        <>
                          <button
                            onClick={() => handleStartTimer(task.id)}
                            className={`flex items-center px-2 py-1 text-xs rounded transition-colors ${
                              activeTimer === task.id
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {activeTimer === task.id ? (
                              <>
                                <Pause className="w-3 h-3 mr-1" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 mr-1" />
                                Start
                              </>
                            )}
                          </button>
                          
                          {task.status === 'open' && (
                            <button
                              onClick={() => handleTaskStatusUpdate(task.id, 'in_progress')}
                              className="flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              Start Work
                            </button>
                          )}
                          
                          {task.status === 'in_progress' && (
                            <button
                              onClick={() => handleTaskStatusUpdate(task.id, 'completed')}
                              className="flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              Complete
                            </button>
                          )}
                        </>
                      )}
                      
                      <button
                        onClick={() => viewTaskDetails(task)}
                        className="flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Details
                      </button>
                      
                      {activeTimer === task.id && (
                        <button
                          onClick={() => {
                            const hours = parseFloat(prompt('Enter hours to log:') || '0');
                            if (hours > 0) {
                              handleLogTime(task.id, hours);
                            }
                          }}
                          className="flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                        >
                          Log Time
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No tasks assigned</p>
                <p>You don't have any tasks assigned to you yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Team Tasks Section (Lead only) */}
        {currentUserRole === 'lead' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-600" />
                Team Tasks ({teamTasks.length})
              </h3>
            </div>
            
            <div className="p-6">
              {teamTasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamTasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-gray-900 text-sm">{task.name}</h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTaskStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span className="flex items-center">
                          <Building2 className="w-3 h-3 mr-1" />
                          {task.project_name || 'Unknown Project'}
                        </span>
                        {task.estimated_hours && (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {task.estimated_hours}h
                          </span>
                        )}
                      </div>

                      {/* Lead Actions for Team Tasks */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => viewTaskDetails(task)}
                          className="flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Review
                        </button>
                        
                        {task.status !== 'completed' && (
                          <button
                            onClick={() => handleTaskStatusUpdate(task.id, 'completed')}
                            className="flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No team tasks</p>
                  <p>Your team doesn't have any tasks assigned yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default dashboard view
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white p-6">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {currentUser?.full_name}!
        </h1>
        <p className="text-blue-100">
          {currentUserRole === 'lead' 
            ? 'Lead your team and coordinate project activities'
            : 'Track your time and manage your tasks efficiently'
          }
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">My Projects</p>
              <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckSquare className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">My Tasks</p>
              <p className="text-2xl font-bold text-gray-900">
                {tasks.filter(t => t.assigned_to_user_id === currentUser?.id).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">32.5h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => setActiveSection('projects')}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Building2 className="h-5 w-5 text-blue-600 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">View Projects</p>
              <p className="text-sm text-gray-600">See all assigned projects</p>
            </div>
          </button>
          
          <button 
            onClick={() => setActiveSection('tasks')}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <CheckSquare className="h-5 w-5 text-green-600 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">View Tasks</p>
              <p className="text-sm text-gray-600">Manage your task list</p>
            </div>
          </button>
          
          <button 
            onClick={() => setActiveSection('timesheet')}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Clock className="h-5 w-5 text-purple-600 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Log Time</p>
              <p className="text-sm text-gray-600">Track your hours</p>
            </div>
          </button>
          
          <button 
            onClick={() => setActiveSection('timesheet-status')}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Activity className="h-5 w-5 text-yellow-600 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">View Status</p>
              <p className="text-sm text-gray-600">Check timesheet status</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  // Task Detail Modal
  const TaskDetailModal = () => {
    if (!showTaskModal || !selectedTask) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedTask.name}</h3>
                <p className="text-gray-600 mt-1">
                  {selectedTask.project_name || selectedTask.project?.name || 'Unknown Project'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-lg border ${getTaskStatusColor(selectedTask.status)}`}>
                  {selectedTask.status}
                </span>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="space-y-6">
              {/* Task Description */}
              {selectedTask.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-700">{selectedTask.description}</p>
                </div>
              )}

              {/* Task Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Task Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="text-gray-900 capitalize">{selectedTask.status}</span>
                    </div>
                    {selectedTask.estimated_hours && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estimated Hours:</span>
                        <span className="text-gray-900">{selectedTask.estimated_hours}h</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Billable:</span>
                      <span className="text-gray-900">{selectedTask.is_billable ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-gray-900">{new Date(selectedTask.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Project Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Project:</span>
                      <span className="text-gray-900">{selectedTask.project_name || selectedTask.project?.name}</span>
                    </div>
                    {selectedTask.project && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Client:</span>
                          <span className="text-gray-900">{selectedTask.client_name || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Project Status:</span>
                          <span className="text-gray-900 capitalize">{selectedTask.project.status}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                {activeTimer === selectedTask.id && (
                  <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg flex items-center space-x-2">
                    <Timer className="w-4 h-4" />
                    <span className="font-mono text-sm">{formatTime(timerSeconds)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                {selectedTask.status !== 'completed' && (
                  <>
                    <button
                      onClick={() => handleStartTimer(selectedTask.id)}
                      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                        activeTimer === selectedTask.id
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {activeTimer === selectedTask.id ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Stop Timer
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Timer
                        </>
                      )}
                    </button>
                    
                    {selectedTask.status === 'in_progress' && (
                      <button
                        onClick={() => {
                          handleTaskStatusUpdate(selectedTask.id, 'completed');
                          setShowTaskModal(false);
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center transition-colors"
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Mark Complete
                      </button>
                    )}
                  </>
                )}
                
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Main Content */}
      {/* Content is rendered above based on activeSection */}
      
      {/* Task Detail Modal */}
      <TaskDetailModal />
    </>
  );
};

export default EmployeeDashboard;