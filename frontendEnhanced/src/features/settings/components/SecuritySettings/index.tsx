/**
 * SecuritySettings Component
 * Password change and security settings
 * Adapted from /frontend with frontendEnhanced design system
 */

import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, CheckCircle, XCircle, Save } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import type { PasswordChangePayload, PasswordValidation } from '../../types/settings.types';

export interface SecuritySettingsProps {
  /**
   * Callback when form has unsaved changes
   */
  onSettingsChange?: () => void;
  /**
   * Callback when settings are successfully saved
   */
  onSettingsSaved?: () => void;
  /**
   * Change password function
   */
  onChangePassword: (data: PasswordChangePayload) => Promise<{ error?: string }>;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Validate password strength
 */
const validatePassword = (password: string): PasswordValidation => {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(requirements).filter(Boolean).length;
  const strength: 'weak' | 'medium' | 'strong' = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong';

  return { requirements, strength, score };
};

/**
 * Security settings component
 * Complexity: 7
 * LOC: ~240
 */
export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  onSettingsChange,
  onSettingsSaved,
  onChangePassword,
  className = '',
}) => {
  const [formData, setFormData] = useState<PasswordChangePayload>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    onSettingsChange?.();

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(formData.newPassword);
    if (passwordValidation.score < 3) {
      setError('Password does not meet minimum requirements');
      setLoading(false);
      return;
    }

    try {
      const result = await onChangePassword(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Password changed successfully');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        onSettingsSaved?.();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof PasswordChangePayload, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
    onSettingsChange?.();
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const passwordValidation = validatePassword(formData.newPassword);
  const isFormValid =
    formData.currentPassword.length > 0 &&
    formData.newPassword.length > 0 &&
    formData.confirmPassword.length > 0 &&
    formData.newPassword === formData.confirmPassword &&
    passwordValidation.score >= 3;

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary mb-2 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
          Security Settings
        </h3>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
          Update your password and security preferences.
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
        <div className="bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-border rounded-lg p-6">
          <h4 className="text-md font-medium text-text-primary dark:text-dark-text-primary mb-4 flex items-center">
            <Lock className="h-4 w-4 mr-2 text-primary-600 dark:text-primary-400" />
            Change Password
          </h4>

          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label
                htmlFor="current-password"
                className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2"
              >
                Current Password
              </label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  placeholder="Enter your current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-2.5 text-text-tertiary dark:text-dark-text-tertiary hover:text-text-secondary dark:hover:text-dark-text-secondary"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Enter a new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-2.5 text-text-tertiary dark:text-dark-text-tertiary hover:text-text-secondary dark:hover:text-dark-text-secondary"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-2.5 text-text-tertiary dark:text-dark-text-tertiary hover:text-text-secondary dark:hover:text-dark-text-secondary"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-primary dark:text-dark-text-primary">Password Strength</span>
                    <span
                      className={`capitalize font-medium ${
                        passwordValidation.strength === 'weak'
                          ? 'text-error-600 dark:text-error-400'
                          : passwordValidation.strength === 'medium'
                          ? 'text-warning-600 dark:text-warning-400'
                          : 'text-success-600 dark:text-success-400'
                      }`}
                    >
                      {passwordValidation.strength}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-dark-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordValidation.strength === 'weak'
                          ? 'bg-error-500 w-1/3'
                          : passwordValidation.strength === 'medium'
                          ? 'bg-warning-500 w-2/3'
                          : 'bg-success-500 w-full'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(passwordValidation.requirements).map(([key, met]) => (
                    <div key={key} className="flex items-center">
                      {met ? (
                        <CheckCircle className="h-3 w-3 text-success-500 dark:text-success-400 mr-2" />
                      ) : (
                        <XCircle className="h-3 w-3 text-error-500 dark:text-error-400 mr-2" />
                      )}
                      <span className={met ? 'text-text-primary dark:text-dark-text-primary' : 'text-text-tertiary dark:text-dark-text-tertiary'}>
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

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button type="submit"  disabled={loading || !isFormValid}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Changing Password...' : 'Change Password'}
          </Button>
        </div>
      </form>
    </div>
  );
};
