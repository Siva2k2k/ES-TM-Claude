import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Trash2,
  Activity,
  Users,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { AuditLog, AuditLogFilters, auditService } from '../services/auditService';
import { toast } from '../hooks/useToast';
import { useAuth } from '../store/AuthContext';

const AuditLogsPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<any>(null);
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 25,
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      let response;
      if (searchTerm.trim()) {
        response = await auditService.searchLogs(searchTerm, filters);
      } else if (selectedDateRange.startDate && selectedDateRange.endDate) {
        response = await auditService.getLogsInRange(
          selectedDateRange.startDate,
          selectedDateRange.endDate,
          filters
        );
      } else {
        response = await auditService.getAllLogs(filters);
      }

      if (response.success && response.data) {
        setLogs(response.data.logs || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        setLogs([]);
        toast.error('Failed to fetch audit logs');
      }
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      setLogs([]);
      
      if (error?.message?.includes('404')) {
        toast.error('Audit logs endpoint not found - backend may not be fully implemented');
      } else if (error?.message?.includes('403')) {
        toast.error('Access denied - insufficient permissions');
      } else {
        toast.error('Failed to fetch audit logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await auditService.getStatistics();
      if (response.success && response.data) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching audit statistics:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStatistics();
  }, [filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchLogs();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleDateRangeFilter = () => {
    if (!selectedDateRange.startDate || !selectedDateRange.endDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    
    setFilters(prev => ({
      ...prev,
      page: 1,
    }));
    fetchLogs();
  };

  const clearDateRange = () => {
    setSelectedDateRange({ startDate: '', endDate: '' });
    fetchLogs();
  };

  const handleCleanupOldLogs = async () => {
    if (!user || (user.role !== 'Admin' && user.role !== 'SuperAdmin')) {
      toast.error('Only administrators can perform this action');
      return;
    }

    if (!confirm('Are you sure you want to delete audit logs older than 90 days? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await auditService.deleteOldLogs(90);
      if (response.success) {
        toast.success(`Successfully deleted ${response.data?.deletedCount || 0} old audit logs`);
        fetchLogs();
        fetchStatistics();
      } else {
        toast.error('Failed to cleanup old logs');
      }
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      toast.error('Failed to cleanup old logs');
    }
  };

  const handleRefresh = () => {
    fetchLogs();
    fetchStatistics();
  };

  const formatUserInfo = (log: AuditLog): string => {
    if (log.userId) {
      // Check if userId is populated with user object
      if (typeof log.userId === 'object' && log.userId.firstName && log.userId.lastName) {
        return `${log.userId.firstName} ${log.userId.lastName}`;
      }
      // Fallback to userId if not populated
      return typeof log.userId === 'string' ? log.userId : 'Unknown User';
    }
    return 'System';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground">Monitor system activity and user actions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {(user?.role === 'Admin' || user?.role === 'SuperAdmin') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanupOldLogs}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cleanup Old Logs
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{statistics.totalLogs?.toLocaleString() || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{statistics.logsToday?.toLocaleString() || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{statistics.logsThisWeek?.toLocaleString() || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{statistics.logsThisMonth?.toLocaleString() || 0}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search audit logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium mb-1">Action</label>
                <Select
                  value={filters.action || ''}
                  onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
                >
                  <option value="">All Actions</option>
                  <option value="USER_LOGIN">Login</option>
                  <option value="USER_LOGOUT">Logout</option>
                  <option value="USER_REGISTERED">Registration</option>
                  <option value="PASSWORD_CHANGED">Password Change</option>
                  <option value="PROFILE_UPDATED">Profile Update</option>
                  <option value="EMAIL_VERIFIED">Email Verification</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Resource</label>
                <Select
                  value={filters.resource || ''}
                  onChange={(e) => handleFilterChange('resource', e.target.value || undefined)}
                >
                  <option value="">All Resources</option>
                  <option value="USER">User</option>
                  <option value="SYSTEM">System</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="date"
                  value={selectedDateRange.startDate}
                  onChange={(e) => setSelectedDateRange(prev => ({
                    ...prev,
                    startDate: e.target.value
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Input
                  type="date"
                  value={selectedDateRange.endDate}
                  onChange={(e) => setSelectedDateRange(prev => ({
                    ...prev,
                    endDate: e.target.value
                  }))}
                />
              </div>
              <div className="flex items-end space-x-2">
                <Button
                  onClick={handleDateRangeFilter}
                  disabled={!selectedDateRange.startDate || !selectedDateRange.endDate}
                >
                  Apply Date Range
                </Button>
                {(selectedDateRange.startDate || selectedDateRange.endDate) && (
                  <Button variant="outline" onClick={clearDateRange}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Timestamp</th>
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Action</th>
                  <th className="text-left p-4 font-medium">Resource</th>
                  <th className="text-left p-4 font-medium">IP Address</th>
                  <th className="text-left p-4 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs && logs.length > 0 ? logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-medium">
                          {auditService.formatTimestamp(log.timestamp)}
                        </div>
                        <div className="text-muted-foreground">
                          {auditService.formatRelativeTime(log.timestamp)}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{formatUserInfo(log)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={auditService.getActionColor(log.action)}>
                        {auditService.formatAction(log.action)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium">{log.resource}</span>
                      {log.resourceId && (
                        <div className="text-xs text-muted-foreground">ID: {log.resourceId}</div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {log.ipAddress || 'N/A'}
                    </td>
                    <td className="p-4">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <div className="text-xs text-muted-foreground max-w-xs truncate">
                          {JSON.stringify(log.details)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No details</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="text-center p-8">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="text-4xl text-muted-foreground">📋</div>
                        <div className="text-lg font-medium">No audit logs found</div>
                        <div className="text-sm text-muted-foreground">
                          {searchTerm || showFilters 
                            ? 'Try adjusting your search or filters'
                            : 'The audit logs API may not be fully implemented yet'
                          }
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLogsPage;