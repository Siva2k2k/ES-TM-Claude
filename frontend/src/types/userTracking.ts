/**
 * User Tracking Types
 * Types for user performance tracking, analytics, and monitoring
 */

export interface UtilizationMetrics {
  utilization_percentage: number;
  billable_efficiency: number;
  productivity_score: number;
}

export interface PunctualityMetrics {
  submission_timeliness: number;
  is_on_time: boolean;
  submission_streak: number;
  punctuality_score: number;
}

export interface QualityMetrics {
  rejection_count: number;
  approval_level_reached: string;
  quality_score: number;
  consecutive_approvals: number;
}

export interface PerformanceMetrics {
  project_count: number;
  avg_hours_per_project: number;
  project_diversity_score: number;
  consistency_score: number;
}

export interface ProjectBreakdown {
  project_id: string;
  project_name: string;
  total_hours: number;
  billable_hours: number;
  percentage_of_week: number;
  is_training: boolean;
}

export interface UserWeekSummary {
  id: string;
  user_id: string;
  timesheet_id: string;
  week_start_date: string;
  week_end_date: string;
  total_worked_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  training_hours: number;
  leave_hours: number;
  holiday_hours: number;
  miscellaneous_hours: number;
  avg_daily_hours: number;
  working_days_count: number;
  max_daily_hours: number;
  min_daily_hours: number;
  utilization_metrics: UtilizationMetrics;
  punctuality_metrics: PunctualityMetrics;
  quality_metrics: QualityMetrics;
  performance_metrics: PerformanceMetrics;
  project_breakdown: ProjectBreakdown[];
  submitted_at?: string;
  status: string;
  last_aggregated_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserPerformanceSummary {
  avg_utilization: number;
  avg_punctuality: number;
  avg_quality: number;
  total_hours: number;
  weeks_tracked: number;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  manager?: {
    id: string;
    full_name: string;
  };
}

export interface UserListItem extends User {
  avg_utilization: number;
  avg_punctuality: number;
  avg_quality: number;
  total_hours: number;
  weeks_tracked: number;
}

export interface DashboardOverview {
  overview: {
    total_users: number;
    active_users: number;
    avg_utilization: number;
    avg_punctuality: number;
    avg_quality: number;
  };
  trends: Array<{
    _id: string;
    avg_utilization: number;
    avg_punctuality: number;
    avg_quality: number;
    total_hours: number;
    user_count: number;
  }>;
  top_performers: Array<{
    user_id: string;
    full_name: string;
    role: string;
    avg_utilization: number;
    avg_punctuality: number;
    avg_quality: number;
    overall_score: number;
    total_hours: number;
  }>;
  alerts: Array<{
    type: 'warning' | 'info' | 'error';
    title: string;
    message: string;
    count: number;
  }>;
}

export interface UserAnalytics {
  user: User;
  summary: UserPerformanceSummary;
  trends: {
    utilization: Array<{
      week: string;
      utilization: number;
      billable_hours: number;
      total_hours: number;
    }>;
    punctuality: Array<{
      week: string;
      score: number;
      on_time: boolean;
    }>;
    quality: Array<{
      week: string;
      score: number;
      rejections: number;
    }>;
  };
  project_breakdown: Array<{
    project_id: string;
    project_name: string;
    total_hours: number;
    billable_hours: number;
    weeks_worked: number;
    is_training: boolean;
  }>;
  performance_scores: {
    utilization: number;
    punctuality: number;
    quality: number;
    consistency: number;
    project_diversity: number;
  };
}

export interface TeamRankingItem {
  user_id: string;
  user_name: string;
  avg_utilization: number;
  avg_punctuality: number;
  avg_quality: number;
  overall_score: number;
  total_hours: number;
  total_weeks: number;
}

export interface ProjectPerformance {
  _id: string;
  project_name: string;
  total_hours: number;
  billable_hours: number;
  user_count: number;
  weeks_count: number;
  avg_hours_per_week: number;
  utilization_rate: number;
  is_training: boolean;
}

export interface UserTrackingFilters {
  weeks?: number;
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
}

export interface UserTrackingDashboardResponse {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UtilizationTrendItem {
  week_start_date: string;
  utilization_metrics: { utilization_percentage: number };
  total_worked_hours: number;
  billable_hours: number;
}

export interface AggregationRequest {
  timesheetId?: string;
  userId?: string;
  weeks?: number;
}

export interface AggregationResponse {
  processed: number;
}