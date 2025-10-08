/**
 * Setting Field Component
 * Renders appropriate input for system setting based on value type
 * Cognitive Complexity: 5
 */
import React from 'react';
import { Input, Label } from '../../../../components/ui';
import type { SystemSetting } from '../../types/settings.types';

interface SettingFieldProps {
  setting: SystemSetting;
  onChange: (key: string, value: string | number | boolean | Record<string, unknown>) => void;
}

export const SettingField: React.FC<SettingFieldProps> = ({ setting, onChange }) => {
  const { setting_key, setting_value, description } = setting;

  // Generate label from key if no description
  const label = description || setting_key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  // Boolean setting - checkbox
  if (typeof setting_value === 'boolean') {
    return (
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={setting_value}
          onChange={(e) => onChange(setting_key, e.target.checked)}
          className="h-4 w-4 text-primary-600 dark:text-primary-400 focus:ring-primary-500 border-border-primary dark:border-dark-border-primary rounded bg-surface-primary dark:bg-dark-800"
        />
        <span className="ml-2 text-sm text-text-primary dark:text-dark-text-primary">
          {label}
        </span>
      </label>
    );
  }

  // Number setting
  if (typeof setting_value === 'number') {
    return (
      <div>
        <Label htmlFor={setting_key}>{label}</Label>
        <Input
          id={setting_key}
          type="number"
          value={setting_value}
          onChange={(e) => onChange(setting_key, parseFloat(e.target.value) || 0)}
          className="max-w-xs"
        />
      </div>
    );
  }

  // String setting (default)
  return (
    <div>
      <Label htmlFor={setting_key}>{label}</Label>
      <Input
        id={setting_key}
        type="text"
        value={String(setting_value)}
        onChange={(e) => onChange(setting_key, e.target.value)}
      />
    </div>
  );
};
