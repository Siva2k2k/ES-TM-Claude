import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { UserService } from '@/services/UserService';
import { UserRole } from '@/models/User';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
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

/**
 * User Controller - Handles HTTP requests for user management
 */
export class UserController {
  /**
   * Create a new user (Super Admin only)
   * POST /api/v1/users
   */
  static createUser = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await UserService.createUser(req.body, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: result.user
    });
  });

  /**
   * Create a new user for approval (Management role)
   * POST /api/v1/users/for-approval
   */
  static createUserForApproval = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await UserService.createUserForApproval(req.body, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'User created and submitted for approval',
      user: result.user
    });
  });

  /**
   * Approve user (Super Admin only)
   * POST /api/v1/users/:userId/approve
   */
  static approveUser = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const result = await UserService.approveUser(userId, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'User approved successfully'
    });
  });

  /**
   * Set user active/inactive status (Super Admin only)
   * PUT /api/v1/users/:userId/status
   */
  static setUserStatus = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const { isActive } = req.body;
    const result = await UserService.setUserStatus(userId, isActive, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `User status updated to ${isActive ? 'active' : 'inactive'}`
    });
  });

  /**
   * Update user billing rate (Super Admin only)
   * PUT /api/v1/users/:userId/billing
   */
  static setUserBilling = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const { hourlyRate } = req.body;
    const result = await UserService.setUserBilling(userId, hourlyRate, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'User billing rate updated successfully'
    });
  });

  /**
   * Get all users (Super Admin and Management)
   * GET /api/v1/users
   */
  static getAllUsers = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await UserService.getAllUsers(req.user);

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
   * Get users based on role permissions
   * GET /api/v1/users/by-role?role=employee
   */
  static getUsersByPermission = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { role } = req.query;
    const result = await UserService.getUsers(role as UserRole, req.user);

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
   * Get pending approvals (Super Admin only)
   * GET /api/v1/users/pending-approvals
   */
  static getPendingApprovals = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await UserService.getPendingApprovals(req.user);

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
   * Update user details
   * PUT /api/v1/users/:userId
   */
  static updateUser = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const result = await UserService.updateUser(userId, req.body, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  });

  /**
   * Delete user (soft delete)
   * DELETE /api/v1/users/:userId
   */
  static deleteUser = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const result = await UserService.deleteUser(userId, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  });

  /**
   * Get user by ID
   * GET /api/v1/users/:userId
   */
  static getUserById = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const result = await UserService.getUserById(userId, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      user: result.user
    });
  });

  /**
   * Get team members for manager
   * GET /api/v1/users/:managerId/team-members
   */
  static getTeamMembers = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { managerId } = req.params;
    const result = await UserService.getTeamMembers(managerId, req.user);

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
   * Get users by roles
   * GET /api/v1/users/roles?roles=employee,lead
   */
  static getUsersByRoles = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { roles } = req.query;
    const roleArray = typeof roles === 'string' ? roles.split(',') as UserRole[] : [];

    const result = await UserService.getUsersByRole(roleArray, req.user);

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
}

// Validation middleware
export const createUserValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('role')
    .optional()
    .isIn(['employee', 'lead', 'manager', 'management', 'super_admin'])
    .withMessage('Invalid role'),
  body('hourly_rate')
    .optional()
    .isNumeric()
    .custom(value => value > 0)
    .withMessage('Hourly rate must be a positive number'),
  body('manager_id')
    .optional()
    .isMongoId()
    .withMessage('Invalid manager ID format')
];

export const userIdValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

export const setUserStatusValidation = [
  ...userIdValidation,
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

export const setUserBillingValidation = [
  ...userIdValidation,
  body('hourlyRate')
    .isNumeric()
    .custom(value => value > 0)
    .withMessage('Hourly rate must be a positive number')
];

export const updateUserValidation = [
  ...userIdValidation,
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('hourly_rate')
    .optional()
    .isNumeric()
    .custom(value => value > 0)
    .withMessage('Hourly rate must be a positive number')
];

export const getUsersByRoleValidation = [
  query('role')
    .isIn(['employee', 'lead', 'manager', 'management', 'super_admin'])
    .withMessage('Invalid role')
];

export const getUsersByRolesValidation = [
  query('roles')
    .isString()
    .custom(value => {
      const roles = value.split(',');
      const validRoles = ['employee', 'lead', 'manager', 'management', 'super_admin'];
      return roles.every((role: string) => validRoles.includes(role.trim()));
    })
    .withMessage('Invalid roles format. Use comma-separated valid roles.')
];