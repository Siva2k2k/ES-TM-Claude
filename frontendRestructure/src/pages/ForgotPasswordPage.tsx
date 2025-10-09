import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { AuthService } from '../services/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { toast } from '../hooks/useToast';

interface ForgotPasswordForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>();

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);

    try {
      const response = await AuthService.forgotPassword(data.email);
      
      if (response.success) {
        setEmailSent(true);
        setSubmittedEmail(data.email);
        toast.success('Password reset email sent successfully');
      } else {
        toast.error(response.message || 'Failed to send reset email');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!submittedEmail) return;
    
    setIsLoading(true);
    try {
      const response = await AuthService.forgotPassword(submittedEmail);
      if (response.success) {
        toast.success('Password reset email resent successfully');
      } else {
        toast.error(response.message || 'Failed to resend reset email');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-6 text-3xl font-bold text-foreground">
              Check Your Email
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We've sent a password reset link to
            </p>
            <p className="text-sm font-medium text-foreground">{submittedEmail}</p>
          </div>

          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Didn't receive the email? Check your spam folder or</p>
            </div>
            
            <Button
              onClick={handleResend}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Resending...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="w-4 h-4" />
                  <span>Resend Email</span>
                </div>
              )}
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-primary hover:text-primary/90 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </Link>
            </div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm">
              <Mail className="mr-2 h-4 w-4" />
              Email sent successfully
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
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            Forgot Your Password?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No worries! Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
                className="pl-10"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address',
                  },
                })}
                error={errors.email?.message}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending Reset Link...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="w-4 h-4" />
                  <span>Send Reset Link</span>
                </div>
              )}
            </Button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-primary hover:text-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Link>
          </div>
        </form>

        {/* Additional help */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Remember your password?{' '}
            <Link to="/login" className="text-primary hover:text-primary/90">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}