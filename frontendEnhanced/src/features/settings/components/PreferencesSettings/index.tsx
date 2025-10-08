/**
 * Preferences Settings Component
 * User display preferences including theme, date/time formats
 * Cognitive Complexity: 8
 */
import React, { useState, useEffect } from 'react';
import { Palette, Save, Check } from 'lucide-react';
import { useTheme } from '../../../../core/theme';
import { useSettings } from '../../hooks/useSettings';
import { Button, Input, Label, Select } from '../../../../components/ui';
import { ThemeSwitcher } from './ThemeSwitcher';
import type { SettingsChangeHandlers } from '../SettingsModal/types';
import type { UserSettings } from '../../types/settings.types';

export const PreferencesSettings: React.FC<SettingsChangeHandlers> = ({
  onSettingsChange,
  onSettingsSaved,
}) => {
  const { theme } = useTheme();
  const { userSettings, updateSettings, isLoading, error } = useSettings();
  const [formData, setFormData] = useState<Partial<UserSettings>>({
    theme: theme,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    date_format: 'MM/DD/YYYY',
    time_format: '12h',
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (userSettings) {
      setFormData({
        theme: userSettings.theme,
        timezone: userSettings.timezone,
        date_format: userSettings.date_format,
        time_format: userSettings.time_format,
      });
    }
  }, [userSettings]);

  const handleChange = (key: keyof UserSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    onSettingsChange();
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    const result = await updateSettings(formData);
    if (!result.error) {
      setSaveSuccess(true);
      onSettingsSaved();
      setTimeout(() => setSaveSuccess(false), 3000);
    }

    setSaving(false);
  };

  const dateFormatOptions = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
  ];

  const timeFormatOptions = [
    { value: '12h', label: '12-hour (AM/PM)' },
    { value: '24h', label: '24-hour' },
  ];

  // Get common timezones
  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
    Intl.DateTimeFormat().resolvedOptions().timeZone, // User's current timezone
  ];

  const uniqueTimezones = Array.from(new Set(timezones)).sort();
  const timezoneOptions = uniqueTimezones.map((tz) => ({ value: tz, label: tz }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary flex items-center">
          <Palette className="h-5 w-5 mr-2" />
          Preferences
        </h3>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
          Customize your display settings and preferences
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
          <p className="text-error-700 dark:text-error-300 text-sm">{error}</p>
        </div>
      )}

      {/* Success Alert */}
      {saveSuccess && (
        <div className="p-3 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg flex items-center">
          <Check className="h-4 w-4 text-success-700 dark:text-success-300 mr-2" />
          <p className="text-success-700 dark:text-success-300 text-sm">
            Preferences saved successfully!
          </p>
        </div>
      )}

      {/* Theme Switcher */}
      <ThemeSwitcher
        value={formData.theme || 'system'}
        onChange={(newTheme) => handleChange('theme', newTheme)}
      />

      {/* Date & Time Format */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
          Date & Time Format
        </h4>

        <div>
          <Label htmlFor="date-format">Date Format</Label>
          <Select
            id="date-format"
            value={formData.date_format}
            onChange={(value) => handleChange('date_format', value)}
            options={dateFormatOptions}
          />
          <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary mt-1">
            Example: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div>
          <Label htmlFor="time-format">Time Format</Label>
          <Select
            id="time-format"
            value={formData.time_format}
            onChange={(value) => handleChange('time_format', value)}
            options={timeFormatOptions}
          />
          <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary mt-1">
            Example: {new Date().toLocaleTimeString()}
          </p>
        </div>

        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            id="timezone"
            value={formData.timezone}
            onChange={(value) => handleChange('timezone', value)}
            options={timezoneOptions}
          />
          <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary mt-1">
            Current time: {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-border-primary dark:border-dark-border-primary">
        <Button
          onClick={handleSave}
          disabled={saving || isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};
