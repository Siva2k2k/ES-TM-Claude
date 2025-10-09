import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { AuthService } from '../services/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { toast } from '../hooks/useToast';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordForm>();

  const password = watch('password');

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token');
      navigate('/forgot-password');
    }
  }, [token, navigate]);

  const validatePassword = (value: string) => {
    if (value.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(value)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }
    return true;
  };

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return;

    setIsLoading(true);

    try {
      const response = await AuthService.resetPassword(token, data.password);
      
      if (response.success) {
        setResetSuccess(true);
        toast.success('Password reset successfully');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login?reset=success');
        }, 3000);
      } else {
        toast.error(response.message || 'Failed to reset password');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center">
          <XCircle className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="mt-6 text-2xl font-bold text-foreground">Invalid Reset Link</h2>
          <p className="mt-2 text-muted-foreground">
            The password reset link is invalid or has expired.
          </p>
          <div className="mt-6">
            <Button onClick={() => navigate('/forgot-password')} variant="outline">
              Request New Reset Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="mt-6 text-2xl font-bold text-foreground">Password Reset Successfully!</h2>
          <p className="mt-2 text-muted-foreground">
            Your password has been updated. You can now log in with your new password.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Redirecting to login page...
          </p>
          <div className="mt-6">
            <Button onClick={() => navigate('/login?reset=success')}>
              Go to Login
            </Button>
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
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            Reset Your Password
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your new password below to complete the reset process.
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* New Password */}
          <div>
            <Label htmlFor="password">New Password</Label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Enter your new password"
                className="pl-10 pr-10"
                {...register('password', {
                  required: 'Password is required',
                  validate: validatePassword,
                })}
                error={errors.password?.message}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Eye className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirm your new password"
                className="pl-10 pr-10"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) =>
                    value === password || 'Passwords do not match',
                })}
                error={errors.confirmPassword?.message}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Eye className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            <p className="font-medium mb-1">Password Requirements:</p>
            <ul className="space-y-1">
              <li className="flex items-center">
                <span className={password && password.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}>
                  • At least 8 characters
                </span>
              </li>
              <li className="flex items-center">
                <span className={password && /(?=.*[a-z])/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
                  • One lowercase letter
                </span>
              </li>
              <li className="flex items-center">
                <span className={password && /(?=.*[A-Z])/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
                  • One uppercase letter
                </span>
              </li>
              <li className="flex items-center">
                <span className={password && /(?=.*\d)/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
                  • One number
                </span>
              </li>
              <li className="flex items-center">
                <span className={password && /(?=.*[@$!%*?&])/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
                  • One special character (@$!%*?&)
                </span>
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Resetting Password...</span>
                </div>
              ) : (
                'Reset Password'
              )}
            </Button>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center text-sm text-primary hover:text-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}