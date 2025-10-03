import React, { useState, useEffect } from 'react';
import { X, User, Shield, Palette, Bell, FileText, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../store/contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { ProfileSettings } from './ProfileSettings';
import { SecuritySettings } from './SecuritySettings';
import { PreferencesSettings } from './PreferencesSettings';
import { NotificationSettings } from './NotificationSettings';
import { ReportTemplateSettings } from './ReportTemplateSettings';
import { AdminSettings } from './AdminSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'profile' | 'security' | 'preferences' | 'notifications' | 'templates' | 'admin';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('profile');
      setHasUnsavedChanges(false);
    }
  }, [isOpen]);

  const handleTabChange = (tab: SettingsTab) => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to switch tabs?')) {
        setHasUnsavedChanges(false);
        setActiveTab(tab);
      }
    } else {
      setActiveTab(tab);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        setHasUnsavedChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSettingsChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleSettingsSaved = () => {
    setHasUnsavedChanges(false);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, available: true },
    { id: 'security', label: 'Security', icon: Shield, available: true },
    { id: 'preferences', label: 'Preferences', icon: Palette, available: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, available: true },
    { 
      id: 'templates', 
      label: 'Report Templates', 
      icon: FileText, 
      available: permissions.canCreateCustomReports 
    },
    { 
      id: 'admin', 
      label: 'Administration', 
      icon: SettingsIcon, 
      available: permissions.canModifySystemSettings 
    },
  ] as const;

  const availableTabs = tabs.filter(tab => tab.available);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage your account settings and preferences
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex h-[calc(90vh-120px)]">
            {/* Sidebar */}
            <div className="w-64 border-r border-gray-200 bg-gray-50">
              <nav className="p-4 space-y-2">
                {availableTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as SettingsTab)}
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      {tab.label}
                      {hasUnsavedChanges && isActive && (
                        <div className="ml-auto w-2 h-2 bg-orange-400 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* User Info */}
              <div className="p-4 border-t border-gray-200 mt-auto">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {currentUser?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {currentUser?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {permissions.userRole}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {activeTab === 'profile' && (
                  <ProfileSettings
                    onSettingsChange={handleSettingsChange}
                    onSettingsSaved={handleSettingsSaved}
                  />
                )}
                {activeTab === 'security' && (
                  <SecuritySettings
                    onSettingsChange={handleSettingsChange}
                    onSettingsSaved={handleSettingsSaved}
                  />
                )}
                {activeTab === 'preferences' && (
                  <PreferencesSettings
                    onSettingsChange={handleSettingsChange}
                    onSettingsSaved={handleSettingsSaved}
                  />
                )}
                {activeTab === 'notifications' && (
                  <NotificationSettings
                    onSettingsChange={handleSettingsChange}
                    onSettingsSaved={handleSettingsSaved}
                  />
                )}
                {activeTab === 'templates' && permissions.canCreateCustomReports && (
                  <ReportTemplateSettings
                    onSettingsChange={handleSettingsChange}
                    onSettingsSaved={handleSettingsSaved}
                  />
                )}
                {activeTab === 'admin' && permissions.canModifySystemSettings && (
                  <AdminSettings
                    onSettingsChange={handleSettingsChange}
                    onSettingsSaved={handleSettingsSaved}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};