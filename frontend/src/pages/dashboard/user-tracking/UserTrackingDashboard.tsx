import React, { useEffect, useState, useCallback } from 'react';
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
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { cn } from '../../../utils/cn';
import {
  TeamPerformanceChart,
  WeeklyTrendsChart,
  MetricCard
} from '../../../components/charts/UserTrackingCharts';
import { COLORS } from '../../../components/charts/constants';

const UserTrackingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUserRole } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState(4);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading dashboard data with weeks:', selectedWeeks);
      const response = await userTrackingService.getDashboardOverview({ weeks: selectedWeeks });
      console.log('Dashboard data response:', response);
      
      if (response) {
        setOverview(response);
      } else {
        console.warn('No data received from dashboard overview API');
        setError('No data received from server');
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(`Failed to load dashboard data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedWeeks]);

  useEffect(() => {
    // Check permissions and log current user info for debugging
    console.log('Current user role:', currentUserRole);
    console.log('Checking permissions for user tracking dashboard...');
    
    if (!['manager', 'management', 'super_admin'].includes(currentUserRole || '')) {
      console.log('Access denied. Role required: manager, management, or super_admin. Current role:', currentUserRole);
      navigate('/dashboard');
      return;
    }

    console.log('Permission granted. Loading dashboard data...');
    loadDashboardData();
  }, [currentUserRole, navigate, loadDashboardData]);

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
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No data available</p>
          <div className="text-sm text-gray-500 dark:text-gray-500 space-y-2">
            <p>This might be because:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>No UserWeekSummary data has been aggregated yet</li>
              <li>No users have submitted timesheets in the selected time period</li>
              <li>Your role doesn't have access to view this data</li>
            </ul>
            <p className="mt-4">
              Try using the "Test API" and "Trigger Aggregation" buttons above.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if overview has data but arrays are empty
  const hasNoData = overview.overview.total_users === 0 && 
                   overview.trends.length === 0 && 
                   overview.top_performers.length === 0;

  if (hasNoData) {
    return (
      <div className="space-y-6">
        {/* Header with controls for debugging */}
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
            <button
              onClick={async () => {
                try {
                  console.log('Testing API connectivity...');
                  const testResponse = await fetch('/api/v1/user-tracking/dashboard?weeks=4', {
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  console.log('Test response status:', testResponse.status);
                  const testData = await testResponse.json();
                  console.log('Test response data:', testData);
                  alert(`API Test: ${testResponse.status} - ${JSON.stringify(testData, null, 2)}`);
                } catch (error) {
                  console.error('API test failed:', error);
                  alert(`API Test Failed: ${error}`);
                }
              }}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              Test API
            </button>

            <button
              onClick={async () => {
                try {
                  console.log('Triggering aggregation...');
                  const aggResponse = await fetch('/api/v1/user-tracking/aggregate', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ weeks: 4 })
                  });
                  console.log('Aggregation response status:', aggResponse.status);
                  const aggData = await aggResponse.json();
                  console.log('Aggregation response data:', aggData);
                  alert(`Aggregation: ${aggResponse.status} - Processed: ${aggData.data?.processed || 0} records`);
                  
                  // Reload data after aggregation
                  if (aggResponse.ok) {
                    loadDashboardData();
                  }
                } catch (error) {
                  console.error('Aggregation failed:', error);
                  alert(`Aggregation Failed: ${error}`);
                }
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Trigger Aggregation
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">Dashboard loaded but no performance data found</p>
            <div className="text-sm text-gray-500 dark:text-gray-500 space-y-2">
              <p>API responded successfully but returned empty data. This might be because:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>You're a manager with no direct reports</li>
                <li>No users have activity in the selected time period</li>
                <li>UserWeekSummary data needs to be aggregated</li>
              </ul>
              <p className="mt-4">Current role: <span className="font-semibold">{currentUserRole}</span></p>
            </div>
          </div>
        </div>
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
          <button
            onClick={async () => {
              try {
                console.log('Testing API connectivity...');
                const testResponse = await fetch('/api/v1/user-tracking/dashboard?weeks=4', {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                  }
                });
                console.log('Test response status:', testResponse.status);
                const testData = await testResponse.json();
                console.log('Test response data:', testData);
                alert(`API Test: ${testResponse.status} - ${JSON.stringify(testData, null, 2)}`);
              } catch (error) {
                console.error('API test failed:', error);
                alert(`API Test Failed: ${error}`);
              }
            }}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Test API
          </button>

          <button
            onClick={async () => {
              try {
                console.log('Triggering aggregation...');
                const aggResponse = await fetch('/api/v1/user-tracking/aggregate', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ weeks: 4 })
                });
                console.log('Aggregation response status:', aggResponse.status);
                const aggData = await aggResponse.json();
                console.log('Aggregation response data:', aggData);
                alert(`Aggregation: ${aggResponse.status} - Processed: ${aggData.data?.processed || 0} records`);
                
                // Reload data after aggregation
                if (aggResponse.ok) {
                  loadDashboardData();
                }
              } catch (error) {
                console.error('Aggregation failed:', error);
                alert(`Aggregation Failed: ${error}`);
              }
            }}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            Trigger Aggregation
          </button>
          
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

      {/* Overview Cards with Mini Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total Users"
          value={overview.overview.total_users}
          icon={<Users className="w-6 h-6" />}
          color={COLORS.primary}
        />

        <MetricCard
          title="Active Users"
          value={overview.overview.active_users}
          icon={<Activity className="w-6 h-6" />}
          color={COLORS.success}
        />

        <MetricCard
          title="Avg Utilization"
          value={overview.overview.avg_utilization}
          suffix="%"
          icon={<BarChart3 className="w-6 h-6" />}
          color={COLORS.info}
          trend={overview.trends.slice(-7).map(t => ({ value: t.avg_utilization }))}
        />

        <MetricCard
          title="Avg Punctuality"
          value={overview.overview.avg_punctuality}
          suffix="%"
          icon={<Clock className="w-6 h-6" />}
          color={COLORS.warning}
          trend={overview.trends.slice(-7).map(t => ({ value: t.avg_punctuality }))}
        />

        <MetricCard
          title="Avg Quality"
          value={overview.overview.avg_quality}
          suffix="%"
          icon={<Award className="w-6 h-6" />}
          color={COLORS.success}
          trend={overview.trends.slice(-7).map(t => ({ value: t.avg_quality }))}
        />
      </div>

      {/* Alerts */}
      {overview.alerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Alerts & Notifications
          </h2>
          <div className="space-y-3">
            {overview.alerts.map((alert, alertIndex) => (
              <div
                key={`alert-${alert.type}-${alertIndex}`}
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

      {/* Performance Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Team Performance Comparison
            </h2>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          {overview.top_performers.length > 0 ? (
            <TeamPerformanceChart 
              data={overview.top_performers} 
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No performance data available
            </div>
          )}
        </div>

        {/* Weekly Trends Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Weekly Performance Trends
            </h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          {overview.trends.length > 0 ? (
            <WeeklyTrendsChart 
              data={overview.trends} 
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Weekly Trends Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Weekly Data Summary
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
            {overview.trends.slice(-6).map((trend) => {
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