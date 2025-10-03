import React, { useState } from 'react';
import { Settings, Shield, Save } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

interface AdminSettingsProps {
  onSettingsChange: () => void;
  onSettingsSaved: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  onSettingsChange,
  onSettingsSaved
}) => {
  const permissions = usePermissions();
  const [formData, setFormData] = useState({
    site_name: 'ES Timesheet Manager',
    company_name: 'Your Company',
    session_timeout: 480,
    email_enabled: true
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    onSettingsChange();

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('System settings saved successfully');
      onSettingsSaved();
    } catch {
      // Error handled
    } finally {
      setLoading(false);
    }
  };

  if (!permissions.canModifySystemSettings) {
    return (
      <div className="text-center py-8">
        <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">
          You don't have permission to access system settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          System Administration
        </h3>
        <p className="text-sm text-gray-500">Manage global system settings and configurations.</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">General Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="site-name" className="block text-sm font-medium text-gray-700 mb-2">
                Site Name
              </label>
              <input
                id="site-name"
                type="text"
                value={formData.site_name}
                onChange={(e) => setFormData(prev => ({ ...prev, site_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                id="company-name"
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Security Settings</h4>
          <div className="space-y-4">
            <div>
              <label htmlFor="session-timeout" className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                id="session-timeout"
                type="number"
                value={formData.session_timeout}
                onChange={(e) => setFormData(prev => ({ ...prev, session_timeout: parseInt(e.target.value) }))}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.email_enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, email_enabled: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable Email Notifications</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};