import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { BackendAuthService } from '../../services/BackendAuthService';
import type { UserRole, User } from '../../types';

interface AuthContextType {
  currentUser: User | null;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  setCurrentUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('employee');
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!currentUser;

  // Sign in function
  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);

      const result = await BackendAuthService.login({ email, password });

      if (!result.success) {
        return { error: result.error || result.message };
      }

      if (result.user) {
        setCurrentUser(result.user as User);
        setCurrentUserRole(result.user.role);
      }

      return {};
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 === SIGN OUT PROCESS START ===');
      setIsLoading(true);

      // Clear local state immediately to ensure UI updates
      setCurrentUser(null);
      setCurrentUserRole('employee');

      // Sign out from backend (clears tokens)
      await BackendAuthService.logout();

      console.log('🚪 === SIGN OUT PROCESS END ===');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Clear state and loading on completion/error
      setCurrentUser(null);
      setCurrentUserRole('employee');
      setIsLoading(false);
    }
  };

  // Load user profile
  const loadUserProfile = useCallback(async (): Promise<void> => {
    try {
      const { user, error } = await BackendAuthService.getProfile();

      if (error) {
        console.error('Error loading user profile:', error);
        // If profile fetch fails, clear auth state
        setCurrentUser(null);
        setCurrentUserRole('employee');
        return;
      }

      if (user) {
        setCurrentUser(user);
        setCurrentUserRole(user.role);
      }
    } catch (error) {
      console.error('Exception in loadUserProfile:', error);
      setCurrentUser(null);
      setCurrentUserRole('employee');
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check if user has valid tokens
        if (BackendAuthService.isAuthenticated()) {
          // Try to refresh token if needed
          if (BackendAuthService.shouldRefreshToken()) {
            const refreshResult = await BackendAuthService.refreshToken();
            if (!refreshResult.success) {
              console.log('Token refresh failed, user needs to log in again');
              setIsLoading(false);
              return;
            }
          }

          // Load user profile
          await loadUserProfile();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }

      console.log('🔍 === BACKEND AUTH INITIALIZED ===');
    };

    // Initialize
    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [loadUserProfile]);

  const value: AuthContextType = {
    currentUser,
    currentUserRole,
    setCurrentUserRole,
    setCurrentUser,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};