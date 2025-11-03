import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  Clock,
  Award,
  AlertTriangle,
  Info,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Activity,
  Calendar
} from 'lucide-react';
import { userTrackingService, DashboardOverview } from '../../../services/UserTrackingService';
import { useAuth } from '../../../store/contexts/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { cn } from '../../../utils/cn';

const UserTrackingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUserRole } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState(4);

  useEffect(() => {
    // Check permissions
    if (!['manager', 'management'].includes(currentUserRole || '')) {
      navigate('/dashboard');
      return;
    }

    loadDashboardData();
  }, [currentUserRole, navigate, selectedWeeks]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await userTrackingService.getDashboardOverview({ weeks: selectedWeeks });
      
      if (response.data) {
        setOverview(response.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAlertBgColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

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
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-600 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            User Tracking Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor team performance and productivity metrics
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedWeeks}
            onChange={(e) => setSelectedWeeks(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value={2}>Last 2 weeks</option>
            <option value={4}>Last 4 weeks</option>
            <option value={8}>Last 8 weeks</option>
            <option value={12}>Last 12 weeks</option>
          </select>
          
          <button
            onClick={() => navigate('/dashboard/user-tracking/users')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Users className="w-4 h-4" />
            View All Users
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {overview.overview.total_users}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {overview.overview.active_users}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Utilization</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {overview.overview.avg_utilization}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Punctuality</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {overview.overview.avg_punctuality}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <Award className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Quality</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {overview.overview.avg_quality}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {overview.alerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Alerts & Notifications
          </h2>
          <div className="space-y-3">
            {overview.alerts.map((alert, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border',
                  getAlertBgColor(alert.type)
                )}
              >
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {alert.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {alert.message}
                  </p>
                </div>
                <span className="text-sm font-medium bg-white dark:bg-gray-700 px-2 py-1 rounded">
                  {alert.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Performers */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Top Performers
          </h2>
          <button
            onClick={() => navigate('/dashboard/user-tracking/team/ranking')}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            View All Rankings
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-3">
          {overview.top_performers.slice(0, 5).map((performer, index) => (
            <div
              key={performer.user_id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  #{index + 1}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {performer.full_name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {performer.role}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">Utilization</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {performer.avg_utilization}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">Quality</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {performer.avg_quality}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">Score</p>
                  <p className="font-bold text-green-600 dark:text-green-400">
                    {performer.overall_score}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Trends */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Weekly Trends
          </h2>
          <button
            onClick={() => navigate('/dashboard/user-tracking/analytics')}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            View Detailed Analytics
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
        
        {overview.trends.length > 0 ? (
          <div className="space-y-4">
            {overview.trends.slice(-6).map((trend, index) => {
              const weekDate = new Date(trend._id);
              return (
                <div
                  key={trend._id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        Week of {weekDate.toLocaleDateString()}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {trend.user_count} active users
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Utilization</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {Math.round(trend.avg_utilization)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Punctuality</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {Math.round(trend.avg_punctuality)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Quality</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {Math.round(trend.avg_quality)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 dark:text-gray-400">Total Hours</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {Math.round(trend.total_hours)}h
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No trend data available for the selected period
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTrackingDashboard;