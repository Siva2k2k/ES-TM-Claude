import { body, param } from 'express-validator';

// ============================================================================
// USER SETTINGS VALIDATION
// ============================================================================

export const updateUserSettingsValidation = [
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Theme must be light, dark, or system'),
  
  body('timezone')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Timezone must be a valid string'),
  
  body('date_format')
    .optional()
    .isIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'])
    .withMessage('Date format must be MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD'),
  
  body('time_format')
    .optional()
    .isIn(['12h', '24h'])
    .withMessage('Time format must be 12h or 24h'),
  
  // Notification settings
  body('notifications.email_enabled')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be boolean'),
  
  body('notifications.push_enabled')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be boolean'),
  
  body('notifications.timesheet_reminders')
    .optional()
    .isBoolean()
    .withMessage('Timesheet reminders must be boolean'),
  
  body('notifications.approval_notifications')
    .optional()
    .isBoolean()
    .withMessage('Approval notifications must be boolean'),
  
  body('notifications.team_updates')
    .optional()
    .isBoolean()
    .withMessage('Team updates must be boolean'),
  
  body('notifications.system_announcements')
    .optional()
    .isBoolean()
    .withMessage('System announcements must be boolean'),
  
  body('notifications.frequency')
    .optional()
    .isIn(['immediate', 'daily', 'weekly'])
    .withMessage('Notification frequency must be immediate, daily, or weekly'),
  
  // Display preferences
  body('display_preferences.sidebar_collapsed')
    .optional()
    .isBoolean()
    .withMessage('Sidebar collapsed must be boolean'),
  
  body('display_preferences.table_page_size')
    .optional()
    .isInt({ min: 5, max: 100 })
    .withMessage('Table page size must be between 5 and 100'),
  
  body('display_preferences.dashboard_widgets')
    .optional()
    .isArray()
    .withMessage('Dashboard widgets must be an array'),
  
  body('display_preferences.chart_preferences.default_period')
    .optional()
    .isIn(['7d', '30d', '90d', '1y'])
    .withMessage('Default period must be 7d, 30d, 90d, or 1y'),
  
  body('display_preferences.chart_preferences.show_animations')
    .optional()
    .isBoolean()
    .withMessage('Show animations must be boolean'),
  
  // Privacy settings
  body('privacy_settings.profile_visibility')
    .optional()
    .isIn(['public', 'team', 'private'])
    .withMessage('Profile visibility must be public, team, or private'),
  
  body('privacy_settings.show_activity_status')
    .optional()
    .isBoolean()
    .withMessage('Show activity status must be boolean'),
  
  body('privacy_settings.share_analytics')
    .optional()
    .isBoolean()
    .withMessage('Share analytics must be boolean')
];

// ============================================================================
// REPORT TEMPLATE VALIDATION
// ============================================================================

export const createReportTemplateValidation = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Template name is required and must be less than 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('category')
    .notEmpty()
    .isIn(['timesheet', 'project', 'user', 'analytics', 'custom'])
    .withMessage('Category must be timesheet, project, user, analytics, or custom'),
  
  body('template_data.fields')
    .isArray({ min: 1 })
    .withMessage('At least one field is required'),
  
  body('template_data.format')
    .notEmpty()
    .isIn(['pdf', 'excel', 'csv'])
    .withMessage('Format must be pdf, excel, or csv'),
  
  body('access_level')
    .optional()
    .isIn(['personal', 'team', 'organization', 'system'])
    .withMessage('Access level must be personal, team, organization, or system'),
  
  body('allowed_roles')
    .optional()
    .isArray()
    .withMessage('Allowed roles must be an array'),
  
  body('allowed_roles.*')
    .optional()
    .isIn(['employee', 'lead', 'manager', 'management', 'super_admin'])
    .withMessage('Invalid role in allowed_roles')
];

export const updateReportTemplateValidation = [
  param('templateId')
    .isMongoId()
    .withMessage('Invalid template ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Template name must be less than 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('category')
    .optional()
    .isIn(['timesheet', 'project', 'user', 'analytics', 'custom'])
    .withMessage('Category must be timesheet, project, user, analytics, or custom'),
  
  body('template_data.fields')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one field is required'),
  
  body('template_data.format')
    .optional()
    .isIn(['pdf', 'excel', 'csv'])
    .withMessage('Format must be pdf, excel, or csv'),
  
  body('access_level')
    .optional()
    .isIn(['personal', 'team', 'organization', 'system'])
    .withMessage('Access level must be personal, team, organization, or system'),
  
  body('allowed_roles')
    .optional()
    .isArray()
    .withMessage('Allowed roles must be an array'),
  
  body('allowed_roles.*')
    .optional()
    .isIn(['employee', 'lead', 'manager', 'management', 'super_admin'])
    .withMessage('Invalid role in allowed_roles')
];

export const templateIdValidation = [
  param('templateId')
    .isMongoId()
    .withMessage('Invalid template ID')
];

// ============================================================================
// SYSTEM SETTINGS VALIDATION
// ============================================================================

export const updateSystemSettingValidation = [
  param('settingKey')
    .notEmpty()
    .matches(/^[a-z][a-z0-9_]*$/)
    .withMessage('Setting key must be in snake_case format'),
  
  body('value')
    .exists()
    .withMessage('Setting value is required')
];

// ============================================================================
// THEME VALIDATION
// ============================================================================

export const updateThemeValidation = [
  body('theme')
    .notEmpty()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Theme must be light, dark, or system')
];

// ============================================================================
// NOTIFICATION VALIDATION
// ============================================================================

export const updateNotificationValidation = [
  body('email_enabled')
    .optional()
    .isBoolean()
    .withMessage('Email enabled must be boolean'),
  
  body('push_enabled')
    .optional()
    .isBoolean()
    .withMessage('Push enabled must be boolean'),
  
  body('timesheet_reminders')
    .optional()
    .isBoolean()
    .withMessage('Timesheet reminders must be boolean'),
  
  body('approval_notifications')
    .optional()
    .isBoolean()
    .withMessage('Approval notifications must be boolean'),
  
  body('team_updates')
    .optional()
    .isBoolean()
    .withMessage('Team updates must be boolean'),
  
  body('system_announcements')
    .optional()
    .isBoolean()
    .withMessage('System announcements must be boolean'),
  
  body('frequency')
    .optional()
    .isIn(['immediate', 'daily', 'weekly'])
    .withMessage('Frequency must be immediate, daily, or weekly')
];

// ============================================================================
// USER ID VALIDATION (for admin settings management)
// ============================================================================

export const userIdValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID')
];