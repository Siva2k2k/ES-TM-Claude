import React, { useState, useEffect } from 'react';
import { Settings, Shield, Database, Activity, Save } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { SettingsService } from '../../services/SettingsService';

interface AdminSettingsProps {
  onSettingsChange: () => void;
  onSettingsSaved: () => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({
  onSettingsChange,
  onSettingsSaved
}) => {
  const permissions = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications'>('general');
  
  const [formData, setFormData] = useState({
    general: {
      site_name: 'ES Timesheet Manager',
      company_name: 'Your Company',
      default_timezone: 'UTC',
    },
    security: {
      session_timeout: 480, // 8 hours in minutes
      password_min_length: 8,
      require_2fa: false,
    },
    notifications: {
      email_enabled: true,
      admin_notifications: true,
    }
  });

  useEffect(() => {
    if (permissions.canModifySystemSettings()) {
      loadSystemSettings();
    }
  }, [permissions]);

  const loadSystemSettings = async () => {
    setLoading(true);
    const result = await SettingsService.getSystemSettings();
    if (result.settings) {
      setError(null);
    } else {
      setError(result.error || 'Failed to load system settings');
    }
    setLoading(false);
  };

  const handleSaveSetting = async (category: string, key: string, value: string | number | boolean) => {
    setSaving(true);
    onSettingsChange();
    
    const result = await SettingsService.updateSystemSetting(`${category}.${key}`, value);
    if (result.setting) {
      onSettingsSaved();
    } else {
      setError(result.error || 'Failed to save setting');
    }
    setSaving(false);
  };

  if (!permissions.canModifySystemSettings()) {
    return (
      <div className="text-center py-8">
        <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">
          You don't have permission to access system settings. Only Super Administrators can modify system configuration.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Activity },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          System Administration
        </h3>
        <p className="text-sm text-gray-500">Manage global system settings and configurations.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="site-name" className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
              <input
                id="site-name"
                type="text"
                value={formData.general.site_name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  general: { ...prev.general, site_name: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                id="company-name"
                type="text"
                value={formData.general.company_name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  general: { ...prev.general, company_name: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <button
            onClick={() => handleSaveSetting('general', 'site_settings', JSON.stringify(formData.general))}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save General Settings'}
          </button>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="session-timeout" className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
              <input
                id="session-timeout"
                type="number"
                value={formData.security.session_timeout}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  security: { ...prev.security, session_timeout: parseInt(e.target.value) }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password-length" className="block text-sm font-medium text-gray-700 mb-2">Password Min Length</label>
              <input
                id="password-length"
                type="number"
                value={formData.security.password_min_length}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  security: { ...prev.security, password_min_length: parseInt(e.target.value) }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={() => handleSaveSetting('security', 'settings', JSON.stringify(formData.security))}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Security Settings'}
          </button>
        </div>
      )}

      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notifications.email_enabled}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, email_enabled: e.target.checked }
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable Email Notifications</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notifications.admin_notifications}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, admin_notifications: e.target.checked }
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Admin Notifications</span>
            </label>
          </div>

          <button
            onClick={() => handleSaveSetting('notifications', 'settings', JSON.stringify(formData.notifications))}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Notification Settings'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;