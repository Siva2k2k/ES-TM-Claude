import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Award,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { userTrackingService, DashboardOverview, ProjectPerformance } from '../../../services/UserTrackingService';
import { useAuth } from '../../../store/contexts/AuthContext';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { MetricCard } from '../../../components/charts/UserTrackingCharts';
import { COLORS } from '../../../components/charts/constants';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const GeneralAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUserRole } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [projectPerformance, setProjectPerformance] = useState<ProjectPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState(8);

  const loadAnalytics = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading general analytics data...');
      
      // Load dashboard overview and project performance in parallel
      const [overviewResponse, projectsResponse] = await Promise.all([
        userTrackingService.getDashboardOverview({ weeks: selectedWeeks }),
        userTrackingService.getProjectPerformance({ weeks: selectedWeeks })
      ]);
      
      console.log('Overview response:', overviewResponse);
      console.log('Projects response:', projectsResponse);
      
      setOverview(overviewResponse);
      setProjectPerformance(projectsResponse);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(`Failed to load analytics data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedWeeks]);

  useEffect(() => {
    // Check permissions
    console.log('Current user role for GeneralAnalytics:', currentUserRole);
    
    if (!['manager', 'management', 'super_admin'].includes(currentUserRole || '')) {
      console.log('Access denied to GeneralAnalytics. Role required: manager, management, or super_admin');
      navigate('/dashboard');
      return;
    }

    console.log('Permission granted to GeneralAnalytics. Loading data...');
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
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No analytics data available</p>
          <div className="text-sm text-gray-500 dark:text-gray-500 space-y-2">
            <p>This might be because:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>No UserWeekSummary data has been aggregated yet</li>
              <li>No users have submitted timesheets in the selected time period</li>
              <li>You don't have access to view user data (check your role)</li>
            </ul>
            <div className="mt-4 space-y-2">
              <p className="font-medium">Try these steps:</p>
              <p>1. Click "Trigger Aggregation" above to process existing timesheet data</p>
              <p>2. Check if users have submitted timesheets for the selected period</p>
              <p>3. Verify you have manager/management permissions</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/user-tracking')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Analytics Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive team performance and productivity insights
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={async () => {
              try {
                console.log('Testing Analytics API connectivity...');
                const testResponse = await fetch('/api/v1/user-tracking/dashboard?weeks=4', {
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                  }
                });
                console.log('Test response status:', testResponse.status);
                const testData = await testResponse.json();
                console.log('Test response data:', testData);
                alert(`Analytics API Test: ${testResponse.status} - ${JSON.stringify(testData, null, 2)}`);
              } catch (error) {
                console.error('Analytics API test failed:', error);
                alert(`Analytics API Test Failed: ${error}`);
              }
            }}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Test API
          </button>

          <button
            onClick={async () => {
              try {
                console.log('Triggering aggregation for analytics...');
                const aggResponse = await fetch('/api/v1/user-tracking/aggregate', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ weeks: selectedWeeks })
                });
                console.log('Aggregation response status:', aggResponse.status);
                const aggData = await aggResponse.json();
                console.log('Aggregation response data:', aggData);
                alert(`Aggregation: ${aggResponse.status} - Processed: ${aggData.data?.processed || 0} records`);
                
                // Reload data after aggregation
                if (aggResponse.ok) {
                  loadAnalytics();
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
            <option value={4}>Last 4 weeks</option>
            <option value={8}>Last 8 weeks</option>
            <option value={12}>Last 12 weeks</option>
            <option value={26}>Last 6 months</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={overview.overview.total_users}
          icon={<Users className="w-6 h-6" />}
          color={COLORS.primary}
        />

        <MetricCard
          title="Average Utilization"
          value={Math.round(overview.overview.avg_utilization || 0)}
          suffix="%"
          icon={<BarChart3 className="w-6 h-6" />}
          color={COLORS.success}
          trend={overview.trends?.map(t => ({ value: t.avg_utilization || 0 })) || []}
        />

        <MetricCard
          title="Average Punctuality"
          value={Math.round(overview.overview.avg_punctuality || 0)}
          suffix="%"
          icon={<Clock className="w-6 h-6" />}
          color={COLORS.warning}
          trend={overview.trends?.map(t => ({ value: t.avg_punctuality || 0 })) || []}
        />

        <MetricCard
          title="Average Quality"
          value={Math.round(overview.overview.avg_quality || 0)}
          suffix="%"
          icon={<Award className="w-6 h-6" />}
          color={COLORS.info}
          trend={overview.trends?.map(t => ({ value: t.avg_quality || 0 })) || []}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Team Performance Trends
            </h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={overview.trends || []}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="_id" 
                tick={{ fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis tick={{ fontSize: 12 }} className="text-gray-600 dark:text-gray-400" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="avg_utilization" 
                stroke={COLORS.primary}
                strokeWidth={3}
                name="Utilization %"
              />
              <Line 
                type="monotone" 
                dataKey="avg_punctuality" 
                stroke={COLORS.warning}
                strokeWidth={2}
                name="Punctuality %"
              />
              <Line 
                type="monotone" 
                dataKey="avg_quality" 
                stroke={COLORS.success}
                strokeWidth={2}
                name="Quality %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performers */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Top Performers
            </h2>
            <Award className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {(overview.top_performers || []).slice(0, 5).map((performer, index) => (
              <div 
                key={performer.user_id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {performer.full_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {performer.role}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {Math.round(performer.overall_score || 0)}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {performer.total_hours || 0}h
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Performance */}
      {projectPerformance.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Project Performance Analysis
            </h2>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                Hours Distribution
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectPerformance.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="project_name" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total_hours" fill={COLORS.primary} name="Total Hours" />
                  <Bar dataKey="billable_hours" fill={COLORS.success} name="Billable Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
                Project Details
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {projectPerformance.map((project) => (
                  <div 
                    key={project._id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {project.project_name}
                        {project.is_training && (
                          <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            Training
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {project.user_count} users • {project.weeks_count} weeks
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {project.total_hours || 0}h
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {Math.round(project.utilization_rate || 0)}% util
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {overview.alerts && overview.alerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Performance Alerts
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview.alerts.map((alert, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.type === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                  alert.type === 'warning' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' :
                  'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                }`}
              >
                <h3 className={`font-medium ${
                  alert.type === 'error' ? 'text-red-800 dark:text-red-200' :
                  alert.type === 'warning' ? 'text-orange-800 dark:text-orange-200' :
                  'text-blue-800 dark:text-blue-200'
                }`}>
                  {alert.title}
                </h3>
                <p className={`text-sm mt-1 ${
                  alert.type === 'error' ? 'text-red-600 dark:text-red-300' :
                  alert.type === 'warning' ? 'text-orange-600 dark:text-orange-300' :
                  'text-blue-600 dark:text-blue-300'
                }`}>
                  {alert.message}
                </p>
                {alert.count > 0 && (
                  <p className={`text-xs mt-2 font-medium ${
                    alert.type === 'error' ? 'text-red-700 dark:text-red-200' :
                    alert.type === 'warning' ? 'text-orange-700 dark:text-orange-200' :
                    'text-blue-700 dark:text-blue-200'
                  }`}>
                    {alert.count} affected users
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralAnalyticsPage;