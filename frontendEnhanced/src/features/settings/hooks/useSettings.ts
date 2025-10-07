/**
 * useSettings Hook
 * Custom hook for settings state management
 */

import { useState, useCallback } from 'react';
import { SettingsService } from '../services/settingsService';
import type {
  UserSettings,
  ProfileUpdatePayload,
  PasswordChangePayload,
} from '../types/settings.types';

export interface UseSettingsReturn {
  userSettings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<{ error?: string }>;
  updateTheme: (theme: 'light' | 'dark' | 'system') => Promise<{ error?: string }>;
  updateProfile: (data: ProfileUpdatePayload) => Promise<{ error?: string }>;
  changePassword: (data: PasswordChangePayload) => Promise<{ error?: string }>;
}

/**
 * Custom hook for managing settings state
 * Complexity: 6
 */
export const useSettings = (): UseSettingsReturn => {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load user settings from backend
   */
  const loadSettings = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await SettingsService.getUserSettings();

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.settings) {
        setUserSettings(result.settings);
      }
    } catch (err) {
      console.error('[useSettings] Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update user settings
   */
  const updateSettings = useCallback(async (settings: Partial<UserSettings>): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await SettingsService.updateUserSettings(settings);

      if (result.error) {
        setError(result.error);
        return { error: result.error };
      }

      if (result.settings) {
        setUserSettings(result.settings);
      }

      return {};
    } catch (err) {
      console.error('[useSettings] Error updating settings:', err);
      const errorMsg = 'Failed to update settings';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  /**
   * Update theme preference
   */
  const updateTheme = useCallback(async (theme: 'light' | 'dark' | 'system'): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await SettingsService.updateTheme(theme);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to update theme';
        setError(errorMsg);
        return { error: errorMsg };
      }

      // Update local settings state
      if (userSettings) {
        setUserSettings({
          ...userSettings,
          theme,
        });
      }

      return {};
    } catch (err) {
      console.error('[useSettings] Error updating theme:', err);
      const errorMsg = 'Failed to update theme';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, [userSettings]);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data: ProfileUpdatePayload): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await SettingsService.updateProfile(data);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to update profile';
        setError(errorMsg);
        return { error: errorMsg };
      }

      return {};
    } catch (err) {
      console.error('[useSettings] Error updating profile:', err);
      const errorMsg = 'Failed to update profile';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  /**
   * Change password
   */
  const changePassword = useCallback(async (data: PasswordChangePayload): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await SettingsService.changePassword(data);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to change password';
        setError(errorMsg);
        return { error: errorMsg };
      }

      return {};
    } catch (err) {
      console.error('[useSettings] Error changing password:', err);
      const errorMsg = 'Failed to change password';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  return {
    userSettings,
    isLoading,
    error,
    loadSettings,
    updateSettings,
    updateTheme,
    updateProfile,
    changePassword,
  };
};
