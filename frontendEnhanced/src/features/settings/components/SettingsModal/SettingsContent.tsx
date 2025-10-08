/**
 * Settings Content Component
 * Renders the appropriate settings component based on active tab
 * Cognitive Complexity: 3
 */
import React from 'react';
import { usePermissions } from '../../../../core/hooks/usePermissions';
import { useSettings } from '../../hooks/useSettings';
import { ProfileSettings } from '../ProfileSettings';
import { SecuritySettings } from '../SecuritySettings';
import { PreferencesSettings } from '../PreferencesSettings';
import { NotificationPreferences } from '../NotificationPreferences';
import { ReportTemplateSettings } from '../ReportTemplateSettings';
import { AdminSettings } from '../AdminSettings';
import type { SettingsTab, SettingsChangeHandlers } from './types';

interface SettingsContentProps extends SettingsChangeHandlers {
  activeTab: SettingsTab;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({
  activeTab,
  onSettingsChange,
  onSettingsSaved,
}) => {
  const permissions = usePermissions();
  const { userSettings, updateSettings, updateProfile, changePassword } = useSettings();

  switch (activeTab) {
    case 'profile':
      return (
        <ProfileSettings
          onSettingsChange={onSettingsChange}
          onSettingsSaved={onSettingsSaved}
          onUpdateProfile={updateProfile}
        />
      );

    case 'security':
      return (
        <SecuritySettings
          onSettingsChange={onSettingsChange}
          onSettingsSaved={onSettingsSaved}
          onChangePassword={changePassword}
        />
      );

    case 'preferences':
      return (
        <PreferencesSettings
          onSettingsChange={onSettingsChange}
          onSettingsSaved={onSettingsSaved}
        />
      );

    case 'notifications':
      return (
        <NotificationPreferences
          onSettingsChange={onSettingsChange}
          onSettingsSaved={onSettingsSaved}
          userSettings={userSettings}
          onUpdateSettings={updateSettings}
        />
      );

    case 'templates':
      if (!permissions.canCreateCustomReports) return null;
      return (
        <ReportTemplateSettings
          onSettingsChange={onSettingsChange}
          onSettingsSaved={onSettingsSaved}
        />
      );

    case 'admin':
      if (!permissions.canModifySystemSettings) return null;
      return (
        <AdminSettings
          onSettingsChange={onSettingsChange}
          onSettingsSaved={onSettingsSaved}
        />
      );

    default:
      return null;
  }
};
