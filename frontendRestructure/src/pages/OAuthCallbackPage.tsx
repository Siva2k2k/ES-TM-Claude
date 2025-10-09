import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error } = useAuth();

  useEffect(() => {
    // Wait for auth context to finish processing OAuth callback
    if (!isLoading) {
      if (isAuthenticated) {
        // Successfully authenticated, redirect to dashboard
        navigate('/dashboard', { replace: true });
      } else if (error) {
        // Authentication failed, redirect to login with error
        navigate('/login?error=oauth_failed', { replace: true });
      } else {
        // No token found or other issue, redirect to login
        navigate('/login?error=oauth_callback_failed', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, error, navigate]);

  // Show loading while authentication is in progress
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}