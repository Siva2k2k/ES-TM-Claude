import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ProjectService } from '@/services/ProjectService';
import { UserRole } from '@/models/User';
import {
  ValidationError,
  AuthorizationError,
  handleAsyncError
} from '@/utils/errors';

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
    const result = await ProjectService.updateProject(projectId, req.body, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
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
    const result = await ProjectService.deleteProject(projectId, req.user);

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
    const result = await ProjectService.updateTask(taskId, req.body, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
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
