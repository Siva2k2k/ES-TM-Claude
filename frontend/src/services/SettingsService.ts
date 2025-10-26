import { backendApi } from './BackendAPI';
import { BackendAuthService } from './BackendAuthService';
import { UserSettings, ReportTemplate, SystemSetting } from '../types/settings';
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
      const result = await BackendAuthService.changePassword({
        currentPassword,
        newPassword
      });
      
      return result;
    } catch (error) {
      console.error('Error changing password:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to change password' };
    }
  }
}