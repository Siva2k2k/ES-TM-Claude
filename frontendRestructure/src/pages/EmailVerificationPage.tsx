import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthService } from '../services/auth';
import { Button } from '../components/ui/Button';
import { toast } from '../hooks/useToast';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Mail, 
  ArrowLeft 
} from 'lucide-react';

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired' | 'invalid';

export default function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const hasVerified = useRef(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setMessage('No verification token provided');
      return;
    }

    // Prevent double verification calls
    if (hasVerified.current) {
      return;
    }

    hasVerified.current = true;
    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      setStatus('loading');
      console.log('Starting email verification for token:', verificationToken.substring(0, 10) + '...');
      const response = await AuthService.verifyEmail(verificationToken);
      
      if (response.success) {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        toast.success('Your account is now active. You can log in.', {
          title: 'Email Verified',
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login?verified=true');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(response.message || 'Email verification failed');
        
        // Check if token is expired
        if (response.message?.toLowerCase().includes('expired')) {
          setStatus('expired');
        }
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'An error occurred during verification');
      
      if (error.message?.toLowerCase().includes('expired')) {
        setStatus('expired');
      }
    }
  };

  const handleResendVerification = async () => {
    const email = prompt('Please enter your email address to resend verification:');
    if (!email) return;

    setIsResending(true);
    try {
      const response = await AuthService.resendVerificationEmail(email);
      
      if (response.success) {
        toast.success('Please check your inbox for a new verification email.', {
          title: 'Verification Email Sent',
        });
      } else {
        toast.error(response.message || 'Failed to resend verification email', {
          title: 'Error',
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred', {
        title: 'Error',
      });
    } finally {
      setIsResending(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
      case 'expired':
      case 'invalid':
        return <XCircle className="h-16 w-16 text-red-500" />;
      default:
        return <Mail className="h-16 w-16 text-blue-500" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying Email...';
      case 'success':
        return 'Email Verified!';
      case 'expired':
        return 'Verification Link Expired';
      case 'invalid':
        return 'Invalid Verification Link';
      case 'error':
      default:
        return 'Verification Failed';
    }
  };

  const getDescription = () => {
    switch (status) {
      case 'loading':
        return 'Please wait while we verify your email address...';
      case 'success':
        return 'Your email has been successfully verified. You will be redirected to the login page shortly.';
      case 'expired':
        return 'Your verification link has expired. Please request a new one.';
      case 'invalid':
        return 'The verification link is invalid or malformed.';
      case 'error':
      default:
        return message || 'There was an error verifying your email address.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {getStatusIcon()}
          <h2 className="mt-6 text-3xl font-bold text-foreground">
            {getTitle()}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {getDescription()}
          </p>
        </div>

        <div className="space-y-4">
          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Redirecting to login page in a few seconds...
              </p>
              <Button
                onClick={() => navigate('/login?verified=true')}
                className="w-full"
              >
                Go to Login Now
              </Button>
            </div>
          )}

          {(status === 'expired' || status === 'error') && (
            <div className="space-y-3">
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full"
                variant="outline"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </>
                )}
              </Button>
            </div>
          )}

          {status !== 'loading' && (
            <Button
              onClick={() => navigate('/login')}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          )}
        </div>

        {status === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm">
              <CheckCircle className="mr-2 h-4 w-4" />
              Account successfully activated
            </div>
          </div>
        )}

        {(status === 'expired' || status === 'invalid') && (
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-red-50 text-red-700 text-sm">
              <XCircle className="mr-2 h-4 w-4" />
              {status === 'expired' ? 'Link has expired' : 'Invalid verification link'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}