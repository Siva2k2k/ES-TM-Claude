/**
 * CompanyHolidayController
 * Handles CRUD operations for company holidays
 */

import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import CompanyHolidayService from '@/services/CompanyHolidayService';
import { ValidationError, handleAsyncError } from '@/utils/errors';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    full_name: string;
  };
}

export class CompanyHolidayController {

  /**
   * Get all holidays (with optional filters)
   * GET /api/holidays
   */
  static getHolidays = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate, holiday_type, is_active, year } = req.query;

    let filters: any = {};

    if (startDate || endDate) {
      filters.startDate = startDate as string;
      filters.endDate = endDate as string;
    }

    if (year) {
      const yearNum = parseInt(year as string, 10);
      const holidays = await CompanyHolidayService.getHolidaysByYear(yearNum);
      return res.json({
        success: true,
        holidays
      });
    }

    if (holiday_type) {
      filters.holiday_type = holiday_type as any;
    }

    if (is_active !== undefined) {
      filters.is_active = is_active === 'true';
    }

    const holidays = await CompanyHolidayService.getHolidays(filters);

    res.json({
      success: true,
      holidays
    });
  });

  /**
   * Get upcoming holidays (next 30 days)
   * GET /api/holidays/upcoming
   */
  static getUpcomingHolidays = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

    const holidays = await CompanyHolidayService.getUpcomingHolidays(days);

    res.json({
      success: true,
      holidays,
      count: holidays.length
    });
  });

  /**
   * Get holiday by ID
   * GET /api/holidays/:id
   */
  static getHolidayById = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    const { id } = req.params;
    const holiday = await CompanyHolidayService.getHolidayById(id);

    res.json({
      success: true,
      holiday
    });
  });

  /**
   * Create a new holiday (Admin only)
   * POST /api/holidays
   */
  static createHoliday = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Only super_admin and management can create holidays
    if (!['super_admin', 'management'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can create holidays'
      });
    }

    const { name, date, holiday_type, description } = req.body;

    const holiday = await CompanyHolidayService.createHoliday({
      name,
      date,
      holiday_type,
      description,
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      holiday
    });
  });

  /**
   * Update a holiday (Admin only)
   * PUT /api/holidays/:id
   */
  static updateHoliday = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Only super_admin and management can update holidays
    if (!['super_admin', 'management'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can update holidays'
      });
    }

    const { id } = req.params;
    const { name, date, holiday_type, description, is_active } = req.body;

    const holiday = await CompanyHolidayService.updateHoliday(id, {
      name,
      date,
      holiday_type,
      description,
      is_active
    });

    res.json({
      success: true,
      message: 'Holiday updated successfully',
      holiday
    });
  });

  /**
   * Delete a holiday (Admin only)
   * DELETE /api/holidays/:id
   */
  static deleteHoliday = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Only super_admin and management can delete holidays
    if (!['super_admin', 'management'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can delete holidays'
      });
    }

    const { id } = req.params;
    await CompanyHolidayService.deleteHoliday(id);

    res.json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  });

  /**
   * Check if a specific date is a holiday
   * GET /api/holidays/check/:date
   */
  static checkHoliday = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const { date } = req.params;
    const checkDate = new Date(date);

    if (isNaN(checkDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    const isHoliday = await CompanyHolidayService.isHoliday(checkDate);
    const holiday = isHoliday ? await CompanyHolidayService.getHolidayByDate(checkDate) : null;

    res.json({
      success: true,
      is_holiday: isHoliday,
      holiday
    });
  });
}

// Validation middleware
export const createHolidayValidation = [
  body('name')
    .notEmpty()
    .withMessage('Holiday name is required')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Holiday name must be between 1 and 200 characters'),
  body('date')
    .notEmpty()
    .withMessage('Holiday date is required')
    .isISO8601()
    .withMessage('Date must be in ISO format (YYYY-MM-DD)'),
  body('holiday_type')
    .optional()
    .isIn(['public', 'company', 'optional'])
    .withMessage('Holiday type must be one of: public, company, optional'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
];

export const updateHolidayValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid holiday ID format'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Holiday name must be between 1 and 200 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO format (YYYY-MM-DD)'),
  body('holiday_type')
    .optional()
    .isIn(['public', 'company', 'optional'])
    .withMessage('Holiday type must be one of: public, company, optional'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean')
];

export const holidayIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid holiday ID format')
];
