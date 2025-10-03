import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { SettingsService } from '../services/SettingsService';
import { AuthRequest } from '../middleware/auth';
import { handleAsyncError, ValidationError, AuthorizationError } from '../utils/errors';

export class SettingsController {

  // ============================================================================
  // USER SETTINGS
  // ============================================================================

  /**
   * Get current user's settings
   * GET /api/v1/settings/profile
   */
  static getUserSettings = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const targetUserId = userId || req.user.id;

    const result = await SettingsService.getUserSettings(targetUserId, req.user);

    if (result.error) {
      return res.status(403).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      settings: result.settings
    });
  });

  /**
   * Update user settings
   * PUT /api/v1/settings/profile
   */
  static updateUserSettings = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const targetUserId = userId || req.user.id;

    const result = await SettingsService.updateUserSettings(
      targetUserId,
      req.body,
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
      message: 'Settings updated successfully',
      settings: result.settings
    });
  });

  /**
   * Reset user settings to default
   * POST /api/v1/settings/profile/reset
   */
  static resetUserSettings = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { userId } = req.params;
    const targetUserId = userId || req.user.id;

    const result = await SettingsService.resetUserSettings(targetUserId, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Settings reset to default successfully',
      settings: result.settings
    });
  });

  // ============================================================================
  // REPORT TEMPLATES
  // ============================================================================

  /**
   * Get available report templates
   * GET /api/v1/settings/templates
   */
  static getReportTemplates = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await SettingsService.getAvailableTemplates(req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      templates: result.templates
    });
  });

  /**
   * Create new report template
   * POST /api/v1/settings/templates
   */
  static createReportTemplate = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await SettingsService.createReportTemplate(req.body, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'Report template created successfully',
      template: result.template
    });
  });

  /**
   * Update report template
   * PUT /api/v1/settings/templates/:templateId
   */
  static updateReportTemplate = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { templateId } = req.params;

    const result = await SettingsService.updateReportTemplate(
      templateId,
      req.body,
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
      message: 'Report template updated successfully',
      template: result.template
    });
  });

  /**
   * Delete report template
   * DELETE /api/v1/settings/templates/:templateId
   */
  static deleteReportTemplate = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { templateId } = req.params;

    const result = await SettingsService.deleteReportTemplate(templateId, req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Report template deleted successfully'
    });
  });

  // ============================================================================
  // SYSTEM SETTINGS (Admin Only)
  // ============================================================================

  /**
   * Get system settings
   * GET /api/v1/settings/system
   */
  static getSystemSettings = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await SettingsService.getSystemSettings(req.user);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      settings: result.settings
    });
  });

  /**
   * Update system setting
   * PUT /api/v1/settings/system/:settingKey
   */
  static updateSystemSetting = handleAsyncError(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { settingKey } = req.params;
    const { value } = req.body;

    const result = await SettingsService.updateSystemSetting(
      settingKey,
      value,
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
      message: 'System setting updated successfully',
      setting: result.setting
    });
  });

  // ============================================================================
  // QUICK SETTINGS ENDPOINTS
  // ============================================================================

  /**
   * Update theme preference only
   * PUT /api/v1/settings/theme
   */
  static updateTheme = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const { theme } = req.body;

    if (!['light', 'dark', 'system'].includes(theme)) {
      throw new ValidationError('Invalid theme value');
    }

    const result = await SettingsService.updateUserSettings(
      req.user.id,
      { theme },
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
      message: 'Theme updated successfully',
      theme
    });
  });

  /**
   * Update notification preferences only
   * PUT /api/v1/settings/notifications
   */
  static updateNotifications = handleAsyncError(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthorizationError('User not authenticated');
    }

    const result = await SettingsService.updateUserSettings(
      req.user.id,
      { notifications: req.body },
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
      message: 'Notification preferences updated successfully',
      notifications: result.settings?.notifications
    });
  });
}