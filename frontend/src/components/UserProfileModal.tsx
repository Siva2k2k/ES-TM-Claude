import React, { useState, useEffect } from 'react';
import { User, Mail, DollarSign, Calendar, Shield, X, AlertCircle, CheckCircle, Save } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    hourly_rate?: number;
    created_at?: string;
    updated_at?: string;
    manager_id?: string;
  };
  onUpdate?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdate
}) => {
  const [fullName, setFullName] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setHourlyRate(user.hourly_rate || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const hasChanges = () => {
    return fullName !== user.full_name || hourlyRate !== user.hourly_rate;
  };

  const validateForm = () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      return 'Full name must be at least 2 characters';
    }
    if (hourlyRate !== '' && (isNaN(Number(hourlyRate)) || Number(hourlyRate) <= 0)) {
      return 'Hourly rate must be a positive number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!hasChanges()) {
      setError('No changes to save');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: any = {
        full_name: fullName.trim()
      };

      if (hourlyRate !== '') {
        updateData.hourly_rate = Number(hourlyRate);
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setSuccess(true);
      setTimeout(() => {
        onUpdate?.();
        handleClose();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFullName(user?.full_name || '');
    setHourlyRate(user?.hourly_rate || '');
    setError(null);
    setSuccess(false);
    onClose();
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'super_admin': 'Super Admin',
      'management': 'Management',
      'manager': 'Manager',
      'lead': 'Team Lead',
      'employee': 'Employee'
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colorMap: Record<string, string> = {
      'super_admin': 'bg-purple-100 text-purple-800',
      'management': 'bg-red-100 text-red-800',
      'manager': 'bg-blue-100 text-blue-800',
      'lead': 'bg-green-100 text-green-800',
      'employee': 'bg-gray-100 text-gray-800'
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <User className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">Profile updated successfully!</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Information Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>

              {/* Email (Read-only) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="block w-full pl-10 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
              </div>

              {/* Full Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </div>
              </div>

              {/* Role (Read-only) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="block w-full pl-10 py-2 border border-gray-300 rounded-lg bg-gray-50">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Role is managed by administrators</p>
              </div>
            </div>

            {/* Work Information Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Work Information</h3>

              {/* Hourly Rate */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hourly Rate (USD)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="block w-full pl-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter hourly rate"
                    min="0.01"
                    max="10000"
                    step="0.01"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Used for billing and reporting calculations</p>
              </div>
            </div>

            {/* Account Information Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Created Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member Since
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      disabled
                      className="block w-full pl-10 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                    />
                  </div>
                </div>

                {/* Last Updated */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Updated
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                      disabled
                      className="block w-full pl-10 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasChanges() || loading}
              className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors flex items-center justify-center ${
                hasChanges() && !loading
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};