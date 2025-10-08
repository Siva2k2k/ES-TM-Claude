/**
 * Settings Modal Types
 */

export type SettingsTab =
  | 'profile'
  | 'security'
  | 'preferences'
  | 'notifications'
  | 'templates'
  | 'admin';

export interface SettingsTabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
}

export interface SettingsChangeHandlers {
  onSettingsChange: () => void;
  onSettingsSaved: () => void;
}
