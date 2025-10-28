import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ProjectService, NotificationService } from '@/services';
import Task from '@/models/Task';
import { UserRole } from '@/models/User';
import {
  ValidationError,
  AuthorizationError,
  handleAsyncError
} from '@/utils/errors';
import { IdUtils } from '@/utils/idUtils';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
    hourly_rate: number;
    is_active: boolean;
    is_approved_by_super_admin: boolean;
  };
}

export class ProjectController {
  static createProject = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await ProjectService.createProject(req.body, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    const project = result.project;
    if (project) {
      try {
        const projectAny = project as any;
        const projectId =
          typeof projectAny.id === 'string'
            ? projectAny.id
            : projectAny._id && typeof projectAny._id.toString === 'function'
              ? projectAny._id.toString()
              : undefined;
        const managerRaw = projectAny.primary_manager_id;
        const managerId = managerRaw && typeof managerRaw.toString === 'function'
          ? managerRaw.toString()
          : managerRaw
            ? String(managerRaw)
            : undefined;

        if (projectId && managerId && managerId !== req.user.id) {
          await NotificationService.notifyProjectCreated({
            recipientIds: [managerId],
            projectId,
            projectName: projectAny.name,
            createdById: req.user.id,
            createdByName: req.user.full_name
          });
        }
      } catch (notificationError) {
        console.error('Failed to send project creation notification:', notificationError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: result.project
    });
  });

  static updateProject = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const existingProjectResult = await ProjectService.getProjectById(projectId, req.user);

    if (!existingProjectResult.project || existingProjectResult.error) {
      const statusCode = existingProjectResult.error === 'You do not have access to this project' ? 403 : 404;
      return res.status(statusCode).json({
        success: false,
        error: existingProjectResult.error || 'Project not found'
      });
    }

    const previousProject = existingProjectResult.project;
    const result = await ProjectService.updateProject(projectId, req.body, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    let updatedProject = previousProject;
    try {
      const updatedProjectResult = await ProjectService.getProjectById(projectId, req.user);
      if (!updatedProjectResult.error && updatedProjectResult.project) {
        updatedProject = updatedProjectResult.project;
      }
    } catch (fetchError) {
      console.error('Failed to fetch project after update:', fetchError);
    }

    try {
      const membersResult = await ProjectService.getProjectMembers(projectId, req.user);
      const members = !membersResult.error && membersResult.members ? membersResult.members : [];

      const allMemberIds = new Set<string>();
      const leadershipIds = new Set<string>();

      members.forEach(member => {
        if (!member?.user_id) {
          return;
        }

        allMemberIds.add(member.user_id);
        if (
          member.project_role === 'manager' ||
          member.project_role === 'lead' ||
          member.is_primary_manager ||
          member.is_secondary_manager
        ) {
          leadershipIds.add(member.user_id);
        }
      });

      // Use centralized ID parsing utility
      const previousPrimaryManagerId = IdUtils.toIdString((previousProject as any)?.primary_manager_id);
      const updatedPrimaryManagerId = IdUtils.toIdString((updatedProject as any)?.primary_manager_id);
      const projectName = (updatedProject as any)?.name || (previousProject as any)?.name || 'Project';
      const previousStatus = (previousProject as any)?.status;
      const updatedStatus = (updatedProject as any)?.status;
      const statusChanged = Boolean(previousStatus && updatedStatus && previousStatus !== updatedStatus);
      const completedNow = statusChanged && updatedStatus === 'completed';
      const updatedFields = Object.keys(req.body || {});

      const actorId = req.user.id;
      const actorName = req.user.full_name;

      if (completedNow) {
        const recipientSet = new Set<string>(allMemberIds);
        if (previousPrimaryManagerId) {
          recipientSet.add(previousPrimaryManagerId);
        }
        if (updatedPrimaryManagerId) {
          recipientSet.add(updatedPrimaryManagerId);
        }
        recipientSet.delete(actorId);

        if (recipientSet.size > 0) {
          await NotificationService.notifyProjectCompleted({
            recipientIds: Array.from(recipientSet),
            projectId,
            projectName,
            completedById: actorId,
            completedByName: actorName
          });
        }
      } else if (updatedFields.length > 0 || statusChanged) {
        const recipientSet = new Set<string>(leadershipIds);
        if (previousPrimaryManagerId) {
          recipientSet.add(previousPrimaryManagerId);
        }
        if (updatedPrimaryManagerId) {
          recipientSet.add(updatedPrimaryManagerId);
        }
        recipientSet.delete(actorId);

        if (recipientSet.size > 0) {
          const fieldsForNotification =
            statusChanged && !updatedFields.includes('status')
              ? [...updatedFields, 'status']
              : updatedFields;

          await NotificationService.notifyProjectUpdated({
            recipientIds: Array.from(recipientSet),
            projectId,
            projectName,
            updatedById: actorId,
            updatedByName: actorName,
            updatedFields: fieldsForNotification
          });
        }
      }
    } catch (notificationError) {
      console.error('Failed to send project update notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Project updated successfully'
    });
  });

  static deleteProject = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Delete reason is required'
      });
    }

    const result = await ProjectService.deleteProject(projectId, reason, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  });

  static getProjects = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await ProjectService.getProjects(req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      projects: result.projects
    });
  });

  static getProjectById = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const result = await ProjectService.getProjectById(projectId, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      project: result.project
    });
  });

  static getUserProjects = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const result = await ProjectService.getUserProjects(userId, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      projects: result.projects
    });
  });

  static getUserTasks = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const result = await ProjectService.getUserTasks(userId, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      tasks: result.tasks
    });
  });

  static getProjectsByStatus = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { status } = req.query;
    const result = await ProjectService.getProjectsByStatus(status as any, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      projects: result.projects
    });
  });

  static addProjectMember = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }
    
    const { projectId } = req.params;
    const { userId, projectRole } = req.body;
    const isPrimaryManager = Boolean(req.body.is_primary_manager ?? req.body.isPrimaryManager ?? false);
    const isSecondaryManager = Boolean(req.body.is_secondary_manager ?? req.body.isSecondaryManager ?? false);
    const result = await ProjectService.addProjectMember(projectId, userId, projectRole || 'member', isPrimaryManager, isSecondaryManager, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Trigger automatic project allocation notification
    try {
      // Get project name for notification
      const projectResult = await ProjectService.getProjectById(projectId, req.user);
      const projectName = projectResult.project?.name || 'Unknown Project';
      
      await NotificationService.notifyProjectAllocation(userId, projectId, projectName, req.user.id);
    } catch (notificationError) {
      console.error('Failed to send project allocation notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    res.json({
      success: true,
      message: 'Project member added successfully'
    });
  });

  static removeProjectMember = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId, userId } = req.params;
    const result = await ProjectService.removeProjectMember(projectId, userId, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Project member removed successfully'
    });
  });

  static getProjectMembers = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const result = await ProjectService.getProjectMembers(projectId, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.members
    });
  });

  static createTask = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const taskData = { ...req.body, project_id: projectId };
    const result = await ProjectService.createTask(taskData, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Trigger automatic task allocation notification
    try {
      const task = result.task;
      if (task && taskData.assigned_to_user_id) {
        // Get project name for notification
        const projectResult = await ProjectService.getProjectById(projectId, req.user);
        const projectName = projectResult.project?.name || 'Unknown Project';
        const taskName = task.name || taskData.name || 'Unknown Task';
        
        await NotificationService.notifyTaskReceived({
          recipientIds: [taskData.assigned_to_user_id],
          taskId: task._id.toString(),
          taskName,
          projectName,
          projectId,
          assignedById: req.user.id,
          assignedByName: req.user.full_name
        });
      }
    } catch (notificationError) {
      console.error('Failed to send task allocation notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: result.task
    });
  });

  static updateTask = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { taskId } = req.params;
  const existingTask = await (Task as any).findById(taskId).lean().exec();
    const result = await ProjectService.updateTask(taskId, req.body, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    let updatedTask: any = existingTask;
    try {
  const freshTask = await (Task as any).findById(taskId).lean().exec();
      if (freshTask) {
        updatedTask = freshTask;
      }
    } catch (fetchError) {
      console.error('Failed to fetch task after update:', fetchError);
    }

    try {
      // Use centralized ID parsing utility
      const projectId =
        req.body.project_id ||
        IdUtils.toIdString(updatedTask?.project_id) ||
        IdUtils.toIdString(existingTask?.project_id);

      const taskName =
        (updatedTask?.name) ||
        req.body.name ||
        existingTask?.name ||
        'Task';

      const previousAssigneeId = IdUtils.toIdString(existingTask?.assigned_to_user_id);
      const updatedAssigneeId =
        req.body.assigned_to_user_id || IdUtils.toIdString(updatedTask?.assigned_to_user_id);

      const previousStatus = existingTask?.status;
      const updatedStatus = req.body.status || updatedTask?.status;

      let projectName = 'Project';
      let projectPrimaryManagerId: string | undefined;
      let projectMembers: Array<{
        user_id: string;
        project_role: string;
        is_primary_manager: boolean;
        is_secondary_manager: boolean;
      }> = [];

      if (projectId) {
        try {
          const projectDetails = await ProjectService.getProjectById(projectId, req.user);
          if (!projectDetails.error && projectDetails.project) {
            projectName = (projectDetails.project as any)?.name || projectName;
            projectPrimaryManagerId = IdUtils.toIdString(
              (projectDetails.project as any)?.primary_manager_id
            );
          }
        } catch (projectFetchError) {
          console.error('Failed to fetch project for task notification:', projectFetchError);
        }

        try {
          const membersResult = await ProjectService.getProjectMembers(projectId, req.user);
          if (!membersResult.error && membersResult.members) {
            projectMembers = membersResult.members;
          }
        } catch (memberFetchError) {
          console.error('Failed to fetch project members for task notification:', memberFetchError);
        }
      }

      const assignmentChanged =
        Boolean(updatedAssigneeId) && updatedAssigneeId !== previousAssigneeId;

      if (
        assignmentChanged &&
        updatedAssigneeId &&
        projectId &&
        updatedAssigneeId !== req.user.id
      ) {
        await NotificationService.notifyTaskReceived({
          recipientIds: [updatedAssigneeId],
          taskId,
          taskName,
          projectName,
          projectId,
          assignedById: req.user.id,
          assignedByName: req.user.full_name
        });
      }

      const completedNow =
        updatedStatus === 'completed' && previousStatus !== 'completed';

      if (completedNow && projectId) {
        const recipientSet = new Set<string>();

        projectMembers.forEach(member => {
          if (
            member.user_id &&
            (member.project_role === 'manager' ||
              member.project_role === 'lead' ||
              member.is_primary_manager ||
              member.is_secondary_manager)
          ) {
            recipientSet.add(member.user_id);
          }
        });

        if (projectPrimaryManagerId) {
          recipientSet.add(projectPrimaryManagerId);
        }

        recipientSet.delete(req.user.id);
        if (updatedAssigneeId) {
          recipientSet.delete(updatedAssigneeId);
        }

        if (recipientSet.size > 0) {
          await NotificationService.notifyTaskCompleted({
            recipientIds: Array.from(recipientSet),
            taskId,
            taskName,
            projectName,
            projectId,
            completedById: req.user.id,
            completedByName: req.user.full_name
          });
        }
      }
    } catch (notificationError) {
      console.error('Failed to send task notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    res.json({
      success: true,
      message: 'Task updated successfully'
    });
  });

  static deleteTask = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { taskId } = req.params;
    const result = await ProjectService.deleteTask(taskId, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  });

  static getProjectTasks = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const result = await ProjectService.getProjectTasks(projectId, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      tasks: result.tasks
    });
  });

  static createClient = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await ProjectService.createClient(req.body, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      client: result.client
    });
  });

  static updateClient = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { clientId } = req.params;
    const result = await ProjectService.updateClient(clientId, req.body, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Client updated successfully'
    });
  });

  static deleteClient = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { clientId } = req.params;
    const result = await ProjectService.deleteClient(clientId, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  });

  static getClients = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await ProjectService.getClients(req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.clients
    });
  });

  static getClientById = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { clientId } = req.params;
    const result = await ProjectService.getClientById(clientId, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      client: result.client
    });
  });

  // ========================================================================
  // MULTI-PROJECT ROLE SYSTEM ENDPOINTS
  // ========================================================================

  /**
   * Get project permissions for current user
   */
  static getProjectPermissions = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const permissions = await ProjectService.getProjectPermissions(req.user.id, projectId);

    res.json({
      success: true,
      permissions
    });
  });

  /**
   * Add project member with enhanced role validation
   */
  static addProjectMemberEnhanced = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const { userId, projectRole, hasManagerAccess } = req.body;

    const result = await ProjectService.addProjectMemberEnhanced(
      projectId,
      userId,
      projectRole,
      hasManagerAccess || false,
      req.user
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Project member added successfully'
    });
  });

  /**
   * Update project member role and permissions
   */
  static updateProjectMemberRole = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId, userId } = req.params;
    const { projectRole, hasManagerAccess } = req.body;

    const result = await ProjectService.updateProjectMemberRole(
      projectId,
      userId,
      projectRole,
      hasManagerAccess || false,
      req.user
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Project member role updated successfully'
    });
  });

  /**
   * Get user's roles across all projects
   */
  static getUserProjectRoles = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const result = await ProjectService.getUserProjectRoles(userId, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      userProjectRoles: result.userProjectRoles
    });
  });

  /**
   * Get available users for project
   */
  static getAvailableUsersForProject = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const result = await ProjectService.getAvailableUsersForProject(projectId, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      users: result.users
    });
  });

  /**
   * Get enhanced project members with detailed role information
   */
  static getProjectMembersEnhanced = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const result = await ProjectService.getProjectMembersEnhanced(projectId, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      members: result.members
    });
  });

  /**
   * Hard delete project (permanent deletion)
   */
  static hardDeleteProject = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const result = await ProjectService.hardDeleteProject(projectId, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Project permanently deleted successfully'
    });
  });

  /**
   * Restore soft-deleted project
   */
  static restoreProject = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const result = await ProjectService.restoreProject(projectId, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Project restored successfully'
    });
  });

  /**
   * Get all deleted projects
   */
  static getDeletedProjects = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await ProjectService.getDeletedProjects(req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.projects
    });
  });

  static checkProjectDependencies = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { projectId } = req.params;
    const dependencyCheck = await ProjectService.canHardDeleteProject(projectId);

    res.json({
      success: true,
      canDelete: dependencyCheck.canDelete,
      dependencies: dependencyCheck.dependencies,
      counts: dependencyCheck.counts
    });
  });

  // ========================================================================
  // TRAINING PROJECT ENDPOINTS
  // ========================================================================

  /**
   * Get Training Project with all tasks
   * Accessible to all authenticated users
   */
  static getTrainingProject = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await ProjectService.getTrainingProjectWithTasks();

    if (!result.success || !result.project) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Training project not found'
      });
    }

    res.json({
      success: true,
      project: result.project,
      tasks: result.tasks
    });
  });

  /**
   * Add task to Training Project
   * Only Management, Manager, and Admin can add tasks
   */
  static addTrainingTask = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    // Only Management, Manager, and Super Admin can add training tasks
    if (!['management', 'manager', 'super_admin'].includes(req.user.role)) {
      throw new AuthorizationError('Only Management, Managers, and Admins can add training tasks');
    }

    const result = await ProjectService.addTrainingTask(req.body, req.user);

    if (!result.success || !result.task) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to create training task'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Training task created successfully',
      task: result.task
    });
  });

  /**
   * Update task in Training Project
   * Only Management, Manager, and Admin can update tasks
   */
  static updateTrainingTask = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    // Only Management, Manager, and Super Admin can update training tasks
    if (!['management', 'manager', 'super_admin'].includes(req.user.role)) {
      throw new AuthorizationError('Only Management, Managers, and Admins can update training tasks');
    }

    const { taskId } = req.params;
    const result = await ProjectService.updateTrainingTask(taskId, req.body, req.user);

    if (!result.success || !result.task) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to update training task'
      });
    }

    res.json({
      success: true,
      message: 'Training task updated successfully',
      task: result.task
    });
  });

  /**
   * Delete task from Training Project
   * Only Management, Manager, and Admin can delete tasks
   */
  static deleteTrainingTask = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    // Only Management, Manager, and Super Admin can delete training tasks
    if (!['management', 'manager', 'super_admin'].includes(req.user.role)) {
      throw new AuthorizationError('Only Management, Managers, and Admins can delete training tasks');
    }

    const { taskId } = req.params;
    const result = await ProjectService.deleteTrainingTask(taskId, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to delete training task'
      });
    }

    res.json({
      success: true,
      message: 'Training task deleted successfully'
    });
  });
}

// Validation middleware
export const createProjectValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Project name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('client_id')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // Skip validation for empty/null/undefined values
      if (value === null || value === undefined || value === '') {
        return true;
      }
      // Accept both MongoDB ObjectId (24 char hex) and UUID formats
      const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
      const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return mongoIdPattern.test(value) || uuidPattern.test(value);
    })
    .withMessage('Invalid client ID format (must be ObjectId or UUID)'),
  body('primary_manager_id')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // Skip validation for empty/null/undefined values
      if (value === null || value === undefined || value === '') {
        return true;
      }
      // Accept both MongoDB ObjectId (24 char hex) and UUID formats
      const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
      const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return mongoIdPattern.test(value) || uuidPattern.test(value);
    })
    .withMessage('Invalid primary manager ID format (must be ObjectId or UUID)'),
  body('budget')
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .custom(value => value >= 0)
    .withMessage('Budget must be a non-negative number'),
  body('hourly_rate')
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .custom(value => value > 0)
    .withMessage('Hourly rate must be a positive number'),
  body('start_date')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('end_date')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('status')
    .optional()
    .isIn(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .withMessage('Invalid project status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid project priority'),
  body('is_billable')
    .optional()
    .isBoolean()
    .withMessage('is_billable must be a boolean')
];

export const projectIdValidation = [
  param('projectId')
    .custom((value) => {
      if (!value) return false; // Project ID is required
      // Accept both MongoDB ObjectId (24 char hex) and UUID formats
      const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
      const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return mongoIdPattern.test(value) || uuidPattern.test(value);
    })
    .withMessage('Invalid project ID format (must be ObjectId or UUID)')
];

export const userIdValidation = [
  param('userId')
    .custom((value) => {
      if (!value) return false; // User ID is required
      // Accept both MongoDB ObjectId (24 char hex) and UUID formats
      const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
      const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return mongoIdPattern.test(value) || uuidPattern.test(value);
    })
    .withMessage('Invalid user ID format (must be ObjectId or UUID)')
];

export const addProjectMemberValidation = [
  ...projectIdValidation,
  body('userId')
    .custom((value) => {
      if (!value) return false; // User ID is required
      // Accept both MongoDB ObjectId (24 char hex) and UUID formats
      const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
      const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return mongoIdPattern.test(value) || uuidPattern.test(value);
    })
    .withMessage('Invalid user ID format (must be ObjectId or UUID)')
];

export const projectStatusValidation = [
  query('status')
    .isIn(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .withMessage('Invalid project status')
];

// Updated validation for task creation 
// Also fixed project validation for empty strings
export const createTaskValidation = [
  ...projectIdValidation,
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Task name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('assigned_to_user_id')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty/null values
      // Accept both MongoDB ObjectId (24 char hex) and UUID formats
      const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
      const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return mongoIdPattern.test(value) || uuidPattern.test(value);
    })
    .withMessage('Invalid assigned user ID format (must be ObjectId or UUID)'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid task priority'),
  body('status')
    .optional()
    .isIn(['open', 'todo', 'in_progress', 'review', 'completed'])
    .withMessage('Invalid task status'),
  body('estimated_hours')
    .optional()
    .isNumeric()
    .custom(value => value > 0)
    .withMessage('Estimated hours must be a positive number')
];

export const updateTaskValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Task name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('assigned_to_user_id')
    .optional()
    .custom((value) => {
      if (!value) return true; // Allow empty/null values
      // Accept both MongoDB ObjectId (24 char hex) and UUID formats
      const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
      const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return mongoIdPattern.test(value) || uuidPattern.test(value);
    })
    .withMessage('Invalid assigned user ID format (must be ObjectId or UUID)'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid task priority'),
  body('status')
    .optional()
    .isIn(['open', 'todo', 'in_progress', 'review', 'completed'])
    .withMessage('Invalid task status'),
  body('estimated_hours')
    .optional()
    .isNumeric()
    .custom(value => value > 0)
    .withMessage('Estimated hours must be a positive number'),
  body('is_billable')
    .optional()
    .isBoolean()
    .withMessage('is_billable must be a boolean')
];

export const taskIdValidation = [
  param('taskId')
    .custom((value) => {
      if (!value) return false; // Task ID is required
      // Accept both MongoDB ObjectId (24 char hex) and UUID formats
      const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
      const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return mongoIdPattern.test(value) || uuidPattern.test(value);
    })
    .withMessage('Invalid task ID format (must be ObjectId or UUID)')
];

export const createClientValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Client name must be between 2 and 200 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone must be between 10 and 20 characters'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name must be less than 200 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters')
];

export const clientIdValidation = [
  param('clientId')
    .custom((value) => {
      if (!value) return false; // Client ID is required
      // Accept both MongoDB ObjectId (24 char hex) and UUID formats
      const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
      const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return mongoIdPattern.test(value) || uuidPattern.test(value);
    })
    .withMessage('Invalid client ID format (must be ObjectId or UUID)')
];

// ========================================================================
// MULTI-PROJECT ROLE SYSTEM VALIDATIONS
// ========================================================================

export const addProjectMemberEnhancedValidation = [
  ...projectIdValidation,
  body('userId')
    .custom((value) => {
      if (!value) return false; // User ID is required
      // Accept both MongoDB ObjectId (24 char hex) and UUID formats
      const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
      const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      return mongoIdPattern.test(value) || uuidPattern.test(value);
    })
    .withMessage('Invalid user ID format (must be ObjectId or UUID)'),
  body('projectRole')
    .isIn(['employee', 'lead', 'manager'])
    .withMessage('Project role must be one of: employee, lead, manager'),
  body('hasManagerAccess')
    .optional()
    .isBoolean()
    .withMessage('hasManagerAccess must be a boolean')
];

export const updateProjectMemberRoleValidation = [
  ...projectIdValidation,
  ...userIdValidation,
  body('projectRole')
    .isIn(['employee', 'lead', 'manager'])
    .withMessage('Project role must be one of: employee, lead, manager'),
  body('hasManagerAccess')
    .optional()
    .isBoolean()
    .withMessage('hasManagerAccess must be a boolean')
];

// ========================================================================
// TRAINING PROJECT VALIDATIONS
// ========================================================================

export const createTrainingTaskValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Task name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
];

export const updateTrainingTaskValidation = [
  ...taskIdValidation,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Task name must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];
