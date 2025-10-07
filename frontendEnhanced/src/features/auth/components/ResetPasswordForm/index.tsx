/**
 * ResetPasswordForm Component
 * Password reset request and confirmation forms
 */

import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, Loader2, CheckCircle, KeyRound } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

export interface ResetPasswordFormProps {
  /**
   * Callback when password reset is successful
   */
  onSuccess?: () => void;
  /**
   * Callback to show login form
   */
  onShowLogin?: () => void;
  /**
   * Reset password function from auth context
   */
  onResetPassword: (email: string) => Promise<{ error?: string }>;
  /**
   * Optional reset token for confirmation flow
   */
  resetToken?: string;
  /**
   * Loading state
   */
  isLoading?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Password reset form component
 * Complexity: 6
 * LOC: ~230
 */
export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSuccess,
  onShowLogin,
  onResetPassword,
  resetToken,
  isLoading = false,
  className = '',
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onResetPassword(email.trim().toLowerCase());

      if (result.error) {
        setError(result.error);
      } else {
        setShowSuccess(true);
      }
    } catch (err) {
      console.error('[ResetPasswordForm] Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-800 dark:to-dark-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl p-8 text-center max-w-md border border-gray-200 dark:border-dark-700">
          <CheckCircle className="h-16 w-16 text-success-600 dark:text-success-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mb-2">
            Check Your Email
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary mb-6">
            We've sent password reset instructions to <strong>{email}</strong>
          </p>
          <p className="text-sm text-text-tertiary dark:text-dark-text-tertiary mb-6">
            Please check your email and click the link to reset your password. The link will expire in 1 hour.
          </p>
          {onShowLogin && (
            <Button
              variant="outline"
              onClick={onShowLogin}
              className="w-full"
            >
              Back to Login
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-800 dark:to-dark-900 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-dark-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-500 dark:to-primary-600 p-6 text-white text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white/10 p-3 rounded-full">
              <KeyRound className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
          <p className="text-primary-100 dark:text-primary-200">We'll send you reset instructions</p>
        </div>

        {/* Reset Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-4 flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-error-600 dark:text-error-400 flex-shrink-0" />
                <p className="text-error-700 dark:text-error-300 text-sm">{error}</p>
              </div>
            )}

            {/* Information */}
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary dark:text-dark-text-tertiary" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="Enter your email"
                  required
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Sending Instructions...</span>
                </>
              ) : (
                <span>Send Reset Instructions</span>
              )}
            </Button>
          </form>

          {/* Back to Login Link */}
          {onShowLogin && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onShowLogin}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline transition-colors"
              >
                ← Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
