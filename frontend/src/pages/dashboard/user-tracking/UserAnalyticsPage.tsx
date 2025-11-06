import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Award,
  Calendar,
  TrendingUp,
  User
} from 'lucide-react';
import { userTrackingService, UserAnalytics } from '../../../services/UserTrackingService';
import { useAuth } from '../../../store/contexts/AuthContext';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import {
  UtilizationTrendChart,
  PerformanceMetricsChart,
  ProjectHoursChart,
  MetricCard
} from '../../../components/charts/UserTrackingCharts';
import { COLORS } from '../../../components/charts/constants';

const UserAnalyticsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentUserRole } = useAuth();
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState(8);

  const loadAnalytics = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await userTrackingService.getUserAnalytics(userId, {
        weeks: selectedWeeks
      });
      
      if (response) {
        setAnalytics(response);
      }
    } catch (err) {
      console.error('Failed to load user analytics:', err);
      setError('Failed to load user analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedWeeks]);

  useEffect(() => {
    // Check permissions
    if (!['manager', 'management'].includes(currentUserRole || '')) {
      navigate('/dashboard');
      return;
    }

    loadAnalytics();
  }, [currentUserRole, navigate, loadAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={loadAnalytics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/user-tracking/users')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            User Analytics: {analytics.user.full_name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {analytics.user.email} • {analytics.user.role}
          </p>
        </div>
        
        <select
          value={selectedWeeks}
          onChange={(e) => setSelectedWeeks(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value={4}>Last 4 weeks</option>
          <option value={8}>Last 8 weeks</option>
          <option value={12}>Last 12 weeks</option>
          <option value={26}>Last 6 months</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Average Utilization"
          value={Math.round(analytics.summary.avg_utilization)}
          suffix="%"
          icon={<BarChart3 className="w-6 h-6" />}
          color={COLORS.primary}
          trend={analytics.trends.utilization.map(w => ({ value: w.utilization }))}
        />

        <MetricCard
          title="Average Punctuality"
          value={Math.round(analytics.summary.avg_punctuality)}
          suffix="%"
          icon={<Clock className="w-6 h-6" />}
          color={COLORS.warning}
          trend={analytics.trends.punctuality.map(w => ({ value: w.score }))}
        />

        <MetricCard
          title="Average Quality"
          value={Math.round(analytics.summary.avg_quality)}
          suffix="%"
          icon={<Award className="w-6 h-6" />}
          color={COLORS.success}
          trend={analytics.trends.quality.map(w => ({ value: w.score }))}
        />

        <MetricCard
          title="Total Hours"
          value={Math.round(analytics.summary.total_hours)}
          suffix="h"
          icon={<Calendar className="w-6 h-6" />}
          color={COLORS.info}
          trend={analytics.trends.utilization.map(w => ({ value: w.total_hours }))}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Utilization Trend
            </h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <UtilizationTrendChart 
            data={analytics.trends.utilization}
            height={300}
          />
        </div>

        {/* Performance Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Performance Metrics
            </h2>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <PerformanceMetricsChart 
            data={{
              utilization: analytics.summary.avg_utilization,
              punctuality: analytics.summary.avg_punctuality,
              quality: analytics.summary.avg_quality,
              consistency: analytics.performance_scores?.consistency || 75,
              project_diversity: analytics.performance_scores?.project_diversity || 80
            }}
            height={300}
          />
        </div>
      </div>

      {/* Project Hours Breakdown */}
      {analytics.project_breakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Project Hours Distribution
            </h2>
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProjectHoursChart 
              data={analytics.project_breakdown}
              height={300}
            />
            <div className="space-y-3">
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                Project Details
              </h3>
              {analytics.project_breakdown.map((project, index) => (
                <div 
                  key={project.project_name}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'][index % 6] }}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {project.project_name}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {project.total_hours}h
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {project.billable_hours}h billable
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAnalyticsPage;