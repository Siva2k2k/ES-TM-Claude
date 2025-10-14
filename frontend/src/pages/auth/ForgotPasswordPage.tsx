import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../../schemas/auth.schema';
import { AuthCard } from './components';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/**
 * ForgotPasswordPage Component
 * Allows users to request a password reset link
 */

export function ForgotPasswordPage() {
  const [success, setSuccess] = React.useState(false);
  const [serverError, setServerError] = React.useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const emailValue = watch('email');

  const onSubmit = async (data: ForgotPasswordInput) => {
    setServerError('');

    try {
      const response = await fetch('http://localhost:3001/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setServerError(message || 'Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <AuthCard
        title={success ? 'Check Your Email' : 'Forgot Password'}
        subtitle={
          success
            ? 'We\'ve sent password reset instructions to your email'
            : 'Enter your email address and we\'ll send you instructions to reset your password'
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
                If an account exists for <strong>{emailValue}</strong>, you will receive password
                reset instructions shortly.
              </p>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                Please check your inbox and spam folder.
              </p>
            </div>

            <Link to="/login">
              <Button type="button" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </Link>
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

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10"
                  autoFocus
                  {...register('email')}
                  error={errors.email?.message}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Instructions'
                )}
              </Button>

              <Link to="/login" className="block">
                <Button type="button" variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> The reset link will expire in 1 hour. If you don't receive an
                email, please check your spam folder or contact your system administrator.
              </p>
            </div>
          </form>
        )}
      </AuthCard>
    </div>
  );
}

export default ForgotPasswordPage;
