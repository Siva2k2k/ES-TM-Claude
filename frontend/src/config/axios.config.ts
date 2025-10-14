/**
 * Axios Configuration
 * Centralized Axios instance with request/response interceptors
 * for authentication, error handling, and request/response transformation
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';

// API Base URL - uses proxy in development, direct in production
const API_BASE_URL = '/api/v1';

/**
 * Create Axios instance with default configuration
 */
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Automatically adds authentication token to all requests
 */
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');

    // Add token to headers if available
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`🔵 [API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('🔴 [API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles global error responses and token refresh
 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`🟢 [API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Log error in development
    if (import.meta.env.DEV) {
      console.error(`🔴 [API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');

        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.tokens;

          // Update stored token
          localStorage.setItem('accessToken', accessToken);

          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');

        // Redirect to login
        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action');
      // Optionally redirect to unauthorized page
      // window.location.href = '/unauthorized';
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      toast.error('Resource not found');
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      toast.error('Server error. Please try again later');
    }

    // Handle Network Errors
    if (!error.response) {
      toast.error('Network error. Please check your connection');
    }

    return Promise.reject(error);
  }
);

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Helper function to handle API errors consistently
 */
export const handleApiError = (error: unknown): { error: string } => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse>;

    // Extract error message from response
    const raw =
      axiosError.response?.data?.error ||
      axiosError.response?.data?.message ||
      axiosError.message ||
      'An unexpected error occurred';

    // Coerce non-string error payloads to a readable string
    let errorMessage: string;
    if (typeof raw === 'string') {
      errorMessage = raw;
    } else if (raw && typeof raw === 'object') {
      // Prefer nested message property if present
      // e.g., { message: 'Invalid email or password', stack: '...' }
      // Fallback to JSON string if needed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyRaw = raw as any;
      if (anyRaw.message && typeof anyRaw.message === 'string') {
        errorMessage = anyRaw.message;
      } else {
        try {
          errorMessage = JSON.stringify(raw);
        } catch {
          errorMessage = String(raw);
        }
      }
    } else {
      errorMessage = String(raw);
    }

    return { error: errorMessage };
  }

  if (error instanceof Error) {
    return { error: error.message };
  }

  return { error: 'An unexpected error occurred' };
};

/**
 * Export configured axios instance as default
 */
export default axiosInstance;
