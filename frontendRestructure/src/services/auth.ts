import { LoginCredentials, RegisterCredentials, User, OAuthProviders, ApiResponse } from '../types';
import apiService from './api';

export class AuthService {
  // Login with email and password
  static async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; accessToken: string }>> {
    console.log('🔍 AuthService.login called with:', { email: credentials.email });
    
    try {
      const response = await apiService.post('/auth/login', credentials);
      console.log('✅ Login API response:', response);
      
      if (response.success && response.data?.accessToken) {
        apiService.setAuthToken(response.data.accessToken);
      }
      
      return response;
    } catch (error) {
      console.log('❌ Login API error:', error);
      throw error;
    }
  }

  // Register new user
  static async register(credentials: RegisterCredentials): Promise<ApiResponse<{ user: User }>> {
    return await apiService.post('/auth/register', credentials);
  }

  // Logout user
  static async logout(): Promise<ApiResponse> {
    try {
      const response = await apiService.post('/auth/logout');
      return response;
    } finally {
      // Always clear local auth data
      apiService.clearAuthToken();
    }
  }

  // Get current user profile
  static async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return await apiService.get('/auth/me');
  }

  // Refresh access token
  static async refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
    const response = await apiService.post('/auth/refresh-token');
    
    if (response.success && response.data?.accessToken) {
      apiService.setAuthToken(response.data.accessToken);
    }
    
    return response;
  }

  // Verify email
  static async verifyEmail(token: string): Promise<ApiResponse> {
    return await apiService.post('/auth/verify-email', { token });
  }

  // Resend verification email
  static async resendVerificationEmail(email: string): Promise<ApiResponse> {
    return await apiService.post('/auth/resend-verification', { email });
  }

  // Forgot password
  static async forgotPassword(email: string): Promise<ApiResponse> {
    return await apiService.post('/auth/forgot-password', { email });
  }

  // Reset password
  static async resetPassword(token: string, password: string): Promise<ApiResponse> {
    console.log('🔐 Starting password reset...');
    const response = await apiService.post('/auth/reset-password', { token, password });
    
    // If password reset is successful, clear any existing tokens
    // since the server invalidates all refresh tokens after password reset
    if (response.success) {
      console.log('✅ Password reset successful, clearing all auth data...');
      
      // Set a flag to indicate password was just reset
      localStorage.setItem('passwordResetJustCompleted', 'true');
      
      // Clear local auth data without making API call since tokens are already revoked
      console.log('🧹 Clearing localStorage and headers...');
      apiService.clearAuthToken();
      
      // Clear refresh token cookie by making a request to clear it
      // This is necessary because HTTP-only cookies cannot be cleared from JavaScript
      try {
        console.log('🍪 Clearing cookies...');
        await apiService.post('/auth/clear-cookies');
        console.log('✅ Cookies cleared successfully');
      } catch (error) {
        // Ignore errors if clearing fails
        console.log('❌ Cookie clearing request failed:', error);
      }
      
      // Dispatch logout event to update auth context
      console.log('📢 Dispatching logout event...');
      window.dispatchEvent(new CustomEvent('auth:logout'));
      console.log('🏁 Password reset cleanup complete');
    }
    
    return response;
  }

  // Change password
  static async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return await apiService.put('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword: newPassword,
    });
  }

  // Get OAuth providers
  static async getOAuthProviders(): Promise<ApiResponse<{ providers: OAuthProviders }>> {
    return await apiService.get('/auth/oauth/providers');
  }

  // Get registration settings
  static async getRegistrationSettings(): Promise<ApiResponse<{ allowSelfRegistration: boolean }>> {
    return await apiService.get('/auth/registration-settings');
  }

  // OAuth login URL generators
  static getGoogleOAuthUrl(): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    return `${baseUrl}/auth/google`;
  }

  static getMicrosoftOAuthUrl(): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    return `${baseUrl}/auth/microsoft`;
  }

  static getAppleOAuthUrl(): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    return `${baseUrl}/auth/apple`;
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    // If password was just reset, consider user as not authenticated
    if (localStorage.getItem('passwordResetJustCompleted')) {
      return false;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return false;

    try {
      // Basic JWT expiration check (decode without verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  // Get user role from token
  static getUserRole(): string | null {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || null;
    } catch {
      return null;
    }
  }

  // Check if user has required role
  static hasRole(requiredRoles: string[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? requiredRoles.includes(userRole) : false;
  }

  // Handle OAuth callback
  static handleOAuthCallback(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (error) {
      throw new Error(`OAuth authentication failed: ${error}`);
    }

    if (token) {
      apiService.setAuthToken(token);
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      return token;
    }

    return null;
  }
}

export default AuthService;