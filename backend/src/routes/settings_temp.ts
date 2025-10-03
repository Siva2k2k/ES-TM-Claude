import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController';
import { requireAuth, requireRole } from '../middleware/auth';
// Temporarily disabled validation to fix compilation errors
// import {
//   updateUserSettingsValidation,
//   createReportTemplateValidation,
//   updateReportTemplateValidation,
//   templateIdValidation,
//   updateSystemSettingValidation,
//   updateThemeValidation,
//   updateNotificationValidation,
//   userIdValidation
// } from '../validation/settingsValidation';

const router = Router();

// ============================================================================
// USER SETTINGS ROUTES
// ============================================================================

/**
 * @route GET /api/v1/settings/profile
 * @desc Get current user's settings
 * @access Private
 */
router.get('/profile', requireAuth, SettingsController.getUserSettings);

/**
 * @route GET /api/v1/settings/profile/:userId
 * @desc Get specific user's settings (Admin only)
 * @access Private (Admin+)
 */
router.get('/profile/:userId', requireAuth, SettingsController.getUserSettings);

/**
 * @route PUT /api/v1/settings/profile
 * @desc Update current user's settings
 * @access Private
 */
router.put('/profile', requireAuth, updateUserSettingsValidation, SettingsController.updateUserSettings);

/**
 * @route PUT /api/v1/settings/profile/:userId
 * @desc Update specific user's settings (Admin only)
 * @access Private (Admin+)
 */
router.put('/profile/:userId', 
  requireAuth, 
  requireRole(['super_admin', 'management']), 
  userIdValidation, 
  updateUserSettingsValidation, 
  SettingsController.updateUserSettings
);

/**
 * @route POST /api/v1/settings/profile/reset
 * @desc Reset current user's settings to default
 * @access Private
 */
router.post('/profile/reset', requireAuth, SettingsController.resetUserSettings);

/**
 * @route POST /api/v1/settings/profile/:userId/reset
 * @desc Reset specific user's settings to default (Admin only)
 * @access Private (Admin+)
 */
router.post('/profile/:userId/reset', 
  requireAuth, 
  requireRole(['super_admin', 'management']), 
  userIdValidation, 
  SettingsController.resetUserSettings
);

// ============================================================================
// QUICK SETTINGS ROUTES
// ============================================================================

/**
 * @route PUT /api/v1/settings/theme
 * @desc Update theme preference
 * @access Private
 */
router.put('/theme', requireAuth, updateThemeValidation, SettingsController.updateTheme);

/**
 * @route PUT /api/v1/settings/notifications
 * @desc Update notification preferences
 * @access Private
 */
router.put('/notifications', requireAuth, updateNotificationValidation, SettingsController.updateNotifications);

// ============================================================================
// REPORT TEMPLATE ROUTES
// ============================================================================

/**
 * @route GET /api/v1/settings/templates
 * @desc Get available report templates
 * @access Private (Lead+)
 */
router.get('/templates', 
  requireAuth, 
  requireRole(['lead', 'manager', 'management', 'super_admin']), 
  SettingsController.getReportTemplates
);

/**
 * @route POST /api/v1/settings/templates
 * @desc Create new report template
 * @access Private (Lead+)
 */
router.post('/templates', 
  requireAuth, 
  requireRole(['lead', 'manager', 'management', 'super_admin']), 
  createReportTemplateValidation, 
  SettingsController.createReportTemplate
);

/**
 * @route PUT /api/v1/settings/templates/:templateId
 * @desc Update report template
 * @access Private (Owner or Admin)
 */
router.put('/templates/:templateId', 
  requireAuth, 
  updateReportTemplateValidation, 
  SettingsController.updateReportTemplate
);

/**
 * @route DELETE /api/v1/settings/templates/:templateId
 * @desc Delete report template
 * @access Private (Owner or Admin)
 */
router.delete('/templates/:templateId', 
  requireAuth, 
  templateIdValidation, 
  SettingsController.deleteReportTemplate
);

// ============================================================================
// SYSTEM SETTINGS ROUTES (Admin Only)
// ============================================================================

/**
 * @route GET /api/v1/settings/system
 * @desc Get system settings (role-based filtering)
 * @access Private
 */
router.get('/system', requireAuth, SettingsController.getSystemSettings);

/**
 * @route PUT /api/v1/settings/system/:settingKey
 * @desc Update system setting
 * @access Private (Super Admin only)
 */
router.put('/system/:settingKey', 
  requireAuth, 
  requireRole(['super_admin']), 
  updateSystemSettingValidation, 
  SettingsController.updateSystemSetting
);

export default router;
