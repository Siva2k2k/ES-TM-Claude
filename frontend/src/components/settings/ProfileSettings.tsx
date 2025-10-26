import React, { useState, useEffect } from 'react';
import { User, Mail, DollarSign, Shield, Save, Loader2, RefreshCw, Lock, Edit } from 'lucide-react';
import { useAuth } from '../../store/contexts/AuthContext';
import { backendApi } from '../../lib/backendApi';
import { useToast } from '../../hooks/useToast';
import { UserProfileModal } from '../UserProfileModal';
import { ChangePasswordModal } from '../ChangePasswordModal';

interface ProfileSettingsProps {
  onSettingsChange: () => void;
  onSettingsSaved: () => void;
}

interface ProfileFormData {
  full_name: string;
  email: string;
  hourly_rate: number;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  onSettingsChange,
  onSettingsSaved
}) => {
  const { currentUser, refreshUser } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    hourly_rate: 0
  });
  const [initialData, setInitialData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    hourly_rate: 0
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const data = {
        full_name: currentUser.full_name || '',
        email: currentUser.email || '',
        hourly_rate: currentUser.hourly_rate || 0
      };
      setFormData(data);
      setInitialData(data);
      setHasChanges(false);
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const loadingToast = toast.loading('Updating profile...');

    try {
      // Prepare update payload - only include hourly_rate if it's greater than 0
      const updatePayload: any = {
        full_name: formData.full_name.trim()
      };

      // Only include hourly_rate if it's valid (>= 0.01)
      if (formData.hourly_rate > 0) {
        updatePayload.hourly_rate = formData.hourly_rate;
      }

      // Call the auth profile update API
      const response = await backendApi.put<{ success: boolean; user?: any; error?: string }>(
        '/auth/profile',
        updatePayload
      );

      if (response.success) {
        toast.update(loadingToast, {
          render: 'Profile updated successfully!',
          type: 'success',
          isLoading: false,
          autoClose: 3000
        });
        setInitialData(formData);
        setHasChanges(false);
        onSettingsSaved();

        // Refresh user data in auth context
        if (refreshUser) {
          await refreshUser();
        }
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      toast.update(loadingToast, {
        render: errorMessage,
        type: 'error',
        isLoading: false,
        autoClose: 5000
      });
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
      onSettingsChange();
    }
  };

  const handleProfileUpdate = async () => {
    setShowProfileModal(false);
    if (refreshUser) {
      await refreshUser();
    }
    onSettingsSaved();
    toast.success('Profile updated successfully!');
  };

  const handlePasswordChange = () => {
    setShowPasswordModal(false);
    toast.success('Password changed successfully!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Profile Information
        </h3>
        <p className="text-sm text-gray-500">Update your personal information and contact details.</p>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile (Modal)
          </button>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center px-4 py-2 border border-indigo-300 rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={formData.email}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <Mail className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Email cannot be changed. Contact your administrator for email updates.
            </p>
          </div>

          <div>
            <label htmlFor="hourly_rate" className="block text-sm font-medium text-gray-700 mb-2">
              Hourly Rate ($)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                id="hourly_rate"
                type="number"
                min="0"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => handleInputChange('hourly_rate', parseFloat(e.target.value) || 0)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <div className="relative">
              <input
                type="text"
                value={currentUser?.role || 'N/A'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed capitalize"
              />
              <Shield className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Role is managed by your administrator.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Profile Picture</h4>
          <p className="text-sm text-blue-700 mb-3">
            Profile pictures will be available in a future update. For now, your initials are displayed.
          </p>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-lg">
                {formData.full_name.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{formData.full_name || 'User'}</p>
              <p className="text-xs text-gray-500 capitalize">{currentUser?.role}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              setFormData(initialData);
              setHasChanges(false);
            }}
            disabled={loading || !hasChanges}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={loading || !hasChanges}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={currentUser ? {
          id: currentUser.id || '',
          email: currentUser.email,
          full_name: currentUser.full_name || '',
          role: currentUser.role,
          hourly_rate: currentUser.hourly_rate,
          created_at: currentUser.created_at,
          updated_at: currentUser.updated_at,
          manager_id: currentUser.manager_id
        } : undefined}
        onUpdate={handleProfileUpdate}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordChange}
      />
    </div>
  );
};