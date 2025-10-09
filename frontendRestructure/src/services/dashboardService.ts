import { apiService } from './api';
import { ApiResponse } from '../types';

// Role-based analytics interfaces
export interface UserAnalytics {
  period: string;
  profile: {
    status: string;
    accountType: string;
    memberSince: string;
    lastActive: string;
  };
}

export interface AdminAnalytics {
  period: string;
  users: {
    totalUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    usersByRole: Record<string, number>;
    total: number;
    active: number;
    inactive: number;
    deleted: number;
    unverified: number;
  };
  system: {
    totalLogs: number;
    logsToday: number;
    logsThisWeek: number;
    logsThisMonth: number;
    topActions: Array<{ action: string; count: number }>;
    maintenanceMode: boolean;
    selfRegistrationEnabled: boolean;
    emailVerificationRequired: boolean;
  };
  recentActivity: Array<{
    id?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    timestamp: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }>;
}

export interface SuperAdminAnalytics extends AdminAnalytics {
  system: AdminAnalytics['system'] & {
    topResources: Array<{ resource: string; count: number }>;
    topUsers: Array<{ userId: string; count: number }>;
    oauthProviders: {
      google: boolean;
      microsoft: boolean;
      apple: boolean;
    };
  };
}

export type DashboardStats = UserAnalytics | AdminAnalytics | SuperAdminAnalytics;

export interface AnalyticsSummary {
  canViewUserStats: boolean;
  canViewSystemStats: boolean;
  canViewAuditLogs: boolean;
  canViewOAuthSettings: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
  avatar?: string;
  lastLogin?: string;
  createdAt: string;
}

class DashboardService {
  // Get dashboard analytics data based on user role
  async getDashboardData(period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<ApiResponse<DashboardStats>> {
    // Use the new general analytics endpoint that handles role-based access
    return apiService.get(`/analytics?period=${period}`);
  }

  // Get analytics summary for current user
  async getAnalyticsSummary(): Promise<ApiResponse<AnalyticsSummary>> {
    return apiService.get('/analytics/summary');
  }

  // Get admin-specific analytics (for backward compatibility)
  async getAdminAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<ApiResponse<AdminAnalytics | SuperAdminAnalytics>> {
    return apiService.get(`/admin/analytics?period=${period}`);
  }

  // Get current user profile data
  async getUserProfile(): Promise<ApiResponse<{ user: UserProfile }>> {
    return apiService.get('/auth/me');
  }

  // Get recent audit logs for user dashboard (Admin+ only)
  async getRecentActivity(limit: number = 10): Promise<ApiResponse<any>> {
    return apiService.get(`/admin/audit-logs?limit=${limit}&page=1`);
  }

  // Type guard functions
  isUserAnalytics(data: DashboardStats): data is UserAnalytics {
    return 'profile' in data;
  }

  isAdminAnalytics(data: DashboardStats): data is AdminAnalytics {
    return 'users' in data && 'system' in data && !('oauthProviders' in (data as any).system);
  }

  isSuperAdminAnalytics(data: DashboardStats): data is SuperAdminAnalytics {
    return 'users' in data && 'system' in data && 'oauthProviders' in (data as any).system;
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;