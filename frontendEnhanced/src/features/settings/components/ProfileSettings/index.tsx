/**
 * ProfileSettings Component
 * User profile settings form
 * Adapted from /frontend with frontendEnhanced design system
 */

import React, { useState, useEffect } from 'react';
import { User, Mail, DollarSign, Shield, Save, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { useAuthContext } from '../../../auth';
import type { ProfileUpdatePayload } from '../../types/settings.types';

export interface ProfileSettingsProps {
  /**
   * Callback when form has unsaved changes
   */
  onSettingsChange?: () => void;
  /**
   * Callback when settings are successfully saved
   */
  onSettingsSaved?: () => void;
  /**
   * Update profile function
   */
  onUpdateProfile: (data: ProfileUpdatePayload) => Promise<{ error?: string }>;
  /**
   * Additional CSS classes
   */
  className?: string;
}

interface ProfileFormData {
  full_name: string;
  email: string;
  hourly_rate: number;
}

/**
 * Profile settings component
 * Complexity: 7
 * LOC: ~220
 */
export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  onSettingsChange,
  onSettingsSaved,
  onUpdateProfile,
  className = '',
}) => {
  const { user, refreshUser } = useAuthContext();
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    hourly_rate: 0,
  });
  const [initialData, setInitialData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    hourly_rate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const data = {
        full_name: user.full_name || '',
        email: user.email || '',
        hourly_rate: user.hourly_rate || 0,
      };
      setFormData(data);
      setInitialData(data);
      setHasChanges(false);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare update payload
      const updatePayload: ProfileUpdatePayload = {
        full_name: formData.full_name.trim(),
      };

      // Only include hourly_rate if it's valid
      if (formData.hourly_rate > 0) {
        updatePayload.hourly_rate = formData.hourly_rate;
      }

      const result = await onUpdateProfile(updatePayload);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Profile updated successfully!');
        setInitialData(formData);
        setHasChanges(false);
        onSettingsSaved?.();

        // Refresh user data
        await refreshUser();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string | number) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Check if there are changes
    const changed = JSON.stringify(newData) !== JSON.stringify(initialData);
    setHasChanges(changed);

    if (changed) {
      onSettingsChange?.();
    }

    // Clear messages when user types
    setError(null);
    setSuccess(null);
  };

  const handleReset = () => {
    setFormData(initialData);
    setHasChanges(false);
    setError(null);
    setSuccess(null);
  };

  const userInitials = formData.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary mb-2 flex items-center">
          <User className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
          Profile Information
        </h3>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          Update your personal information and contact details.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-4">
          <p className="text-error-700 dark:text-error-300 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-4">
          <p className="text-success-700 dark:text-success-300 text-sm">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label
              htmlFor="full_name"
              className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2"
            >
              Full Name
            </label>
            <Input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Enter your full name"
              disabled={loading}
            />
          </div>

          {/* Email (Read-only) */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={formData.email}
                readOnly
                disabled
                className="cursor-not-allowed"
              />
              <Mail className="absolute right-3 top-2.5 h-4 w-4 text-text-tertiary dark:text-dark-text-tertiary" />
            </div>
            <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary mt-1">
              Email cannot be changed. Contact your administrator for email updates.
            </p>
          </div>

          {/* Hourly Rate */}
          <div>
            <label
              htmlFor="hourly_rate"
              className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2"
            >
              Hourly Rate ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-text-tertiary dark:text-dark-text-tertiary" />
              <Input
                id="hourly_rate"
                type="number"
                min="0"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => handleInputChange('hourly_rate', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          {/* Role (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
              Role
            </label>
            <div className="relative">
              <Input
                type="text"
                value={user?.role || 'N/A'}
                readOnly
                disabled
                className="capitalize cursor-not-allowed"
              />
              <Shield className="absolute right-3 top-2.5 h-4 w-4 text-text-tertiary dark:text-dark-text-tertiary" />
            </div>
            <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary mt-1">
              Role is managed by your administrator.
            </p>
          </div>
        </div>

        {/* Profile Picture Section */}
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-primary-900 dark:text-primary-100 mb-2">
            Profile Picture
          </h4>
          <p className="text-sm text-primary-700 dark:text-primary-300 mb-3">
            Profile pictures will be available in a future update. For now, your initials are displayed.
          </p>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-lg">{userInitials}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                {formData.full_name || 'User'}
              </p>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary capitalize">
                {user?.role}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={loading || !hasChanges}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            type="submit"
            
            disabled={loading || !hasChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};
