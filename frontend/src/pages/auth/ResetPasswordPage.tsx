import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { AuthCard, PasswordStrengthIndicator } from './components';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { passwordSchema } from '../../schemas/auth.schema';

/**
 * ResetPasswordPage Component
 * Allows users to set a new password using a reset token
 */

// Schema without token field (token comes from URL)
const resetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = React.useState<string>('');
  const [success, setSuccess] = React.useState(false);
  const [serverError, setServerError] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordFormSchema),
  });

  const passwordValue = watch('password', '');

  // Extract token from URL on mount
  React.useEffect(() => {
    const tokenParam = searchParams.get('token');

    if (tokenParam && tokenParam.length > 10) {
      setToken(tokenParam);
      console.log('✅ Token extracted from URL');
    } else {
      setServerError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [searchParams]);

  // Validate token with backend on mount (redirect to login if invalid)
  React.useEffect(() => {
    if (!token) return;

    const validate = async () => {
      try {
        const resp = await fetch(`http://localhost:3001/api/v1/auth/reset-password/validate?token=${encodeURIComponent(token)}`);
        const json = await resp.json();
        if (!json.success) {
          setServerError('This reset link is invalid or has expired. Redirecting to login...');
          setTimeout(() => navigate('/login'), 2000);
        }
      } catch (err) {
        console.error('Navigating to Login page', err);
        setServerError('Failed to validate reset token. Redirecting to Login Page.');
        setTimeout(() => navigate('/login'), 4000);
      }
    };

    validate();
  }, [token, navigate]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setServerError('Invalid reset token.');
      return;
    }

    setServerError('');

    try {
      const response = await fetch('http://localhost:3001/api/v1/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: data.password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        const raw = result.error ?? result.message ?? 'Failed to reset password';
        const errorMessage = typeof raw === 'string' ? raw : String(raw?.message ?? JSON.stringify(raw));
        setServerError(errorMessage);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  // Show error state if no valid token
  if (!token && serverError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <AuthCard title="Invalid Reset Link" subtitle="This password reset link is invalid or has expired">
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-slate-700 dark:text-gray-300 mb-4">{serverError}</p>
              <Button onClick={() => navigate('/forgot-password')} className="w-full">
                Request New Reset Link
              </Button>
            </div>
          </div>
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <AuthCard
        title={success ? 'Password Reset Successful' : 'Reset Your Password'}
        subtitle={success ? 'You can now login with your new password' : 'Enter your new password below'}
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
                Your password has been reset successfully!
              </p>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                Redirecting to login page...
              </p>
            </div>

            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Server Error Message */}
            {serverError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 dark:text-red-300 text-sm">{serverError}</p>
              </div>
            )}

            {/* New Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  className="pl-10 pr-10"
                  autoFocus
                  {...register('password')}
                  error={errors.password?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {passwordValue && <PasswordStrengthIndicator password={passwordValue} />}

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
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  className="pl-10 pr-10"
                  {...register('confirmPassword')}
                  error={errors.confirmPassword?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        )}
      </AuthCard>
    </div>
  );
}

export default ResetPasswordPage;
