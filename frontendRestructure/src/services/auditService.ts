import { apiService } from './api';
import { ApiResponse, PaginatedResponse } from '../types';

export interface AuditLog {
  id: string;
  userId?: string | {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditStatistics {
  totalLogs: number;
  logsToday: number;
  logsThisWeek: number;
  logsThisMonth: number;
  topActions: Array<{ action: string; count: number }>;
  topResources: Array<{ resource: string; count: number }>;
  topUsers: Array<{ userId: string; count: number }>;
}

class AuditService {
  private readonly basePath = '/audit';

  async getAllLogs(filters: AuditLogFilters = {}): Promise<ApiResponse<{
    logs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = `${this.basePath}${queryString ? `?${queryString}` : ''}`;
    
    return apiService.get(url);
  }

  async getUserActivity(
    userId: string, 
    filters: Partial<AuditLogFilters> = {}
  ): Promise<ApiResponse<{
    logs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = `${this.basePath}/user/${userId}${queryString ? `?${queryString}` : ''}`;
    
    return apiService.get(url);
  }

  async getLogsByAction(
    action: string, 
    filters: Partial<AuditLogFilters> = {}
  ): Promise<ApiResponse<{
    logs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = `${this.basePath}/action/${action}${queryString ? `?${queryString}` : ''}`;
    
    return apiService.get(url);
  }

  async getLogsByResource(
    resource: string, 
    resourceId?: string,
    filters: Partial<AuditLogFilters> = {}
  ): Promise<ApiResponse<{
    logs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const baseUrl = resourceId 
      ? `${this.basePath}/resource/${resource}/${resourceId}`
      : `${this.basePath}/resource/${resource}`;
    const url = `${baseUrl}${queryString ? `?${queryString}` : ''}`;
    
    return apiService.get(url);
  }

  async getRecentActivity(limit: number = 100): Promise<ApiResponse<{
    logs: AuditLog[];
  }>> {
    return apiService.get(`${this.basePath}/recent?limit=${limit}`);
  }

  async getStatistics(): Promise<ApiResponse<{
    statistics: AuditStatistics;
  }>> {
    return apiService.get(`${this.basePath}/stats`);
  }

  async searchLogs(
    query: string, 
    filters: Partial<AuditLogFilters> = {}
  ): Promise<ApiResponse<{
    logs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = `${this.basePath}/search/${encodeURIComponent(query)}${queryString ? `?${queryString}` : ''}`;
    
    return apiService.get(url);
  }

  async getLogsInRange(
    startDate: string,
    endDate: string,
    filters: Partial<AuditLogFilters> = {}
  ): Promise<ApiResponse<{
    logs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = `${this.basePath}/range${queryString ? `?${queryString}` : ''}`;
    
    return apiService.post(url, { startDate, endDate });
  }

  async deleteOldLogs(olderThanDays: number = 90): Promise<ApiResponse<{
    deletedCount: number;
  }>> {
    return apiService.delete(`${this.basePath}/cleanup`, {
      data: { olderThanDays }
    });
  }

  // Helper methods for formatting
  formatAction(action: string): string {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  getActionColor(action: string): string {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('login') || actionLower.includes('register')) {
      return 'text-green-600 bg-green-50';
    }
    if (actionLower.includes('logout')) {
      return 'text-blue-600 bg-blue-50';
    }
    if (actionLower.includes('delete') || actionLower.includes('remove')) {
      return 'text-red-600 bg-red-50';
    }
    if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('change')) {
      return 'text-orange-600 bg-orange-50';
    }
    if (actionLower.includes('create') || actionLower.includes('add')) {
      return 'text-purple-600 bg-purple-50';
    }
    if (actionLower.includes('view') || actionLower.includes('access')) {
      return 'text-gray-600 bg-gray-50';
    }
    
    return 'text-blue-600 bg-blue-50';
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  formatRelativeTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }
}

export const auditService = new AuditService();
export default auditService;