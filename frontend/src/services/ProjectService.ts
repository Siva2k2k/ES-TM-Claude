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

  // Log raw client payload to help debug id vs _id differences
  console.debug('ProjectService.getAllClients: raw clients payload:', response.data);
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
   * Soft delete project (requires reason)
   */
  static async deleteProject(projectId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.deleteWithBody<{ success: boolean; message?: string }>(
        `/projects/${projectId}`,
        { reason }
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
   * Hard delete project (permanent deletion)
   */
  static async hardDeleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.delete<{ success: boolean; message?: string }>(
        `/projects/${projectId}/hard-delete`
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to permanently delete project' };
      }

      console.log(`Permanently deleted project: ${projectId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in hardDeleteProject:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to permanently delete project';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Delete a task (soft delete)
   */
  static async deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.delete<{ success: boolean; message?: string }>(
        `/projects/tasks/${taskId}`
      );

      if (!response.success) {
        return { success: false, error: response.message || 'Failed to delete task' };
      }

      console.log(`Soft deleted task: ${taskId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in deleteTask:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to delete task';
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

      const response = await backendApi.get<{ success: boolean; projects: Project[]; message?: string }>(
        `/projects/user/${targetUserId}`
      );

      if (!response.success) {
        return { projects: [], error: response.message || 'Failed to fetch user projects' };
      }

      console.log('🔍 ProjectService final projects:', response.projects);
      // Normalize projects: ensure each project has an `id` string and
      // that embedded tasks (if any) have `assigned_to_user_id` as string
      const projectsRaw = response.projects as unknown as Array<Record<string, unknown>>;
      const normalized = (projectsRaw || []).map(projectRaw => {
        const project = { ...projectRaw } as Record<string, unknown> & Partial<Project>;

        // Ensure id exists (use virtual id or fallback to _id)
        if (!project.id) {
          const rawId = project._id as unknown;
          if (rawId !== undefined && rawId !== null) {
            project.id = typeof rawId === 'string' ? rawId : String(rawId);
          }
        }

        // Normalize embedded tasks if present
        if (Array.isArray(project.tasks)) {
          project.tasks = project.tasks.map(taskRaw => {
            const task = { ...taskRaw } as Record<string, unknown> & Partial<Task>;
            const at = task.assigned_to_user_id as unknown;
            let assigned: string | undefined = undefined;

            if (at !== undefined && at !== null) {
              if (typeof at === 'string') assigned = at;
              else if (typeof at === 'object') {
                const atObj = at as Record<string, unknown>;
                if (atObj._id) assigned = String(atObj._id);
                else if (atObj.id) assigned = String(atObj.id);
                else assigned = String(atObj);
              } else {
                assigned = String(at);
              }
            }

            (task as Partial<Task>).assigned_to_user_id = assigned;
            return task as Task;
          });
        }

        return project as Project;
      });

      return { projects: normalized };
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
      const response = await backendApi.get<{ success: boolean; data: Array<Record<string, unknown>>; message?: string }>(
        `/projects/${projectId}/members`
      );

      console.log("Data", response);

      if (!response.success) {
        return { members: [], error: response.message || 'Failed to fetch project members' };
      }

      // Transform the response data to match the expected format
      const members = (response.data || []).map((member: Record<string, unknown>) => {
        const m = member as {
          id?: string;
          _id?: string;
          user_id?: string;
          project_role?: string;
          is_primary_manager?: boolean;
          is_secondary_manager?: boolean;
          user?: { full_name?: string; email?: string };
          user_name?: string;
          user_email?: string;
        };

        return {
          id: m.id || m._id || '',
          user_id: m.user_id || '',
          project_role: m.project_role || '',
          is_primary_manager: !!m.is_primary_manager,
          is_secondary_manager: !!m.is_secondary_manager,
          user_name: (m.user && m.user.full_name) || m.user_name || '',
          user_email: (m.user && m.user.email) || m.user_email || ''
        };
      }) || [];

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
  static async addProjectMember(
    projectId: string,
    userId: string,
    projectRole: string = 'employee',
    isPrimaryManager = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = {
        // include both formats to be resilient to backend validation
        userId,
        user_id: userId,
        projectRole,
        project_role: projectRole,
        isPrimaryManager,
        is_primary_manager: isPrimaryManager
      };

      console.log("Payload being sent:", payload);

      const response = await backendApi.post<{ success: boolean; message?: string }>(
        `/projects/${projectId}/members`,
        payload
      );

      if (!response || !response.success) {
        return { success: false, error: response?.message || 'Failed to add user to project' };
      }

      return { success: true };
    } catch (err: any) {
      console.error('ProjectService.addProjectMember error:', err);
      const errorMessage = err?.message || err?.response?.message || 'Failed to add user to project';
      return { success: false, error: errorMessage };
    }
  }

  // backward-compatible alias used by other code
  static async addUserToProject(
    projectId: string,
    userId: string,
    projectRole: string = 'employee',
    isPrimaryManager = false
  ) {
    return this.addProjectMember(projectId, userId, projectRole, isPrimaryManager);
  }

  /**
   * Get projects enriched with client data
   * This method fetches projects and clients separately, then merges them
   */
  static async getProjectsWithClientData(userId?: string): Promise<{ projects: (Project & { client?: Client })[]; error?: string }> {
    try {
      // Fetch projects and clients in parallel
      const [projectsResult, clientsResult] = await Promise.all([
        userId ? this.getUserProjects(userId) : this.getAllProjects(),
        this.getAllClients()
      ]);

      if (projectsResult.error) {
        return { projects: [], error: projectsResult.error };
      }

      if (clientsResult.error) {
        console.warn('Failed to fetch clients for project enrichment:', clientsResult.error);
        // Return projects without client data if clients fetch fails
        return { projects: projectsResult.projects || [], error: undefined };
      }

      // Create client lookup map
      const clients = clientsResult.clients || [];
      const clientById = new Map<string, Client>();
      
      clients.forEach(client => {
        if (client.id) {
          clientById.set(client.id, client);
        }
      });

      // Enrich projects with client data
      const enrichedProjects = (projectsResult.projects || []).map(project => {
        const clientData = project.client_id ? clientById.get(project.client_id) : null;
        
        return {
          ...project,
          client: clientData || undefined
        };
      });

      console.log(`🔍 getProjectsWithClientData: Enriched ${enrichedProjects.length} projects with client data`);
      return { projects: enrichedProjects };
    } catch (error) {
      console.error('Error in getProjectsWithClientData:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch projects with client data';
      return { projects: [], error: errorMessage };
    }
  }

  /**
   * Get user projects enriched with client data
   */
  static async getUserProjectsWithClientData(userId: string): Promise<{ projects: (Project & { client?: Client })[]; error?: string }> {
    return this.getProjectsWithClientData(userId);
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

      const response: any = await backendApi.post(`/projects/${taskData.project_id}/tasks`, payload);

      // Backend historically returned different shapes. Accept several patterns:
      // 1) { success: true, data: Task }
      // 2) { task: Task }
      // 3) direct Task object
      console.debug('ProjectService.createTask: raw response:', response);

      if (response && typeof response === 'object') {
        if (response.success && response.data) {
          return { task: response.data };
        }

        if (response.task) {
          return { task: response.task };
        }

        // If the response looks like a Task (has _id or id and project_id), return it
        if (response._id || response.id) {
          return { task: response as Task };
        }
      }

      // If we reach here, treat as failure with best-effort message
      return { error: (response && response.message) || 'Failed to create task' };
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
      // Sanitize updates to ensure backend receives valid ID formats
      const payload: any = { ...updates } as any;
      if ('assigned_to_user_id' in payload) {
        const at = payload.assigned_to_user_id;
        if (!at) {
          payload.assigned_to_user_id = null;
        } else if (typeof at === 'string') {
          payload.assigned_to_user_id = at.trim() || null;
        } else if (typeof at === 'object') {
          // try to extract id fields
          const candidate = (at as any)._id || (at as any).id || (at as any).user_id || null;
          payload.assigned_to_user_id = candidate ? String(candidate) : null;
        } else {
          payload.assigned_to_user_id = String(at);
        }
      }

      // Ensure estimated_hours is a number or null
      if ('estimated_hours' in payload) {
        const eh = payload.estimated_hours;
        payload.estimated_hours = eh === undefined || eh === null || eh === '' ? null : Number(eh);
      }

      // Ensure is_billable is a boolean if present
      if ('is_billable' in payload) {
        payload.is_billable = !!payload.is_billable;
      }

      console.debug(`ProjectService.updateTask payload for ${taskId}:`, payload);

      const response = await backendApi.put<{ success: boolean; message?: string }>(
        `/projects/tasks/${taskId}`,
        payload
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
      // Get user's projects first
      const projectsResult = await this.getUserProjects(userId);
      if (projectsResult.error) {
        return { tasks: [], error: projectsResult.error };
      }

      // Prefer embedded tasks from the projects response (backend now embeds tasks).
      // Fall back to fetching per-project tasks only when tasks are not embedded.
      const allTasks: Task[] = [];
      const projects = projectsResult.projects as Project[];
      
      console.log(`🔍 getUserTasks: Processing ${projects.length} projects for user ${userId}`);
      
      for (const project of projects) {
        const projectWithTasks = project as unknown as { tasks?: Task[] };
        if (Array.isArray(projectWithTasks.tasks) && projectWithTasks.tasks?.length > 0) {
          const projectTasks = (project as unknown as { tasks?: Task[] }).tasks || [];
          console.log(`🔍 Found ${projectTasks.length} embedded tasks in project ${project.name || project.id}`);
          
          // Filter tasks assigned to this user
          const userTasks = projectTasks.filter(task => {
            const isAssigned = task.assigned_to_user_id === userId;
            console.log(`🔍 Task "${task.name}": assigned_to="${task.assigned_to_user_id}", userId="${userId}", matches=${isAssigned}`);
            return isAssigned;
          });
          
          allTasks.push(...userTasks);
          continue;
        }

        // Fallback: only attempt to fetch if we have a valid project id
        const projId = project.id || (project as unknown as { _id?: string })._id;
        if (!projId) {
          console.warn('Skipping tasks fetch for project with missing id:', project);
          continue;
        }

        try {
          const tasksResponse = await backendApi.get<{ success: boolean; tasks: Task[]; message?: string }>(
            `/projects/${projId}/tasks`
          );

          if (tasksResponse.success && Array.isArray(tasksResponse.tasks)) {
            // Filter tasks assigned to this user
            const userTasks = tasksResponse.tasks.filter(task => task.assigned_to_user_id === userId);
            allTasks.push(...userTasks);
          }
        } catch (error) {
          console.warn(`Failed to fetch tasks for project ${projId}:`, error);
        }
      }

      console.log(`🔍 Final filtered tasks for user ${userId}:`, allTasks);
      return { tasks: allTasks };
    } catch (error) {
      console.error('Error in getUserTasks:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch user tasks';
      return { tasks: [], error: errorMessage };
    }
  }

  /**
   * Get all tasks across all projects
   * Convenience wrapper used by UI pages that need a flat task list
   */
  static async getAllTasks(): Promise<{ tasks: Task[]; error?: string }> {
    try {
      // Fetch all projects first
      const projectsResult = await this.getAllProjects();
      if (projectsResult.error) {
        return { tasks: [], error: projectsResult.error };
      }

      const allTasks: Task[] = [];
      const projects = projectsResult.projects || [];

      for (const project of projects) {
        const projRecord = project as unknown as Record<string, unknown>;
  const projId = (projRecord['id'] as string) || (projRecord['_id'] as string) || undefined;
        if (!projId) continue;

        try {
          const tasksResult = await this.getProjectTasks(projId);
          if (!tasksResult.error && Array.isArray(tasksResult.tasks)) {
            allTasks.push(...tasksResult.tasks);
          }
        } catch (err) {
          // ignore per-project task fetch failures, continue with others
          console.warn(`ProjectService.getAllTasks: failed to fetch tasks for project ${projId}`, err);
        }
      }

      return { tasks: allTasks };
    } catch (error) {
      console.error('Error in getAllTasks:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch tasks';
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
  // static async addProjectMember(projectId: string, userId: string, role: string): Promise<{ success: boolean; error?: string }> {
  //   return this.addUserToProject(
  //     projectId,
  //     userId,
  //     role,
  //     false,
  //     role === 'manager'
  //   );
  // }

  /**
   * Remove a member from a project
   */
  static async removeProjectMember(projectId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    return this.removeUserFromProject(projectId, userId);
  }


}export default ProjectService;