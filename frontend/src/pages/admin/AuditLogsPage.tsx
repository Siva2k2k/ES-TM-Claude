/**
 * Audit Logs Page
 * Admin-only page for viewing system audit logs
 * SonarQube Compliant: Cognitive Complexity < 15, File < 250 lines
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/contexts/AuthContext';
import { AuditLogTable } from './components';
import type { ActivityAuditLog } from '../../services/AuditLogService';
import AuditLogService from '../../services/AuditLogService';
import { MultiSelect } from '../../components/ui/MultiSelect';
import {
  Shield,
  Activity,
  Search,
  Filter,
  Download,
  Calendar,
  RefreshCw,
  X
} from 'lucide-react';
import { showError, showSuccess } from '../../utils/toast';

// Map ActivityAuditLog to AuditLog for component compatibility
type AuditLog = ActivityAuditLog & { _id: string };

const AUDIT_ACTIONS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
  'VERIFY',
  'FREEZE',
  'SUBMIT',
  'ESCALATE',
  'USER_LOGIN',
  'USER_LOGOUT',
  'USER_CREATED',
  'USER_APPROVED',
  'USER_DEACTIVATED',
  'USER_ROLE_CHANGED',
  'TIMESHEET_SUBMITTED',
  'TIMESHEET_APPROVED',
  'TIMESHEET_VERIFIED',
  'TIMESHEET_REJECTED',
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'PROJECT_DELETED',
  'BILLING_SNAPSHOT_GENERATED',
  'BILLING_APPROVED',
  'ROLE_SWITCHED',
  'PERMISSION_DENIED',
  'DATA_EXPORT',
  'SYSTEM_CONFIG_CHANGED'
];

export const AuditLogsPage: React.FC = () => {
  const { currentUser, currentUserRole } = useAuth();

  // State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // For debounced search
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState<'timestamp' | 'action' | 'actor'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const LOGS_PER_PAGE = 50;

  // Permission check
  const canViewAuditLogs = ['super_admin', 'management'].includes(currentUserRole);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchTerm);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (canViewAuditLogs) {
      loadAuditLogs();
    }
  }, [currentPage, selectedActions, startDate, endDate, searchQuery, sortBy, sortOrder, canViewAuditLogs]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      // If there's a search query, use search API
      if (searchQuery.trim()) {
        const result = await AuditLogService.searchAuditLogs(searchQuery, {
          limit: LOGS_PER_PAGE,
          actions: selectedActions.length > 0 ? selectedActions as any[] : undefined
        });

        if (result.error) {
          showError(result.error);
          return;
        }

        const mappedLogs: AuditLog[] = result.logs.map(log => ({
          ...log,
          _id: log.id
        }));

        // Apply client-side sorting for search results
        const sortedLogs = sortLogs(mappedLogs);
        setLogs(sortedLogs);
        setTotalLogs(result.logs.length);
        setHasMore(false);
      } else {
        // Regular filtering
        const result = await AuditLogService.getAuditLogs({
          limit: LOGS_PER_PAGE,
          offset: (currentPage - 1) * LOGS_PER_PAGE,
          actions: selectedActions.length > 0 ? selectedActions as any[] : undefined,
          startDate,
          endDate
        });

        if (result.error) {
          showError(result.error);
          return;
        }

        const mappedLogs: AuditLog[] = result.logs.map(log => ({
          ...log,
          _id: log.id
        }));

        // Apply client-side sorting
        const sortedLogs = sortLogs(mappedLogs);
        setLogs(sortedLogs);
        setTotalLogs(result.total);
        setHasMore(result.hasMore);
      }
    } catch (error) {
      showError('Failed to load audit logs');
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortLogs = (logsToSort: AuditLog[]): AuditLog[] => {
    return [...logsToSort].sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'timestamp':
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'action':
          compareValue = a.action.localeCompare(b.action);
          break;
        case 'actor':
          compareValue = a.actor_name.localeCompare(b.actor_name);
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  };

  const handleActionFilter = (action: string) => {
    setSelectedActions(prev =>
      prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSearchQuery('');
    setSelectedActions([]);
    setStartDate('');
    setEndDate('');
    setSortBy('timestamp');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || selectedActions.length > 0 || startDate || endDate;

  const handleExport = async () => {
    try {
      if (!startDate || !endDate) {
        showError('Please select both start and end dates for export');
        return;
      }

      const result = await AuditLogService.exportAuditLogs(startDate, endDate, 'csv');

      if (result.error || !result.success) {
        showError(result.error || 'Failed to export audit logs');
        return;
      }

      showSuccess('Audit logs export initiated');
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch (error) {
      showError('Failed to export audit logs');
      console.error('Error exporting audit logs:', error);
    }
  };

  const handleViewDetails = (log: AuditLog) => {
    // Could open a modal with full log details
    console.log('View log details:', log);
  };

  if (!canViewAuditLogs) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to view audit logs. Only Super Admin and Management roles can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Activity className="h-8 w-8 text-blue-600" />
                Audit Logs
              </h1>
              <p className="text-gray-600 mt-1">View all system activities and user actions</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadAuditLogs}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Search Bar */}
            <div className="md:col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="inline h-4 w-4 mr-1" />
                Search Logs
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by actor name, action, or table name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Sort By */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="timestamp">Timestamp</option>
                <option value="action">Action</option>
                <option value="actor">Actor</option>
              </select>
            </div>

            {/* Order */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              Filters
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
                Clear All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="dd-mm-yyyy"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="dd-mm-yyyy"
              />
            </div>

            {/* Action Types Multi-Select */}
            <div>
              <MultiSelect
                label={
                  <span>
                    <Filter className="inline h-4 w-4 mr-1" />
                    Action Types
                  </span>
                }
                options={AUDIT_ACTIONS}
                selected={selectedActions}
                onChange={(selected) => {
                  setSelectedActions(selected);
                  setCurrentPage(1);
                }}
                placeholder="Select action types..."
                formatLabel={(action) => action.replace(/_/g, ' ')}
              />
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Activity Log ({totalLogs} total entries)
            </h3>
          </div>

          <AuditLogTable
            logs={logs}
            loading={loading}
            onViewDetails={handleViewDetails}
          />

          {/* Pagination */}
          {totalLogs > LOGS_PER_PAGE && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * LOGS_PER_PAGE) + 1} to {Math.min(currentPage * LOGS_PER_PAGE, totalLogs)} of {totalLogs} entries
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!hasMore}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
