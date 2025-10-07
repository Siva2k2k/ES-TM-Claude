/**
 * useAuth Hook
 * Custom hook for authentication state management
 */

import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/authService';
import type {
  AuthContextType,
  User,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '../types/auth.types';

/**
 * Custom hook for managing authentication state
 * Complexity: 8 (within acceptable range)
 */
export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  /**
   * Load user profile from backend
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const { user: fetchedUser, error: profileError } = await AuthService.getProfile();

      if (profileError) {
        console.error('[useAuth] Error loading user profile:', profileError);
        setUser(null);
        setError(profileError);
        return;
      }

      if (fetchedUser) {
        setUser(fetchedUser);
        setError(null);
      }
    } catch (err) {
      console.error('[useAuth] Exception in refreshUser:', err);
      setUser(null);
      setError('Failed to load user profile');
    }
  }, []);

  /**
   * Sign in user
   */
  const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await AuthService.login({ email, password });

      if (!result.success) {
        const errorMsg = result.error || result.message;
        setError(errorMsg);
        return { error: errorMsg };
      }

      if (result.user) {
        setUser(result.user);
      }

      return {};
    } catch (err) {
      console.error('[useAuth] Unexpected sign in error:', err);
      const errorMsg = 'An unexpected error occurred';
      setError(errorMsg);
      return { error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sign out user
   */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Clear local state immediately
      setUser(null);
      setError(null);

      // Call backend logout
      await AuthService.logout();
    } catch (err) {
      console.error('[useAuth] Sign out error:', err);
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (data: RegisterRequest): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await AuthService.register(data);

      if (!result.success) {
        const errorMsg = result.error || result.message;
        setError(errorMsg);
        return { error: errorMsg };
      }

      if (result.user) {
        setUser(result.user);
      }

      return {};
    } catch (err) {
      console.error('[useAuth] Unexpected registration error:', err);
      const errorMsg = 'An unexpected error occurred';
      setError(errorMsg);
      return { error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data: UpdateProfileRequest): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await AuthService.updateProfile(data);

      if (!result.success) {
        const errorMsg = result.error || 'Profile update failed';
        setError(errorMsg);
        return { error: errorMsg };
      }

      // Refresh user data after successful update
      await refreshUser();

      return {};
    } catch (err) {
      console.error('[useAuth] Unexpected profile update error:', err);
      const errorMsg = 'An unexpected error occurred';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, [refreshUser]);

  /**
   * Change password
   */
  const changePassword = useCallback(async (data: ChangePasswordRequest): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await AuthService.changePassword(data);

      if (!result.success) {
        const errorMsg = result.error || 'Password change failed';
        setError(errorMsg);
        return { error: errorMsg };
      }

      return {};
    } catch (err) {
      console.error('[useAuth] Unexpected password change error:', err);
      const errorMsg = 'An unexpected error occurred';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  /**
   * Request password reset
   */
  const resetPassword = useCallback(async (email: string): Promise<{ error?: string }> => {
    try {
      setError(null);

      const result = await AuthService.resetPassword({ email });

      if (!result.success) {
        const errorMsg = result.error || 'Password reset request failed';
        setError(errorMsg);
        return { error: errorMsg };
      }

      return {};
    } catch (err) {
      console.error('[useAuth] Unexpected password reset error:', err);
      const errorMsg = 'An unexpected error occurred';
      setError(errorMsg);
      return { error: errorMsg };
    }
  }, []);

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check if user has valid tokens
        if (AuthService.isAuthenticated()) {
          // Try to refresh token if needed
          if (AuthService.shouldRefreshToken()) {
            const refreshResult = await AuthService.refreshToken();
            if (!refreshResult.success) {
              console.log('[useAuth] Token refresh failed, user needs to log in again');
              setIsLoading(false);
              return;
            }
          }

          // Load user profile
          await refreshUser();
        }
      } catch (err) {
        console.error('[useAuth] Error initializing auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    signIn,
    signOut,
    register,
    updateProfile,
    changePassword,
    resetPassword,
    refreshUser,
  };
};
