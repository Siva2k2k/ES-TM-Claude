/**
 * DefaulterController
 * Handles defaulter tracking and notifications
 */

import { Request, Response } from 'express';
import { param, query, body, validationResult } from 'express-validator';
import DefaulterService from '@/services/DefaulterService';
import { ValidationError, handleAsyncError } from '@/utils/errors';
import { parseLocalDate } from '@/utils/dateUtils';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    full_name: string;
  };
}

export class DefaulterController {

  /**
   * Get defaulters for a specific project and week
   * GET /api/defaulters/:projectId/:weekStart
   *
   * Access: Lead, Manager, Management, Super Admin
   *
   * Behavior: Excludes the requesting user's role from defaulters
   * - Lead accessing → excludes lead role
   * - Manager accessing → excludes manager role
   */
  static getProjectDefaulters = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const { projectId, weekStart } = req.params;
    const weekStartDate = parseLocalDate(weekStart);

    // Exclude the requesting user's role from defaulters
    // If lead is accessing, don't show leads as defaulters
    // If manager is accessing, don't show managers as defaulters
    const excludeRole = req.user.role;

    const defaulters = await DefaulterService.getProjectDefaulters(
      projectId,
      weekStartDate,
      excludeRole
    );

    res.json({
      success: true,
      project_id: projectId,
      week_start_date: weekStart,
      defaulters,
      count: defaulters.length,
      excluded_role: excludeRole
    });
  });

  /**
   * Get all defaulters for a manager across all their projects
   * GET /api/defaulters/manager/:managerId/:weekStart
   *
   * Returns aggregated statistics instead of project-grouped data
   *
   * Access: Manager (self), Management, Super Admin
   */
  static getManagerDefaulters = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const { managerId, weekStart } = req.params;
    const weekStartDate = parseLocalDate(weekStart);

    // Authorization: Can only view own defaulters unless super_admin/management
    if (req.user.id !== managerId && !['super_admin', 'management'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own defaulters'
      });
    }

    const stats = await DefaulterService.getManagerDefaulters(managerId, weekStartDate);

    res.json({
      success: true,
      manager_id: managerId,
      week_start_date: weekStart,
      total_defaulters: stats.total_defaulters,
      by_project: stats.by_project,
      critical_defaulters: stats.critical_defaulters,
      all_defaulters: stats.all_defaulters
    });
  });

  /**
   * Get defaulter statistics for dashboard
   * GET /api/defaulters/stats
   *
   * Query params:
   * - managerId (optional): Filter to specific manager
   * - weekStartDate (optional): Specific week (defaults to current week)
   *
   * Access: Manager (self), Management, Super Admin
   */
  static getDefaulterStats = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const { managerId, weekStartDate } = req.query;

    // Authorization: Can only view own stats unless super_admin/management
    if (managerId && req.user.id !== managerId && !['super_admin', 'management'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own statistics'
      });
    }

    const weekStart = weekStartDate ? parseLocalDate(weekStartDate as string) : undefined;

    const stats = await DefaulterService.getDefaulterStats(
      managerId as string | undefined,
      weekStart
    );

    res.json({
      success: true,
      stats
    });
  });

  /**
   * Send reminder notifications to defaulters
   * POST /api/defaulters/notify
   *
   * Body:
   * - projectId: Project ID
   * - weekStartDate: Week start date (YYYY-MM-DD)
   *
   * Access: Lead, Manager, Management, Super Admin
   */
  static notifyDefaulters = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Only leads, managers, and admins can send notifications
    if (!['lead', 'manager', 'management', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only team leads, managers, and administrators can send reminders'
      });
    }

    const { projectId, weekStartDate } = req.body;
    const weekStart = parseLocalDate(weekStartDate);

    const notificationCount = await DefaulterService.notifyDefaulters(projectId, weekStart);

    res.json({
      success: true,
      message: `Reminder notifications sent to ${notificationCount} team member${notificationCount !== 1 ? 's' : ''}`,
      notification_count: notificationCount
    });
  });

  /**
   * Validate that there are no defaulters for a project-week
   * GET /api/defaulters/validate/:projectId/:weekStart
   *
   * Returns: { has_defaulters: boolean, defaulters: [...], can_proceed: boolean }
   *
   * This endpoint is used to check if approval/rejection buttons should be enabled
   *
   * Behavior: Excludes the requesting user's role from validation
   *
   * Access: Lead, Manager, Management, Super Admin
   */
  static validateNoDefaulters = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    const { projectId, weekStart } = req.params;
    const weekStartDate = parseLocalDate(weekStart);

    // Exclude the requesting user's role from defaulters validation
    const excludeRole = req.user.role;

    const defaulters = await DefaulterService.getProjectDefaulters(
      projectId,
      weekStartDate,
      excludeRole
    );

    const hasDefaulters = defaulters.length > 0;

    res.json({
      success: true,
      project_id: projectId,
      week_start_date: weekStart,
      has_defaulters: hasDefaulters,
      can_proceed: !hasDefaulters,
      defaulters: defaulters,
      defaulter_count: defaulters.length,
      excluded_role: excludeRole
    });
  });

  /**
   * Get users who haven't submitted timesheets for any project in the past 2 weeks
   * GET /api/defaulters/missing-submissions
   *
   * Returns missing submissions with formatted messages for display
   *
   * Access: Lead, Manager, Management, Super Admin
   */
  static getMissingSubmissions = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new ValidationError('User not authenticated');
    }

    // Only leads and managers can access this endpoint
    if (!['lead', 'manager', 'management', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only team leads and managers can view missing submissions'
      });
    }

    const missingSubmissions = await DefaulterService.getMissingSubmissionsForPastWeeks(
      req.user.id,
      req.user.role
    );

    res.json({
      success: true,
      user_id: req.user.id,
      user_role: req.user.role,
      missing_submissions: missingSubmissions,
      count: missingSubmissions.length,
      period: 'past 2 weeks'
    });
  });
}

// Validation middleware

export const projectDefaultersValidation = [
  param('projectId')
    .isMongoId()
    .withMessage('Invalid project ID format'),
  param('weekStart')
    .notEmpty()
    .withMessage('Week start date is required')
    .matches(/^\d{4}-\d{2}-\d{2}(T.*)?$/)
    .withMessage('Week start date must be in YYYY-MM-DD or ISO 8601 format')
];

export const managerDefaultersValidation = [
  param('managerId')
    .isMongoId()
    .withMessage('Invalid manager ID format'),
  param('weekStart')
    .notEmpty()
    .withMessage('Week start date is required')
    .matches(/^\d{4}-\d{2}-\d{2}(T.*)?$/)
    .withMessage('Week start date must be in YYYY-MM-DD or ISO 8601 format')
];

export const notifyDefaultersValidation = [
  body('projectId')
    .isMongoId()
    .withMessage('Invalid project ID format'),
  body('weekStartDate')
    .notEmpty()
    .withMessage('Week start date is required')
    .matches(/^\d{4}-\d{2}-\d{2}(T.*)?$/)
    .withMessage('Week start date must be in YYYY-MM-DD or ISO 8601 format')
];
