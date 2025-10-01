import React, { useState, useEffect } from 'react';
import { ReportService, LiveAnalytics } from '../services/ReportService';
import { useAuth } from '../store/contexts/AuthContext';
import { showError } from '../utils/toast';

const LiveAnalyticsDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<LiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadAnalytics(true); // Silent refresh
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadAnalytics = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = await ReportService.getLiveAnalytics();

      if (result.success && result.analytics) {
        setAnalytics(result.analytics);
      } else {
        if (!silent) {
          showError(result.error || 'Failed to load analytics');
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      if (!silent) {
        showError('Failed to load analytics');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const formatHours = (hours: number): string => {
    return `${hours.toFixed(2)} hrs`;
  };

  const getWeekLabel = (weekNumber: number): string => {
    const weekLabels: { [key: number]: string } = {
      1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun'
    };
    return weekLabels[weekNumber] || `W${weekNumber}`;
  };

  const calculatePercentage = (value: number, total: number): number => {
    return total > 0 ? (value / total) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  const approvalRate = calculatePercentage(analytics.timesheet.approved, analytics.timesheet.total_timesheets);
  const submittedRate = calculatePercentage(analytics.timesheet.submitted, analytics.timesheet.total_timesheets);
  const pendingRate = calculatePercentage(analytics.timesheet.pending, analytics.timesheet.total_timesheets);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              📊 Live Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time insights based on your role • {analytics.user_scope}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(analytics.generated_at).toLocaleTimeString()}
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Auto-refresh</span>
            </label>
            <button
              onClick={() => loadAnalytics()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics - Timesheet */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Hours</h3>
            <span className="text-2xl">⏰</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatHours(analytics.timesheet.total_hours)}</p>
          <p className="text-sm text-gray-500 mt-1">Across {formatNumber(analytics.timesheet.total_timesheets)} timesheets</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Approved</h3>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{formatNumber(analytics.timesheet.approved)}</p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${approvalRate}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{approvalRate.toFixed(1)}% approval rate</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Submitted</h3>
            <span className="text-2xl">📤</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{formatNumber(analytics.timesheet.submitted)}</p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${submittedRate}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{submittedRate.toFixed(1)}% submitted</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Pending</h3>
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{formatNumber(analytics.timesheet.pending)}</p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{ width: `${pendingRate}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{pendingRate.toFixed(1)}% pending</p>
          </div>
        </div>
      </div>

      {/* Billing Metrics (if available) */}
      {analytics.billing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg shadow p-6 border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-emerald-700">Total Revenue</h3>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold text-emerald-900">{formatCurrency(analytics.billing.total_revenue)}</p>
            <p className="text-sm text-emerald-600 mt-1">From {formatNumber(analytics.billing.total_snapshots)} billing snapshots</p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-700">Hours Billed</h3>
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-3xl font-bold text-blue-900">{formatHours(analytics.billing.total_hours_billed)}</p>
            <p className="text-sm text-blue-600 mt-1">Billable hours tracked</p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-purple-700">Average Rate</h3>
              <span className="text-2xl">💵</span>
            </div>
            <p className="text-3xl font-bold text-purple-900">
              {formatCurrency(analytics.billing.total_hours_billed > 0
                ? analytics.billing.total_revenue / analytics.billing.total_hours_billed
                : 0)}
            </p>
            <p className="text-sm text-purple-600 mt-1">Per hour</p>
          </div>
        </div>
      )}

      {/* Weekly Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 Weekly Trend</h2>
        {analytics.weekly_trend.length > 0 ? (
          <div>
            {/* Simple Bar Chart */}
            <div className="flex items-end justify-between h-64 gap-2">
              {analytics.weekly_trend.map((day, idx) => {
                const maxHours = Math.max(...analytics.weekly_trend.map(d => d.hours));
                const heightPercent = (day.hours / maxHours) * 100;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center justify-end h-full">
                      <div className="text-xs font-semibold text-gray-900 mb-1">
                        {formatHours(day.hours)}
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-700 hover:to-blue-500"
                        style={{ height: `${heightPercent}%`, minHeight: day.hours > 0 ? '20px' : '0' }}
                        title={`${getWeekLabel(day._id)}: ${formatHours(day.hours)} (${day.count} entries)`}
                      ></div>
                    </div>
                    <div className="text-sm font-medium text-gray-600 mt-2">
                      {getWeekLabel(day._id)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {day.count}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-t from-blue-600 to-blue-400 rounded"></div>
                <span className="text-gray-600">Hours per day</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Number below = timesheet count</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>No weekly trend data available</p>
          </div>
        )}
      </div>

      {/* Timesheet Status Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Timesheet Status Breakdown</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Approved</span>
              <span className="font-semibold text-green-600">
                {formatNumber(analytics.timesheet.approved)} ({approvalRate.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${approvalRate}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Submitted (Pending Approval)</span>
              <span className="font-semibold text-blue-600">
                {formatNumber(analytics.timesheet.submitted)} ({submittedRate.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${submittedRate}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Pending (Not Submitted)</span>
              <span className="font-semibold text-yellow-600">
                {formatNumber(analytics.timesheet.pending)} ({pendingRate.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-yellow-500 h-3 rounded-full transition-all"
                style={{ width: `${pendingRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Period Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Analytics Period</h3>
            <p className="text-sm text-blue-800">
              Data shown: <span className="font-semibold">{analytics.period}</span>
            </p>
            <p className="text-sm text-blue-800">
              Scope: <span className="font-semibold">{analytics.user_scope}</span>
            </p>
            <p className="text-xs text-blue-700 mt-2">
              {autoRefresh ? '🔄 Auto-refreshing every 30 seconds' : 'Auto-refresh disabled'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAnalyticsDashboard;
