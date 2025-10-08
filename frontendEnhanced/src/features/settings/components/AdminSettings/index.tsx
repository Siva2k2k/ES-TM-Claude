/**
 * Admin Settings Component
 * System-wide settings management (super_admin only)
 * Cognitive Complexity: 10
 */
import React, { useState, useEffect } from 'react';
import { Settings, Shield, Loader2 } from 'lucide-react';
import { usePermissions } from '../../../../core/hooks/usePermissions';
import { SettingsService } from '../../services/settingsService';
import type { SystemSetting } from '../../types/settings.types';
import type { SettingsChangeHandlers } from '../SettingsModal/types';
import { SettingField } from './SettingField';
import { SettingsActions } from './SettingsActions';

export const AdminSettings: React.FC<SettingsChangeHandlers> = ({
  onSettingsChange,
  onSettingsSaved,
}) => {
  const permissions = usePermissions();
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [initialSettings, setInitialSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSystemSettings();
  }, []);

  const loadSystemSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await SettingsService.getSystemSettings();
      if (result.error) {
        setError(result.error);
      } else if (result.settings) {
        setSystemSettings(result.settings);
        setInitialSettings(JSON.parse(JSON.stringify(result.settings)));
        setHasChanges(false);
      }
    } catch (err) {
      setError('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (
    settingKey: string,
    value: string | number | boolean | Record<string, unknown>
  ) => {
    const updatedSettings = systemSettings.map((setting) =>
      setting.setting_key === settingKey
        ? { ...setting, setting_value: value }
        : setting
    );
    setSystemSettings(updatedSettings);

    const changed = JSON.stringify(updatedSettings) !== JSON.stringify(initialSettings);
    setHasChanges(changed);

    if (changed) {
      onSettingsChange();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const changedSettings = systemSettings.filter((setting, index) => {
        const initial = initialSettings[index];
        return JSON.stringify(setting.setting_value) !== JSON.stringify(initial?.setting_value);
      });

      const updatePromises = changedSettings.map((setting) =>
        SettingsService.updateSystemSetting(setting.setting_key, setting.setting_value)
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        setError(`Failed to update ${errors.length} setting(s)`);
      } else {
        setInitialSettings(JSON.parse(JSON.stringify(systemSettings)));
        setHasChanges(false);
        onSettingsSaved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSystemSettings(JSON.parse(JSON.stringify(initialSettings)));
    setHasChanges(false);
  };

  // Permission check
  if (!permissions.canModifySystemSettings) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-text-tertiary dark:text-dark-text-tertiary mb-4" />
        <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary mb-2">
          Access Denied
        </h3>
        <p className="text-text-secondary dark:text-dark-text-secondary">
          You don't have permission to access system settings.
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400" />
        <span className="ml-3 text-text-secondary dark:text-dark-text-secondary">
          Loading system settings...
        </span>
      </div>
    );
  }

  // Group settings by category
  const settingsByCategory = systemSettings.reduce<Record<string, SystemSetting[]>>(
    (acc, setting) => {
      const category = setting.category || 'general';
      if (!acc[category]) acc[category] = [];
      acc[category].push(setting);
      return acc;
    },
    {}
  );

  const categoryLabels: Record<string, string> = {
    general: 'General Settings',
    security: 'Security Settings',
    notifications: 'Notification Settings',
    reports: 'Report Settings',
    integration: 'Integration Settings',
    appearance: 'Appearance Settings',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          System Administration
        </h3>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
          Manage global system settings and configurations
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
          <p className="text-error-700 dark:text-error-300 text-sm">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {systemSettings.length === 0 && (
        <div className="text-center py-12 bg-surface-secondary dark:bg-dark-700 rounded-lg">
          <Settings className="mx-auto h-12 w-12 text-text-tertiary dark:text-dark-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary mb-2">
            No Settings Found
          </h3>
          <p className="text-text-secondary dark:text-dark-text-secondary">
            System settings have not been initialized yet.
          </p>
        </div>
      )}

      {/* Settings by category */}
      <div className="space-y-6">
        {Object.entries(settingsByCategory).map(([category, settings]) => (
          <div
            key={category}
            className="bg-surface-primary dark:bg-dark-800 border border-border-primary dark:border-dark-border-primary rounded-lg p-6"
          >
            <h4 className="text-md font-medium text-text-primary dark:text-dark-text-primary mb-4">
              {categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1)}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settings.map((setting) => (
                <SettingField
                  key={setting.setting_key}
                  setting={setting}
                  onChange={handleSettingChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {systemSettings.length > 0 && (
        <SettingsActions
          hasChanges={hasChanges}
          saving={saving}
          onSave={handleSave}
          onReset={handleReset}
        />
      )}
    </div>
  );
};
