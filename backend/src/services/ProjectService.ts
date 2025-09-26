import mongoose from 'mongoose';
import {
  Project,
  ProjectMember,
  Client,
  Task,
  IProject,
  IProjectMember,
  IClient,
  ITask,
  ProjectStatus
} from '@/models';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError
} from '@/utils/errors';
import {
  AuthUser,
  requireManagementRole,
  requireManagerRole,
  canManageRoleHierarchy
} from '@/utils/auth';

export interface ProjectWithDetails extends IProject {
  client?: IClient;
  primary_manager?: { full_name: string };
  tasks?: ITask[];
}

export interface ProjectAnalytics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  budgetUtilization: number;
}

/**
 * Backend Project Management Service - MongoDB Implementation
 * Handles all project-related operations with proper authorization
 */
export class ProjectService {
  /**
   * Create a new project (Management and Super Admin)
   */
  static async createProject(projectData: Partial<IProject>, currentUser: AuthUser): Promise<{ project?: IProject; error?: string }> {
    try {
      requireManagementRole(currentUser);

      // Validate project data
      const validation = this.validateProjectData(projectData);
      if (!validation.isValid) {
        throw new ValidationError(validation.errors.join(', '));
      }

      const project = new Project({
        name: projectData.name!,
        client_id: projectData.client_id!,
        primary_manager_id: projectData.primary_manager_id!,
        status: projectData.status || 'active',
        start_date: projectData.start_date!,
        end_date: projectData.end_date || null,
        budget: projectData.budget || null,
        description: projectData.description || null,
        is_billable: projectData.is_billable ?? true
      });

      await project.save();

      console.log('Project created:', project.id);
      return { project };
    } catch (error) {
      console.error('Error in createProject:', error);
      if (error instanceof ValidationError || error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to create project' };
    }
  }

  /**
   * Update project
   */
  static async updateProject(projectId: string, updates: Partial<IProject>, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagementRole(currentUser);

      // Sanitize updates: convert empty date strings to null
      const payload: any = { ...updates };
      if (payload.start_date === '' || payload.start_date === undefined) {
        payload.start_date = null;
      }
      if (payload.end_date === '' || payload.end_date === undefined) {
        payload.end_date = null;
      }
      if (payload.budget === '') {
        payload.budget = null;
      }

      payload.updated_at = new Date();

      const result = await (Project.updateOne as any)({
        _id: projectId,
        deleted_at: { $exists: false }
      }, payload);

      if (result.matchedCount === 0) {
        throw new NotFoundError('Project not found');
      }

      console.log(`Updated project ${projectId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in updateProject:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to update project' };
    }
  }

  /**
   * Get all projects
   */
  static async getAllProjects(currentUser: AuthUser): Promise<{ projects: ProjectWithDetails[]; error?: string }> {
    try {
      requireManagementRole(currentUser);

      const projects = await (Project.find as any)({
        deleted_at: { $exists: false }
      })
        .populate('client_id', 'name contact_person')
        .populate('primary_manager_id', 'full_name')
        .sort({ created_at: -1 });

      return { projects };
    } catch (error) {
      console.error('Error in getAllProjects:', error);
      if (error instanceof AuthorizationError) {
        return { projects: [], error: error.message };
      }
      return { projects: [], error: 'Failed to fetch projects' };
    }
  }

  /**
   * Get projects by status
   */
  static async getProjectsByStatus(status: ProjectStatus, currentUser: AuthUser): Promise<{ projects: ProjectWithDetails[]; error?: string }> {
    try {
      requireManagerRole(currentUser);

      const projects = await (Project.find as any)({
        status,
        deleted_at: { $exists: false }
      })
        .populate('client_id', 'name contact_person')
        .populate('primary_manager_id', 'full_name')
        .sort({ created_at: -1 });

      return { projects };
    } catch (error) {
      console.error('Error in getProjectsByStatus:', error);
      if (error instanceof AuthorizationError) {
        return { projects: [], error: error.message };
      }
      return { projects: [], error: 'Failed to fetch projects by status' };
    }
  }

  /**
   * Get active projects
   */
  static async getActiveProjects(currentUser: AuthUser): Promise<{ projects: ProjectWithDetails[]; error?: string }> {
    return this.getProjectsByStatus('active', currentUser);
  }

  /**
   * Get completed projects
   */
  static async getCompletedProjects(currentUser: AuthUser): Promise<{ projects: ProjectWithDetails[]; error?: string }> {
    return this.getProjectsByStatus('completed', currentUser);
  }

  /**
   * Get tasks for a project
   */
  static async getProjectTasks(projectId: string, currentUser: AuthUser): Promise<{ tasks: ITask[]; error?: string }> {
    try {
      // Check if user has access to this project
      const hasAccess = await this.checkProjectAccess(projectId, currentUser);
      if (!hasAccess) {
        throw new AuthorizationError('You do not have access to this project');
      }

      const tasks = await (Task.find as any)({
        project_id: projectId,
        deleted_at: { $exists: false }
      })
        .populate('assigned_to_user_id', 'full_name')
        .populate('created_by_user_id', 'full_name')
        .sort({ created_at: -1 });

      return { tasks };
    } catch (error) {
      console.error('Error in getProjectTasks:', error);
      if (error instanceof AuthorizationError) {
        return { tasks: [], error: error.message };
      }
      return { tasks: [], error: 'Failed to fetch project tasks' };
    }
  }

  /**
   * Get project with tasks
   */
  static async getProjectWithTasks(projectId: string, currentUser: AuthUser): Promise<{
    project?: ProjectWithDetails;
    tasks: ITask[];
    error?: string;
  }> {
    try {
      const [projectResult, tasksResult] = await Promise.all([
        this.getProjectById(projectId, currentUser),
        this.getProjectTasks(projectId, currentUser)
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
  static async updateProjectStatus(projectId: string, status: ProjectStatus, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagerRole(currentUser);

      const result = await (Project.updateOne as any)({
        _id: projectId,
        deleted_at: { $exists: false }
      }, {
        status,
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('Project not found');
      }

      console.log(`Updated project ${projectId} status to: ${status}`);
      return { success: true };
    } catch (error) {
      console.error('Error in updateProjectStatus:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to update project status' };
    }
  }

  /**
   * Get project analytics
   */
  static async getProjectAnalytics(projectId?: string, currentUser?: AuthUser): Promise<ProjectAnalytics & { error?: string }> {
    try {
      if (currentUser) {
        requireManagerRole(currentUser);
      }

      // Get projects
      const projectFilter: any = { deleted_at: { $exists: false } };
      if (projectId) {
        projectFilter._id = projectId;
      }

      const projects = await (Project.find as any)(projectFilter).select('_id status budget');

      // Get tasks
      const taskFilter: any = { deleted_at: { $exists: false } };
      if (projectId) {
        taskFilter.project_id = projectId;
      }

      const tasks = await (Task.find as any)(taskFilter).select('_id status project_id');

      const completedTasks = tasks.filter((task: ITask) => task.status === 'completed').length;

      return {
        totalProjects: projects.length,
        activeProjects: projects.filter((p: IProject) => p.status === 'active').length,
        completedProjects: projects.filter((p: IProject) => p.status === 'completed').length,
        totalTasks: tasks.length,
        completedTasks,
        budgetUtilization: tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0
      };
    } catch (error) {
      console.error('Error in getProjectAnalytics:', error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        budgetUtilization: 0,
        error: 'Failed to fetch project analytics'
      };
    }
  }

  /**
   * Get all clients
   */
  static async getAllClients(currentUser: AuthUser): Promise<{ clients: IClient[]; error?: string }> {
    try {
      requireManagerRole(currentUser);

      const clients = await (Client.find as any)({
        is_active: true,
        deleted_at: { $exists: false }
      });

      return { clients };
    } catch (error) {
      console.error('Error in getAllClients:', error);
      if (error instanceof AuthorizationError) {
        return { clients: [], error: error.message };
      }
      return { clients: [], error: 'Failed to fetch clients' };
    }
  }

  /**
   * Get clients (alias for getAllClients for controller compatibility)
   */
  static async getClients(currentUser: AuthUser): Promise<{ clients: IClient[]; error?: string }> {
    return this.getAllClients(currentUser);
  }

  /**
   * Get projects (alias for getAllProjects for controller compatibility)
   */
  static async getProjects(currentUser: AuthUser): Promise<{ projects: ProjectWithDetails[]; error?: string }> {
    return this.getAllProjects(currentUser);
  }

  /**
   * Create a new client
   */
  static async createClient(clientData: Partial<IClient>, currentUser: AuthUser): Promise<{ client?: IClient; error?: string }> {
    try {
      requireManagerRole(currentUser);

      if (!clientData.name || clientData.name.trim().length < 2) {
        throw new ValidationError('Client name must be at least 2 characters');
      }

      const client = new Client({
        name: clientData.name!,
        contact_person: clientData.contact_person || null,
        contact_email: clientData.contact_email || null,
        is_active: clientData.is_active ?? true
      });

      await client.save();

      console.log('Client created:', client.id);
      return { client };
    } catch (error) {
      console.error('Error in createClient:', error);
      if (error instanceof ValidationError || error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to create client' };
    }
  }

  /**
   * Get project by ID
   */
  static async getProjectById(projectId: string, currentUser: AuthUser): Promise<{ project?: ProjectWithDetails; error?: string }> {
    try {
      // Check project access
      const hasAccess = await this.checkProjectAccess(projectId, currentUser);
      if (!hasAccess) {
        throw new AuthorizationError('You do not have access to this project');
      }

      const project = await (Project.findOne as any)({
        _id: projectId,
        deleted_at: { $exists: false }
      })
        .populate('client_id', 'name contact_person')
        .populate('primary_manager_id', 'full_name');

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      return { project };
    } catch (error) {
      console.error('Error in getProjectById:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch project' };
    }
  }

  /**
   * Soft delete project
   */
  static async deleteProject(projectId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagementRole(currentUser);

      const result = await (Project.updateOne as any)({
        _id: projectId
      }, {
        deleted_at: new Date(),
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('Project not found');
      }

      console.log(`Soft deleted project: ${projectId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in deleteProject:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to delete project' };
    }
  }

  /**
   * Get user's assigned projects
   */
  static async getUserProjects(userId: string, currentUser: AuthUser): Promise<{ projects: ProjectWithDetails[]; error?: string }> {
    try {
      // Users can get their own projects, or higher roles can get subordinates' projects
      if (currentUser.id !== userId && !canManageRoleHierarchy(currentUser.role, 'employee')) {
        throw new AuthorizationError('You can only view your own projects');
      }

      // Get projects in two ways:
      // 1. Projects where user is a member (via ProjectMember)
      // 2. Projects where user is the primary manager

      const [memberProjects, primaryManagerProjects] = await Promise.all([
        // Projects via membership
        (ProjectMember.find as any)({
          user_id: userId,
          removed_at: { $exists: false },
          deleted_at: { $exists: false }
        }).populate({
          path: 'project_id',
          match: { deleted_at: { $exists: false } },
          populate: [
            { path: 'client_id', select: 'name contact_person' },
            { path: 'primary_manager_id', select: 'full_name' }
          ]
        }),

        // Projects where user is primary manager
        (Project.find as any)({
          primary_manager_id: userId,
          deleted_at: { $exists: false }
        })
          .populate('client_id', 'name contact_person')
          .populate('primary_manager_id', 'full_name')
      ]);

      // Combine and deduplicate projects
      const memberProjectsData = memberProjects
        .filter((item: any) => item.project_id) // Filter out null projects
        .map((item: any) => item.project_id);

      const allProjects = [...memberProjectsData, ...primaryManagerProjects];
      const seen = new Set<string>();
      const deduplicatedProjects: ProjectWithDetails[] = [];

      for (const project of allProjects) {
        if (project && project._id && !seen.has(project._id.toString())) {
          seen.add(project._id.toString());
          deduplicatedProjects.push(project);
        }
      }

      return { projects: deduplicatedProjects };
    } catch (error) {
      console.error('Error in getUserProjects:', error);
      if (error instanceof AuthorizationError) {
        return { projects: [], error: error.message };
      }
      return { projects: [], error: 'Failed to fetch user projects' };
    }
  }

  /**
   * Get project members for a specific project
   */
  static async getProjectMembers(projectId: string, currentUser: AuthUser): Promise<{
    members: Array<{
      id: string;
      user_id: string;
      project_role: string;
      is_primary_manager: boolean;
      is_secondary_manager: boolean;
      user_name: string;
      user_email: string;
    }>;
    error?: string;
  }> {
    try {
      // Check project access
      const hasAccess = await this.checkProjectAccess(projectId, currentUser);
      if (!hasAccess) {
        throw new AuthorizationError('You do not have access to this project');
      }

      const members = await (ProjectMember.find as any)({
        project_id: projectId,
        removed_at: { $exists: false },
        deleted_at: { $exists: false }
      }).populate('user_id', 'full_name email');

      const membersData = members.map((member: any) => ({
        id: member._id.toString(),
        user_id: member.user_id._id.toString(),
        project_role: member.project_role,
        is_primary_manager: member.is_primary_manager,
        is_secondary_manager: member.is_secondary_manager,
        user_name: member.user_id.full_name,
        user_email: member.user_id.email
      }));

      return { members: membersData };
    } catch (error) {
      console.error('Error in getProjectMembers:', error);
      if (error instanceof AuthorizationError) {
        return { members: [], error: error.message };
      }
      return { members: [], error: 'Failed to fetch project members' };
    }
  }

  /**
   * Remove user from project
   */
  static async removeUserFromProject(projectId: string, userId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagerRole(currentUser);

      const result = await (ProjectMember.updateOne as any)({
        project_id: projectId,
        user_id: userId
      }, {
        removed_at: new Date(),
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('Project member not found');
      }

      return { success: true };
    } catch (error) {
      console.error('Error in removeUserFromProject:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to remove user from project' };
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
    isSecondaryManager = false,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagerRole(currentUser);

      const projectMember = new ProjectMember({
        project_id: projectId,
        user_id: userId,
        project_role: projectRole,
        is_primary_manager: isPrimaryManager,
        is_secondary_manager: isSecondaryManager,
        assigned_at: new Date()
      });

      await projectMember.save();

      console.log(`Added user ${userId} to project ${projectId} with role ${projectRole}`);
      return { success: true };
    } catch (error) {
      console.error('Error in addUserToProject:', error);
      if (error instanceof AuthorizationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to add user to project' };
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
  }, currentUser: AuthUser): Promise<{ task?: ITask; error?: string }> {
    try {
      // Check project access
      const hasAccess = await this.checkProjectAccess(taskData.project_id, currentUser);
      if (!hasAccess) {
        throw new AuthorizationError('You do not have access to this project');
      }

      const task = new Task({
        project_id: taskData.project_id,
        name: taskData.name,
        description: taskData.description || null,
        assigned_to_user_id: taskData.assigned_to_user_id || null,
        status: taskData.status || 'open',
        estimated_hours: taskData.estimated_hours || null,
        is_billable: taskData.is_billable ?? true,
        created_by_user_id: currentUser.id
      });

      await task.save();

      return { task };
    } catch (error) {
      console.error('Error in createTask:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to create task' };
    }
  }

  /**
   * Update task
   */
  static async updateTask(taskId: string, updates: Partial<ITask>, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if task exists and user has access
      const task = await (Task.findOne as any)({
        _id: taskId,
        deleted_at: { $exists: false }
      });

      if (!task) {
        throw new NotFoundError('Task not found');
      }

      const hasAccess = await this.checkProjectAccess(task.project_id, currentUser);
      if (!hasAccess) {
        throw new AuthorizationError('You do not have access to this project');
      }

      const result = await (Task.updateOne as any)({
        _id: taskId,
        deleted_at: { $exists: false }
      }, {
        ...updates,
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('Task not found');
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateTask:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to update task' };
    }
  }

  /**
   * Get user's assigned tasks
   */
  static async getUserTasks(userId: string, currentUser: AuthUser): Promise<{ tasks: ITask[]; error?: string }> {
    try {
      // Users can get their own tasks, or higher roles can get subordinates' tasks
      if (currentUser.id !== userId && !canManageRoleHierarchy(currentUser.role, 'employee')) {
        throw new AuthorizationError('You can only view your own tasks');
      }

      const tasks = await (Task.find as any)({
        assigned_to_user_id: userId,
        deleted_at: { $exists: false }
      })
        .populate('project_id', 'name client_id')
        .populate('assigned_to_user_id', 'full_name')
        .sort({ created_at: -1 });

      return { tasks };
    } catch (error) {
      console.error('Error in getUserTasks:', error);
      if (error instanceof AuthorizationError) {
        return { tasks: [], error: error.message };
      }
      return { tasks: [], error: 'Failed to fetch user tasks' };
    }
  }

  /**
   * Validate project data
   */
  static validateProjectData(projectData: Partial<IProject>): { isValid: boolean; errors: string[] } {
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
   * Delete task (alias for soft delete)
   */
  static async deleteTask(taskId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if task exists and user has access
      const task = await (Task.findOne as any)({
        _id: taskId,
        deleted_at: { $exists: false }
      });

      if (!task) {
        throw new NotFoundError('Task not found');
      }

      const hasAccess = await this.checkProjectAccess(task.project_id, currentUser);
      if (!hasAccess) {
        throw new AuthorizationError('You do not have access to this project');
      }

      const result = await (Task.updateOne as any)({
        _id: taskId,
        deleted_at: { $exists: false }
      }, {
        deleted_at: new Date(),
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('Task not found');
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteTask:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to delete task' };
    }
  }

  /**
   * Add project member (alias for addUserToProject with simpler interface)
   */
  static async addProjectMember(projectId: string, userId: string, projectRole: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    return this.addUserToProject(projectId, userId, projectRole, false, false, currentUser);
  }

  /**
   * Remove project member (alias for removeUserFromProject)
   */
  static async removeProjectMember(projectId: string, userId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    return this.removeUserFromProject(projectId, userId, currentUser);
  }

  /**
   * Update client
   */
  static async updateClient(clientId: string, updates: Partial<IClient>, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagerRole(currentUser);

      const result = await (Client.updateOne as any)({
        _id: clientId,
        deleted_at: { $exists: false }
      }, {
        ...updates,
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('Client not found');
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateClient:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to update client' };
    }
  }

  /**
   * Delete client (soft delete)
   */
  static async deleteClient(clientId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagerRole(currentUser);

      const result = await (Client.updateOne as any)({
        _id: clientId
      }, {
        deleted_at: new Date(),
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('Client not found');
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteClient:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to delete client' };
    }
  }

  /**
   * Get client by ID
   */
  static async getClientById(clientId: string, currentUser: AuthUser): Promise<{ client?: IClient; error?: string }> {
    try {
      requireManagerRole(currentUser);

      const client = await (Client.findOne as any)({
        _id: clientId,
        deleted_at: { $exists: false }
      });

      if (!client) {
        throw new NotFoundError('Client not found');
      }

      return { client };
    } catch (error) {
      console.error('Error in getClientById:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch client' };
    }
  }

  /**
   * Check if user has access to a project
   * Private helper method
   */
  private static async checkProjectAccess(projectId: string, currentUser: AuthUser): Promise<boolean> {
    // Super admin and management have access to all projects
    if (['super_admin', 'management'].includes(currentUser.role)) {
      return true;
    }

    // Check if user is the primary manager
    const project = await (Project.findOne as any)({
      _id: projectId,
      deleted_at: { $exists: false }
    });

    if (!project) {
      return false;
    }

    if (project.primary_manager_id.toString() === currentUser.id) {
      return true;
    }

    // Check if user is a member of the project
    const membership = await (ProjectMember.findOne as any)({
      project_id: projectId,
      user_id: currentUser.id,
      removed_at: { $exists: false },
      deleted_at: { $exists: false }
    });

    return !!membership;
  }
}