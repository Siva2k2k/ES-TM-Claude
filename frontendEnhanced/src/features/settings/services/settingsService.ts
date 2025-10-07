/**
 * Settings Service
 * Handles all settings-related API calls
 */

import type {
  UserSettings,
  ReportTemplate,
  SystemSetting,
  ProfileUpdatePayload,
  PasswordChangePayload,
} from '../types/settings.types';

/**
 * Settings service class
 * Manages settings API interactions
 */
export class SettingsService {
  private static readonly baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

  /**
   * Get authorization headers with access token
   */
  private static getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // ============================================================================
  // USER SETTINGS
  // ============================================================================

  /**
   * Get current user's settings
   */
  static async getUserSettings(): Promise<{ settings?: UserSettings; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/settings/profile`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to load settings' };
      }

      return { settings: result.settings };
    } catch (error) {
      console.error('[SettingsService] Error loading user settings:', error);
      return { error: 'Failed to load settings' };
    }
  }

  /**
   * Update user settings
   */
  static async updateUserSettings(settings: Partial<UserSettings>): Promise<{ settings?: UserSettings; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/settings/profile`, {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to update settings' };
      }

      return { settings: result.settings };
    } catch (error) {
      console.error('[SettingsService] Error updating user settings:', error);
      return { error: 'Failed to update settings' };
    }
  }

  /**
   * Update theme preference only
   */
  static async updateTheme(theme: 'light' | 'dark' | 'system'): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/settings/theme`, {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to update theme' };
      }

      return { success: true };
    } catch (error) {
      console.error('[SettingsService] Error updating theme:', error);
      return { success: false, error: 'Failed to update theme' };
    }
  }

  // ============================================================================
  // PROFILE MANAGEMENT
  // ============================================================================

  /**
   * Update user profile
   */
  static async updateProfile(data: ProfileUpdatePayload): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/auth/profile`, {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to update profile' };
      }

      return { success: true };
    } catch (error) {
      console.error('[SettingsService] Error updating profile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  // ============================================================================
  // PASSWORD MANAGEMENT
  // ============================================================================

  /**
   * Change password
   */
  static async changePassword(data: PasswordChangePayload): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/auth/change-password`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to change password' };
      }

      return { success: true };
    } catch (error) {
      console.error('[SettingsService] Error changing password:', error);
      return { success: false, error: 'Failed to change password' };
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
      const response = await fetch(`${this.baseURL}/settings/templates`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to load report templates' };
      }

      return { templates: result.templates };
    } catch (error) {
      console.error('[SettingsService] Error loading report templates:', error);
      return { error: 'Failed to load report templates' };
    }
  }

  /**
   * Create new report template
   */
  static async createReportTemplate(template: Partial<ReportTemplate>): Promise<{ template?: ReportTemplate; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/settings/templates`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to create report template' };
      }

      return { template: result.template };
    } catch (error) {
      console.error('[SettingsService] Error creating report template:', error);
      return { error: 'Failed to create report template' };
    }
  }

  /**
   * Update report template
   */
  static async updateReportTemplate(
    templateId: string,
    template: Partial<ReportTemplate>
  ): Promise<{ template?: ReportTemplate; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/settings/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to update report template' };
      }

      return { template: result.template };
    } catch (error) {
      console.error('[SettingsService] Error updating report template:', error);
      return { error: 'Failed to update report template' };
    }
  }

  /**
   * Delete report template
   */
  static async deleteReportTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/settings/templates/${templateId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete report template' };
      }

      return { success: true };
    } catch (error) {
      console.error('[SettingsService] Error deleting report template:', error);
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
      const response = await fetch(`${this.baseURL}/settings/system`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to load system settings' };
      }

      return { settings: result.settings };
    } catch (error) {
      console.error('[SettingsService] Error loading system settings:', error);
      return { error: 'Failed to load system settings' };
    }
  }

  /**
   * Update system setting
   */
  static async updateSystemSetting(
    settingKey: string,
    value: string | number | boolean | Record<string, unknown>
  ): Promise<{ setting?: SystemSetting; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/settings/system/${settingKey}`, {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Failed to update system setting' };
      }

      return { setting: result.setting };
    } catch (error) {
      console.error('[SettingsService] Error updating system setting:', error);
      return { error: 'Failed to update system setting' };
    }
  }
}
