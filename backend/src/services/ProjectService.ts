import mongoose from 'mongoose';
import {
  Project,
  ProjectMember,
  Client,
  Task,
  IProject,
  IClient,
  ITask,
  ProjectStatus
} from '@/models';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError
} from '@/utils/errors';
import {
  AuthUser,
  requireManagementRole,
  requireManagerRole,
  canManageRoleHierarchy
} from '@/utils/auth';
import { requireSuperAdmin } from '@/utils/authorization';
import { AuditLogService } from '@/services/AuditLogService';
import { ValidationUtils } from '@/utils/validation';
import { NotificationService } from '@/services/NotificationService';
import { NotificationRecipientResolver } from '@/services/NotificationRecipientResolver';

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
      requireManagerRole(currentUser);

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

      // Audit log: Project created
      await AuditLogService.logEvent(
        'projects',
        project._id.toString(),
        'PROJECT_CREATED',
        currentUser.id,
        currentUser.full_name,
        { name: project.name, client_id: project.client_id.toString() },
        { created_by: currentUser.id },
        null,
        { name: project.name, status: project.status, is_billable: project.is_billable }
      );

      // Notify management about new project
      try {
        const managementUsers = await NotificationRecipientResolver.getManagementUsers();
        const recipientIds = managementUsers.filter(id => id !== currentUser.id);
        if (recipientIds.length > 0) {
          await NotificationService.notifyProjectCreated({
            recipientIds,
            projectId: project._id.toString(),
            projectName: project.name,
            createdById: currentUser.id,
            createdByName: currentUser.full_name
          });
        }
      } catch (notifError) {

      }

      return { project };
    } catch (error) {

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
      requireManagerRole(currentUser);

      // Fetch the existing project first to verify it exists and get current values
      const oldProject = await (Project.findOne as any)({
        _id: projectId,
        deleted_at: { $exists: false }
      }).lean();

      if (!oldProject) {
        throw new NotFoundError('Project not found');
      }

      // Build the update payload - only include fields that are actually being updated
      const payload: any = {};

      // Only update fields that are explicitly provided in the updates object
      if (updates.name !== undefined) {
        payload.name = updates.name;
      }

      if (updates.description !== undefined) {
        payload.description = updates.description;
      }

      if (updates.client_id !== undefined) {
        payload.client_id = updates.client_id;
      }

      if (updates.primary_manager_id !== undefined) {
        payload.primary_manager_id = updates.primary_manager_id;
      }

      if (updates.start_date !== undefined) {
        // Sanitize: handle string or Date inputs, convert empty string to null
        if ((updates.start_date as any) === '' || updates.start_date === null) {
          payload.start_date = null;
        } else if (typeof updates.start_date === 'string') {
          // Convert string dates to proper Date objects
          const parsedDate = new Date(updates.start_date);
          if (!isNaN(parsedDate.getTime())) {
            payload.start_date = parsedDate;
          } else {
            payload.start_date = null; // Invalid date string
          }
        } else {
          payload.start_date = updates.start_date;
        }
      }

      if (updates.end_date !== undefined) {
        // Sanitize: handle string or Date inputs, convert empty string to null
        if ((updates.end_date as any) === '' || updates.end_date === null) {
          payload.end_date = null;
        } else if (typeof updates.end_date === 'string') {
          // Convert string dates to proper Date objects
          const parsedDate = new Date(updates.end_date);
          if (!isNaN(parsedDate.getTime())) {
            payload.end_date = parsedDate;
          } else {
            payload.end_date = null; // Invalid date string
          }
        } else {
          payload.end_date = updates.end_date;
        }
      }

      if (updates.status !== undefined) {
        payload.status = updates.status;
      }

      if (updates.budget !== undefined) {
        // Sanitize: convert empty string or null to null, parse number strings
        if ((updates.budget as any) === '' || updates.budget === null) {
          payload.budget = null;
        } else if (typeof updates.budget === 'string') {
          const parsedBudget = parseFloat(updates.budget as string);
          payload.budget = isNaN(parsedBudget) ? null : parsedBudget;
        } else {
          payload.budget = updates.budget;
        }
      }

      if (updates.is_billable !== undefined) {
        payload.is_billable = updates.is_billable;
      }

      // Always set updated_at
      payload.updated_at = new Date();

      // Only proceed with update if there are actually fields to update (besides updated_at)
      const fieldsToUpdate = Object.keys(payload).filter(key => key !== 'updated_at');
      if (fieldsToUpdate.length === 0) {
        return { success: true }; // No fields to update, but that's okay
      }

      // Check if manager is being changed for notification purposes
      const managerChanged = updates.primary_manager_id && 
        oldProject?.primary_manager_id?.toString() !== updates.primary_manager_id?.toString();

      const result = await (Project.updateOne as any)({
        _id: projectId,
        deleted_at: { $exists: false }
      }, payload);

      if (result.matchedCount === 0) {
        throw new NotFoundError('Project not found');
      }

      // Audit log: Project updated
      const updatedProject = await (Project.findById as any)(projectId).lean();
      if (updatedProject) {
        await AuditLogService.logEvent(
          'projects',
          projectId,
          'PROJECT_UPDATED',
          currentUser.id,
          currentUser.full_name,
          { name: updatedProject.name, updated_fields: fieldsToUpdate },
          { updated_by: currentUser.id },
          null,
          payload
        );

        // Notify if manager was changed
        if (managerChanged && oldProject) {
          try {
            // Notify new manager
            if (updates.primary_manager_id) {
              await NotificationService.notifyProjectManagerAssigned({
                recipientIds: [updates.primary_manager_id.toString()],
                projectId,
                projectName: updatedProject.name,
                newManagerId: updates.primary_manager_id.toString(),
                assignedById: currentUser.id,
                assignedByName: currentUser.full_name
              });
            }

            // Notify old manager they were removed
            if (oldProject.primary_manager_id) {
              await NotificationService.notifyProjectMemberRemoved({
                recipientIds: [oldProject.primary_manager_id.toString()],
                projectId,
                projectName: updatedProject.name,
                removedById: currentUser.id,
                removedByName: currentUser.full_name
              });
            }
          } catch (notifError) {

          }
        }

        // Notify management about project updates
        try {
          const managementUsers = await NotificationRecipientResolver.getManagementUsers();
          const recipientIds = managementUsers.filter(id => id !== currentUser.id);
          if (recipientIds.length > 0) {
            await NotificationService.notifyProjectUpdated({
              recipientIds,
              projectId,
              projectName: updatedProject.name,
              updatedById: currentUser.id,
              updatedByName: currentUser.full_name,
              updatedFields: Object.keys(updates)
            });
          }
        } catch (notifError) {

        }
      }

      return { success: true };
    } catch (error) {

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
      // Manager, Management, and Super Admin can see all projects
      requireManagerRole(currentUser);

      const projects = await (Project.find as any)({
        deleted_at: { $exists: false }
      })
        .populate('client_id', 'name contact_person')
        .populate('primary_manager_id', 'full_name')
        .sort({ created_at: -1 });

      return { projects };
    } catch (error) {

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
      let projects;

      // Managers and above can see all projects by status
      // Employees can see projects they are assigned to
      if (currentUser.role === 'employee' || currentUser.role === 'lead') {
        // For employees and leads, only show projects they are members of
        projects = await (Project.find as any)({
          status,
          deleted_at: { $exists: false },
          $or: [
            { primary_manager_id: currentUser.id },
            { members: currentUser.id }
          ]
        })
          .populate('client_id', 'name contact_person')
          .populate('primary_manager_id', 'full_name')
          .populate('members', 'full_name email role')
          .sort({ created_at: -1 });
      } else {
        // For managers and above, show all projects
        requireManagerRole(currentUser);
        
        projects = await (Project.find as any)({
          status,
          deleted_at: { $exists: false }
        })
          .populate('client_id', 'name contact_person')
          .populate('primary_manager_id', 'full_name')
          .populate('members', 'full_name email role')
          .sort({ created_at: -1 });
      }

      // Transform projects to include embedded tasks if needed
      const projectsWithTasks = [];
      for (const project of projects) {
        const projectObj = project.toObject();
        
        // Fetch tasks for this project
        const tasks = await (Task.find as any)({
          project_id: projectObj._id,
          deleted_at: { $exists: false }
        })
          .populate('assigned_to_user_id', 'full_name email')
          .populate('created_by_user_id', 'full_name email')
          .sort({ created_at: -1 });

        // Transform tasks to have consistent ID format
        const transformedTasks = tasks.map((task: any) => {
          const taskObj = task.toObject();
          
          // Normalize assigned_to_user_id
          let assignedToUserId = null;
          if (taskObj.assigned_to_user_id) {
            if (typeof taskObj.assigned_to_user_id === 'object' && taskObj.assigned_to_user_id._id) {
              assignedToUserId = taskObj.assigned_to_user_id._id.toString();
            } else if (typeof taskObj.assigned_to_user_id === 'string') {
              assignedToUserId = taskObj.assigned_to_user_id;
            }
          }

          // Normalize created_by_user_id
          let createdByUserId = null;
          if (taskObj.created_by_user_id) {
            if (typeof taskObj.created_by_user_id === 'object' && taskObj.created_by_user_id._id) {
              createdByUserId = taskObj.created_by_user_id._id.toString();
            } else if (typeof taskObj.created_by_user_id === 'string') {
              createdByUserId = taskObj.created_by_user_id;
            }
          }

          return {
            ...taskObj,
            id: taskObj._id.toString(),
            assigned_to_user_id: assignedToUserId,
            created_by_user_id: createdByUserId
          };
        });

        projectsWithTasks.push({
          ...projectObj,
          id: projectObj._id.toString(),
          tasks: transformedTasks
        });
      }

      return { projects: projectsWithTasks };
    } catch (error) {

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
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return { tasks: [], error: 'Invalid project ID format' };
      }

      // Check if project exists first
      const projectExists = await (Project.findOne as any)({
        _id: new mongoose.Types.ObjectId(projectId),
        deleted_at: { $exists: false }
      });

      if (!projectExists) {
        return { tasks: [], error: 'Project not found' };
      }

      // Check if user has access to this project
      const hasAccess = await this.checkProjectAccess(projectId, currentUser);
      if (!hasAccess) {
        return { tasks: [], error: 'You do not have access to this project' };
      }

      const tasks = await (Task.find as any)({
        project_id: new mongoose.Types.ObjectId(projectId),
        deleted_at: { $exists: false }
      })
        .populate('assigned_to_user_id', 'full_name')
        .populate('created_by_user_id', 'full_name')
        .sort({ created_at: -1 });

      // Transform tasks to have consistent ID format and normalize populated fields
      const transformedTasks = tasks.map((task: any) => {
        const taskObj = task.toObject();
        
        // Normalize assigned_to_user_id
        let assignedToUserId = null;
        if (taskObj.assigned_to_user_id) {
          if (typeof taskObj.assigned_to_user_id === 'object' && taskObj.assigned_to_user_id._id) {
            assignedToUserId = taskObj.assigned_to_user_id._id.toString();
          } else if (typeof taskObj.assigned_to_user_id === 'string') {
            assignedToUserId = taskObj.assigned_to_user_id;
          }
        }

        // Normalize created_by_user_id
        let createdByUserId = null;
        if (taskObj.created_by_user_id) {
          if (typeof taskObj.created_by_user_id === 'object' && taskObj.created_by_user_id._id) {
            createdByUserId = taskObj.created_by_user_id._id.toString();
          } else if (typeof taskObj.created_by_user_id === 'string') {
            createdByUserId = taskObj.created_by_user_id;
          }
        }

        return {
          ...taskObj,
          id: taskObj._id.toString(),
          assigned_to_user_id: assignedToUserId,
          created_by_user_id: createdByUserId
        };
      });

      return { tasks: transformedTasks };
    } catch (error) {

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

      return { success: true };
    } catch (error) {

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
      // requireManagerRole(currentUser);

      const clients = await (Client.find as any)({
        is_active: true,
        deleted_at: { $exists: false }
      });

      return { clients };
    } catch (error) {

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
   * Get projects based on user role - Management sees all, others see their assigned projects
   */
  static async getProjects(currentUser: AuthUser): Promise<{ projects: ProjectWithDetails[]; error?: string }> {
    // If management level, return all projects
    if (['super_admin', 'management', 'manager'].includes(currentUser.role)) {
      return this.getAllProjects(currentUser);
    }
    
    // For employees and leads, return their assigned projects
    return this.getUserProjects(currentUser.id, currentUser);
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

      return { client };
    } catch (error) {

      if (error instanceof ValidationError || error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to create client' };
    }
  }

  /**
   * Get project by ID
   */
  static async getProjectById(projectId: string, currentUser: AuthUser): Promise<{ project?: ProjectWithDetails; error?: string; warnings?: string[] }> {
    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return { error: 'Invalid project ID format' };
      }

      // Check if project exists first
      const project = await (Project.findOne as any)({
        _id: new mongoose.Types.ObjectId(projectId),
        deleted_at: { $exists: false }
      })
        .populate('client_id', 'name contact_person')
        .populate('primary_manager_id', 'full_name');

      if (!project) {
        return { error: 'Project not found' };
      }

      // Then check project access
      const hasAccess = await this.checkProjectAccess(projectId, currentUser);
      if (!hasAccess) {
        return { error: 'You do not have access to this project' };
      }

      // Non-blocking validation: check whether the project has a Lead assigned.
      // This is a soft/warning check intended for UI display only and must not block operations.
      const leadMember = await (ProjectMember.findOne as any)({
        project_id: new mongoose.Types.ObjectId(projectId),
        project_role: 'lead',
        removed_at: { $exists: false },
        deleted_at: { $exists: false }
      }).lean();

      const warnings: string[] = [];
      if (!leadMember) {
        // Frontend can display this warning (non-blocking)
        warnings.push('project_must_have_lead');
      }

      return { project, warnings };
    } catch (error) {

      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch project' };
    }
  }

  /**
   * Soft delete project
   */
  static async deleteProject(projectId: string, reason: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagementRole(currentUser);

      if (!reason || reason.trim().length === 0) {
        return { success: false, error: 'Delete reason is required' };
      }

      // Check if project exists and is not already deleted
      const project = await (Project.findById as any)(projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      if (project.deleted_at) {
        return { success: false, error: 'Project is already deleted' };
      }

      const result = await (Project.updateOne as any)({
        _id: projectId
      }, {
        deleted_at: new Date(),
        deleted_by: currentUser.id,
        deleted_reason: reason,
        status: 'archived',
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('Project not found');
      }

      // Cascade soft delete to all tasks associated with this project
      const Task = (await import('../models/Task')).default;
      const taskUpdateResult = await (Task.updateMany as any)(
        { project_id: projectId, deleted_at: null },
        {
          deleted_at: new Date(),
          deleted_by: currentUser.id,
          deleted_reason: `Project deleted: ${reason}`
        }
      );


      // Audit log: Project deleted
      await AuditLogService.logEvent(
        'projects',
        projectId,
        'PROJECT_DELETED',
        currentUser.id,
        currentUser.full_name,
        {
          name: project.name,
          client_id: project.client_id?.toString(),
          reason: reason,
          cascade_deleted_tasks: taskUpdateResult.modifiedCount
        },
        { deleted_by: null, deleted_at: null, deleted_reason: null },
        { deleted_by: currentUser.id, deleted_at: new Date(), deleted_reason: reason }
      );

      // Notify project manager and management about deletion
      try {
        const recipientIds = [];
        
        // Notify project manager
        if (project.primary_manager_id && project.primary_manager_id.toString() !== currentUser.id) {
          recipientIds.push(project.primary_manager_id.toString());
        }

        // Notify management
        const managementUsers = await NotificationRecipientResolver.getManagementUsers();
        for (const managementUserId of managementUsers) {
          if (managementUserId !== currentUser.id && !recipientIds.includes(managementUserId)) {
            recipientIds.push(managementUserId);
          }
        }

        // Send notifications
        if (recipientIds.length > 0) {
          await NotificationService.notifyProjectDeleted({
            recipientIds,
            projectId,
            projectName: project.name,
            deletedById: currentUser.id,
            deletedByName: currentUser.full_name,
            reason
          });
        }
      } catch (notifError) {

      }

      return { success: true };
    } catch (error) {

      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to delete project' };
    }
  }

  /**
   * Check if project can be hard deleted (check for critical dependencies)
   */
  static async canHardDeleteProject(projectId: string): Promise<{
    canDelete: boolean;
    dependencies: string[];
    counts: {
      timeEntries: number;
      billingRecords: number;
      timesheetApprovals: number;
    };
  }> {
    try {
      const dependencies: string[] = [];
      const counts = {
        timeEntries: 0,
        billingRecords: 0,
        timesheetApprovals: 0
      };

      // Check for time entries (critical financial/legal records)
      const TimeEntry = (await import('../models/TimeEntry')).default;
      const timeEntryCount = await (TimeEntry.countDocuments as any)({
        project_id: projectId
      });
      counts.timeEntries = timeEntryCount;
      if (timeEntryCount > 0) {
        dependencies.push(`${timeEntryCount} time entry/entries (financial records)`);
      }

      // Check for billing adjustments
      const BillingAdjustment = (await import('../models/BillingAdjustment')).default;
      const billingCount = await (BillingAdjustment.countDocuments as any)({
        project_id: projectId
      });
      counts.billingRecords = billingCount;
      if (billingCount > 0) {
        dependencies.push(`${billingCount} billing record(s)`);
      }

      // Check for timesheet project approvals
      const TimesheetProjectApproval = (await import('../models/TimesheetProjectApproval')).default;
      const approvalCount = await (TimesheetProjectApproval.countDocuments as any)({
        project_id: projectId
      });
      counts.timesheetApprovals = approvalCount;
      if (approvalCount > 0) {
        dependencies.push(`${approvalCount} timesheet approval(s)`);
      }

      return {
        canDelete: dependencies.length === 0,
        dependencies,
        counts
      };
    } catch (error) {

      return {
        canDelete: false,
        dependencies: ['Error checking dependencies'],
        counts: { timeEntries: 0, billingRecords: 0, timesheetApprovals: 0 }
      };
    }
  }

  /**
   * Hard delete project (permanent deletion)
   * Only allowed if no critical dependencies exist
   */
  static async hardDeleteProject(projectId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      requireSuperAdmin(currentUser);

      // Get the project before deletion
      const project = await (Project.findById as any)(projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Must be soft deleted first
      if (!project.deleted_at) {
        return {
          success: false,
          error: 'Project must be soft deleted first before permanent deletion'
        };
      }

      // CHECK CRITICAL DEPENDENCIES - Enterprise Standard
      const dependencyCheck = await this.canHardDeleteProject(projectId);

      if (!dependencyCheck.canDelete) {
        return {
          success: false,
          error: `Cannot permanently delete project. Has critical dependencies: ${dependencyCheck.dependencies.join(', ')}. These are permanent financial/legal records that must be preserved.`
        };
      }

      // If no critical dependencies, cascade hard delete non-critical data
      const Task = (await import('../models/Task')).default;
      const ProjectMember = (await import('../models/Project')).ProjectMember;

      const taskDeleteResult = await (Task.deleteMany as any)({ project_id: projectId });
      const memberDeleteResult = await (ProjectMember.deleteMany as any)({ project_id: projectId });


      // Log audit event BEFORE deleting
      await AuditLogService.logEvent(
        'projects',
        projectId,
        'PROJECT_HARD_DELETED',
        currentUser.id,
        currentUser.full_name,
        {
          name: project.name,
          client_id: project.client_id?.toString(),
          deleted_reason: project.deleted_reason,
          original_deleted_at: project.deleted_at,
          original_deleted_by: project.deleted_by,
          cascade_hard_deleted_tasks: taskDeleteResult.deletedCount,
          cascade_hard_deleted_members: memberDeleteResult.deletedCount,
          dependency_check: dependencyCheck.counts
        }
      );

      // Permanently delete from database
      const result = await (Project.deleteOne as any)({ _id: projectId });

      if (result.deletedCount === 0) {
        throw new NotFoundError('Project not found or already deleted');
      }

      return { success: true };
    } catch (error) {

      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to permanently delete project' };
    }
  }

  /**
   * Restore soft-deleted project
   */
  static async restoreProject(projectId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagementRole(currentUser);

      // Get the project before restoration
      const project = await (Project.findById as any)(projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      if (!project.deleted_at) {
        return { success: false, error: 'Project is not deleted' };
      }

      const result = await (Project.updateOne as any)({
        _id: projectId
      }, {
        $unset: { deleted_at: '', deleted_by: '', deleted_reason: '' },
        status: 'active',
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('Project not found');
      }

      // Audit log: Project restored
      await AuditLogService.logEvent(
        'projects',
        projectId,
        'PROJECT_RESTORED',
        currentUser.id,
        currentUser.full_name,
        {
          name: project.name,
          client_id: project.client_id?.toString(),
          original_deleted_reason: project.deleted_reason
        },
        { deleted_at: project.deleted_at, deleted_by: project.deleted_by, deleted_reason: project.deleted_reason },
        { deleted_at: null, deleted_by: null, deleted_reason: null }
      );

      return { success: true };
    } catch (error) {

      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to restore project' };
    }
  }

  /**
   * Get all deleted projects
   */
  static async getDeletedProjects(currentUser: AuthUser): Promise<{ projects: any[]; error?: string }> {
    try {
      requireManagementRole(currentUser);

      const projects = await (Project.find as any)({
        deleted_at: { $ne: null },
        is_hard_deleted: { $ne: true }
      })
        .populate('client_id', 'name')
        .populate('primary_manager_id', 'full_name email')
        .sort({ deleted_at: -1 })
        .lean();

      return { projects };
    } catch (error) {

      if (error instanceof AuthorizationError) {
        return { projects: [], error: error.message };
      }
      return { projects: [], error: 'Failed to fetch deleted projects' };
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

      // Populate tasks for each project and transform to frontend format
      const projectsWithTasks = await Promise.all(
        deduplicatedProjects.map(async (project) => {
          const tasks = await (Task.find as any)({
            project_id: project._id,
            deleted_at: { $exists: false }
          });
          
          // Manually transform project to frontend format
          const projectObj = project.toObject ? project.toObject() : project;
          const transformedProject = {
            id: projectObj._id.toString(),
            name: projectObj.name,
            client_id: projectObj.client_id,
            primary_manager_id: projectObj.primary_manager_id,
            status: projectObj.status,
            start_date: projectObj.start_date,
            end_date: projectObj.end_date,
            budget: projectObj.budget,
            description: projectObj.description,
            is_billable: projectObj.is_billable,
            created_at: projectObj.created_at,
            updated_at: projectObj.updated_at
          };
          
          // Transform tasks to frontend format
          const transformedTasks = tasks.map((task: any) => {
            const taskObj = task.toObject ? task.toObject() : task;

            // Normalize assigned_to_user_id to a string (or null). It might be:
            // - null/undefined
            // - a plain ObjectId instance
            // - a populated user object with _id or id
            // - already a string
            let assignedToUserId: string | null = null;
            const at = taskObj.assigned_to_user_id;
            if (at !== null && at !== undefined) {
              if (typeof at === 'string') {
                assignedToUserId = at;
              } else if (typeof at === 'object') {
                if (at._id) {
                  assignedToUserId = at._id.toString();
                } else if (at.id) {
                  assignedToUserId = at.id.toString();
                } else if (typeof at.toString === 'function') {
                  const s = at.toString();
                  if (s && !s.includes('[object Object]')) assignedToUserId = s;
                }
              } else {
                // fallback for ObjectId-like values
                try {
                  assignedToUserId = String(at);
                } catch (e) {
                  assignedToUserId = null;
                }
              }
            }

            // Normalize created_by_user_id similarly (may be populated)
            let createdByUserId: string | null = null;
            const cb = taskObj.created_by_user_id;
            if (cb !== null && cb !== undefined) {
              if (typeof cb === 'string') {
                createdByUserId = cb;
              } else if (typeof cb === 'object') {
                if (cb._id) createdByUserId = cb._id.toString();
                else if (cb.id) createdByUserId = cb.id.toString();
                else createdByUserId = String(cb);
              } else {
                createdByUserId = String(cb);
              }
            }

            return {
              id: taskObj._id.toString(),
              project_id: taskObj.project_id ? taskObj.project_id.toString() : null,
              name: taskObj.name,
              description: taskObj.description,
              assigned_to_user_id: assignedToUserId,
              status: taskObj.status,
              estimated_hours: taskObj.estimated_hours,
              is_billable: taskObj.is_billable,
              created_by_user_id: createdByUserId,
              created_at: taskObj.created_at,
              updated_at: taskObj.updated_at
            };
          });
          
          const result = {
            ...transformedProject,
            tasks: transformedTasks
          };
          
          
          return result;
        })
      );

      return { projects: projectsWithTasks as unknown as ProjectWithDetails[] };
    } catch (error) {

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
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return { members: [], error: 'Invalid project ID format' };
      }

      // Check if project exists first
      const projectExists = await (Project.findOne as any)({
        _id: new mongoose.Types.ObjectId(projectId),
        deleted_at: { $exists: false }
      });

      if (!projectExists) {
        return { members: [], error: 'Project not found' };
      }

      // Check project access
      const hasAccess = await this.checkProjectAccess(projectId, currentUser);
      if (!hasAccess) {
        return { members: [], error: 'You do not have access to this project' };
      }

      const members = await (ProjectMember.find as any)({
        project_id: new mongoose.Types.ObjectId(projectId),
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

      if (error instanceof AuthorizationError) {
        return { members: [], error: error.message };
      }
      return { members: [], error: 'Failed to fetch project members' };
    }
  }

  /**
   * Remove user from project (hard delete)
   */
  static async removeUserFromProject(projectId: string, userId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagerRole(currentUser);

      // Get project and user details before removal
      const project = await (Project.findById as any)(projectId).select('name primary_manager_id').lean();
      const projectMember = await (ProjectMember.findOne as any)({
        project_id: projectId,
        user_id: userId,
        removed_at: { $exists: false },
        deleted_at: { $exists: false }
      }).populate('user_id', 'full_name email').lean();

      if (!projectMember) {
        throw new NotFoundError('Project member not found');
      }

      // Audit log: Project member removed
      await AuditLogService.logEvent(
        'project_members',
        projectMember._id.toString(),
        'PROJECT_MEMBER_REMOVED',
        currentUser.id,
        currentUser.full_name,
        {
          project_id: projectId,
          project_name: project?.name,
          user_id: userId,
          user_name: projectMember.user_id?.full_name,
          user_email: projectMember.user_id?.email,
          project_role: projectMember.project_role,
          is_primary_manager: projectMember.is_primary_manager,
          is_secondary_manager: projectMember.is_secondary_manager
        },
        {
          project_id: projectId,
          user_id: userId,
          project_role: projectMember.project_role,
          is_primary_manager: projectMember.is_primary_manager,
          is_secondary_manager: projectMember.is_secondary_manager,
          assigned_at: projectMember.assigned_at
        },
        null,
        null
      );

      // Hard delete the project member
      const result = await (ProjectMember.deleteOne as any)({
        _id: projectMember._id
      });

      if (result.deletedCount === 0) {
        throw new NotFoundError('Project member not found');
      }

      // Notify the removed member and project manager
      if (project && projectMember) {
        try {
          const recipientIds = [userId];

          // Add project manager to recipients
          if (project.primary_manager_id && project.primary_manager_id.toString() !== currentUser.id) {
            recipientIds.push(project.primary_manager_id.toString());
          }

          await NotificationService.notifyProjectMemberRemoved({
            recipientIds,
            projectId,
            projectName: project.name,
            userId,
            removedById: currentUser.id,
            removedByName: currentUser.full_name
          });
        } catch (notifError) {

        }
      }

      return { success: true };
    } catch (error) {

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
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      requireManagerRole(currentUser);

      const projectMember = new ProjectMember({
        project_id: projectId,
        user_id: userId,
        project_role: projectRole,
        is_primary_manager: isPrimaryManager,
        assigned_at: new Date()
      });

      await projectMember.save();

      return { success: true };
    } catch (error) {

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

      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to delete task' };
    }
  }

  /**
   * Add project member (alias for addUserToProject with simpler interface)
   */
  static async addProjectMember(projectId: string, userId: string, projectRole: string, isPrimaryManager: boolean,  currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    return this.addUserToProject(projectId, userId, projectRole, isPrimaryManager, currentUser);
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
    try {
      // Super admin, management, and manager have access to all projects
      if (['super_admin', 'management', 'manager'].includes(currentUser.role)) {
        return true;
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        console.log(`Invalid ObjectId format: ${projectId}`);
        return false;
      }

      // Check if project exists first
      const project = await (Project.findOne as any)({
        _id: new mongoose.Types.ObjectId(projectId),
        deleted_at: { $exists: false }
      });

      if (!project) {
        console.log(`Project not found: ${projectId}`);
        return false;
      }

      // Check if user is the primary manager
      if (project.primary_manager_id && project.primary_manager_id.toString() === currentUser.id) {
        return true;
      }

      // Check if user is a member of the project
      const membership = await (ProjectMember.findOne as any)({
        project_id: new mongoose.Types.ObjectId(projectId),
        user_id: new mongoose.Types.ObjectId(currentUser.id),
        removed_at: { $exists: false },
        deleted_at: { $exists: false }
      });

      return !!membership;
    } catch (error) {
      console.error(`Error checking project access for project ${projectId}, user ${currentUser.id}:`, error);
      return false;
    }
  }

  // ========================================================================
  // MULTI-PROJECT ROLE SYSTEM ENHANCEMENTS
  // ========================================================================

  /**
   * Project-specific permission interface with enhanced role support
   */
  static async getProjectPermissions(userId: string, projectId: string): Promise<{
    projectRole: string | null;
    systemRole: string;
    hasManagerAccess: boolean;
    canAddMembers: boolean;
    canApproveTimesheets: boolean;
    canViewAllTasks: boolean;
    canAssignTasks: boolean;
    isElevated: boolean;
    effectivePermissions: string[];
  }> {
    try {
      // Get user's system role first
      const User = (await import('@/models/User')).default;
      const user = await (User.findById as any)(userId);

      if (!user) {
        return {
          projectRole: null,
          systemRole: 'employee',
          hasManagerAccess: false,
          canAddMembers: false,
          canApproveTimesheets: false,
          canViewAllTasks: false,
          canAssignTasks: false,
          isElevated: false,
          effectivePermissions: []
        };
      }

      const systemRole = user.role;
      
      // Import enhanced authorization
      const { getUserEffectivePermissions } = await import('@/utils/enhancedAuthorization');

      // Super admin and management have all permissions everywhere
      if (['super_admin', 'management'].includes(systemRole)) {
        const permissions = getUserEffectivePermissions(systemRole);
        return {
          projectRole: 'management',
          systemRole,
          hasManagerAccess: true,
          canAddMembers: true,
          canApproveTimesheets: true,
          canViewAllTasks: true,
          canAssignTasks: true,
          isElevated: false,
          effectivePermissions: permissions.effectivePermissions
        };
      }

      // Check if user is primary manager of the project
      const project = await (Project.findOne as any)({
        _id: projectId,
        deleted_at: { $exists: false }
      });

      if (project && project.primary_manager_id.toString() === userId) {
        const permissions = getUserEffectivePermissions(systemRole, 'secondary_manager', projectId);
        return {
          projectRole: 'primary_manager',
          systemRole,
          hasManagerAccess: true,
          canAddMembers: true,
          canApproveTimesheets: true,
          canViewAllTasks: true,
          canAssignTasks: true,
          isElevated: false,
          effectivePermissions: permissions.effectivePermissions
        };
      }

      // Get project membership to check for role elevation
      const ProjectMember = (await import('@/models/Project')).ProjectMember;
      const membership = await (ProjectMember.findOne as any)({
        project_id: projectId,
        user_id: userId,
        removed_at: { $exists: false },
        deleted_at: { $exists: false }
      });

      if (!membership) {
        const permissions = getUserEffectivePermissions(systemRole);
        return {
          projectRole: null,
          systemRole,
          hasManagerAccess: false,
          canAddMembers: false,
          canApproveTimesheets: false,
          canViewAllTasks: false,
          canAssignTasks: false,
          isElevated: false,
          effectivePermissions: permissions.effectivePermissions
        };
      }

      // Determine project role - check for elevation
      let projectRole = membership.project_role;
      const isSecondaryManager = membership.is_secondary_manager;
      const isElevated = (systemRole === 'lead' && isSecondaryManager) || 
                        (systemRole === 'employee' && projectRole === 'lead');

      if (isSecondaryManager) {
        projectRole = 'secondary_manager';
      }

      // Get effective permissions using enhanced authorization
      const permissions = getUserEffectivePermissions(systemRole, projectRole, projectId);

      return {
        projectRole,
        systemRole,
        hasManagerAccess: permissions.canManageProjectMembers,
        canAddMembers: permissions.canManageProjectMembers,
        canApproveTimesheets: permissions.canApproveTimesheets,
        canViewAllTasks: permissions.canViewTeamData || permissions.canAssignTasks,
        canAssignTasks: permissions.canAssignTasks,
        isElevated,
        effectivePermissions: permissions.effectivePermissions
      };

    } catch (error) {

      return {
        projectRole: null,
        systemRole: 'employee',
        hasManagerAccess: false,
        canAddMembers: false,
        canApproveTimesheets: false,
        canViewAllTasks: false,
        canAssignTasks: false,
        isElevated: false,
        effectivePermissions: []
      };
    }
  }

  /**
   * Check if user can add another user to a specific project
   */
  static async canAddToProject(
    currentUserId: string,
    projectId: string,
    targetUserId: string,
    targetRole: string
  ): Promise<{ canAdd: boolean; reason?: string }> {
    try {
      // Get current user's permissions on this project
      const permissions = await this.getProjectPermissions(currentUserId, projectId);

      if (!permissions.canAddMembers) {
        return {
          canAdd: false,
          reason: 'You do not have permission to add members to this project'
        };
      }

      // Check if target user already exists in this project
      const existingMembership = await (ProjectMember.findOne as any)({
        project_id: projectId,
        user_id: targetUserId,
        removed_at: { $exists: false },
        deleted_at: { $exists: false }
      });

      if (existingMembership) {
        return {
          canAdd: false,
          reason: 'User is already a member of this project'
        };
      }

      // Validate target role
      const validRoles = ['employee', 'lead', 'manager'];
      if (!validRoles.includes(targetRole)) {
        return {
          canAdd: false,
          reason: 'Invalid project role specified'
        };
      }

      // Additional role-based validation
      const User = (await import('@/models/User')).default;
      const currentUser = await (User.findById as any)(currentUserId);
      const targetUser = await (User.findById as any)(targetUserId);

      if (!currentUser || !targetUser) {
        return {
          canAdd: false,
          reason: 'User not found'
        };
      }

      // System role validation - can't assign higher project role than system allows
      if (targetRole === 'manager' && !['manager', 'management', 'super_admin'].includes(targetUser.role)) {
        return {
          canAdd: false,
          reason: 'User system role does not support manager project role'
        };
      }

      return { canAdd: true };

    } catch (error) {

      return {
        canAdd: false,
        reason: 'Error validating permissions'
      };
    }
  }

  /**
   * Enhanced add project member with role validation
   */
  static async addProjectMemberEnhanced(
    projectId: string,
    userId: string,
    projectRole: string,
    hasManagerAccess: boolean = false,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate permission to add
      const canAddResult = await this.canAddToProject(currentUser.id, projectId, userId, projectRole);

      if (!canAddResult.canAdd) {
        return {
          success: false,
          error: canAddResult.reason || 'Cannot add user to project'
        };
      }

      // Determine manager access flags
      let isPrimaryManager = false;
      let isSecondaryManager = false;

      if (projectRole === 'manager') {
        isPrimaryManager = true;
      } else if (hasManagerAccess) {
        isSecondaryManager = true;
      }

      // Create project membership
      const projectMember = new ProjectMember({
        project_id: projectId,
        user_id: userId,
        project_role: projectRole,
        is_primary_manager: isPrimaryManager,
        is_secondary_manager: isSecondaryManager,
        assigned_at: new Date()
      });

      await projectMember.save();

      // Notify the added member and project manager
      try {
        const project = await (Project.findById as any)(projectId).select('name primary_manager_id').lean();
        if (project) {
          const recipientIds = [userId];
          
          // Add project manager to recipients
          if (project.primary_manager_id && project.primary_manager_id.toString() !== currentUser.id) {
            recipientIds.push(project.primary_manager_id.toString());
          }

          await NotificationService.notifyProjectMemberAdded({
            recipientIds,
            projectId,
            projectName: project.name,
            userId,
            role: projectRole,
            addedById: currentUser.id,
            addedByName: currentUser.full_name
          });
        }
      } catch (notifError) {

      }

      return { success: true };

    } catch (error) {

      return {
        success: false,
        error: 'Failed to add project member'
      };
    }
  }

  /**
   * Update project member role and permissions
   */
  static async updateProjectMemberRole(
    projectId: string,
    userId: string,
    newProjectRole: string,
    hasManagerAccess: boolean = false,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if current user can manage members in this project
      const permissions = await this.getProjectPermissions(currentUser.id, projectId);

      if (!permissions.canAddMembers) {
        return {
          success: false,
          error: 'You do not have permission to modify members in this project'
        };
      }

      // Find existing membership
      const membership = await (ProjectMember.findOne as any)({
        project_id: projectId,
        user_id: userId,
        removed_at: { $exists: false },
        deleted_at: { $exists: false }
      });

      if (!membership) {
        return {
          success: false,
          error: 'User is not a member of this project'
        };
      }

      // Validate new role
      const validRoles = ['employee', 'lead', 'manager'];
      if (!validRoles.includes(newProjectRole)) {
        return {
          success: false,
          error: 'Invalid project role'
        };
      }

      // Update membership
      const updates: any = {
        project_role: newProjectRole,
        updated_at: new Date()
      };

      // Set manager access flags
      if (newProjectRole === 'manager') {
        updates.is_primary_manager = true;
        updates.is_secondary_manager = false;
      } else if (hasManagerAccess) {
        updates.is_primary_manager = false;
        updates.is_secondary_manager = true;
      } else {
        updates.is_primary_manager = false;
        updates.is_secondary_manager = false;
      }

      await (ProjectMember.updateOne as any)({
        project_id: projectId,
        user_id: userId
      }, updates);

      return { success: true };

    } catch (error) {

      return {
        success: false,
        error: 'Failed to update project member role'
      };
    }
  }

  /**
   * Get user's roles across all projects
   */
  static async getUserProjectRoles(userId: string, currentUser: AuthUser): Promise<{
    userProjectRoles?: Array<{
      projectId: string;
      projectName: string;
      projectRole: string;
      hasManagerAccess: boolean;
      isActive: boolean;
    }>;
    error?: string;
  }> {
    try {
      // Check permission - users can see their own roles, managers+ can see others
      if (userId !== currentUser.id && !canManageRoleHierarchy(currentUser.role, 'employee')) {
        return {
          error: 'You do not have permission to view this user\'s project roles'
        };
      }

      const memberships = await (ProjectMember.find as any)({
        user_id: userId,
        removed_at: { $exists: false },
        deleted_at: { $exists: false }
      }).populate('project_id', 'name status');

      const userProjectRoles = memberships.map((membership: any) => ({
        projectId: membership.project_id._id.toString(),
        projectName: membership.project_id.name,
        projectRole: membership.project_role,
        hasManagerAccess: membership.is_primary_manager || membership.is_secondary_manager,
        isActive: membership.project_id.status === 'active'
      }));

      return { userProjectRoles };

    } catch (error) {

      return {
        error: 'Failed to fetch user project roles'
      };
    }
  }

  /**
   * Get available users for a project (filtered by current user's permissions)
   */
  static async getAvailableUsersForProject(
    projectId: string,
    currentUser: AuthUser
  ): Promise<{
    users?: Array<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      currentProjectRoles: Array<{
        projectId: string;
        projectName: string;
        projectRole: string;
      }>;
    }>;
    error?: string;
  }> {
    try {
      // Check if user can add members to this project
      const permissions = await this.getProjectPermissions(currentUser.id, projectId);

      if (!permissions.canAddMembers) {
        return {
          error: 'You do not have permission to view available users for this project'
        };
      }

      const User = (await import('@/models/User')).default;

      // Get all active users
      let userQuery: any = {
        is_active: true,
        is_approved_by_super_admin: true,
        deleted_at: { $exists: false }
      };

      const users = await (User.find as any)(userQuery);

      // Get current project members to exclude them
      const currentMembers = await (ProjectMember.find as any)({
        project_id: projectId,
        removed_at: { $exists: false },
        deleted_at: { $exists: false }
      });

      const currentMemberIds = currentMembers.map((m: any) => m.user_id.toString());

      // Filter out current members and get project roles for remaining users
      const availableUsersPromises = users
        .filter((user: any) => !currentMemberIds.includes(user._id.toString()))
        .map(async (user: any) => {
          // Get user's roles in other projects
          const otherMemberships = await (ProjectMember.find as any)({
            user_id: user._id,
            project_id: { $ne: projectId },
            removed_at: { $exists: false },
            deleted_at: { $exists: false }
          }).populate('project_id', 'name');

          const currentProjectRoles = otherMemberships.map((membership: any) => ({
            projectId: membership.project_id._id.toString(),
            projectName: membership.project_id.name,
            projectRole: membership.project_role
          }));

          return {
            id: user._id.toString(),
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            currentProjectRoles
          };
        });

      const availableUsers = await Promise.all(availableUsersPromises);

      return { users: availableUsers };

    } catch (error) {

      return {
        error: 'Failed to fetch available users'
      };
    }
  }

  /**
   * Check if user has manager-level access on project
   */
  static async hasManagerAccessOnProject(userId: string, projectId: string): Promise<boolean> {
    try {
      const permissions = await this.getProjectPermissions(userId, projectId);
      return permissions.hasManagerAccess;
    } catch (error) {

      return false;
    }
  }

  /**
   * Get enhanced project members with detailed role information
   */
  static async getProjectMembersEnhanced(projectId: string, currentUser: AuthUser): Promise<{
    members?: Array<{
      id: string;
      user_id: string;
      user_name: string;
      user_email: string;
      user_system_role: string;
      project_role: string;
      has_manager_access: boolean;
      is_primary_manager: boolean;
      is_secondary_manager: boolean;
      assigned_at: Date;
      other_project_roles: Array<{
        projectId: string;
        projectName: string;
        projectRole: string;
      }>;
    }>;
    error?: string;
  }> {
    try {
      // Check project access
      const hasAccess = await this.checkProjectAccess(projectId, currentUser);
      if (!hasAccess) {
        return { error: 'You do not have access to this project' };
      }

      // Get project members with user details
      const members = await (ProjectMember.find as any)({
        project_id: projectId,
        removed_at: { $exists: false },
        deleted_at: { $exists: false }
      }).populate('user_id', 'full_name email role');

      const User = (await import('@/models/User')).default;

      // Enhance members data with additional role information
      const enhancedMembersPromises = members.map(async (member: any) => {
        // Get user's roles in other projects
        const otherMemberships = await (ProjectMember.find as any)({
          user_id: member.user_id._id,
          project_id: { $ne: projectId },
          removed_at: { $exists: false },
          deleted_at: { $exists: false }
        }).populate('project_id', 'name');

        const otherProjectRoles = otherMemberships.map((membership: any) => ({
          projectId: membership.project_id._id.toString(),
          projectName: membership.project_id.name,
          projectRole: membership.project_role
        }));

        return {
          id: member._id.toString(),
          user_id: member.user_id._id.toString(),
          user_name: member.user_id.full_name,
          user_email: member.user_id.email,
          user_system_role: member.user_id.role,
          project_role: member.project_role,
          has_manager_access: member.is_primary_manager || member.is_secondary_manager,
          is_primary_manager: member.is_primary_manager,
          is_secondary_manager: member.is_secondary_manager,
          assigned_at: member.assigned_at,
          other_project_roles: otherProjectRoles
        };
      });

      const enhancedMembers = await Promise.all(enhancedMembersPromises);

      return { members: enhancedMembers };

    } catch (error) {

      return { error: 'Failed to fetch project members' };
    }
  }

  // ========================================================================
  // TRAINING PROJECT METHODS
  // ========================================================================

  /**
   * Get Training Project with all tasks
   */
  static async getTrainingProjectWithTasks(): Promise<{
    success: boolean;
    project?: any;
    tasks?: any[];
    error?: string;
  }> {
    try {
      const Task = (await import('../models/Task')).default;
      const project = await (Project as any).getTrainingProject();

      if (!project) {
        return {
          success: false,
          error: 'Training project not found. Please contact administrator.'
        };
      }

      // Get all tasks for this project
      const tasks = await (Task.find as any)({
        project_id: project._id,
        deleted_at: null
      }).sort({ created_at: -1 }).lean();

      return {
        success: true,
        project,
        tasks
      };
    } catch (error) {

      return {
        success: false,
        error: 'Failed to fetch training project'
      };
    }
  }

  /**
   * Add task to Training Project
   */
  static async addTrainingTask(
    taskData: any,
    currentUser: AuthUser
  ): Promise<{
    success: boolean;
    task?: any;
    error?: string;
  }> {
    try {
      const project = await (Project as any).getTrainingProject();

      if (!project) {
        return {
          success: false,
          error: 'Training project not found'
        };
      }

      // Create task
      const task = await (Task.create as any)({
        name: taskData.name,
        description: taskData.description || '',
        project_id: project._id,
        created_by_user_id: new mongoose.Types.ObjectId(currentUser.id),
        estimated_hours: 0,
        hourly_rate: 0,
        is_active: true,
        is_billable: false, // Training tasks are always non-billable
        status: 'open'
      });

      return {
        success: true,
        task
      };
    } catch (error) {

      return {
        success: false,
        error: 'Failed to create training task'
      };
    }
  }

  /**
   * Update task in Training Project
   */
  static async updateTrainingTask(
    taskId: string,
    taskData: any,
    currentUser: AuthUser
  ): Promise<{
    success: boolean;
    task?: any;
    error?: string;
  }> {
    try {
      const Task = (await import('../models/Task')).default;
      const project = await (Project as any).getTrainingProject();

      if (!project) {
        return {
          success: false,
          error: 'Training project not found'
        };
      }

      // Find task
      const task = await (Task.findOne as any)({
        _id: new mongoose.Types.ObjectId(taskId),
        project_id: project._id,
        deleted_at: null
      });

      if (!task) {
        return {
          success: false,
          error: 'Training task not found'
        };
      }

      // Update fields
      if (taskData.name !== undefined) task.name = taskData.name;
      if (taskData.description !== undefined) task.description = taskData.description;
      if (taskData.is_active !== undefined) task.is_active = taskData.is_active;

      // Ensure training tasks remain non-billable
      task.is_billable = false;

      await task.save();

      return {
        success: true,
        task
      };
    } catch (error) {

      return {
        success: false,
        error: 'Failed to update training task'
      };
    }
  }

  /**
   * Delete task from Training Project (soft delete)
   */
  static async deleteTrainingTask(
    taskId: string,
    currentUser: AuthUser
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const Task = (await import('../models/Task')).default;
      const project = await (Project as any).getTrainingProject();

      if (!project) {
        return {
          success: false,
          error: 'Training project not found'
        };
      }

      // Find task
      const task = await (Task.findOne as any)({
        _id: new mongoose.Types.ObjectId(taskId),
        project_id: project._id,
        deleted_at: null
      });

      if (!task) {
        return {
          success: false,
          error: 'Training task not found'
        };
      }

      // Soft delete
      task.deleted_at = new Date();
      await task.save();

      return {
        success: true
      };
    } catch (error) {

      return {
        success: false,
        error: 'Failed to delete training task'
      };
    }
  }
}
