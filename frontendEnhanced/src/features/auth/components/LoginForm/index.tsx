/**
 * LoginForm Component
 * User login form with validation and error handling
 * Adapted from /frontend with frontendEnhanced design system
 */

import React, { useState } from 'react';
import { Shield, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

export interface LoginFormProps {
  /**
   * Callback when login is successful
   */
  onSuccess?: () => void;
  /**
   * Callback to show forgot password form
   */
  onForgotPassword?: () => void;
  /**
   * Sign in function from auth context
   */
  onSignIn: (email: string, password: string) => Promise<{ error?: string }>;
  /**
   * Loading state from auth context
   */
  isLoading?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Login form component
 * Complexity: 6
 * LOC: ~200
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onForgotPassword,
  onSignIn,
  isLoading = false,
  className = '',
}) => {
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await onSignIn(email, password);

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess?.();
      }
    } catch (err) {
      console.error('[LoginForm] Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-800 dark:to-dark-900 flex items-center justify-center">
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl p-8 text-center border border-gray-200 dark:border-dark-700">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400 mx-auto mb-4" />
          <p className="text-text-secondary dark:text-dark-text-secondary">Loading...</p>
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
            <div className="relative">
              <Shield className="h-12 w-12 text-white" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-primary-400 to-accent-500 rounded-full"></div>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">TimeTracker Pro</h1>
          <p className="text-primary-100 dark:text-primary-200">Enterprise Time Management System</p>
        </div>

        {/* Login Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-4 flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-error-600 dark:text-error-400 flex-shrink-0" />
                <p className="text-error-700 dark:text-error-300 text-sm">{error}</p>
              </div>
            )}

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
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary dark:text-dark-text-tertiary" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="Enter your password"
                  required
                  disabled={isSubmitting}
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
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </Button>
          </form>

          {/* Forgot Password Link */}
          {onForgotPassword && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600">
            <h3 className="text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
              Demo Credentials
            </h3>
            <div className="text-xs text-text-secondary dark:text-dark-text-secondary space-y-1">
              <p>
                <strong className="text-text-primary dark:text-dark-text-primary">Super Admin:</strong> admin@company.com / Admin123!
              </p>
              <p>
                <strong className="text-text-primary dark:text-dark-text-primary">Manager:</strong> manager@company.com / Manager123!
              </p>
              <p>
                <strong className="text-text-primary dark:text-dark-text-primary">Employee:</strong> test@company.com / Test123!
              </p>
              <p className="text-text-tertiary dark:text-dark-text-tertiary mt-2">
                Use any credentials above to test different roles
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
