import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Filter, 
  Search, 
  Download, 
  RefreshCw,
  FileText,
  ChevronRight,
  ChevronDown,
  Lock,
  Send,
  Edit,
  Activity,
  Shield,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../store/contexts/AuthContext';
import { useRoleManager } from '../hooks/useRoleManager';
import { TimesheetService } from '../services/TimesheetService';
import { ProjectService } from '../services/ProjectService';
import { showSuccess, showError, showWarning } from '../utils/toast';
import type {
  TimesheetStatus,
  TimesheetWithDetails
} from '../types';

interface StatusSummary {
  status: TimesheetStatus;
  count: number;
  totalHours: number;
  color: string;
  icon: React.ReactNode;
}

const TimesheetStatusView = () => {
  const { currentUser } = useAuth();
  const { hasPermission } = useRoleManager();
  
  // Role-based permission checks
  const canApproveTimesheets = hasPermission('timesheet_approve_verify_manager');
  const canViewOnlyTimesheet = hasPermission('timesheet_view_only');
  const [timesheets, setTimesheets] = useState<TimesheetWithDetails[]>([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState<TimesheetWithDetails[]>([]);
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'week' | 'month' | 'quarter' | 'all'>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTimesheet, setExpandedTimesheet] = useState<string | null>(null);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetWithDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load and process timesheets
  useEffect(() => {
    const loadTimesheets = () => {
      if (!currentUser) return;
      
      const loadData = async () => {
        try {
          const result = await TimesheetService.getUserTimesheets(currentUser.id);
          if (!result.error) {
            setTimesheets(result.timesheets);
          } else {
            console.error('Error loading timesheets:', result.error);
          }
        } catch (error) {
          console.error('Error loading timesheets:', error);
        }
      };
      
      loadData();
    };

    loadTimesheets();
  }, [currentUser]);

  // Filter timesheets
  useEffect(() => {
    let filtered = timesheets;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ts => ts.status === statusFilter);
    }

    // Date filter
    const now = new Date();
    if (dateFilter !== 'all') {
      const cutoffDate = new Date();
      switch (dateFilter) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
      }
      filtered = filtered.filter(ts => new Date(ts.week_start_date) >= cutoffDate);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ts => 
        ts.week_start_date.includes(searchTerm) ||
        ts.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by week start date (newest first)
    filtered.sort((a, b) => new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime());

    setFilteredTimesheets(filtered);
  }, [timesheets, statusFilter, dateFilter, searchTerm]);

  const getStatusColor = (status: TimesheetStatus) => {
    const colors: Record<TimesheetStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      submitted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      manager_approved: 'bg-green-100 text-green-800 border-green-200',
      management_pending: 'bg-orange-100 text-orange-800 border-orange-200',
      manager_rejected: 'bg-red-100 text-red-800 border-red-200',
      management_rejected: 'bg-red-100 text-red-800 border-red-200',
      frozen: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status: TimesheetStatus) => {
    switch (status) {
      case 'manager_approved':
      case 'frozen':
        return <CheckCircle className="w-4 h-4" />;
      case 'manager_rejected':
      case 'management_rejected':
        return <XCircle className="w-4 h-4" />;
      case 'submitted':
      case 'management_pending':
        return <Clock className="w-4 h-4" />;
      case 'draft':
        return <Edit className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusSummary = (): StatusSummary[] => {
    const statuses: TimesheetStatus[] = ['draft', 'submitted', 'manager_approved', 'manager_rejected', 'management_rejected', 'frozen'];
    
    return statuses.map(status => {
      const statusTimesheets = timesheets.filter(ts => ts.status === status);
      const totalHours = statusTimesheets.reduce((sum, ts) => sum + ts.total_hours, 0);
      
      return {
        status,
        count: statusTimesheets.length,
        totalHours,
        color: getStatusColor(status),
        icon: getStatusIcon(status)
      };
    }).filter(summary => summary.count > 0);
  };

  const canEditTimesheet = (timesheet: TimesheetWithDetails) => {
    return timesheet.status === 'draft' || timesheet.status === 'manager_rejected' || timesheet.status === 'management_rejected';
  };

  const canResubmitTimesheet = (timesheet: TimesheetWithDetails) => {
    return timesheet.status === 'manager_rejected' || timesheet.status === 'management_rejected';
  };

  const resubmitTimesheet = (timesheetId: string) => {
    setTimesheets(prev => prev.map(ts => 
      ts.id === timesheetId 
        ? { ...ts, status: 'submitted' as TimesheetStatus, updated_at: new Date().toISOString() }
        : ts
    ));
    showError('Timesheet resubmitted for approval!');
  };

  const viewTimesheetDetails = (timesheet: TimesheetWithDetails) => {
    setSelectedTimesheet(timesheet);
    setShowDetailModal(true);
  };

  // Status Summary Cards
  const StatusSummaryCards = () => {
    const summaries = getStatusSummary();
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {summaries.map((summary) => (
          <div key={summary.status} className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 capitalize">
                  {summary.status.replace('_', ' ')}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{summary.count}</p>
                <p className="text-sm text-slate-600 mt-1">{summary.totalHours}h total</p>
              </div>
              <div className={`p-2 rounded-lg ${summary.color.split(' ')[0]}`}>
                {summary.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Timesheet Detail Modal
  const TimesheetDetailModal = () => {
    if (!showDetailModal || !selectedTimesheet) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Timesheet Details
                </h3>
                <p className="text-slate-600 mt-1">
                  Week of {new Date(selectedTimesheet.week_start_date).toLocaleDateString()} - {new Date(selectedTimesheet.week_end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-lg border ${getStatusColor(selectedTimesheet.status)}`}>
                  {getStatusIcon(selectedTimesheet.status)}
                  <span className="ml-2">{selectedTimesheet.status.toUpperCase()}</span>
                </span>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary Stats */}
              <div className="lg:col-span-1">
                <h4 className="font-semibold text-slate-900 mb-4">Summary</h4>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-slate-900">{selectedTimesheet.total_hours}h</div>
                    <div className="text-sm text-slate-600">Total Hours</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedTimesheet.billableHours}h</div>
                    <div className="text-sm text-green-700">Billable Hours</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{selectedTimesheet.nonBillableHours}h</div>
                    <div className="text-sm text-gray-700">Non-billable Hours</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedTimesheet.entries?.length || 0}</div>
                    <div className="text-sm text-blue-700">Time Entries</div>
                  </div>
                </div>
              </div>

              {/* Project Breakdown */}
              <div className="lg:col-span-2">
                <h4 className="font-semibold text-slate-900 mb-4">Project Breakdown</h4>
                <div className="space-y-3">
                  {(selectedTimesheet.projectBreakdown || []).map((project, index) => (
                    <div key={index} className="bg-slate-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-slate-900">{project.projectName}</div>
                          <div className="text-sm text-slate-600">{project.clientName}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">{project.hours}h</div>
                          <div className="text-sm text-green-600">{project.billableHours}h billable</div>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(project.hours / selectedTimesheet.total_hours) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time Entries */}
                <h4 className="font-semibold text-slate-900 mt-6 mb-4">Time Entries</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(selectedTimesheet.entries || []).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {new Date(entry.date).toLocaleDateString()}
                        </div>
                        <div className="text-slate-600">
                          {entry.description || 'No description'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-slate-900">{entry.hours}h</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          entry.is_billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.is_billable ? 'Billable' : 'Non-billable'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-200 bg-slate-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-600">
                <div>Created: {new Date(selectedTimesheet.created_at).toLocaleDateString()}</div>
                <div>Last Updated: {new Date(selectedTimesheet.updated_at).toLocaleDateString()}</div>
              </div>
              <div className="flex space-x-3">
                {canResubmitTimesheet(selectedTimesheet) && (
                  <button
                    onClick={() => {
                      resubmitTimesheet(selectedTimesheet.id);
                      setShowDetailModal(false);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Resubmit
                  </button>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center">
            Timesheet Status
            {canViewOnlyTimesheet && (
              <span className="ml-3 text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full flex items-center">
                <Shield className="h-3 w-3 mr-1" />
                View Only
              </span>
            )}
            {canApproveTimesheets && (
              <span className="ml-3 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center">
                <UserCheck className="h-3 w-3 mr-1" />
                Approval Authority
              </span>
            )}
          </h2>
          <p className="text-slate-600 mt-1">
            {canViewOnlyTimesheet 
              ? 'View timesheet data for system oversight'
              : canApproveTimesheets
              ? 'Track and manage timesheet approvals' 
              : 'Track and manage your timesheet submissions'
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Role-Based Approval Workflow Information */}
      {(canViewOnlyTimesheet || canApproveTimesheets) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Timesheet Approval Workflow
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-semibold text-gray-600">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Employee</p>
                <p className="text-sm text-gray-600">Submits timesheet</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-semibold text-yellow-600">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Manager/Lead</p>
                <p className="text-sm text-gray-600">Initial approval</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                canApproveTimesheets ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <span className={`text-sm font-semibold ${
                  canApproveTimesheets ? 'text-green-600' : 'text-gray-600'
                }`}>3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Management</p>
                <p className="text-sm text-gray-600">
                  {canApproveTimesheets ? 'Final Approval ✅' : 'Final Approval'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                canViewOnlyTimesheet ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <span className={`text-sm font-semibold ${
                  canViewOnlyTimesheet ? 'text-blue-600' : 'text-gray-600'
                }`}>4</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Super Admin</p>
                <p className="text-sm text-gray-600">
                  {canViewOnlyTimesheet ? 'View Only 👁️' : 'Oversight'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Summary */}
      <StatusSummaryCards />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search timesheets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TimesheetStatus | 'all')}
              className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="manager_approved">Manager Approved</option>
              <option value="management_pending">Management Pending</option>
              <option value="manager_rejected">Manager Rejected</option>
              <option value="management_rejected">Management Rejected</option>
              <option value="frozen">Approved & Frozen</option>
            </select>
          </div>
          <div className="relative">
            <Calendar className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'all' | 'week' | 'month' | 'quarter')}
              className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timesheets List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Timesheets ({filteredTimesheets.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredTimesheets.map((timesheet) => (
            <div key={timesheet.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <button
                    onClick={() => setExpandedTimesheet(
                      expandedTimesheet === timesheet.id ? null : timesheet.id
                    )}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {expandedTimesheet === timesheet.id ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="font-medium text-slate-900">
                        Week of {new Date(timesheet.week_start_date).toLocaleDateString()}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(timesheet.status)}`}>
                        {getStatusIcon(timesheet.status)}
                        <span className="ml-1">{timesheet.status.toUpperCase()}</span>
                      </span>
                      {timesheet.verified && (
                        <span className="inline-flex items-center text-blue-600 text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                      <span>{timesheet.total_hours}h total</span>
                      <span className="text-green-600">{timesheet.billableHours}h billable</span>
                      <span>{timesheet.entries?.length || 0} entries</span>
                      <span>Updated {new Date(timesheet.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => viewTimesheetDetails(timesheet)}
                    className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {canEditTimesheet(timesheet) && (
                    <button
                      className="text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit timesheet"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  
                  {canResubmitTimesheet(timesheet) && (
                    <button
                      onClick={() => resubmitTimesheet(timesheet.id)}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg hover:bg-blue-200 flex items-center text-sm transition-colors"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Resubmit
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedTimesheet === timesheet.id && (
                <div className="mt-4 ml-9 space-y-4">
                  {/* Project Breakdown */}
                  <div>
                    <h5 className="font-medium text-slate-900 mb-2">Project Breakdown</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(timesheet.projectBreakdown || []).map((project, index) => (
                        <div key={index} className="bg-slate-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-slate-900 text-sm">{project.projectName}</div>
                              <div className="text-xs text-slate-600">{project.clientName}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-slate-900 text-sm">{project.hours}h</div>
                              <div className="text-xs text-green-600">{project.billableHours}h billable</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Entries Preview */}
                  <div>
                    <h5 className="font-medium text-slate-900 mb-2">Recent Entries</h5>
                    <div className="space-y-2">
                      {(timesheet.entries || []).slice(0, 3).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded">
                          <div>
                            <span className="font-medium">{new Date(entry.date).toLocaleDateString()}</span>
                            <span className="text-slate-600 ml-2">
                              {entry.description || 'No description'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{entry.hours}h</span>
                            <span className={`inline-flex px-1 py-0.5 text-xs rounded ${
                              entry.is_billable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {entry.is_billable ? 'B' : 'NB'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(timesheet.entries?.length || 0) > 3 && (
                        <div className="text-sm text-slate-500 text-center py-1">
                          +{(timesheet.entries?.length || 0) - 3} more entries
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredTimesheets.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No timesheets found</h3>
              <p className="text-slate-600">
                {statusFilter !== 'all' || dateFilter !== 'all' || searchTerm
                  ? 'Try adjusting your filters to see more results.'
                  : 'You haven\'t submitted any timesheets yet.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <TimesheetDetailModal />
    </div>
  );
};

export default TimesheetStatusView;