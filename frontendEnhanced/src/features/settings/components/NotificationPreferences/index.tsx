/**
 * NotificationPreferences Component
 * User notification preferences settings
 * Adapted from /frontend with frontendEnhanced design system
 */

import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Save, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { NotificationPreferences as NotificationPrefs, UserSettings } from '../../types/settings.types';

export interface NotificationPreferencesProps {
  /**
   * Current user settings
   */
  userSettings: UserSettings | null;
  /**
   * Callback when form has unsaved changes
   */
  onSettingsChange?: () => void;
  /**
   * Callback when settings are successfully saved
   */
  onSettingsSaved?: () => void;
  /**
   * Update settings function
   */
  onUpdateSettings: (settings: Partial<UserSettings>) => Promise<{ error?: string }>;
  /**
   * Loading state
   */
  isLoading?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Notification preferences component
 * Complexity: 6
 * LOC: ~200
 */
export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  userSettings,
  onSettingsChange,
  onSettingsSaved,
  onUpdateSettings,
  isLoading = false,
  className = '',
}) => {
  const [settings, setSettings] = useState<NotificationPrefs>({
    email_enabled: true,
    push_enabled: false,
    timesheet_reminders: true,
    approval_notifications: false,
    team_updates: false,
    system_announcements: true,
    frequency: 'daily',
  });
  const [initialSettings, setInitialSettings] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (userSettings?.notifications) {
      setSettings(userSettings.notifications);
      setInitialSettings(userSettings.notifications);
      setHasChanges(false);
    }
  }, [userSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await onUpdateSettings({ notifications: settings });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Notification settings saved successfully!');
        setInitialSettings(settings);
        setHasChanges(false);
        onSettingsSaved?.();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save notification settings';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPrefs, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Check if there are changes
    if (initialSettings) {
      const changed = JSON.stringify(newSettings) !== JSON.stringify(initialSettings);
      setHasChanges(changed);

      if (changed) {
        onSettingsChange?.();
      }
    }

    // Clear messages
    setError(null);
    setSuccess(null);
  };

  const handleReset = () => {
    if (initialSettings) {
      setSettings(initialSettings);
      setHasChanges(false);
      setError(null);
      setSuccess(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400" />
        <span className="ml-3 text-text-secondary dark:text-dark-text-secondary">
          Loading notification settings...
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary mb-2 flex items-center">
          <Bell className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
          Notification Settings
        </h3>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          Manage how and when you receive notifications.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-4">
          <p className="text-error-700 dark:text-error-300 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-4">
          <p className="text-success-700 dark:text-success-300 text-sm">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-border rounded-lg p-6">
          <h4 className="text-md font-medium text-text-primary dark:text-dark-text-primary mb-4 flex items-center">
            <Mail className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
            Email Notifications
          </h4>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium text-text-primary dark:text-dark-text-primary">
                  Enable Email Notifications
                </div>
                <div className="text-sm text-text-secondary dark:text-dark-text-secondary">
                  Receive notifications via email
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.email_enabled}
                onChange={(e) => handleToggle('email_enabled', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-dark-border rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium text-text-primary dark:text-dark-text-primary">
                  Timesheet Reminders
                </div>
                <div className="text-sm text-text-secondary dark:text-dark-text-secondary">
                  Daily reminders to submit timesheets
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.timesheet_reminders}
                onChange={(e) => handleToggle('timesheet_reminders', e.target.checked)}
                disabled={!settings.email_enabled}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-dark-border rounded disabled:opacity-50"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium text-text-primary dark:text-dark-text-primary">
                  Approval Notifications
                </div>
                <div className="text-sm text-text-secondary dark:text-dark-text-secondary">
                  When timesheets need approval
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.approval_notifications}
                onChange={(e) => handleToggle('approval_notifications', e.target.checked)}
                disabled={!settings.email_enabled}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-dark-border rounded disabled:opacity-50"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium text-text-primary dark:text-dark-text-primary">
                  Team Updates
                </div>
                <div className="text-sm text-text-secondary dark:text-dark-text-secondary">
                  Updates from your team members
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.team_updates}
                onChange={(e) => handleToggle('team_updates', e.target.checked)}
                disabled={!settings.email_enabled}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-dark-border rounded disabled:opacity-50"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium text-text-primary dark:text-dark-text-primary">
                  System Announcements
                </div>
                <div className="text-sm text-text-secondary dark:text-dark-text-secondary">
                  Important system updates and maintenance
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.system_announcements}
                onChange={(e) => handleToggle('system_announcements', e.target.checked)}
                disabled={!settings.email_enabled}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-dark-border rounded disabled:opacity-50"
              />
            </label>
          </div>

          {settings.email_enabled && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-border">
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
                Notification Frequency
              </label>
              <select
                value={settings.frequency}
                onChange={(e) => handleToggle('frequency', e.target.value as 'immediate' | 'daily' | 'weekly')}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-dark-700 text-text-primary dark:text-dark-text-primary"
              >
                <option value="immediate">Immediate</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Summary</option>
              </select>
            </div>
          )}
        </div>

        {/* Push Notifications - Coming Soon */}
        <div className="bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-border rounded-lg p-6">
          <h4 className="text-md font-medium text-text-primary dark:text-dark-text-primary mb-4 flex items-center">
            <Smartphone className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
            Push Notifications
          </h4>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
            Browser push notifications will be available in a future update.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-border">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={saving || !hasChanges}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button
          onClick={handleSave}
          
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
