import { backendApi } from './BackendAPI';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  time_format: '12h' | '24h';
  notifications: {
    email_enabled: boolean;
    push_enabled: boolean;
    timesheet_reminders: boolean;
    approval_notifications: boolean;
    team_updates: boolean;
    system_announcements: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  display_preferences: {
    sidebar_collapsed: boolean;
    table_page_size: number;
    dashboard_widgets: string[];
    chart_preferences: {
      default_period: '7d' | '30d' | '90d' | '1y';
      show_animations: boolean;
    };
  };
  privacy_settings: {
    profile_visibility: 'public' | 'team' | 'private';
    show_activity_status: boolean;
    share_analytics: boolean;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'timesheet' | 'project' | 'user' | 'analytics' | 'custom';
  template_data: {
    fields: string[];
    filters: Record<string, string | number | boolean>;
    format: 'pdf' | 'excel' | 'csv';
  };
  access_level: 'personal' | 'team' | 'organization' | 'system';
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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
 * Settings Service - Handles all settings-related API calls
 */
export class SettingsService {
  
  // ============================================================================
  // USER SETTINGS
  // ============================================================================
  
  /**
   * Get current user's settings
   */
  static async getUserSettings(): Promise<{ settings?: UserSettings; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; settings?: UserSettings; error?: string }>('/settings/profile');
      
      if (response.success && response.settings) {
        return { settings: response.settings };
      } else {
        return { error: response.error || 'Failed to load settings' };
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      return { error: 'Failed to load settings' };
    }
  }

  /**
   * Update user settings
   */
  static async updateUserSettings(settings: Partial<UserSettings>): Promise<{ settings?: UserSettings; error?: string }> {
    try {
      const response = await backendApi.put<{ success: boolean; settings?: UserSettings; error?: string }>('/settings/profile', settings);
      
      if (response.success && response.settings) {
        return { settings: response.settings };
      } else {
        return { error: response.error || 'Failed to update settings' };
      }
    } catch (error) {
      console.error('Error updating user settings:', error);
      return { error: 'Failed to update settings' };
    }
  }

  /**
   * Update theme preference only
   */
  static async updateTheme(theme: 'light' | 'dark' | 'system'): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.put<{ success: boolean; error?: string }>('/settings/theme', { theme });
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Error updating theme:', error);
      return { success: false, error: 'Failed to update theme' };
    }
  }

  // ============================================================================
  // REPORT TEMPLATES
  // ============================================================================

  /**
   * Get available report templates
   */
  static async getReportTemplates(): Promise<{ templates?: ReportTemplate[]; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; templates?: ReportTemplate[]; error?: string }>('/settings/templates');
      
      if (response.success && response.templates) {
        return { templates: response.templates };
      } else {
        return { error: response.error || 'Failed to load report templates' };
      }
    } catch (error) {
      console.error('Error loading report templates:', error);
      return { error: 'Failed to load report templates' };
    }
  }

  /**
   * Create new report template
   */
  static async createReportTemplate(template: Partial<ReportTemplate>): Promise<{ template?: ReportTemplate; error?: string }> {
    try {
      const response = await backendApi.post<{ success: boolean; template?: ReportTemplate; error?: string }>('/settings/templates', template);
      
      if (response.success && response.template) {
        return { template: response.template };
      } else {
        return { error: response.error || 'Failed to create report template' };
      }
    } catch (error) {
      console.error('Error creating report template:', error);
      return { error: 'Failed to create report template' };
    }
  }

  /**
   * Update report template
   */
  static async updateReportTemplate(templateId: string, template: Partial<ReportTemplate>): Promise<{ template?: ReportTemplate; error?: string }> {
    try {
      const response = await backendApi.put<{ success: boolean; template?: ReportTemplate; error?: string }>(`/settings/templates/${templateId}`, template);
      
      if (response.success && response.template) {
        return { template: response.template };
      } else {
        return { error: response.error || 'Failed to update report template' };
      }
    } catch (error) {
      console.error('Error updating report template:', error);
      return { error: 'Failed to update report template' };
    }
  }

  /**
   * Delete report template
   */
  static async deleteReportTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.delete<{ success: boolean; error?: string }>(`/settings/templates/${templateId}`);
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Error deleting report template:', error);
      return { success: false, error: 'Failed to delete report template' };
    }
  }

  // ============================================================================
  // SYSTEM SETTINGS (Admin Only)
  // ============================================================================

  /**
   * Get system settings
   */
  static async getSystemSettings(): Promise<{ settings?: SystemSetting[]; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; settings?: SystemSetting[]; error?: string }>('/settings/system');
      
      if (response.success && response.settings) {
        return { settings: response.settings };
      } else {
        return { error: response.error || 'Failed to load system settings' };
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
      return { error: 'Failed to load system settings' };
    }
  }

  /**
   * Update system setting
   */
  static async updateSystemSetting(settingKey: string, value: string | number | boolean | Record<string, unknown>): Promise<{ setting?: SystemSetting; error?: string }> {
    try {
      const response = await backendApi.put<{ success: boolean; setting?: SystemSetting; error?: string }>(`/settings/system/${settingKey}`, { value });
      
      if (response.success && response.setting) {
        return { setting: response.setting };
      } else {
        return { error: response.error || 'Failed to update system setting' };
      }
    } catch (error) {
      console.error('Error updating system setting:', error);
      return { error: 'Failed to update system setting' };
    }
  }

  // ============================================================================
  // PASSWORD MANAGEMENT
  // ============================================================================

  /**
   * Change password
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.post<{ success: boolean; error?: string }>('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword: newPassword
      });
      
      return { success: response.success, error: response.error };
    } catch (error) {
      console.error('Error changing password:', error);
      return { success: false, error: 'Failed to change password' };
    }
  }
}