export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'User' | 'Admin' | 'SuperAdmin';
  isEmailVerified: boolean;
  avatar?: string;
  lastLogin?: Date;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface OAuthProviders {
  google: {
    enabled: boolean;
    clientId: string;
    clientSecret?: string;
  };
  microsoft: {
    enabled: boolean;
    clientId: string;
    clientSecret?: string;
  };
  apple: {
    enabled: boolean;
    clientId: string;
    clientSecret?: string;
  };
}

export interface SystemSettings {
  id: string;
  allowSelfRegistration: boolean;
  allowedEmailDomains: string[];
  blockedEmailDomains: string[];
  requireEmailVerification: boolean;
  oauthProviders: OAuthProviders;
  maintenanceMode: boolean;
}

export type UserRole = 'User' | 'Admin' | 'SuperAdmin';

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState {
  isSubmitting: boolean;
  errors: ValidationError[];
  message: string;
}

export interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}