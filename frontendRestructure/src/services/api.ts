import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse } from '../types';

class ApiService {
  private api: AxiosInstance;
  private refreshing = false;
  private refreshQueue: Array<(token: string) => void> = [];
  private isClearing = false;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Check if password was just reset - if so, don't try to refresh tokens
        const passwordResetJustCompleted = localStorage.getItem('passwordResetJustCompleted');
        console.log('🔍 Checking password reset flag:', passwordResetJustCompleted);

        console.log('🚨 API Error:', {
          status: error.response?.status,
          url: originalRequest?.url,
          method: originalRequest?.method,
          retry: originalRequest._retry,
          clearing: this.isClearing,
          hasToken: !!localStorage.getItem('accessToken'),
          passwordResetFlag: !!passwordResetJustCompleted,
          passwordResetFlagValue: passwordResetJustCompleted,
          errorMessage: error.response?.data?.message,
          errorData: error.response?.data,
          allLocalStorageKeys: Object.keys(localStorage)
        });

        // If password was just reset, don't do any token refresh logic at all
        if (passwordResetJustCompleted) {
          console.log('🔄 Password reset flag detected, skipping token refresh for 401 error');
          return Promise.reject(error);
        }

        // For login requests, never try to refresh tokens - just fail immediately
        if (originalRequest?.url?.includes('/auth/login')) {
          console.log('🔐 Login request failed, not attempting token refresh');
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry && !this.isClearing) {
          if (this.refreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve) => {
              this.refreshQueue.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.api(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.refreshing = true;

          console.log('🔄 Attempting token refresh...');

          try {
            const response = await this.api.post('/auth/refresh-token');
            const { accessToken } = response.data.data;
            console.log('✅ Token refresh successful');
            
            localStorage.setItem('accessToken', accessToken);
            
            // Process queued requests
            this.refreshQueue.forEach((callback) => callback(accessToken));
            this.refreshQueue = [];
            
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            console.log('❌ Token refresh failed:', (refreshError as AxiosError)?.response?.status, (refreshError as AxiosError)?.response?.data);
            // Refresh failed, redirect to login
            localStorage.removeItem('accessToken');
            this.refreshQueue = [];
            
            // Dispatch logout event only if not clearing
            if (!this.isClearing) {
              console.log('📢 Dispatching logout event from refresh failure...');
              window.dispatchEvent(new CustomEvent('auth:logout'));
            }
            
            return Promise.reject(refreshError);
          } finally {
            this.refreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  private async request<T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.request(config);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw {
        success: false,
        message: error.message || 'Network error occurred',
        error: error.code,
      };
    }
  }

  // HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // File upload
  async uploadFile<T = any>(url: string, file: File, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<T>({
      ...config,
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Set auth token manually
  setAuthToken(token: string | null): void {
    if (token) {
      localStorage.setItem('accessToken', token);
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('accessToken');
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  // Get current auth token
  getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // Clear auth token
  clearAuthToken(): void {
    this.isClearing = true;
    localStorage.removeItem('accessToken');
    delete this.api.defaults.headers.common['Authorization'];
    // Reset the clearing flag after a short delay
    setTimeout(() => {
      this.isClearing = false;
    }, 100);
  }
}

export const apiService = new ApiService();
export default apiService;