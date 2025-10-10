import type { User, UserRole } from '../types';
import axiosInstance, { handleApiError } from '../config/axios.config';
import type { AxiosResponse } from 'axios';

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

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

/**
 * Backend authentication service - replaces Supabase auth
 * Now uses Axios with interceptors for consistent error handling
 */
export class BackendAuthService {
  private static readonly API_PREFIX = '/auth';

  /**
   * Register a new user
   */
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await axiosInstance.post(
        `${this.API_PREFIX}/register`,
        data
      );

      const result = response.data;

      // Store tokens if registration successful
      if (result.success && result.tokens) {
        localStorage.setItem('accessToken', result.tokens.accessToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
      }

      return result;
    } catch (error) {
      console.error('Registration error:', error);
      const { error: errorMessage } = handleApiError(error);
      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await axiosInstance.post(
        `${this.API_PREFIX}/login`,
        data
      );

      const result = response.data;

      // Store tokens if login successful
      if (result.success && result.tokens) {
        localStorage.setItem('accessToken', result.tokens.accessToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      const { error: errorMessage } = handleApiError(error);
      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      // Call backend logout endpoint (which may blacklist tokens)
      await axiosInstance.post(`${this.API_PREFIX}/logout`);
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
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
      const response: AxiosResponse<{ user: User }> = await axiosInstance.get(
        `${this.API_PREFIX}/profile`
      );

      return { user: response.data.user };
    } catch (error) {
      console.error('Profile error:', error);
      const { error: errorMessage } = handleApiError(error);
      return { error: errorMessage };
    }
  }

  /**
   * Refresh access token
   * Note: Token refresh is handled automatically by axios interceptor
   * This method is here for manual refresh if needed
   */
  static async refreshToken(): Promise<{ success: boolean; error?: string }> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }

      const response: AxiosResponse<{ tokens: { accessToken: string; refreshToken: string } }> =
        await axiosInstance.post(`${this.API_PREFIX}/refresh`, { refreshToken });

      const result = response.data;

      // Update tokens
      if (result.tokens) {
        localStorage.setItem('accessToken', result.tokens.accessToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
      }

      return { success: true };
    } catch (error) {
      console.error('Token refresh error:', error);
      const { error: errorMessage } = handleApiError(error);

      // Clear tokens on refresh failure
      this.clearTokens();

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Change password (for logged-in users)
   */
  static async changePassword(
    data: ChangePasswordRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await axiosInstance.post(`${this.API_PREFIX}/change-password`, data);
      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      const { error: errorMessage } = handleApiError(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Request password reset (forgot password)
   */
  static async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response: AxiosResponse<{ success: boolean; message: string }> =
        await axiosInstance.post(`${this.API_PREFIX}/forgot-password`, data);

      return {
        success: response.data.success,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      const { error: errorMessage } = handleApiError(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(
    data: ResetPasswordRequest
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response: AxiosResponse<{ success: boolean; message: string }> =
        await axiosInstance.post(`${this.API_PREFIX}/reset-password`, data);

      return {
        success: response.data.success,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Reset password error:', error);
      const { error: errorMessage } = handleApiError(error);
      return {
        success: false,
        error: errorMessage,
      };
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
   * Check if token needs refresh (checks JWT expiration)
   */
  static shouldRefreshToken(): boolean {
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!token || !refreshToken) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      // Refresh if token expires within 5 minutes
      const fiveMinutes = 5 * 60;
      return payload.exp && payload.exp - currentTime < fiveMinutes;
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
    localStorage.removeItem('currentUser');
  }
}
