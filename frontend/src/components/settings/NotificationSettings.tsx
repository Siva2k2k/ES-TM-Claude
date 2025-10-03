import React, { useState } from 'react';
import { Bell, Mail, Smartphone, Save } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

interface NotificationSettingsProps {
  onSettingsChange: () => void;
  onSettingsSaved: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  onSettingsChange,
  onSettingsSaved
}) => {
  const permissions = usePermissions();
  const [settings, setSettings] = useState({
    email_enabled: true,
    timesheet_reminders: true,
    approval_notifications: false,
    team_updates: false,
    system_announcements: true,
    frequency: 'daily' as 'immediate' | 'daily' | 'weekly'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    onSettingsChange();

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Notification settings saved successfully');
      onSettingsSaved();
    } catch {
      // Error handled
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof typeof settings, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    onSettingsChange();
  };

  const canManageTeam = permissions.hasAnyRole(['manager', 'management', 'super_admin']);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          Notification Settings
        </h3>
        <p className="text-sm text-gray-500">Manage how and when you receive notifications.</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <Mail className="h-4 w-4 mr-2" />
            Email Notifications
          </h4>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Enable Email Notifications</div>
                <div className="text-sm text-gray-500">Receive notifications via email</div>
              </div>
              <input
                type="checkbox"
                checked={settings.email_enabled}
                onChange={(e) => handleToggle('email_enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Timesheet Reminders</div>
                <div className="text-sm text-gray-500">Daily reminders to submit timesheets</div>
              </div>
              <input
                type="checkbox"
                checked={settings.timesheet_reminders}
                onChange={(e) => handleToggle('timesheet_reminders', e.target.checked)}
                disabled={!settings.email_enabled}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
            </label>

            {canManageTeam && (
              <>
                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Approval Notifications</div>
                    <div className="text-sm text-gray-500">When timesheets need approval</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.approval_notifications}
                    onChange={(e) => handleToggle('approval_notifications', e.target.checked)}
                    disabled={!settings.email_enabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Team Updates</div>
                    <div className="text-sm text-gray-500">Updates from your team members</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.team_updates}
                    onChange={(e) => handleToggle('team_updates', e.target.checked)}
                    disabled={!settings.email_enabled}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                </label>
              </>
            )}

            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">System Announcements</div>
                <div className="text-sm text-gray-500">Important system updates and maintenance</div>
              </div>
              <input
                type="checkbox"
                checked={settings.system_announcements}
                onChange={(e) => handleToggle('system_announcements', e.target.checked)}
                disabled={!settings.email_enabled}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
            </label>
          </div>

          {settings.email_enabled && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Frequency
              </label>
              <select
                value={settings.frequency}
                onChange={(e) => handleToggle('frequency', e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="immediate">Immediate</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Summary</option>
              </select>
            </div>
          )}
        </div>

        {/* Push Notifications - Coming Soon */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <Smartphone className="h-4 w-4 mr-2" />
            Push Notifications
          </h4>
          <p className="text-sm text-gray-500">
            Browser push notifications will be available in a future update.
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};