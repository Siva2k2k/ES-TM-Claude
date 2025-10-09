import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, User, Chrome, AlertCircle, Square } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { RegisterCredentials, OAuthProviders } from '../types';
import AuthService from '../services/auth';

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [allowSelfRegistration, setAllowSelfRegistration] = useState<boolean | null>(null);
  const [oauthProviders, setOauthProviders] = useState<OAuthProviders | null>(null);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterCredentials & { confirmPassword: string }>();

  const password = watch('password');

  useEffect(() => {
    // Check if self registration is allowed and fetch OAuth providers
    const fetchSettings = async () => {
      try {
        const [registrationResponse, oauthResponse] = await Promise.all([
          AuthService.getRegistrationSettings(),
          AuthService.getOAuthProviders()
        ]);

        if (registrationResponse.success && registrationResponse.data) {
          setAllowSelfRegistration(registrationResponse.data.allowSelfRegistration);
        }

        if (oauthResponse.success && oauthResponse.data) {
          setOauthProviders(oauthResponse.data.providers);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        // Default values if unable to fetch
        setAllowSelfRegistration(true);
        setOauthProviders({
          google: { enabled: false, clientId: '' },
          microsoft: { enabled: false, clientId: '' },
          apple: { enabled: false, clientId: '' }
        });
      } finally {
        setIsCheckingRegistration(false);
      }
    };

    fetchSettings();
  }, []);

  const onSubmit = async (data: RegisterCredentials & { confirmPassword: string }) => {
    setIsLoading(true);
    setError('');

    try {
      const { confirmPassword, ...credentials } = data;
      await registerUser(credentials);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = AuthService.getGoogleOAuthUrl();
  };

  const handleMicrosoftLogin = () => {
    window.location.href = AuthService.getMicrosoftOAuthUrl();
  };

  // Show loading state while checking registration settings
  if (isCheckingRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show registration disabled message
  if (allowSelfRegistration === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-foreground">
              Registration Disabled
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Self-registration is currently disabled. To create an account, please contact your administrator.
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary/90 transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
              <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-foreground">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We've sent a verification link to your email address. Please click the link to verify your account.
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary/90 transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary/90 transition-colors"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* Error message */}
          {error && (
            <div className="bg-destructive/15 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="sr-only">
                  First name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    {...register('firstName', {
                      required: 'First name is required',
                      minLength: {
                        value: 1,
                        message: 'First name is required',
                      },
                    })}
                    type="text"
                    className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-input placeholder-muted-foreground text-foreground bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    placeholder="First name"
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="sr-only">
                  Last name
                </label>
                <input
                  {...register('lastName', {
                    required: 'Last name is required',
                    minLength: {
                      value: 1,
                      message: 'Last name is required',
                    },
                  })}
                  type="text"
                  className="appearance-none relative block w-full px-3 py-3 border border-input placeholder-muted-foreground text-foreground bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email field */}
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  type="email"
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-input placeholder-muted-foreground text-foreground bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                      message: 'Password must contain uppercase, lowercase, number, and special character',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-input placeholder-muted-foreground text-foreground bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  ) : (
                    <Eye className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm password field */}
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === password || 'Passwords do not match',
                  })}
                  type="password"
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-input placeholder-muted-foreground text-foreground bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  placeholder="Confirm password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                Creating account...
              </div>
            ) : (
              'Create account'
            )}
          </button>

          {/* OAuth buttons */}
          {oauthProviders && (oauthProviders.google.enabled || oauthProviders.microsoft.enabled || oauthProviders.apple.enabled) && (
            <>
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="space-y-3">
                {oauthProviders.google.enabled && (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center px-4 py-3 border border-input text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent transition-colors"
                  >
                    <Chrome className="h-5 w-5 mr-2" />
                    Continue with Google
                  </button>
                )}
                
                {oauthProviders.microsoft.enabled && (
                  <button
                    type="button"
                    onClick={handleMicrosoftLogin}
                    className="w-full flex items-center justify-center px-4 py-3 border border-input text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent transition-colors"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Continue with Microsoft
                  </button>
                )}

                {oauthProviders.apple.enabled && (
                  <button
                    type="button"
                    onClick={() => window.location.href = AuthService.getAppleOAuthUrl()}
                    className="w-full flex items-center justify-center px-4 py-3 border border-input text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent transition-colors"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Continue with Apple
                  </button>
                )}
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;