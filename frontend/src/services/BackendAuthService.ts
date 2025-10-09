import type { User, UserRole } from '../types';

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
    is_approved_by_super_admin: boolean;
    hourly_rate?: number;
    created_at?: string;
    updated_at?: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Backend authentication service - replaces Supabase auth
 */
export class BackendAuthService {
  private static readonly baseURL = '/api/v1'; // Always use proxy in development and production
  private static readonly API_PREFIX = '/auth';

  private static getAuthHeaders(): { [key: string]: string } {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /**
   * Register a new user
   */
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseURL}${this.API_PREFIX}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.error?.message || 'Registration failed',
          error: result.error?.message || 'Registration failed'
        };
      }

      // Store tokens if registration successful
      if (result.tokens) {
        localStorage.setItem('accessToken', result.tokens.accessToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
      }

      return result;
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Network error during registration',
        error: 'Network error during registration'
      };
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseURL}${this.API_PREFIX}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.error?.message || 'Login failed',
          error: result.error?.message || 'Login failed'
        };
      }

      // Store tokens if login successful
      if (result.tokens) {
        localStorage.setItem('accessToken', result.tokens.accessToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Network error during login',
        error: 'Network error during login'
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      // Call backend logout endpoint (which may blacklist tokens in the future)
      await fetch(`${this.baseURL}${this.API_PREFIX}/logout`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<{ user?: User; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}${this.API_PREFIX}/profile`, {
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error?.message || 'Failed to get profile' };
      }

      return { user: result.user as User };
    } catch (error) {
      console.error('Profile error:', error);
      return { error: 'Network error getting profile' };
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(): Promise<{ success: boolean; error?: string }> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }

      const response = await fetch(`${this.baseURL}${this.API_PREFIX}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Refresh token is invalid, clear storage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return { success: false, error: result.error?.message || 'Token refresh failed' };
      }

      // Update tokens
      if (result.tokens) {
        localStorage.setItem('accessToken', result.tokens.accessToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
      }

      return { success: true };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, error: 'Network error during token refresh' };
    }
  }

  /**
   * Change password
   */
  static async changePassword(data: ChangePasswordRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}${this.API_PREFIX}/change-password`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Password change error details:', { status: response.status, result });
        
        // Enhanced error handling to extract the exact backend message
        let errorMessage = 'Password change failed';
        
        // Handle different error response formats from backend
        if (result.message) {
          // Direct message from backend (most common case)
          errorMessage = result.message;
        } else if (result.error) {
          if (typeof result.error === 'string') {
            errorMessage = result.error;
          } else if (result.error.message) {
            errorMessage = result.error.message;
          }
        } else if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          // Handle validation error arrays
          errorMessage = result.errors.map((err: { message?: string } | string) => 
            typeof err === 'string' ? err : (err.message || 'Validation error')
          ).join(', ');
        }
        
        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Network error during password change' };
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;
    
    try {
      // Simple JWT expiration check
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // If token is expired, clear it and return false
      if (payload.exp && payload.exp < currentTime) {
        this.clearTokens();
        return false;
      }
      
      return true;
    } catch {
      // If token is malformed, clear it
      this.clearTokens();
      return false;
    }
  }

  /**
   * Get access token
   */
  static getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Check if token needs refresh (simple check - in production would decode JWT)
   */
  static shouldRefreshToken(): boolean {
    // In a real implementation, decode JWT and check exp claim
    // For now, always attempt refresh if we have a refresh token
    return !!localStorage.getItem('refreshToken');
    
  }

  /**
   * Clear stored tokens
   */
  static clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}