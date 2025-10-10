import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, KeyRound } from 'lucide-react';
import { changePasswordSchema, type ChangePasswordInput } from '../../schemas/auth.schema';
import { AuthCard, PasswordStrengthIndicator } from './components';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/**
 * ForcePasswordChangePage Component
 * Forces users with temporary passwords to change their password
 */

interface ForcePasswordChangePageProps {
  userEmail?: string;
  onComplete?: () => void;
}

export function ForcePasswordChangePage({
  userEmail = '',
  onComplete,
}: ForcePasswordChangePageProps) {
  const navigate = useNavigate();
  const [success, setSuccess] = React.useState(false);
  const [serverError, setServerError] = React.useState('');
  const [showPasswords, setShowPasswords] = React.useState({
    current: false,
    new: false,
    confirm: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPasswordValue = watch('newPassword', '');

  const onSubmit = async (data: ChangePasswordInput) => {
    setServerError('');

    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch('http://localhost:3001/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);

        // Call onComplete callback if provided, otherwise navigate to dashboard
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          } else {
            navigate('/dashboard');
          }
        }, 2000);
      } else {
        const errorMessage =
          typeof result.error === 'string'
            ? result.error
            : result.error?.message || result.message || 'Failed to change password';
        setServerError(errorMessage);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to change password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <AuthCard
        title={success ? 'Password Changed Successfully' : 'Change Your Password'}
        subtitle={
          success
            ? 'Your password has been updated'
            : userEmail
            ? `Welcome ${userEmail}! Please set a new password to continue.`
            : 'For security reasons, you must change your temporary password.'
        }
      >
        {success ? (
          /* Success State */
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-slate-700 dark:text-gray-300">
                Your password has been changed successfully!
              </p>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                Redirecting to dashboard...
              </p>
            </div>

            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start space-x-3">
              <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Temporary Password Detected</p>
                <p>You're using a temporary password. Please create a new secure password to access your account.</p>
              </div>
            </div>

            {/* Server Error Message */}
            {serverError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 dark:text-red-300 text-sm">{serverError}</p>
              </div>
            )}

            {/* Current Password Field */}
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Current (Temporary) Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  placeholder="Enter your temporary password"
                  className="pl-10 pr-10"
                  autoFocus
                  {...register('currentPassword')}
                  error={errors.currentPassword?.message}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                  }
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <Input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  className="pl-10 pr-10"
                  {...register('newPassword')}
                  error={errors.newPassword?.message}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                  }
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {newPasswordValue && <PasswordStrengthIndicator password={newPasswordValue} />}

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  className="pl-10 pr-10"
                  {...register('confirmPassword')}
                  error={errors.confirmPassword?.message}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                  }
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </form>
        )}
      </AuthCard>
    </div>
  );
}

export default ForcePasswordChangePage;
