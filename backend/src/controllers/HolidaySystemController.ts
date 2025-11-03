/**
 * Holiday System Controller
 * 
 * Handles HTTP requests for holiday system management, initialization,
 * and configuration. Provides admin endpoints for setting up and managing
 * the simplified company holiday system.
 */

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { HolidaySystemService } from '@/services/HolidaySystemService';
import { handleAsyncError } from '@/utils/errors';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    full_name: string;
  };
}

export class HolidaySystemController {

  /**
   * Initialize the holiday system (Super Admin only)
   * POST /api/holiday-system/initialize
   */
  static readonly initializeSystem = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const result = await HolidaySystemService.initializeSystem(req.user);

    if (!result.success) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  });

  /**
   * Get holiday system status and configuration
   * GET /api/holiday-system/status
   */
  static readonly getSystemStatus = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const status = await HolidaySystemService.getSystemStatus();

    if (status.error) {
      return res.status(500).json({
        success: false,
        error: status.error
      });
    }

    res.json({
      success: true,
      status: {
        calendar: status.calendar,
        settings: status.settings,
        holidayCount: status.holidayCount,
        isInitialized: !!status.calendar
      }
    });
  });

  /**
   * Update company calendar settings (Admin only)
   * PUT /api/holiday-system/calendar
   */
  static readonly updateCalendarSettings = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array().map(err => err.msg).join(', ')
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const {
      auto_create_holiday_entries,
      default_holiday_hours,
      working_days,
      working_hours_per_day
    } = req.body;

    const result = await HolidaySystemService.updateCalendarSettings({
      auto_create_holiday_entries,
      default_holiday_hours,
      working_days,
      working_hours_per_day
    }, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Calendar settings updated successfully',
      calendar: result.calendar
    });
  });

  /**
   * Get holidays for a specific year
   * GET /api/holiday-system/holidays/:year?
   */
  static readonly getYearlyHolidays = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const year = req.params.year ? Number.parseInt(req.params.year, 10) : undefined;
    
    if (year && (Number.isNaN(year) || year < 1900 || year > 2100)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid year. Must be between 1900 and 2100.'
      });
    }

    const result = await HolidaySystemService.getYearlyHolidays(year);

    if (result.error) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      year: year || new Date().getFullYear(),
      holidays: result.holidays
    });
  });

  /**
   * Bulk import holidays (Admin only)
   * POST /api/holiday-system/bulk-import
   */
  static readonly bulkImportHolidays = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array().map(err => err.msg).join(', ')
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { holidays } = req.body;

    const result = await HolidaySystemService.bulkImportHolidays(holidays, req.user);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.errors.join(', ') || 'Failed to import holidays'
      });
    }

    res.json({
      success: true,
      message: `Successfully imported ${result.imported} holidays. Skipped ${result.skipped} duplicate(s).`,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors
    });
  });
}

// Validation middleware
export const updateCalendarValidation = [
  body('auto_create_holiday_entries')
    .optional()
    .isBoolean()
    .withMessage('auto_create_holiday_entries must be a boolean'),
  body('default_holiday_hours')
    .optional()
    .isInt({ min: 0, max: 24 })
    .withMessage('default_holiday_hours must be between 0 and 24'),
  body('working_days')
    .optional()
    .isArray({ min: 1, max: 7 })
    .withMessage('working_days must be an array with 1-7 elements')
    .custom((days: number[]) => {
      if (!days.every(day => Number.isInteger(day) && day >= 0 && day <= 6)) {
        throw new Error('working_days must contain integers between 0 (Sunday) and 6 (Saturday)');
      }
      return true;
    }),
  body('working_hours_per_day')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('working_hours_per_day must be between 1 and 24')
];

export const bulkImportValidation = [
  body('holidays')
    .isArray({ min: 1 })
    .withMessage('holidays must be a non-empty array'),
  body('holidays.*.name')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Holiday name is required and must be between 1 and 200 characters'),
  body('holidays.*.date')
    .notEmpty()
    .isISO8601()
    .withMessage('Holiday date is required and must be in ISO format (YYYY-MM-DD)'),
  body('holidays.*.holiday_type')
    .isIn(['public', 'company', 'optional'])
    .withMessage('Holiday type must be one of: public, company, optional'),
  body('holidays.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Holiday description must not exceed 500 characters')
];

export default HolidaySystemController;