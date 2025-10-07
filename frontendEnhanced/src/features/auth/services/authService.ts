/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  ResetPasswordConfirmRequest,
  UpdateProfileRequest,
  User,
} from '../types/auth.types';

/**
 * Authentication service class
 * Manages authentication state and API interactions
 */
export class AuthService {
  private static readonly baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
  private static readonly API_PREFIX = '/auth';

  /**
   * Get authorization headers with access token
   */
  private static getAuthHeaders(): Record<string, string> {
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
          error: result.error?.message || 'Registration failed',
        };
      }

      // Store tokens if registration successful
      if (result.tokens) {
        localStorage.setItem('accessToken', result.tokens.accessToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
      }

      return result;
    } catch (error) {
      console.error('[AuthService] Registration error:', error);
      return {
        success: false,
        message: 'Network error during registration',
        error: 'Network error during registration',
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
          error: result.error?.message || 'Login failed',
        };
      }

      // Store tokens if login successful
      if (result.tokens) {
        localStorage.setItem('accessToken', result.tokens.accessToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
      }

      return result;
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      return {
        success: false,
        message: 'Network error during login',
        error: 'Network error during login',
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      await fetch(`${this.baseURL}${this.API_PREFIX}/logout`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('[AuthService] Logout error:', error);
    } finally {
      // Always clear local storage
      this.clearTokens();
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
      console.error('[AuthService] Profile error:', error);
      return { error: 'Network error getting profile' };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: UpdateProfileRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}${this.API_PREFIX}/profile`, {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error?.message || 'Profile update failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Update profile error:', error);
      return { success: false, error: 'Network error during profile update' };
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
        this.clearTokens();
        return { success: false, error: result.error?.message || 'Token refresh failed' };
      }

      // Update tokens
      if (result.tokens) {
        localStorage.setItem('accessToken', result.tokens.accessToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Token refresh error:', error);
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
        return { success: false, error: result.error?.message || 'Password change failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Change password error:', error);
      return { success: false, error: 'Network error during password change' };
    }
  }

  /**
   * Request password reset
   */
  static async resetPassword(data: ResetPasswordRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}${this.API_PREFIX}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error?.message || 'Password reset request failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Reset password error:', error);
      return { success: false, error: 'Network error during password reset' };
    }
  }

  /**
   * Confirm password reset with token
   */
  static async confirmResetPassword(data: ResetPasswordConfirmRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}${this.API_PREFIX}/reset-password/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error?.message || 'Password reset confirmation failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('[AuthService] Confirm reset password error:', error);
      return { success: false, error: 'Network error during password reset confirmation' };
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
   * Check if token needs refresh
   */
  static shouldRefreshToken(): boolean {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;

      // Refresh if less than 5 minutes until expiry
      return timeUntilExpiry < 300;
    } catch {
      return false;
    }
  }

  /**
   * Clear stored tokens
   */
  static clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Decode JWT token payload
   */
  static decodeToken(token: string): Record<string, unknown> | null {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}
