import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, Chrome, CheckCircle, Square } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { LoginCredentials, OAuthProviders } from '../types';
import AuthService from '../services/auth';

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [allowSelfRegistration, setAllowSelfRegistration] = useState<boolean | null>(null);
  const [oauthProviders, setOauthProviders] = useState<OAuthProviders | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = (location.state as any)?.from || '/dashboard';

  useEffect(() => {
    // Fetch registration settings and OAuth providers
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
      }
    };

    fetchSettings();

    // Check if user came from successful email verification
    if (searchParams.get('verified') === 'true') {
      setShowVerificationSuccess(true);
      // Remove the parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('verified');
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
      
      // Hide the message after 5 seconds
      setTimeout(() => {
        setShowVerificationSuccess(false);
      }, 5000);
    }

    // Check if user came from successful password reset
    if (searchParams.get('reset') === 'success') {
      setShowResetSuccess(true);
      // Remove the parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('reset');
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
      
      // Hide the message after 5 seconds
      setTimeout(() => {
        setShowResetSuccess(false);
      }, 5000);
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>();

  const onSubmit = async (data: LoginCredentials) => {
    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 LoginPage: Calling login...');
      await login(data);
      console.log('✅ LoginPage: Login successful, navigating...');
      navigate(from, { replace: true });
    } catch (err: any) {
      console.log('❌ LoginPage: Login failed with error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      console.log('🏁 LoginPage: Setting loading to false');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = AuthService.getGoogleOAuthUrl();
  };

  const handleMicrosoftLogin = () => {
    window.location.href = AuthService.getMicrosoftOAuthUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {allowSelfRegistration ? (
              <>
                Or{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:text-primary/90 transition-colors"
                >
                  create a new account
                </Link>
              </>
            ) : allowSelfRegistration === false ? (
              <>
                To create an account, please contact admin
              </>
            ) : (
              <>
                Or{' '}
                <span className="font-medium text-muted-foreground">
                  create a new account
                </span>
              </>
            )}
          </p>
        </div>

        {/* Verification Success Message */}
        {showVerificationSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Email verified successfully! You can now log in to your account.
          </div>
        )}

        {/* Password Reset Success Message */}
        {showResetSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Password reset successfully! You can now log in with your new password.
          </div>
        )}

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* Error message */}
          {error && (
            <div className="bg-destructive/15 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
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
          </div>

          {/* Remember me and forgot password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                {...register('rememberMe')}
                id="remember-me"
                name="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-ring border-input rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-primary hover:text-primary/90 transition-colors"
              >
                Forgot your password?
              </Link>
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
                Signing in...
              </div>
            ) : (
              'Sign in'
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

export default LoginPage;