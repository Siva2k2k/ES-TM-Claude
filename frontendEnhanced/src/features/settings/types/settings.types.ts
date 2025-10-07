/**
 * Settings Types
 * Type definitions for settings feature
 */

/**
 * User settings interface
 */
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  time_format: '12h' | '24h';
  notifications: NotificationPreferences;
  display_preferences: DisplayPreferences;
  privacy_settings: PrivacySettings;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  timesheet_reminders: boolean;
  approval_notifications: boolean;
  team_updates: boolean;
  system_announcements: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

/**
 * Display preferences
 */
export interface DisplayPreferences {
  sidebar_collapsed: boolean;
  table_page_size: number;
  dashboard_widgets: string[];
  chart_preferences: ChartPreferences;
}

/**
 * Chart preferences
 */
export interface ChartPreferences {
  default_period: '7d' | '30d' | '90d' | '1y';
  show_animations: boolean;
}

/**
 * Privacy settings
 */
export interface PrivacySettings {
  profile_visibility: 'public' | 'team' | 'private';
  show_activity_status: boolean;
  share_analytics: boolean;
}

/**
 * Report template interface
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'timesheet' | 'project' | 'user' | 'analytics' | 'custom';
  template_data: TemplateData;
  access_level: 'personal' | 'team' | 'organization' | 'system';
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Template data structure
 */
export interface TemplateData {
  fields: string[];
  filters: Record<string, string | number | boolean>;
  format: 'pdf' | 'excel' | 'csv';
}

/**
 * System setting interface
 */
export interface SystemSetting {
  setting_key: string;
  setting_value: string | number | boolean | Record<string, unknown>;
  description?: string;
  category: 'general' | 'security' | 'notifications' | 'reports' | 'integration' | 'appearance';
  is_public: boolean;
  updated_by: string;
  updated_at: string;
}

/**
 * Profile update payload
 */
export interface ProfileUpdatePayload {
  full_name?: string;
  hourly_rate?: number;
}

/**
 * Password change payload
 */
export interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Password validation result
 */
export interface PasswordValidation {
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  strength: 'weak' | 'medium' | 'strong';
  score: number;
}

/**
 * Settings state interface
 */
export interface SettingsState {
  userSettings: UserSettings | null;
  reportTemplates: ReportTemplate[];
  systemSettings: SystemSetting[];
  isLoading: boolean;
  error: string | null;
}
