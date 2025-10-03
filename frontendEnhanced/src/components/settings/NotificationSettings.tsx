import React, { useState, useEffect } from 'react';
import { Bell, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../store/contexts/AuthContext';
import { showSuccess, showError } from '../../utils/toast';

interface NotificationSettingsProps {
  onSettingsChange: () => void;
  onSettingsSaved: () => void;
}

interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  timesheet_reminders: boolean;
  approval_notifications: boolean;
  team_updates: boolean;
  system_announcements: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onSettingsChange, onSettingsSaved }) => {
  const { currentUser, currentUserRole } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    push_enabled: false,
    timesheet_reminders: true,
    approval_notifications: true,
    team_updates: true,
    system_announcements: true,
    frequency: 'immediate'
  });
  
  const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferences>(preferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);

  useEffect(() => {
    loadNotificationSettings();
  }, [currentUser?.id]);

  useEffect(() => {
    if (hasChanges) {
      onSettingsChange();
    }
  }, [hasChanges, onSettingsChange]);

  const loadNotificationSettings = async () => {
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
        if (data.success && data.settings?.notifications) {
          const notifications = data.settings.notifications;
          setPreferences(notifications);
          setOriginalPreferences(notifications);
        }
      }
    } catch (err) {
      console.error('Error loading notification settings:', err);
      setError('Failed to load notification settings');
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

      const response = await fetch('/api/v1/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save notification settings');
      }

      setOriginalPreferences(preferences);
      setSuccess(true);
      showSuccess('Notification preferences saved successfully!');
      onSettingsSaved();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save notification settings';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPreferences(originalPreferences);
    setError(null);
    setSuccess(false);
    onSettingsSaved();
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading notification settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Email Notifications */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          Email Notifications
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Email Notifications</label>
              <p className="text-xs text-gray-500">Receive notifications via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.email_enabled}
                onChange={(e) => updatePreference('email_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {preferences.email_enabled && (
            <div className="ml-6 space-y-4 border-l-2 border-gray-200 pl-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Timesheet Reminders</label>
                  <p className="text-xs text-gray-500">Daily reminders to submit timesheets</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.timesheet_reminders}
                    onChange={(e) => updatePreference('timesheet_reminders', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Approval Notifications</label>
                  <p className="text-xs text-gray-500">When timesheets or requests need approval</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.approval_notifications}
                    onChange={(e) => updatePreference('approval_notifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {['lead', 'manager', 'management', 'super_admin'].includes(currentUserRole || '') && (
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Team Updates</label>
                    <p className="text-xs text-gray-500">Updates about your team members</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.team_updates}
                      onChange={(e) => updatePreference('team_updates', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">System Announcements</label>
                  <p className="text-xs text-gray-500">Important system updates and announcements</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.system_announcements}
                    onChange={(e) => updatePreference('system_announcements', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Frequency */}
      {preferences.email_enabled && (
        <div className="border-t border-gray-200 pt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Frequency</h3>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value="immediate"
                checked={preferences.frequency === 'immediate'}
                onChange={(e) => updatePreference('frequency', e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-3">
                <span className="block text-sm font-medium text-gray-700">Immediate</span>
                <span className="block text-xs text-gray-500">Receive notifications as they happen</span>
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value="daily"
                checked={preferences.frequency === 'daily'}
                onChange={(e) => updatePreference('frequency', e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-3">
                <span className="block text-sm font-medium text-gray-700">Daily Digest</span>
                <span className="block text-xs text-gray-500">Receive a daily summary email</span>
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value="weekly"
                checked={preferences.frequency === 'weekly'}
                onChange={(e) => updatePreference('frequency', e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-3">
                <span className="block text-sm font-medium text-gray-700">Weekly Summary</span>
                <span className="block text-xs text-gray-500">Receive a weekly summary email</span>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Push Notifications (Future Feature) */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Notifications</h3>
        
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Browser Push Notifications</label>
            <p className="text-xs text-gray-500">Receive push notifications in your browser (coming soon)</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.push_enabled}
              onChange={(e) => updatePreference('push_enabled', e.target.checked)}
              disabled={true}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 opacity-50 cursor-not-allowed"></div>
          </label>
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
          <span className="text-sm text-green-800">Notification preferences saved successfully!</span>
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

export default NotificationSettings;