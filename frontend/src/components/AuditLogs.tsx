import React, { useState } from 'react';
import { useRoleManager } from '../hooks/useRoleManager';
import { AuditLogService } from '../services/AuditLogService';
import { Shield, Activity, Download, Search, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast';

export const AuditLogs: React.FC = () => {
  const { canAccessAuditLogs, currentRole } = useRoleManager();
  const [searchQuery, setSearchQuery] = useState('');
  const [activitySummary, setActivitySummary] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load audit data from Supabase
  React.useEffect(() => {
    const loadAuditData = async () => {
      if (!canAccessAuditLogs()) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const [summaryResult, logsResult, securityResult] = await Promise.all([
          AuditLogService.getActivitySummary(7),
          AuditLogService.getAuditLogs({ limit: 20 }),
          AuditLogService.getSecurityEvents({ limit: 10 })
        ]);
        
        if (summaryResult.error) {
          setError(summaryResult.error);
        } else {
          setActivitySummary(summaryResult);
        }
        
        if (!logsResult.error) {
          setRecentLogs(logsResult.logs);
        }
        
        if (!securityResult.error) {
          setSecurityEvents(securityResult.events);
        }
      } catch (err) {
        setError('Failed to load audit data');
        console.error('Error loading audit data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAuditData();
  }, [canAccessAuditLogs]);

  if (!canAccessAuditLogs()) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access Audit Logs.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading audit data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Audit Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const handleExportLogs = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const result = await AuditLogService.exportAuditLogs(startDate, endDate, 'csv');
      if (result.success) {
        showSuccess('Audit logs exported successfully');
      } else {
        showError(`Error exporting logs: ${result.error}`);
      }
    } catch (err) {
      showError('Error exporting audit logs');
      console.error('Error exporting logs:', err);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      try {
        const result = await AuditLogService.searchAuditLogs(searchQuery);
        if (result.error) {
          showError(`Search error: ${result.error}`);
        } else {
          console.log('Search results:', result.logs);
          showInfo(`Found ${result.logs.length} matching log entries`);
        }
      } catch (err) {
        showError('Error searching audit logs');
        console.error('Error searching logs:', err);
      }
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return <Shield className="h-4 w-4" />;
    if (action.includes('APPROVED') || action.includes('VERIFIED')) return <CheckCircle className="h-4 w-4" />;
    if (action.includes('DENIED') || action.includes('REJECTED')) return <AlertTriangle className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'text-blue-600';
    if (action.includes('APPROVED') || action.includes('VERIFIED')) return 'text-green-600';
    if (action.includes('DENIED') || action.includes('REJECTED')) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Logs</h1>
          <p className="text-gray-600">Security monitoring and activity tracking</p>
        </div>

        {/* Activity Summary */}
        {activitySummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{activitySummary.totalEvents}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">User Logins</p>
                  <p className="text-2xl font-bold text-gray-900">{activitySummary.userLogins}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Timesheet Actions</p>
                  <p className="text-2xl font-bold text-gray-900">{activitySummary.timesheetActions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Security Events</p>
                  <p className="text-2xl font-bold text-gray-900">{activitySummary.securityEvents}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search audit logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleSearch}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </button>
              
              <button 
                onClick={handleExportLogs}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentLogs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`p-1 rounded ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{log.actor_name}</p>
                      <p className="text-sm text-gray-600">{log.action.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {recentLogs.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No recent activity found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Security Events */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Security Events</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {securityEvents.map((event, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border-l-4 border-red-500 bg-red-50 rounded-lg">
                    <div className="p-1 rounded text-red-600">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{event.actor_name}</p>
                      <p className="text-sm text-red-600">{event.action.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {securityEvents.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No security events found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Status */}
        {currentRole === 'super_admin' && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Data Retention</p>
                <p className="text-sm text-green-600">Compliant</p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Security Monitoring</p>
                <p className="text-sm text-green-600">Active</p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Audit Trail</p>
                <p className="text-sm text-green-600">Complete</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};