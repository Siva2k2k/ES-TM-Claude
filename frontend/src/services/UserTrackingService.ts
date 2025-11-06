import { backendApi, BackendApiError } from '../lib/backendApi';
import type {
  DashboardOverview,
  UserAnalytics,
  TeamRankingItem,
  ProjectPerformance,
  UserTrackingFilters,
  UserTrackingDashboardResponse,
  UtilizationTrendItem,
  AggregationRequest,
  AggregationResponse
} from '../types/userTracking';

export class UserTrackingService {

  /**
   * Get dashboard overview
   */
  async getDashboardOverview(filters: { weeks?: number } = {}): Promise<DashboardOverview> {
    try {
      const response = await backendApi.get<{ success: boolean; data: DashboardOverview }>(
        '/user-tracking/dashboard',
        { params: filters }
      );
      return response.data;
    } catch (error) {
      console.error('Error in getDashboardOverview:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch dashboard overview';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get user list with performance summary
   */
  async getUserList(filters: UserTrackingFilters = {}): Promise<UserTrackingDashboardResponse> {
    try {
      const response = await backendApi.get<{ success: boolean; data: UserTrackingDashboardResponse }>(
        '/user-tracking/users',
        { params: filters }
      );
      return response.data;
    } catch (error) {
      console.error('Error in getUserList:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch user list';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get detailed user analytics
   */
  async getUserAnalytics(userId: string, filters: { weeks?: number } = {}): Promise<UserAnalytics> {
    try {
      const response = await backendApi.get<{ success: boolean; data: UserAnalytics }>(
        `/user-tracking/users/${userId}/analytics`,
        { params: filters }
      );
      return response.data;
    } catch (error) {
      console.error('Error in getUserAnalytics:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch user analytics';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get utilization trends for a user
   */
  async getUtilizationTrends(userId: string, filters: { weeks?: number } = {}): Promise<UtilizationTrendItem[]> {
    try {
      const response = await backendApi.get<{ success: boolean; data: UtilizationTrendItem[] }>(
        `/user-tracking/users/${userId}/trends`,
        { params: filters }
      );
      return response.data;
    } catch (error) {
      console.error('Error in getUtilizationTrends:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch utilization trends';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get team performance ranking
   */
  async getTeamRanking(filters: { weeks?: number } = {}): Promise<TeamRankingItem[]> {
    try {
      const response = await backendApi.get<{ success: boolean; data: TeamRankingItem[] }>(
        '/user-tracking/team/ranking',
        { params: filters }
      );
      return response.data;
    } catch (error) {
      console.error('Error in getTeamRanking:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch team ranking';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get project performance breakdown
   */
  async getProjectPerformance(filters: UserTrackingFilters = {}): Promise<ProjectPerformance[]> {
    try {
      const response = await backendApi.get<{ success: boolean; data: ProjectPerformance[] }>(
        '/user-tracking/projects/performance',
        { params: filters }
      );
      return response.data;
    } catch (error) {
      console.error('Error in getProjectPerformance:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch project performance';
      throw new Error(errorMessage);
    }
  }

  /**
   * Trigger aggregation for specific timesheet or user
   */
  async triggerAggregation(data: AggregationRequest): Promise<AggregationResponse> {
    try {
      const response = await backendApi.post<{ success: boolean; data: AggregationResponse }>(
        '/user-tracking/aggregate',
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error in triggerAggregation:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to trigger aggregation';
      throw new Error(errorMessage);
    }
  }

  /**
   * Test API connectivity
   */
  async testApiConnectivity(): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; data: DashboardOverview }>(
        '/user-tracking/dashboard',
        { params: { weeks: 4 } }
      );
      return { success: true, data: response };
    } catch (error) {
      console.error('Error in testApiConnectivity:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to test API connectivity';
      return { success: false, error: errorMessage };
    }
  }
}

export const userTrackingService = new UserTrackingService();

// Export types for components
export type {
  UserAnalytics,
  UtilizationTrendItem,
  TeamRankingItem,
  ProjectPerformance,
  DashboardOverview,
  UserTrackingFilters,
  UserTrackingDashboardResponse,
  UserListItem
} from '../types/userTracking';