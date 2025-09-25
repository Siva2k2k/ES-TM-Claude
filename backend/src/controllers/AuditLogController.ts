import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AuditLogService } from '@/services/AuditLogService';
import { AuditAction } from '@/models/AuditLog';
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

export class AuditLogController {
  static getAuditLogs = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const {
      startDate,
      endDate,
      actions,
      actorId,
      tableName,
      limit,
      offset
    } = req.query;

    // Parse actions if provided
    let parsedActions: AuditAction[] | undefined;
    if (actions && typeof actions === 'string') {
      parsedActions = actions.split(',') as AuditAction[];
    }

    const result = await AuditLogService.getAuditLogs({
      startDate: startDate as string,
      endDate: endDate as string,
      actions: parsedActions,
      actorId: actorId as string,
      tableName: tableName as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    }, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      logs: result.logs,
      total: result.total,
      hasMore: result.hasMore
    });
  });

  static getSecurityEvents = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { startDate, endDate, limit } = req.query;

    const result = await AuditLogService.getSecurityEvents({
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : undefined
    }, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      events: result.events
    });
  });

  static getUserActivity = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const { days } = req.query;

    const result = await AuditLogService.getUserActivity(
      userId,
      days ? parseInt(days as string) : 30,
      req.user
    );

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      activities: result.activities
    });
  });

  static getActivitySummary = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { days } = req.query;

    const result = await AuditLogService.getActivitySummary(
      days ? parseInt(days as string) : 7,
      req.user
    );

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      summary: {
        totalEvents: result.totalEvents,
        userLogins: result.userLogins,
        timesheetActions: result.timesheetActions,
        billingActions: result.billingActions,
        systemChanges: result.systemChanges,
        securityEvents: result.securityEvents,
        topUsers: result.topUsers
      }
    });
  });

  static exportAuditLogs = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { startDate, endDate, format } = req.query;

    const result = await AuditLogService.exportAuditLogs(
      startDate as string,
      endDate as string,
      format as 'csv' | 'json' | 'pdf',
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
      message: 'Audit logs export initiated',
      downloadUrl: result.downloadUrl
    });
  });

  static searchAuditLogs = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { q: query, actions, limit } = req.query;

    // Parse actions if provided
    let parsedActions: AuditAction[] | undefined;
    if (actions && typeof actions === 'string') {
      parsedActions = actions.split(',') as AuditAction[];
    }

    const result = await AuditLogService.searchAuditLogs(
      query as string,
      {
        actions: parsedActions,
        limit: limit ? parseInt(limit as string) : undefined
      },
      req.user
    );

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      logs: result.logs
    });
  });

  static clearOldLogs = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { retentionDays } = req.body;

    const result = await AuditLogService.clearOldLogs(retentionDays, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} old audit logs`,
      deletedCount: result.deletedCount
    });
  });

  static getAuditLogById = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { logId } = req.params;

    const result = await AuditLogService.getAuditLogById(logId, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      log: result.log
    });
  });
}

// Validation middleware
export const getAuditLogsValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date in ISO format (YYYY-MM-DD)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date in ISO format (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.query?.startDate && value < req.query.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  query('actions')
    .optional()
    .custom((value) => {
      if (typeof value !== 'string') return true;
      const validActions = [
        'INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'VERIFY', 'FREEZE',
        'SUBMIT', 'ESCALATE', 'USER_LOGIN', 'USER_LOGOUT', 'USER_CREATED',
        'USER_APPROVED', 'USER_DEACTIVATED', 'USER_ROLE_CHANGED',
        'TIMESHEET_SUBMITTED', 'TIMESHEET_APPROVED', 'TIMESHEET_VERIFIED',
        'TIMESHEET_REJECTED', 'PROJECT_CREATED', 'PROJECT_UPDATED',
        'PROJECT_DELETED', 'BILLING_SNAPSHOT_GENERATED', 'BILLING_APPROVED',
        'ROLE_SWITCHED', 'PERMISSION_DENIED', 'SYSTEM_CONFIG_CHANGED'
      ];
      const actions = value.split(',');
      const invalidActions = actions.filter(action => !validActions.includes(action.trim()));
      if (invalidActions.length > 0) {
        throw new Error(`Invalid actions: ${invalidActions.join(', ')}`);
      }
      return true;
    }),
  query('actorId')
    .optional()
    .isMongoId()
    .withMessage('Actor ID must be a valid MongoDB ObjectId'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

export const exportAuditLogsValidation = [
  query('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date in ISO format (YYYY-MM-DD)'),
  query('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date in ISO format (YYYY-MM-DD)')
    .custom((value, { req }) => {
      if (req.query?.startDate && value < req.query.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  query('format')
    .isIn(['csv', 'json', 'pdf'])
    .withMessage('Format must be one of: csv, json, pdf')
];

export const searchAuditLogsValidation = [
  query('q')
    .isLength({ min: 1 })
    .withMessage('Search query is required and cannot be empty'),
  query('actions')
    .optional()
    .custom((value) => {
      if (typeof value !== 'string') return true;
      const validActions = [
        'INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'VERIFY', 'FREEZE',
        'SUBMIT', 'ESCALATE', 'USER_LOGIN', 'USER_LOGOUT', 'USER_CREATED',
        'USER_APPROVED', 'USER_DEACTIVATED', 'USER_ROLE_CHANGED',
        'TIMESHEET_SUBMITTED', 'TIMESHEET_APPROVED', 'TIMESHEET_VERIFIED',
        'TIMESHEET_REJECTED', 'PROJECT_CREATED', 'PROJECT_UPDATED',
        'PROJECT_DELETED', 'BILLING_SNAPSHOT_GENERATED', 'BILLING_APPROVED',
        'ROLE_SWITCHED', 'PERMISSION_DENIED', 'SYSTEM_CONFIG_CHANGED'
      ];
      const actions = value.split(',');
      const invalidActions = actions.filter(action => !validActions.includes(action.trim()));
      if (invalidActions.length > 0) {
        throw new Error(`Invalid actions: ${invalidActions.join(', ')}`);
      }
      return true;
    }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000')
];

export const clearOldLogsValidation = [
  body('retentionDays')
    .isInt({ min: 30, max: 3650 })
    .withMessage('Retention days must be between 30 and 3650 (10 years)')
];

export const userIdValidation = [
  param('userId')
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ObjectId')
];

export const logIdValidation = [
  param('logId')
    .isMongoId()
    .withMessage('Log ID must be a valid MongoDB ObjectId')
];