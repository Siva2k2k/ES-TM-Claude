import React, { useState, useEffect } from 'react';
import { Palette, Monitor, Sun, Moon, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../store/contexts/AuthContext';
import { showSuccess, showError } from '../../utils/toast';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  time_format: '12h' | '24h';
  display_preferences: {
    sidebar_collapsed: boolean;
    table_page_size: number;
    dashboard_widgets: string[];
    chart_preferences: {
      default_period: '7d' | '30d' | '90d' | '1y';
      show_animations: boolean;
    };
  };
  privacy_settings: {
    profile_visibility: 'public' | 'team' | 'private';
    show_activity_status: boolean;
    share_analytics: boolean;
  };
}

interface PreferencesSettingsProps {
  onSettingsChange: () => void;
  onSettingsSaved: () => void;
}

const PreferencesSettings: React.FC<PreferencesSettingsProps> = ({ onSettingsChange, onSettingsSaved }) => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
    time_format: '12h',
    display_preferences: {
      sidebar_collapsed: false,
      table_page_size: 25,
      dashboard_widgets: ['projects', 'tasks', 'timesheet', 'analytics'],
      chart_preferences: {
        default_period: '30d',
        show_animations: true,
      },
    },
    privacy_settings: {
      profile_visibility: 'team',
      show_activity_status: true,
      share_analytics: false,
    },
  });
  
  const [originalSettings, setOriginalSettings] = useState<UserSettings>(settings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load user settings on component mount
  useEffect(() => {
    loadUserSettings();
  }, [currentUser?.id]);

  // Check for changes
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  useEffect(() => {
    if (hasChanges) {
      onSettingsChange();
    }
  }, [hasChanges, onSettingsChange]);

  const loadUserSettings = async () => {
    if (!currentUser?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/settings/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          const userSettings = {
            theme: data.settings.theme || 'light',
            timezone: data.settings.timezone || 'UTC',
            date_format: data.settings.date_format || 'MM/DD/YYYY',
            time_format: data.settings.time_format || '12h',
            display_preferences: {
              sidebar_collapsed: data.settings.display_preferences?.sidebar_collapsed || false,
              table_page_size: data.settings.display_preferences?.table_page_size || 25,
              dashboard_widgets: data.settings.display_preferences?.dashboard_widgets || ['projects', 'tasks', 'timesheet', 'analytics'],
              chart_preferences: {
                default_period: data.settings.display_preferences?.chart_preferences?.default_period || '30d',
                show_animations: data.settings.display_preferences?.chart_preferences?.show_animations !== false,
              },
            },
            privacy_settings: {
              profile_visibility: data.settings.privacy_settings?.profile_visibility || 'team',
              show_activity_status: data.settings.privacy_settings?.show_activity_status !== false,
              share_analytics: data.settings.privacy_settings?.share_analytics || false,
            },
          };
          setSettings(userSettings);
          setOriginalSettings(userSettings);
        }
      }
    } catch (err) {
      console.error('Error loading user settings:', err);
      setError('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/v1/settings/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save preferences');
      }

      setOriginalSettings(settings);
      setSuccess(true);
      showSuccess('Preferences saved successfully!');
      onSettingsSaved();

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save preferences';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setError(null);
    setSuccess(false);
    onSettingsSaved();
  };

  const updateSettings = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
    'Australia/Sydney', 'Pacific/Auckland'
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Theme Settings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Palette className="h-5 w-5 mr-2" />
          Appearance
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' }
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => updateSettings('theme', value)}
                  className={`flex flex-col items-center p-4 border-2 rounded-lg transition-colors ${
                    settings.theme === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-6 w-6 mb-2" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Localization Settings */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Localization</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              id="timezone"
              value={settings.timezone}
              onChange={(e) => updateSettings('timezone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date_format" className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select
              id="date_format"
              value={settings.date_format}
              onChange={(e) => updateSettings('date_format', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            </select>
          </div>

          <div>
            <label htmlFor="time_format" className="block text-sm font-medium text-gray-700 mb-2">
              Time Format
            </label>
            <select
              id="time_format"
              value={settings.time_format}
              onChange={(e) => updateSettings('time_format', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="12h">12 Hour (AM/PM)</option>
              <option value="24h">24 Hour</option>
            </select>
          </div>
        </div>
      </div>

      {/* Display Preferences */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Display Preferences</h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Sidebar Collapsed by Default</label>
              <p className="text-xs text-gray-500">Start with a collapsed sidebar for more screen space</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.display_preferences.sidebar_collapsed}
                onChange={(e) => updateSettings('display_preferences.sidebar_collapsed', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Show Animations</label>
              <p className="text-xs text-gray-500">Enable smooth animations and transitions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.display_preferences.chart_preferences.show_animations}
                onChange={(e) => updateSettings('display_preferences.chart_preferences.show_animations', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label htmlFor="table_page_size" className="block text-sm font-medium text-gray-700 mb-2">
              Table Page Size
            </label>
            <select
              id="table_page_size"
              value={settings.display_preferences.table_page_size}
              onChange={(e) => updateSettings('display_preferences.table_page_size', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10 items per page</option>
              <option value={25}>25 items per page</option>
              <option value={50}>50 items per page</option>
              <option value={100}>100 items per page</option>
            </select>
          </div>

          <div>
            <label htmlFor="default_period" className="block text-sm font-medium text-gray-700 mb-2">
              Default Chart Period
            </label>
            <select
              id="default_period"
              value={settings.display_preferences.chart_preferences.default_period}
              onChange={(e) => updateSettings('display_preferences.chart_preferences.default_period', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy</h3>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="profile_visibility" className="block text-sm font-medium text-gray-700 mb-2">
              Profile Visibility
            </label>
            <select
              id="profile_visibility"
              value={settings.privacy_settings.profile_visibility}
              onChange={(e) => updateSettings('privacy_settings.profile_visibility', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="public">Public - Visible to everyone</option>
              <option value="team">Team - Visible to team members</option>
              <option value="private">Private - Only visible to you</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Show Activity Status</label>
              <p className="text-xs text-gray-500">Let others see when you're online</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy_settings.show_activity_status}
                onChange={(e) => updateSettings('privacy_settings.show_activity_status', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Share Analytics Data</label>
              <p className="text-xs text-gray-500">Allow anonymous analytics data collection to improve the service</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy_settings.share_analytics}
                onChange={(e) => updateSettings('privacy_settings.share_analytics', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-sm text-red-800">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-sm text-green-800">Preferences saved successfully!</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PreferencesSettings;