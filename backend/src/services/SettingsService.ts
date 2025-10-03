import { UserSettings, IUserSettings } from '../models/UserSettings';
import { ReportTemplate, IReportTemplate } from '../models/ReportTemplate';
import { SystemSettings, ISystemSettings } from '../models/SystemSettings';
import { AuthUser } from '../middleware/auth';
import { AuthorizationError, NotFoundError } from '../utils/errors';

export class SettingsService {
  
  // ============================================================================
  // USER SETTINGS MANAGEMENT
  // ============================================================================
  
  /**
   * Get user settings (create default if doesn't exist)
   */
  static async getUserSettings(userId: string, currentUser: AuthUser): Promise<{ settings?: IUserSettings; error?: string }> {
    try {
      // Authorization: Users can view own settings, admins can view any
      if (currentUser.id !== userId && !['super_admin', 'management'].includes(currentUser.role)) {
        throw new AuthorizationError('You can only view your own settings');
      }

      let settings = await UserSettings.findOne({ user_id: userId });
      
      // Create default settings if they don't exist
      if (!settings) {
        settings = new UserSettings({
          user_id: userId,
          // Default values are set by the schema
        });
        await settings.save();
      }
      
      return { settings };
    } catch (error) {
      console.error('Error getting user settings:', error);
      return { error: error instanceof Error ? error.message : 'Failed to get user settings' };
    }
  }

  /**
   * Update user settings
   */
  static async updateUserSettings(
    userId: string, 
    updateData: Partial<IUserSettings>, 
    currentUser: AuthUser
  ): Promise<{ settings?: IUserSettings; error?: string }> {
    try {
      // Authorization: Users can update own settings, admins can update any
      if (currentUser.id !== userId && !['super_admin', 'management'].includes(currentUser.role)) {
        throw new AuthorizationError('You can only update your own settings');
      }

      // Validate the update data
      const validatedData = this.validateUserSettingsUpdate(updateData);
      
      const settings = await UserSettings.findOneAndUpdate(
        { user_id: userId },
        validatedData,
        { 
          new: true, 
          upsert: true, // Create if doesn't exist
          runValidators: true 
        }
      );

      return { settings };
    } catch (error) {
      console.error('Error updating user settings:', error);
      return { error: error instanceof Error ? error.message : 'Failed to update user settings' };
    }
  }

  /**
   * Reset user settings to default
   */
  static async resetUserSettings(userId: string, currentUser: AuthUser): Promise<{ settings?: IUserSettings; error?: string }> {
    try {
      // Authorization check
      if (currentUser.id !== userId && !['super_admin', 'management'].includes(currentUser.role)) {
        throw new AuthorizationError('You can only reset your own settings');
      }

      await UserSettings.deleteOne({ user_id: userId });
      
      // Create new default settings
      const defaultSettings = new UserSettings({
        user_id: userId,
      });
      await defaultSettings.save();

      return { settings: defaultSettings };
    } catch (error) {
      console.error('Error resetting user settings:', error);
      return { error: error instanceof Error ? error.message : 'Failed to reset user settings' };
    }
  }

  // ============================================================================
  // REPORT TEMPLATE MANAGEMENT  
  // ============================================================================

  /**
   * Get available report templates based on user role
   */
  static async getAvailableTemplates(currentUser: AuthUser): Promise<{ templates?: IReportTemplate[]; error?: string }> {
    try {
      const query: any = {
        is_active: true,
        $or: [
          { created_by: currentUser.id },  // User's own templates
          { category: 'system' },          // System templates
          { 
            category: 'executive',
            allowed_roles: { $in: [currentUser.role] }
          },
          {
            category: 'team',
            allowed_roles: { $in: [currentUser.role] }
          }
        ]
      };

      const templates = await (ReportTemplate as any)
        .find(query)
        .populate('created_by', 'full_name email role')
        .sort({ category: 1, name: 1 })
        .lean();

      return { templates: templates as IReportTemplate[] };
    } catch (error) {
      console.error('Error getting report templates:', error);
      return { error: error instanceof Error ? error.message : 'Failed to get report templates' };
    }
  }

  /**
   * Create new report template
   */
  static async createReportTemplate(
    templateData: Partial<IReportTemplate>,
    currentUser: AuthUser
  ): Promise<{ template?: IReportTemplate; error?: string }> {
    try {
      // Check if user can create templates
      if (!['lead', 'manager', 'management', 'super_admin'].includes(currentUser.role)) {
        throw new AuthorizationError('You do not have permission to create report templates');
      }

      // Validate category permissions
      if (templateData.category === 'system' && currentUser.role !== 'super_admin') {
        throw new AuthorizationError('Only super admins can create system-level templates');
      }
      
      if (templateData.category === 'executive' && !['management', 'super_admin'].includes(currentUser.role)) {
        throw new AuthorizationError('Only management or super admins can create executive-level templates');
      }

      const template = new ReportTemplate({
        ...templateData,
        created_by: currentUser.id,
      });

      await template.save();
      await template.populate('created_by', 'full_name email role');

      return { template };
    } catch (error) {
      console.error('Error creating report template:', error);
      return { error: error instanceof Error ? error.message : 'Failed to create report template' };
    }
  }

  /**
   * Update report template
   */
  static async updateReportTemplate(
    templateId: string,
    updateData: Partial<IReportTemplate>,
    currentUser: AuthUser
  ): Promise<{ template?: IReportTemplate; error?: string }> {
    try {
      const template = await (ReportTemplate as any).findById(templateId);
      if (!template) {
        throw new NotFoundError('Report template not found');
      }

      // Authorization: Owner, or admin with appropriate level access
      const canEdit = 
        template.created_by.toString() === currentUser.id ||
        (currentUser.role === 'super_admin') ||
        (currentUser.role === 'management' && ['executive', 'team', 'personal'].includes(template.category)) ||
        (currentUser.role === 'manager' && ['team', 'personal'].includes(template.category));

      if (!canEdit) {
        throw new AuthorizationError('You do not have permission to edit this template');
      }

      Object.assign(template, updateData);
      await template.save();
      await template.populate('created_by', 'full_name email role');

      return { template };
    } catch (error) {
      console.error('Error updating report template:', error);
      return { error: error instanceof Error ? error.message : 'Failed to update report template' };
    }
  }

  /**
   * Delete report template
   */
  static async deleteReportTemplate(
    templateId: string,
    currentUser: AuthUser
  ): Promise<{ success?: boolean; error?: string }> {
    try {
      const template = await (ReportTemplate as any).findById(templateId);
      if (!template) {
        throw new NotFoundError('Report template not found');
      }

      // Authorization check
      const canDelete = 
        template.created_by.toString() === currentUser.id ||
        currentUser.role === 'super_admin' ||
        (currentUser.role === 'management' && template.category !== 'system');

      if (!canDelete) {
        throw new AuthorizationError('You do not have permission to delete this template');
      }

      await (ReportTemplate as any).findByIdAndDelete(templateId);

      return { success: true };
    } catch (error) {
      console.error('Error deleting report template:', error);
      return { error: error instanceof Error ? error.message : 'Failed to delete report template' };
    }
  }

  // ============================================================================
  // SYSTEM SETTINGS MANAGEMENT (Super Admin Only)
  // ============================================================================

  /**
   * Get system settings (role-based filtering)
   */
  static async getSystemSettings(currentUser: AuthUser): Promise<{ settings?: ISystemSettings[]; error?: string }> {
    try {
      let query: any = {};

      // Only super admins can see all settings
      if (currentUser.role === 'super_admin') {
        // No additional filters for super admin
      } else if (['management', 'manager'].includes(currentUser.role)) {
        // Management and managers can see public settings
        query.is_public = true;
      } else {
        // Other roles can only see specific public settings
        query = {
          is_public: true,
          category: { $in: ['general', 'appearance'] }
        };
      }

      const settings = await SystemSettings
        .find(query)
        .populate('updated_by', 'full_name email')
        .sort({ category: 1, setting_key: 1 })
        .lean();

      return { settings: settings as ISystemSettings[] };
    } catch (error) {
      console.error('Error getting system settings:', error);
      return { error: error instanceof Error ? error.message : 'Failed to get system settings' };
    }
  }

  /**
   * Update system setting (Super Admin only)
   */
  static async updateSystemSetting(
    settingKey: string,
    settingValue: any,
    currentUser: AuthUser
  ): Promise<{ setting?: ISystemSettings; error?: string }> {
    try {
      // Only super admin can update system settings
      if (currentUser.role !== 'super_admin') {
        throw new AuthorizationError('Only super admins can update system settings');
      }

      const setting = await SystemSettings.findOneAndUpdate(
        { setting_key: settingKey },
        { 
          setting_value: settingValue,
          updated_by: currentUser.id
        },
        { 
          new: true, 
          runValidators: true,
          populate: { path: 'updated_by', select: 'full_name email' }
        }
      );

      if (!setting) {
        throw new NotFoundError(`System setting '${settingKey}' not found`);
      }

      return { setting };
    } catch (error) {
      console.error('Error updating system setting:', error);
      return { error: error instanceof Error ? error.message : 'Failed to update system setting' };
    }
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  private static validateUserSettingsUpdate(updateData: Partial<IUserSettings>): Partial<IUserSettings> {
    const validatedData: Partial<IUserSettings> = {};

    // Theme validation
    if (updateData.theme && ['light', 'dark', 'system'].includes(updateData.theme)) {
      validatedData.theme = updateData.theme;
    }

    // Timezone validation (basic check)
    if (updateData.timezone && typeof updateData.timezone === 'string') {
      validatedData.timezone = updateData.timezone;
    }

    // Date format validation
    if (updateData.date_format && ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].includes(updateData.date_format)) {
      validatedData.date_format = updateData.date_format;
    }

    // Time format validation
    if (updateData.time_format && ['12h', '24h'].includes(updateData.time_format)) {
      validatedData.time_format = updateData.time_format;
    }

    // Notifications validation
    if (updateData.notifications && typeof updateData.notifications === 'object') {
      validatedData.notifications = updateData.notifications;
    }

    // Display preferences validation
    if (updateData.display_preferences && typeof updateData.display_preferences === 'object') {
      validatedData.display_preferences = updateData.display_preferences;
    }

    // Privacy settings validation
    if (updateData.privacy_settings && typeof updateData.privacy_settings === 'object') {
      validatedData.privacy_settings = updateData.privacy_settings;
    }

    return validatedData;
  }
}