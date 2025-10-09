import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, User, LoginCredentials, RegisterCredentials } from '../types';
import AuthService from '../services/auth';

// Auth Actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; accessToken: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean };

// Auth Context Type
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
  error: string | null;
}

// Initial State
const initialState: AuthState = {
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,
};

// Auth Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [error, setError] = React.useState<string | null>(null);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle authentication errors
  const handleError = (error: any) => {
    const message = error?.message || 'An error occurred';
    setError(message);
    dispatch({ type: 'AUTH_FAILURE', payload: message });
  };

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Check for OAuth callback
      if (window.location.pathname === '/oauth/callback') {
        try {
          const token = AuthService.handleOAuthCallback();
          if (token) {
            const userResponse = await AuthService.getCurrentUser();
            if (userResponse.success && userResponse.data) {
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: {
                  user: userResponse.data.user,
                  accessToken: token,
                },
              });
              return;
            }
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          handleError(error);
          return;
        }
      }

      // Check if password was just reset - if so, skip auth attempts
      const passwordResetJustCompleted = localStorage.getItem('passwordResetJustCompleted');
      if (passwordResetJustCompleted) {
        console.log('🔄 Password was just reset, skipping auth initialization');
        localStorage.removeItem('passwordResetJustCompleted');
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Check for existing auth token
      if (AuthService.isAuthenticated()) {
        try {
          console.log('🔍 Found existing token, verifying with server...');
          const response = await AuthService.getCurrentUser();
          if (response.success && response.data) {
            console.log('✅ Token valid, user authenticated');
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                user: response.data.user,
                accessToken: localStorage.getItem('accessToken') || '',
              },
            });
          } else {
            console.log('❌ Token invalid, logging out');
            dispatch({ type: 'LOGOUT' });
          }
        } catch (error) {
          console.error('Failed to get current user:', error);
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        console.log('📭 No existing token found');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();

    // Listen for logout events from API service
    const handleLogout = () => {
      dispatch({ type: 'LOGOUT' });
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials) => {
    try {
      console.log('🔐 Starting login process...', { email: credentials.email });
      dispatch({ type: 'AUTH_START' });
      const response = await AuthService.login(credentials);
      console.log('Login response:', response);
      
      if (response.success && response.data) {
        // Clear the password reset flag on successful login
        localStorage.removeItem('passwordResetJustCompleted');
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: response.data.user,
            accessToken: response.data.accessToken,
          },
        });
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.log('❌ AuthContext login error:', error);
      handleError(error);
      throw error;
    }
  };

  // Register function
  const register = async (credentials: RegisterCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await AuthService.register(credentials);
      
      if (response.success) {
        dispatch({ type: 'SET_LOADING', payload: false });
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Verify email function
  const verifyEmail = async (token: string) => {
    try {
      const response = await AuthService.verifyEmail(token);
      if (!response.success) {
        throw new Error(response.message || 'Email verification failed');
      }
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  // Resend verification email
  const resendVerificationEmail = async (email: string) => {
    try {
      const response = await AuthService.resendVerificationEmail(email);
      if (!response.success) {
        throw new Error(response.message || 'Failed to resend verification email');
      }
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  // Forgot password
  const forgotPassword = async (email: string) => {
    try {
      const response = await AuthService.forgotPassword(email);
      if (!response.success) {
        throw new Error(response.message || 'Failed to send reset email');
      }
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (token: string, password: string) => {
    try {
      const response = await AuthService.resetPassword(token, password);
      if (!response.success) {
        throw new Error(response.message || 'Password reset failed');
      }
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  // Change password
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await AuthService.changePassword(currentPassword, newPassword);
      if (!response.success) {
        throw new Error(response.message || 'Password change failed');
      }
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const response = await AuthService.getCurrentUser();
      if (response.success && response.data) {
        dispatch({ type: 'UPDATE_USER', payload: response.data.user });
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  // Check user role
  const hasRole = (roles: string[]): boolean => {
    return state.user ? roles.includes(state.user.role) : false;
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    changePassword,
    refreshUser,
    hasRole,
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;