import { backendApi, BackendApiError } from '../lib/backendApi';
import type { Project, Task, Client } from '../types';

/**
 * Project Management Service - MongoDB Backend Integration
 * Handles all project-related operations with Node.js/MongoDB backend
 */
export class ProjectService {
  /**
   * Create a new project (Management and Super Admin)
   */
  static async createProject(projectData: Partial<Project>): Promise<{ project?: Project; error?: string }> {
    try {
      const payload = {
        name: projectData.name!,
        client_id: projectData.client_id!,
        primary_manager_id: projectData.primary_manager_id!,
        status: projectData.status || 'active',
        start_date: projectData.start_date!,
        end_date: projectData.end_date || null,
        budget: projectData.budget || null,
        description: projectData.description || null,
        is_billable: projectData.is_billable ?? true
      };

      const response = await backendApi.post<{ success: boolean; data: Project; message?: string }>(
        '/projects',
        payload
      );

      if (!response.success) {
        return { error: response.message || 'Failed to create project' };
      }

      console.log('Project created:', response.data);
      return { project: response.data };
    } catch (error) {
      console.error('Error in createProject:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to create project';
      return { error: errorMessage };
    }
  }

  /**
   * Update project
   */
  static async updateProject(projectId: string, updates: Partial<Project>): Promise<{ success: boolean; error?: string }> {
    try {
      // Sanitize updates: convert empty date strings to null to avoid parsing errors
      const payload: Partial<Project> & Record<string, unknown> = { ...updates };
      if ('start_date' in payload && ((payload as any).start_date === '' || (payload as any).start_date === undefined)) {
        (payload as any).start_date = null;
      }
      if ('end_date' in payload && ((payload as any).end_date === '' || (payload as any).end_date === undefined)) {
        (payload as any).end_date = null;
      }

      // If budget is an empty string from form input, convert to null
      if ('budget' in payload && (payload as any).budget === '') {
        (payload as any).budget = null;
      }

      // Convert empty strings to null for ID fields
      if ('client_id' in payload && (payload as any).client_id === '') {
        (payload as any).client_id = null;
      }
      if ('primary_manager_id' in payload && (payload as any).primary_manager_id === '') {
        (payload as any).primary_manager_id = null;
      }

      const response = await backendApi.put<{ success: boolean; message?: string }>(
        `/projects/${projectId}`,
        payload
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to update project' };
      }

      console.log(`Updated project ${projectId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in updateProject:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to update project';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get all projects
   */
  static async getAllProjects(): Promise<{ projects: Project[]; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; projects: Project[]; message?: string }>(
        '/projects'
      );

      if (!response.success) {
        return { projects: [], error: response.message || 'Failed to fetch projects' };
      }

      return { projects: response.projects || [] };
    } catch (error) {
      console.error('Error in getAllProjects:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch projects';
      return { projects: [], error: errorMessage };
    }
  }

  /**
   * Get projects by status
   */
  static async getProjectsByStatus(status: string): Promise<{ projects: Project[]; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; projects: Project[]; message?: string }>(
        `/projects/status?status=${encodeURIComponent(status)}`
      );

      if (!response.success) {
        return { projects: [], error: response.message || 'Failed to fetch projects by status' };
      }

      return { projects: response.projects || [] };
    } catch (error) {
      console.error('Exception in getProjectsByStatus:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch projects by status';
      return { projects: [], error: errorMessage };
    }
  }

  /**
   * Get active projects
   */
  static async getActiveProjects(): Promise<{ projects: Project[]; error?: string }> {
    return this.getProjectsByStatus('active');
  }

  /**
   * Get completed projects
   */
  static async getCompletedProjects(): Promise<{ projects: Project[]; error?: string }> {
    return this.getProjectsByStatus('completed');
  }

  /**
   * Get tasks for a project
   */
  static async getProjectTasks(projectId: string): Promise<{ tasks: Task[]; error?: string }> {
    try {
      console.log(`🔍 getProjectTasks: Querying tasks for project ${projectId}`);

      const response = await backendApi.get<{ success: boolean; tasks: Task[]; message?: string }>(
        `/projects/${projectId}/tasks`
      );

      if (!response.success) {
        return { tasks: [], error: response.message || 'Failed to fetch project tasks' };
      }

      console.log(`🔍 getProjectTasks: Found ${(response.tasks || []).length} tasks for project ${projectId}`);
      return { tasks: response.tasks || [] };
    } catch (error) {
      console.error('Error in getProjectTasks:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch project tasks';
      return { tasks: [], error: errorMessage };
    }
  }

  /**
   * Get project with tasks
   */
  static async getProjectWithTasks(projectId: string): Promise<{ 
    project?: Project; 
    tasks: Task[]; 
    error?: string 
  }> {
    try {
      const [projectResult, tasksResult] = await Promise.all([
        this.getProjectById(projectId),
        this.getProjectTasks(projectId)
      ]);

      if (projectResult.error) {
        return { tasks: [], error: projectResult.error };
      }

      if (tasksResult.error) {
        return { project: projectResult.project, tasks: [], error: tasksResult.error };
      }

      return { 
        project: projectResult.project, 
        tasks: tasksResult.tasks 
      };
    } catch (error) {
      console.error('Error in getProjectWithTasks:', error);
      return { tasks: [], error: 'Failed to fetch project with tasks' };
    }
  }

  /**
   * Update project status
   */
  static async updateProjectStatus(projectId: string, status: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.put<{ success: boolean; message?: string }>(
        `/projects/${projectId}`,
        { status }
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to update project status' };
      }

      console.log(`Updated project ${projectId} status to: ${status}`);
      return { success: true };
    } catch (error) {
      console.error('Error in updateProjectStatus:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to update project status';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get project analytics
   */
  static async getProjectAnalytics(projectId?: string): Promise<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalTasks: number;
    completedTasks: number;
    budgetUtilization: number;
    error?: string;
  }> {
    try {
      // For now, calculate analytics client-side by fetching projects and tasks
      // TODO: This could be optimized with a dedicated backend analytics endpoint
      const projectsResult = projectId
        ? await this.getProjectById(projectId)
        : await this.getAllProjects();

      if (projectsResult.error) {
        return {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          totalTasks: 0,
          completedTasks: 0,
          budgetUtilization: 0,
          error: projectsResult.error
        };
      }

      const projects = projectId
        ? (projectsResult as { project?: Project }).project ? [(projectsResult as { project: Project }).project] : []
        : (projectsResult as { projects: Project[] }).projects;

      let totalTasks = 0;
      let completedTasks = 0;

      // Get tasks for analytics
      if (projectId) {
        const tasksResult = await this.getProjectTasks(projectId);
        if (!tasksResult.error) {
          totalTasks = tasksResult.tasks.length;
          completedTasks = tasksResult.tasks.filter(task => task.status === 'completed').length;
        }
      } else {
        // For all projects, we'd need to aggregate - simplified for now
        // This could be optimized with a dedicated backend endpoint
        totalTasks = 0;
        completedTasks = 0;
      }

      return {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        completedProjects: projects.filter(p => p.status === 'completed').length,
        totalTasks,
        completedTasks,
        budgetUtilization: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      };
    } catch (error) {
      console.error('Error in getProjectAnalytics:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch project analytics';
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        budgetUtilization: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Get all clients
   */
  static async getAllClients(): Promise<{ clients: Client[]; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; data: Client[]; message?: string }>(
        '/projects/clients'
      );

      if (!response.success) {
        return { clients: [], error: response.message || 'Failed to fetch clients' };
      }

      console.log('Clients fetched:', response.data);
      return { clients: response.data };
    } catch (error) {
      console.error('Error in getAllClients:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch clients';
      return { clients: [], error: errorMessage };
    }
  }

  /**
   * Create a new client
   */
  static async createClient(clientData: Partial<Client>): Promise<{ client?: Client; error?: string }> {
    try {
      const payload = {
        name: clientData.name!,
        contact_person: clientData.contact_person || null,
        contact_email: clientData.contact_email || null,
        is_active: clientData.is_active ?? true
      };

      const response = await backendApi.post<{ success: boolean; data: Client; message?: string }>(
        '/projects/clients',
        payload
      );

      if (!response.success) {
        return { error: response.message || 'Failed to create client' };
      }

      console.log('Client created:', response.data);
      return { client: response.data };
    } catch (error) {
      console.error('Error in createClient:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to create client';
      return { error: errorMessage };
    }
  }

  /**
   * Get project by ID
   */
  static async getProjectById(projectId: string): Promise<{ project?: Project; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; data: Project; message?: string }>(
        `/projects/${projectId}`
      );

      if (!response.success) {
        return { error: response.message || 'Project not found' };
      }

      return { project: response.data };
    } catch (error) {
      console.error('Error in getProjectById:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch project';
      return { error: errorMessage };
    }
  }

  /**
   * Soft delete project
   */
  static async deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.delete<{ success: boolean; message?: string }>(
        `/projects/${projectId}`
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to delete project' };
      }

      console.log(`Soft deleted project: ${projectId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in deleteProject:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to delete project';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Validate project data
   */
  static validateProjectData(projectData: Partial<Project>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!projectData.name || projectData.name.trim().length < 2) {
      errors.push('Project name must be at least 2 characters');
    }

    if (!projectData.client_id) {
      errors.push('Client is required');
    }

    if (!projectData.primary_manager_id) {
      errors.push('Primary manager is required');
    }

    if (projectData.budget !== undefined && projectData.budget < 0) {
      errors.push('Budget cannot be negative');
    }

    if (projectData.start_date && projectData.end_date) {
      if (new Date(projectData.start_date) > new Date(projectData.end_date)) {
        errors.push('End date must be after start date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get user's assigned projects
   */
  static async getUserProjects(userId?: string): Promise<{ projects: Project[]; error?: string }> {
    try {
      const targetUserId = userId;
      console.log('🔍 ProjectService.getUserProjects called with userId:', targetUserId);

      if (!targetUserId) {
        console.warn('🔍 No userId provided, returning empty projects');
        return { projects: [] };
      }

      const response = await backendApi.get<{ success: boolean; data: Project[]; message?: string }>(
        `/projects/user/${targetUserId}`
      );

      if (!response.success) {
        return { projects: [], error: response.message || 'Failed to fetch user projects' };
      }

      console.log('🔍 ProjectService final projects:', response.data);
      return { projects: response.data };
    } catch (error) {
      console.error('Error in getUserProjects:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch user projects';
      return { projects: [], error: errorMessage };
    }
  }

  /**
   * Get project members for a specific project
   */
  static async getProjectMembers(projectId: string): Promise<{
    members: Array<{
      id: string;
      user_id: string;
      project_role: string;
      is_primary_manager: boolean;
      is_secondary_manager: boolean;
      user_name: string;
      user_email: string;
    }>;
    error?: string
  }> {
    try {
      const response = await backendApi.get<{ success: boolean; data: any[]; message?: string }>(
        `/projects/${projectId}/members`
      );

      if (!response.success) {
        return { members: [], error: response.message || 'Failed to fetch project members' };
      }

      // Transform the response data to match the expected format
      const members = response.data?.map((member: any) => ({
        id: member.id || member._id,
        user_id: member.user_id,
        project_role: member.project_role,
        is_primary_manager: member.is_primary_manager,
        is_secondary_manager: member.is_secondary_manager,
        user_name: member.user?.full_name || member.user_name,
        user_email: member.user?.email || member.user_email
      })) || [];

      return { members };
    } catch (error) {
      console.error('Error in getProjectMembers:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch project members';
      return { members: [], error: errorMessage };
    }
  }

  /**
   * Remove user from project
   */
  static async removeUserFromProject(projectId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.delete<{ success: boolean; message?: string }>(
        `/projects/${projectId}/members/${userId}`
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to remove user from project' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in removeUserFromProject:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to remove user from project';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Add user to project
   */
  static async addUserToProject(
    projectId: string,
    userId: string,
    projectRole: string,
    isPrimaryManager = false,
    isSecondaryManager = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = {
        user_id: userId,
        project_role: projectRole,
        is_primary_manager: isPrimaryManager,
        is_secondary_manager: isSecondaryManager
      };

      const response = await backendApi.post<{ success: boolean; message?: string }>(
        `/projects/${projectId}/members`,
        payload
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to add user to project' };
      }

      console.log(`Added user ${userId} to project ${projectId} with role ${projectRole}`);
      return { success: true };
    } catch (error) {
      console.error('Error in addUserToProject:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to add user to project';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create task
   */
  static async createTask(taskData: {
    project_id: string;
    name: string;
    description?: string;
    assigned_to_user_id?: string;
    status?: string;
    estimated_hours?: number;
    is_billable?: boolean;
    created_by_user_id?: string;
  }): Promise<{ task?: Task; error?: string }> {
    try {
      const payload = {
        name: taskData.name,
        description: taskData.description || null,
        assigned_to_user_id: taskData.assigned_to_user_id || null,
        status: taskData.status || 'open',
        estimated_hours: taskData.estimated_hours || null,
        is_billable: taskData.is_billable ?? true
      };

      const response = await backendApi.post<{ success: boolean; data: Task; message?: string }>(
        `/projects/${taskData.project_id}/tasks`,
        payload
      );

      if (!response.success) {
        return { error: response.message || 'Failed to create task' };
      }

      return { task: response.data };
    } catch (error) {
      console.error('Error in createTask:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to create task';
      return { error: errorMessage };
    }
  }

  /**
   * Update task
   */
  static async updateTask(taskId: string, updates: Partial<Task>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.put<{ success: boolean; message?: string }>(
        `/projects/tasks/${taskId}`,
        updates
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to update task' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateTask:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to update task';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get user's assigned tasks
   */
  static async getUserTasks(userId: string): Promise<{ tasks: Task[]; error?: string }> {
    try {
      // Note: This endpoint may need to be implemented in the backend or adjusted based on available endpoints
      // For now using a general projects/user endpoint and filtering client-side
      const response = await backendApi.get<{ success: boolean; data: any[]; message?: string }>(
        `/projects/user/${userId}`
      );

      if (!response.success) {
        return { tasks: [], error: response.message || 'Failed to fetch user tasks' };
      }

      // Extract tasks from user projects - this may need adjustment based on actual backend response structure
      const allTasks: Task[] = [];
      for (const project of response.data) {
        if (project.tasks) {
          allTasks.push(...project.tasks.filter((task: Task) => task.assigned_to_user_id === userId));
        }
      }

      return { tasks: allTasks };
    } catch (error) {
      console.error('Error in getUserTasks:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch user tasks';
      return { tasks: [], error: errorMessage };
    }
  }

  static async getLeadTasks(userId: string): Promise<{ tasks: Task[]; error?: string }> {
    try {
      // For now, delegate to getUserTasks since the backend API structure may need adjustment
      // This can be optimized later with a dedicated endpoint
      const userTasksResult = await this.getUserTasks(userId);

      if (userTasksResult.error) {
        return userTasksResult;
      }

      // Additionally, fetch projects where the user is a lead to get more tasks
      // This is a simplified approach - may need backend endpoint optimization
      const projectsResult = await this.getUserProjects(userId);
      if (!projectsResult.error && projectsResult.projects) {
        const allTasks: Task[] = [...userTasksResult.tasks];

        // Get tasks from managed projects
        for (const project of projectsResult.projects) {
          const projectTasksResult = await this.getProjectTasks(project.id);
          if (!projectTasksResult.error) {
            allTasks.push(...projectTasksResult.tasks);
          }
        }

        // Deduplicate tasks by ID
        const uniqueTasks = allTasks.filter((task, index, array) =>
          array.findIndex(t => t.id === task.id) === index
        );

        return { tasks: uniqueTasks };
      }

      return userTasksResult;
    } catch (error: unknown) {
      console.error('Error in getLeadTasks:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch lead tasks';
      return { tasks: [], error: errorMessage };
    }
  }

  /**
   * Add a member to a project
   */
  static async addProjectMember(projectId: string, userId: string, role: string): Promise<{ success: boolean; error?: string }> {
    return this.addUserToProject(
      projectId,
      userId,
      role,
      false,
      role === 'manager'
    );
  }

  /**
   * Remove a member from a project
   */
  static async removeProjectMember(projectId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    return this.removeUserFromProject(projectId, userId);
  }


}export default ProjectService;