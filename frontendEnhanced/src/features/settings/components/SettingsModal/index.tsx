/**
 * Settings Modal
 * Main container for user settings with tab navigation
 * Cognitive Complexity: 8
 */
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../../auth/hooks/useAuth';
import { usePermissions } from '../../../../core/hooks/usePermissions';
import { Modal } from '../../../../components/ui';
import { SettingsTabs } from './SettingsTabs';
import { SettingsContent } from './SettingsContent';
import type { SettingsTab } from './types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'profile',
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab(initialTab);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, initialTab]);

  const handleTabChange = (tab: SettingsTab) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to switch tabs?'
      );
      if (!confirmed) return;
      setHasUnsavedChanges(false);
    }
    setActiveTab(tab);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleSettingsChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleSettingsSaved = () => {
    setHasUnsavedChanges(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" showCloseButton={false}>
      <div className="flex flex-col h-[85vh] max-h-[900px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border-primary dark:border-dark-border-primary">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-text-primary dark:text-dark-text-primary truncate">
              Settings
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
              Manage your account settings and preferences
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 sm:p-2 text-text-tertiary dark:text-dark-text-tertiary hover:text-text-primary dark:hover:text-dark-text-primary rounded-lg hover:bg-surface-hover dark:hover:bg-dark-700 ml-2 flex-shrink-0"
            aria-label="Close settings"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Sidebar with tabs */}
          <SettingsTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            hasUnsavedChanges={hasUnsavedChanges}
          />

          {/* Content area */}
          <div className="flex-1 overflow-y-auto bg-surface-primary dark:bg-dark-800">
            <div className="p-4 sm:p-6">
              <SettingsContent
                activeTab={activeTab}
                onSettingsChange={handleSettingsChange}
                onSettingsSaved={handleSettingsSaved}
              />
            </div>
          </div>
        </div>

        {/* User info footer (mobile only) */}
        <div className="sm:hidden p-4 border-t border-border-primary dark:border-dark-border-primary bg-surface-secondary dark:bg-dark-900">
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
    </Modal>
  );
};
