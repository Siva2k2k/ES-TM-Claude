import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { BillingService } from '@/services/BillingService';
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

    const { startDate, endDate, format } = req.query;
    const result = await BillingService.exportBillingReport(
      startDate as string,
      endDate as string,
      format as 'csv' | 'pdf' | 'excel',
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
      message: 'Billing report export initiated',
      downloadUrl: result.downloadUrl
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
    .isIn(['csv', 'pdf', 'excel'])
    .withMessage('Format must be one of: csv, pdf, excel')
];

export const snapshotIdValidation = [
  param('snapshotId')
    .isMongoId()
    .withMessage('Invalid snapshot ID format')
];