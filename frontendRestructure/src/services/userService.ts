import { apiService } from './api';
import { User, ApiResponse, PaginatedResponse } from '../types';

export interface UserCreateData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'User' | 'Admin' | 'SuperAdmin';
  password: string;
  isActive?: boolean;
}

export interface UserUpdateData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'User' | 'Admin' | 'SuperAdmin';
  password?: string;
  isActive?: boolean;
}

export interface ProfileUpdateData {
  firstName: string;
  lastName: string;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface UserWithStatus extends User {
  isActive: boolean;
}

export const userService = {
  // Get all users with pagination and filtering
  async getUsers(params?: UserQueryParams): Promise<PaginatedResponse<UserWithStatus>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiService.get(`/admin/users?${queryParams.toString()}`);
    console.log('User Service Response:', response);
    return response as any;
  },

  // Get a single user by ID
  async getUser(userId: string): Promise<ApiResponse<UserWithStatus>> {
    const response = await apiService.get(`/users/${userId}`);
    return response;
  },

  // Create a new user
  async createUser(userData: UserCreateData): Promise<ApiResponse<UserWithStatus>> {
    const response = await apiService.post('/admin/users', userData);
    return response;
  },

  // Update an existing user
  async updateUser(userId: string, userData: UserUpdateData): Promise<ApiResponse<UserWithStatus>> {
    const response = await apiService.put(`/users/${userId}`, userData);
    return response;
  },

  // Delete a user
  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    const response = await apiService.delete(`/admin/users/${userId}`);
    return response;
  },

  // Activate/Deactivate a user
  async toggleUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<UserWithStatus>> {
    const response = await apiService.patch(`/admin/users/${userId}/status`, { isActive });
    return response;
  },

  // Reset user password
  async resetUserPassword(userId: string, newPassword: string): Promise<ApiResponse<void>> {
    const response = await apiService.patch(`/admin/users/${userId}/password`, { password: newPassword });
    return response;
  },

  // Send email verification
  async sendEmailVerification(userId: string): Promise<ApiResponse<void>> {
    const response = await apiService.post(`/admin/users/${userId}/send-verification`);
    return response;
  },

  // Get user activity/audit logs
  async getUserActivity(userId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<any>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiService.get(`/admin/users/${userId}/activity?${queryParams.toString()}`);
    return response as any;
  },

  // Bulk operations
  async bulkUpdateUsers(userIds: string[], updates: UserUpdateData): Promise<ApiResponse<void>> {
    const response = await apiService.patch('/admin/users/bulk', { userIds, updates });
    return response;
  },

  async bulkDeleteUsers(userIds: string[]): Promise<ApiResponse<void>> {
    const response = await apiService.delete('/admin/users/bulk', { data: { userIds } });
    return response;
  },

  // Export users
  async exportUsers(format: 'csv' | 'xlsx' = 'csv', filters?: UserQueryParams): Promise<Blob> {
    const queryParams = new URLSearchParams();
    queryParams.append('format', format);
    
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.role) queryParams.append('role', filters.role);
    if (filters?.status) queryParams.append('status', filters.status);

    // Note: This would need special handling for blob responses
    throw new Error('Export functionality not yet implemented');
  },

  // Profile management for current user
  async updateProfile(profileData: ProfileUpdateData): Promise<ApiResponse<UserWithStatus>> {
    const response = await apiService.put('/auth/profile', profileData);
    return response;
  },

  async changePassword(currentPassword: string, newPassword: string, confirmPassword?: string): Promise<ApiResponse<void>> {
    const response = await apiService.put('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword: confirmPassword || newPassword
    });
    return response;
  },

  // Upload profile avatar
  async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    const response = await apiService.uploadFile('/auth/profile/avatar', file);
    return response;
  },
};