/**
 * Authentication Types
 * Type definitions for authentication feature
 */

import { UserRole } from '../../../types/common.types';

/**
 * User interface - matches backend User model
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_approved_by_super_admin: boolean;
  hourly_rate?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication response from backend
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  tokens?: AuthTokens;
  error?: string;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Registration request payload
 */
export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
}

/**
 * Change password request payload
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Reset password request payload
 */
export interface ResetPasswordRequest {
  email: string;
}

/**
 * Reset password confirmation payload
 */
export interface ResetPasswordConfirmRequest {
  token: string;
  newPassword: string;
}

/**
 * Profile update request payload
 */
export interface UpdateProfileRequest {
  full_name?: string;
  hourly_rate?: number;
}

/**
 * Authentication state
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Authentication context type
 */
export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  register: (data: RegisterRequest) => Promise<{ error?: string }>;
  updateProfile: (data: UpdateProfileRequest) => Promise<{ error?: string }>;
  changePassword: (data: ChangePasswordRequest) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshUser: () => Promise<void>;
}
