import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Lock, 
  Bell, 
  Palette, 
  FileText, 
  Shield, 
  Database,
  Save,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../store/contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import ProfileSettings from '../components/settings/ProfileSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import PreferencesSettings from '../components/settings/PreferencesSettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import ReportTemplateSettings from '../components/settings/ReportTemplateSettings';
import AdminSettings from '../components/settings/AdminSettings';
// Toast utilities will be used by child components

type SettingsTab = 'profile' | 'security' | 'preferences' | 'notifications' | 'templates' | 'admin';

interface SettingsPageProps {
  defaultTab?: SettingsTab;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ defaultTab = 'profile' }) => {
  const { currentUser, currentUserRole } = useAuth();
  const { canModifySystemSettings } = usePermissions();
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Available tabs based on user role
  const availableTabs = [
    {
      id: 'profile' as const,
      name: 'Profile',
      icon: User,
      description: 'Personal information and account details',
      available: true
    },
    {
      id: 'security' as const,
      name: 'Security',
      icon: Lock,
      description: 'Password and security settings',
      available: true
    },
    {
      id: 'preferences' as const,
      name: 'Preferences',
      icon: Palette,
      description: 'Theme, display, and interface settings',
      available: true
    },
    {
      id: 'notifications' as const,
      name: 'Notifications',
      icon: Bell,
      description: 'Email and alert preferences',
      available: true
    },
    {
      id: 'templates' as const,
      name: 'Report Templates',
      icon: FileText,
      description: 'Custom report templates and formats',
      available: ['lead', 'manager', 'management', 'super_admin'].includes(currentUserRole || '')
    },
    {
      id: 'admin' as const,
      name: 'System Settings',
      icon: Database,
      description: 'System configuration and administration',
      available: canModifySystemSettings()
    }
  ].filter(tab => tab.available);

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleTabChange = (newTab: SettingsTab) => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to switch tabs?');
      if (!confirm) return;
    }
    setActiveTab(newTab);
    setHasUnsavedChanges(false);
  };

  const renderActiveTab = () => {
    const commonProps = {
      onSettingsChange: () => setHasUnsavedChanges(true),
      onSettingsSaved: () => setHasUnsavedChanges(false)
    };

    switch (activeTab) {
      case 'profile':
        return <ProfileSettings {...commonProps} />;
      case 'security':
        return <SecuritySettings {...commonProps} />;
      case 'preferences':
        return <PreferencesSettings {...commonProps} />;
      case 'notifications':
        return <NotificationSettings {...commonProps} />;
      case 'templates':
        return <ReportTemplateSettings {...commonProps} />;
      case 'admin':
        return <AdminSettings {...commonProps} />;
      default:
        return <ProfileSettings {...commonProps} />;
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <Settings className="h-8 w-8 text-gray-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">
            Manage your account settings, preferences, and system configuration
          </p>
          {hasUnsavedChanges && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <Save className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-sm text-yellow-800 font-medium">
                  You have unsaved changes
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {availableTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className={`h-5 w-5 mr-3 ${
                        isActive ? 'text-blue-600' : 'text-gray-500'
                      }`} />
                      <div>
                        <div className="font-medium">{tab.name}</div>
                        <div className={`text-xs ${
                          isActive ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {tab.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {availableTabs.find(tab => tab.id === activeTab)?.name}
                  </h2>
                  {hasUnsavedChanges && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          // This would trigger a reset in the active component
                          setHasUnsavedChanges(false);
                          window.location.reload();
                        }}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {availableTabs.find(tab => tab.id === activeTab)?.description}
                </p>
              </div>

              <div className="p-6">
                {renderActiveTab()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;