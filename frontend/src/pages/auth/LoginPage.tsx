import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../store/contexts/AuthContext';
import { loginSchema, type LoginInput } from '../../schemas/auth.schema';
import { AuthCard } from './components';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/**
 * LoginPage Component
 * Modern login page with react-hook-form and Zod validation
 */

export function LoginPage() {
  const { signIn, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = React.useState('');

  // Get the intended destination from location state (for redirect after login)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@company.com',
      password: 'admin123',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError('');

    try {
      console.log('🔐 LoginPage - Starting sign in process...');
      const result = await signIn(data.email, data.password);

      if (result.error) {
        console.error('🔐 LoginPage - Sign in failed:', result.error);
          // Ensure the error is a string before setting it in state to avoid React object render errors
          setServerError(typeof result.error === 'string' ? result.error : String(result.error));
      } else {
        console.log('🔐 LoginPage - Sign in successful');
        
        // Check if password change is required
        if (result.requirePasswordChange) {
          console.log('🔐 LoginPage - Password change required, staying on current flow');
          // The requirePasswordChange state in AuthContext will trigger ForcePasswordChangePage
          return;
        }

        // Navigate to intended destination or dashboard on successful login
        console.log(`🔐 LoginPage - Navigating to ${from}...`);
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('🔐 LoginPage - Unexpected error:', err);
      setServerError('An unexpected error occurred. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <AuthCard
        title="Welcome Back"
        subtitle="Sign in to your account to continue"
      >
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
                {...register('email')}
                error={errors.email?.message}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="pl-10"
                {...register('password')}
                error={errors.password?.message}
              />
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex items-center justify-end">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>          
        </form>
      </AuthCard>
    </div>
  );
}

export default LoginPage;
