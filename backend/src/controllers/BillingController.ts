import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { BillingService } from '@/services/BillingService';
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

export class BillingController {
  static generateWeeklySnapshot = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { weekStartDate } = req.body;
    const result = await BillingService.generateWeeklySnapshot(weekStartDate, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: `Generated ${result.snapshots?.length} billing snapshots`,
      snapshots: result.snapshots
    });
  });

  static getAllBillingSnapshots = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await BillingService.getAllBillingSnapshots(req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      snapshots: result.snapshots
    });
  });

  static getBillingDashboard = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await BillingService.getBillingDashboard(req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      dashboard: {
        totalRevenue: result.totalRevenue,
        weeklyRevenue: result.weeklyRevenue,
        monthlyRevenue: result.monthlyRevenue,
        pendingApprovals: result.pendingApprovals,
        totalBillableHours: result.totalBillableHours,
        averageHourlyRate: result.averageHourlyRate,
        revenueGrowth: result.revenueGrowth
      }
    });
  });

  static approveMonthlyBilling = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { year, month } = req.body;
    const result = await BillingService.approveMonthlyBilling(year, month, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `Monthly billing for ${year}-${month} approved successfully`
    });
  });

  static getRevenueByProject = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await BillingService.getRevenueByProject(req.user);

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

  static exportBillingReport = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    // Support both query params (GET) and body params (POST)
    const data = req.method === 'GET' ? req.query : req.body;
    const { startDate, endDate, format } = data;
    const isDownloadRequest = req.method === 'GET';

    // Use centralized ID parsing utility
    const parseIdList = IdUtils.parseIds;

    const parseRoles = (value: unknown): string[] => {
      if (!value) {
        return [];
      }
      if (Array.isArray(value)) {
        return value
          .map((role) => (typeof role === 'string' ? role.trim().toLowerCase() : ''))
          .filter((role) => role.length > 0);
      }
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((role) => role.trim().toLowerCase())
          .filter((role) => role.length > 0);
      }
      return [];
    };

    const parseView = (value: unknown): 'weekly' | 'monthly' | 'custom' => {
      if (value === 'weekly') {
        return 'weekly';
      }
      if (value === 'custom' || value === 'timeline') {
        return 'custom';
      }
      return 'monthly';
    };

    const search =
      typeof data.search === 'string' && data.search.trim().length > 0
        ? data.search.trim()
        : undefined;

    const projectIds = parseIdList((data as any).projectIds);
    const clientIds = parseIdList((data as any).clientIds);
    const roles = parseRoles((data as any).roles);
    const view = parseView((data as any).view);

    const result = await BillingService.exportBillingReport(
      startDate as string,
      endDate as string,
      format as 'csv' | 'pdf' | 'excel',
      req.user,
      {
        projectIds,
        clientIds,
        roles,
        search,
        view
      },
      { generateFile: isDownloadRequest }
    );

    if (!result.success) {
      if (isDownloadRequest) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    if (isDownloadRequest) {
      res.setHeader('Content-Type', result.contentType ?? 'text/csv');
      if (result.filename) {
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      } else {
        res.setHeader('Content-Disposition', 'attachment; filename="project-billing.csv"');
      }

      if (result.deliveredFormat) {
        res.setHeader('X-Delivered-Format', result.deliveredFormat);
      }

      return res.send(result.buffer ?? Buffer.from([]));
    }

    const query = new URLSearchParams({
      startDate: startDate as string,
      endDate: endDate as string,
      format: format as string,
      view
    });

    if (projectIds.length > 0) {
      query.set('projectIds', projectIds.join(','));
    }
    if (clientIds.length > 0) {
      query.set('clientIds', clientIds.join(','));
    }
    if (roles.length > 0) {
      query.set('roles', roles.join(','));
    }
    if (search) {
      query.set('search', search);
    }

    res.json({
      success: true,
      message: 'Billing report export initiated',
      downloadUrl: `/billing/export?${query.toString()}`,
      deliveredFormat: result.deliveredFormat
    });
  });

  static getBillingSnapshotById = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { snapshotId } = req.params;
    const result = await BillingService.getBillingSnapshotById(snapshotId, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      snapshot: result.snapshot
    });
  });
}

// Validation middleware
export const generateWeeklySnapshotValidation = [
  body('weekStartDate')
    .isISO8601()
    .withMessage('Week start date must be a valid date in ISO format (YYYY-MM-DD)')
];

export const approveMonthlyBillingValidation = [
  body('year')
    .isInt({ min: 2020, max: 2100 })
    .withMessage('Year must be a valid integer between 2020 and 2100'),
  body('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be a valid integer between 1 and 12')
];

export const exportBillingReportValidation = [
  // Validate for GET requests (query params)
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date in ISO format (YYYY-MM-DD)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date in ISO format (YYYY-MM-DD)'),
  query('format')
    .optional()
    .isIn(['csv', 'pdf', 'excel'])
    .withMessage('Format must be one of: csv, pdf, excel'),
  // Validate for POST requests (body params)
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date in ISO format (YYYY-MM-DD)'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date in ISO format (YYYY-MM-DD)'),
  body('format')
    .optional()
    .isIn(['csv', 'pdf', 'excel'])
    .withMessage('Format must be one of: csv, pdf, excel'),
  // Custom validation to ensure required fields exist in either query or body
  (req: Request, res: Response, next: any) => {
    const data = req.method === 'GET' ? req.query : req.body;
    const errors: string[] = [];

    if (!data.startDate) {
      errors.push('Start date is required');
    }
    if (!data.endDate) {
      errors.push('End date is required');
    }
    if (!data.format) {
      errors.push('Format is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join(', ')
      });
    }

    next();
  }
];

export const snapshotIdValidation = [
  param('snapshotId')
    .isMongoId()
    .withMessage('Invalid snapshot ID format')
];
