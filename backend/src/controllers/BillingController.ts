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

    const isDownloadRequest = req.method === 'GET';
    const parsedParams = BillingController.parseExportParameters(req, isDownloadRequest);

    const result = await BillingService.exportBillingReport(
      parsedParams.startDate,
      parsedParams.endDate,
      parsedParams.format,
      req.user,
      {
        projectIds: parsedParams.projectIds,
        clientIds: parsedParams.clientIds,
        roles: parsedParams.roles,
        search: parsedParams.search,
        view: parsedParams.view
      },
      { generateFile: isDownloadRequest }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    if (isDownloadRequest) {
      return BillingController.sendFileDownloadResponse(res, result);
    }

    return BillingController.sendExportInitiatedResponse(res, parsedParams, result);
  });

  /**
   * Parse and validate export parameters from request
   */
  private static parseExportParameters(req: AuthRequest, isDownloadRequest: boolean) {
    const data = isDownloadRequest ? req.query : req.body;
    const { startDate, endDate, format } = data;

    return {
      startDate: startDate as string,
      endDate: endDate as string,
      format: format as 'csv' | 'pdf' | 'excel',
      projectIds: IdUtils.parseIds((data as any).projectIds),
      clientIds: IdUtils.parseIds((data as any).clientIds),
      roles: BillingController.parseRoles((data as any).roles),
      search: BillingController.parseSearch(data.search),
      view: BillingController.parseView((data as any).view)
    };
  }

  /**
   * Parse roles from request parameter
   */
  private static parseRoles(value: unknown): string[] {
    if (!value) return [];

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
  }

  /**
   * Parse view type from request parameter
   */
  private static parseView(value: unknown): 'weekly' | 'monthly' | 'custom' {
    if (value === 'weekly') return 'weekly';
    if (value === 'custom' || value === 'timeline') return 'custom';
    return 'monthly';
  }

  /**
   * Parse search parameter
   */
  private static parseSearch(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : undefined;
  }

  /**
   * Send file download response
   */
  private static sendFileDownloadResponse(res: Response, result: any) {
    res.setHeader('Content-Type', result.contentType ?? 'text/csv');

    const filename = result.filename || 'project-billing.csv';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (result.deliveredFormat) {
      res.setHeader('X-Delivered-Format', result.deliveredFormat);
    }

    return res.send(result.buffer ?? Buffer.from([]));
  }

  /**
   * Send export initiated response with download URL
   */
  private static sendExportInitiatedResponse(res: Response, params: any, result: any) {
    const query = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
      format: params.format,
      view: params.view
    });

    if (params.projectIds.length > 0) query.set('projectIds', params.projectIds.join(','));
    if (params.clientIds.length > 0) query.set('clientIds', params.clientIds.join(','));
    if (params.roles.length > 0) query.set('roles', params.roles.join(','));
    if (params.search) query.set('search', params.search);

    return res.json({
      success: true,
      message: 'Billing report export initiated',
      downloadUrl: `/billing/export?${query.toString()}`,
      deliveredFormat: result.deliveredFormat
    });
  }

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
