import React, { useState, useEffect } from 'react';
import { User, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../store/contexts/AuthContext';
import { useProfileForm } from '../../hooks/useProfileForm';
import { showSuccess, showError } from '../../utils/toast';

interface ProfileSettingsProps {
  onSettingsChange: () => void;
  onSettingsSaved: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onSettingsChange, onSettingsSaved }) => {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const {
    form,
    isSubmitting,
    error,
    success,
    hasChanges,
    handleSubmit,
    clearError,
    resetForm
  } = useProfileForm({
    user: currentUser || undefined,
    onSuccess: (data) => {
      showSuccess('Profile updated successfully!');
      setIsEditing(false);
      onSettingsSaved();
    },
    onError: (error) => {
      showError(`Failed to update profile: ${error}`);
    }
  });

  // Monitor form changes
  useEffect(() => {
    if (hasChanges && isEditing) {
      onSettingsChange();
    }
  }, [hasChanges, isEditing, onSettingsChange]);

  const handleEdit = () => {
    setIsEditing(true);
    clearError();
  };

  const handleCancel = () => {
    resetForm();
    setIsEditing(false);
    onSettingsSaved(); // Reset unsaved changes state
  };

  if (!currentUser) {
    return (
      <div className="text-center py-8">
        <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600">No user information available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              {...form.register('full_name')}
              type="text"
              id="full_name"
              disabled={!isEditing}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                !isEditing 
                  ? 'bg-gray-50 border-gray-200 text-gray-500' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Enter your full name"
            />
            {form.formState.errors.full_name && (
              <p className="mt-1 text-sm text-red-600">
                {form.formState.errors.full_name.message}
              </p>
            )}
          </div>

          {/* Email (Read-only) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={currentUser.email}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Email cannot be changed. Contact an administrator if you need to update your email.
            </p>
          </div>

          {/* Role (Read-only) */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                currentUser.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                currentUser.role === 'management' ? 'bg-blue-100 text-blue-800' :
                currentUser.role === 'manager' ? 'bg-indigo-100 text-indigo-800' :
                currentUser.role === 'lead' ? 'bg-cyan-100 text-cyan-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {currentUser.role.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Your role is assigned by administrators and cannot be changed here.
            </p>
          </div>

          {/* Hourly Rate (if applicable) */}
          {(currentUser.role !== 'super_admin' && currentUser.role !== 'management') && (
            <div>
              <label htmlFor="hourly_rate" className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate ($)
              </label>
              <input
                {...form.register('hourly_rate', { 
                  valueAsNumber: true,
                  setValueAs: (value) => value === '' ? null : Number(value)
                })}
                type="number"
                id="hourly_rate"
                min="0"
                step="0.01"
                disabled={!isEditing}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  !isEditing 
                    ? 'bg-gray-50 border-gray-200 text-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="0.00"
              />
              {form.formState.errors.hourly_rate && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.hourly_rate.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Your hourly rate for timesheet calculations. Leave empty if not applicable.
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {/* Success Display */}
          {success && (
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm text-green-800">Profile updated successfully!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            {!isEditing ? (
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !hasChanges}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Account Information */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Status
            </label>
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                currentUser.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {currentUser.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Approval Status
            </label>
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                currentUser.is_approved_by_super_admin ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {currentUser.is_approved_by_super_admin ? 'Approved' : 'Pending Approval'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Since
            </label>
            <p className="text-sm text-gray-600">
              {new Date(currentUser.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Updated
            </label>
            <p className="text-sm text-gray-600">
              {new Date(currentUser.updated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;