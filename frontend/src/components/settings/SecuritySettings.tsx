import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, CheckCircle, XCircle, Save } from 'lucide-react';
import { SettingsService } from '../../services/SettingsService';

interface SecuritySettingsProps {
  onSettingsChange: () => void;
  onSettingsSaved: () => void;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  onSettingsChange,
  onSettingsSaved
}) => {
  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+=\-{}|;:,.<>?]/.test(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;
    const strength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong';

    return { requirements, strength, score };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    onSettingsChange();

    // Validation
    if (!formData.currentPassword.trim()) {
      setError('Current password is required');
      setLoading(false);
      return;
    }

    if (!formData.newPassword.trim()) {
      setError('New password is required');
      setLoading(false);
      return;
    }

    if (!formData.confirmPassword.trim()) {
      setError('Password confirmation is required');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(formData.newPassword);
    if (passwordValidation.score < 5) {
      setError('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting password change with validation:', {
        currentPasswordLength: formData.currentPassword.length,
        newPasswordLength: formData.newPassword.length,
        passwordRequirements: passwordValidation,
        score: passwordValidation.score
      });
      
      const result = await SettingsService.changePassword(
        formData.currentPassword,
        formData.newPassword
      );

      if (result.success) {
        setSuccess('Password changed successfully');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        onSettingsSaved();
      } else {
        const errorMsg = result.error || 'Failed to change password';
        console.log('Setting error message:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Password change error:', error);
      setError('Failed to change password: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof PasswordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Only clear error/success when user starts typing, not immediately
    if (error || success) {
      setError(null);
      setSuccess(null);
    }
    onSettingsChange();
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const passwordValidation = validatePassword(formData.newPassword);
  const isFormValid = 
    formData.currentPassword.length > 0 &&
    formData.newPassword.length > 0 &&
    formData.confirmPassword.length > 0 &&
    formData.newPassword === formData.confirmPassword &&
    passwordValidation.score >= 5;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Security Settings
        </h3>
        <p className="text-sm text-gray-500">Update your password and security preferences.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </h4>

          <div className="space-y-4">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter a new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                    formData.confirmPassword && formData.newPassword !== formData.confirmPassword 
                      ? 'border-red-300 bg-red-50' 
                      : formData.confirmPassword && formData.newPassword === formData.confirmPassword && formData.newPassword
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">Passwords do not match</p>
              )}
              {formData.confirmPassword && formData.newPassword === formData.confirmPassword && formData.newPassword && (
                <p className="text-sm text-green-600 mt-1 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">Password Strength</span>
                    <span className={`capitalize font-medium ${
                      passwordValidation.strength === 'weak' ? 'text-red-600' :
                      passwordValidation.strength === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {passwordValidation.strength}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordValidation.strength === 'weak' ? 'bg-red-500 w-1/3' :
                        passwordValidation.strength === 'medium' ? 'bg-yellow-500 w-2/3' : 'bg-green-500 w-full'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(passwordValidation.requirements).map(([key, met]) => (
                    <div key={key} className="flex items-center">
                      {met ? (
                        <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500 mr-2" />
                      )}
                      <span className={met ? 'text-gray-700' : 'text-gray-500'}>
                        {key === 'length' && '8+ characters'}
                        {key === 'uppercase' && 'Uppercase letter'}
                        {key === 'lowercase' && 'Lowercase letter'}
                        {key === 'number' && 'Number'}
                        {key === 'special' && 'Special character'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
};