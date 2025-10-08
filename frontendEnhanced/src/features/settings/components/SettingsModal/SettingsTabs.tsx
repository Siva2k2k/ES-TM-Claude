/**
 * Settings Tabs Component
 * Tab navigation for settings modal
 * Cognitive Complexity: 5
 */
import React from 'react';
import { User, Shield, Palette, Bell, FileText, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../../auth/hooks/useAuth';
import { usePermissions } from '../../../../core/hooks/usePermissions';
import type { SettingsTab, SettingsTabConfig } from './types';

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  hasUnsavedChanges: boolean;
}

export const SettingsTabs: React.FC<SettingsTabsProps> = ({
  activeTab,
  onTabChange,
  hasUnsavedChanges,
}) => {
  const { user } = useAuth();
  const permissions = usePermissions();

  const tabs: SettingsTabConfig[] = [
    { id: 'profile', label: 'Profile', icon: User, available: true },
    { id: 'security', label: 'Security', icon: Shield, available: true },
    { id: 'preferences', label: 'Preferences', icon: Palette, available: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, available: true },
    {
      id: 'templates',
      label: 'Report Templates',
      icon: FileText,
      available: permissions.canCreateCustomReports,
    },
    {
      id: 'admin',
      label: 'Administration',
      icon: SettingsIcon,
      available: permissions.canModifySystemSettings,
    },
  ];

  const availableTabs = tabs.filter((tab) => tab.available);

  return (
    <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r border-border-primary dark:border-dark-border-primary bg-surface-secondary dark:bg-dark-900 overflow-x-auto sm:overflow-x-visible">
      <nav className="p-2 sm:p-4 flex sm:flex-col overflow-x-auto sm:overflow-x-visible space-x-2 sm:space-x-0 sm:space-y-2">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap sm:w-full ${
                isActive
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700'
                  : 'text-text-primary dark:text-dark-text-primary hover:bg-surface-hover dark:hover:bg-dark-800'
              }`}
            >
              <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              {hasUnsavedChanges && isActive && (
                <div
                  className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 bg-warning-500 rounded-full flex-shrink-0"
                  aria-label="Unsaved changes"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info - Desktop only */}
      <div className="hidden sm:block p-4 border-t border-border-primary dark:border-dark-border-primary mt-auto">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary capitalize">
              {user?.role || 'employee'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
