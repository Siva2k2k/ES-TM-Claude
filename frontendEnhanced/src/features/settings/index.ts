/**
 * Settings Feature Barrel Export
 * Main entry point for the settings feature module
 */

// Components
export * from './components';

// Hooks
export { useSettings } from './hooks/useSettings';
export type { UseSettingsReturn } from './hooks/useSettings';

// Services
export { SettingsService } from './services/settingsService';

// Types
export * from './types/settings.types';
