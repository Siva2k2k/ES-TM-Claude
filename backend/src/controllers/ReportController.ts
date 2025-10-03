import { Request, Response } from 'express';
import { param, body, query, validationResult } from 'express-validator';
import { ReportService, ReportRequest } from '@/services/ReportService';
import { CsvReportGenerator } from '@/services/generators/CsvReportGenerator';
import { ExcelReportGenerator } from '@/services/generators/ExcelReportGenerator';
import { PdfReportGenerator } from '@/services/generators/PdfReportGenerator';
import { UserRole } from '@/models/User';
import {
  ValidationError,
  AuthorizationError,
  handleAsyncError
} from '@/utils/errors';
import { logger } from '@/config/logger';

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
 * Report Controller - Handles HTTP requests for report generation
 */
export class ReportController {
  /**
   * Get all available report templates for user
   * GET /api/v1/reports/templates
   */
  static getTemplates = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await ReportService.getAvailableTemplates(req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      templates: result.templates,
      count: result.templates.length
    });
  });

  /**
   * Get templates by category
   * GET /api/v1/reports/templates/:category
   */
  static getTemplatesByCategory = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { category } = req.params;
    const result = await ReportService.getTemplatesByCategory(
      category as any,
      req.user
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      templates: result.templates,
      category,
      count: result.templates.length
    });
  });

  /**
   * Generate and export report
   * POST /api/v1/reports/generate
   */
  static generateReport = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const reportRequest: ReportRequest = {
      template_id: req.body.template_id,
      user_id: req.user.id,
      user_role: req.user.role,
      date_range: {
        start: new Date(req.body.date_range.start),
        end: new Date(req.body.date_range.end)
      },
      filters: req.body.filters || {},
      format: req.body.format || 'pdf',
      custom_fields: req.body.custom_fields
    };

    // Generate report data
    const result = await ReportService.generateReportData(reportRequest, req.user);

    if (result.error || !result.reportData) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to generate report'
      });
    }

    const reportData = result.reportData;

    // Generate file based on format
    let fileContent: any;
    let contentType: string;
    let filename: string;

    switch (reportRequest.format) {
      case 'csv':
        const csvResult = await CsvReportGenerator.generate(reportData);
        if (csvResult.error || !csvResult.csv) {
          return res.status(500).json({
            success: false,
            error: csvResult.error || 'Failed to generate CSV'
          });
        }
        fileContent = csvResult.csv;
        contentType = 'text/csv';
        filename = `${reportData.template.template_id}_${Date.now()}.csv`;
        break;

      case 'excel':
        const excelResult = await ExcelReportGenerator.generate(reportData);
        if (excelResult.error || !excelResult.buffer) {
          return res.status(500).json({
            success: false,
            error: excelResult.error || 'Failed to generate Excel'
          });
        }
        fileContent = excelResult.buffer;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${reportData.template.template_id}_${Date.now()}.xlsx`;
        break;

      case 'pdf':
        const pdfResult = await PdfReportGenerator.generate(reportData);
        if (pdfResult.error || !pdfResult.buffer) {
          return res.status(500).json({
            success: false,
            error: pdfResult.error || 'Failed to generate PDF'
          });
        }
        fileContent = pdfResult.buffer;
        contentType = 'application/pdf';
        filename = `${reportData.template.template_id}_${Date.now()}.pdf`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported format'
        });
    }

    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logger.info(`Report downloaded: ${filename} by ${req.user.full_name}`);

    // Send file
    res.send(fileContent);
  });

  /**
   * Preview report data without generating file
   * POST /api/v1/reports/preview
   */
  static previewReport = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const reportRequest: ReportRequest = {
      template_id: req.body.template_id,
      user_id: req.user.id,
      user_role: req.user.role,
      date_range: {
        start: new Date(req.body.date_range.start),
        end: new Date(req.body.date_range.end)
      },
      filters: req.body.filters || {},
      format: 'pdf', // Format doesn't matter for preview
      custom_fields: req.body.custom_fields
    };

    const result = await ReportService.generateReportData(reportRequest, req.user);

    if (result.error || !result.reportData) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to generate report preview'
      });
    }

    // Return first 100 records for preview
    const previewData = {
      ...result.reportData,
      data: result.reportData.data.slice(0, 100),
      preview: true,
      full_count: result.reportData.data.length
    };

    res.json({
      success: true,
      report: previewData
    });
  });

  /**
   * Get report generation history
   * GET /api/v1/reports/history
   */
  static getHistory = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const result = await ReportService.getReportHistory(req.user, limit);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      history: result.history,
      count: result.history.length
    });
  });

  /**
   * Create custom report template
   * POST /api/v1/reports/templates/custom
   */
  static createCustomTemplate = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await ReportService.createCustomReport(req.body, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'Custom report template created successfully',
      template: result.template
    });
  });

  /**
   * Get live analytics data
   * GET /api/v1/reports/analytics/live
   */
  static getLiveAnalytics = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await ReportService.getLiveAnalytics(req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      analytics: result.analytics
    });
  });
}

// Validation schemas
export const generateReportValidation = [
  body('template_id')
    .isString()
    .notEmpty()
    .withMessage('Template ID is required'),
  body('date_range.start')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('date_range.end')
    .isISO8601()
    .withMessage('Valid end date is required'),
  body('format')
    .isIn(['pdf', 'excel', 'csv'])
    .withMessage('Format must be pdf, excel, or csv')
];

export const previewReportValidation = [
  body('template_id')
    .isString()
    .notEmpty()
    .withMessage('Template ID is required'),
  body('date_range.start')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('date_range.end')
    .isISO8601()
    .withMessage('Valid end date is required')
];

export const categoryValidation = [
  param('category')
    .isIn(['personal', 'team', 'project', 'financial', 'executive', 'system'])
    .withMessage('Invalid category')
];

export const createCustomTemplateValidation = [
  body('name')
    .isString()
    .notEmpty()
    .withMessage('Template name is required'),
  body('description')
    .isString()
    .notEmpty()
    .withMessage('Description is required'),
  body('category')
    .isIn(['personal', 'team', 'project', 'financial', 'executive', 'system'])
    .withMessage('Invalid category'),
  body('data_source.collection')
    .isString()
    .notEmpty()
    .withMessage('Data source collection is required'),
  body('available_formats')
    .isArray()
    .withMessage('Available formats must be an array'),
  body('default_format')
    .isIn(['pdf', 'excel', 'csv'])
    .withMessage('Invalid default format')
];

export default ReportController;
