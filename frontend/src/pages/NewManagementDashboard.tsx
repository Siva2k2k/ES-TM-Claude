import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  DollarSign, 
  Activity, 
  ChevronRight,
  Download,
  Settings,
  UserCheck,
  Target,
  BarChart3,
  Shield
} from 'lucide-react';
import { useRoleManager } from '../hooks/useRoleManager';
import { UserService } from '../services/UserService';
import { ProjectService } from '../services/ProjectService';
import { TimesheetService } from '../services/TimesheetService';
import { BillingService } from '../services/BillingService';
import { AuditLogService, ActivityAuditLog } from '../services/AuditLogService';

interface DashboardStats {
  totalUsers: number;
  pendingApprovals: number;
  activeProjects: number;
  totalRevenue: number;
  weeklyHours: number;
  complianceScore: number;
}

interface BillingDashboardData {
  totalRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  pendingApprovals: number;
  totalBillableHours: number;
  averageHourlyRate: number;
  revenueGrowth: number;
}

export const ManagementDashboard: React.FC = () => {
  const { 
    canManageUsers, 
    canApproveUsers, 
    canAccessBilling, 
    canAccessAuditLogs,
    canManageProjects,
    hasPermission,
    currentRole 
  } = useRoleManager();

  // Check specific permissions based on corrected role definitions
  // const isSuperAdmin = currentRole === 'super_admin';
  // const isManagement = currentRole === 'management';
  
  // Super Admin: View-only for timesheets and billing
  // Management: Full approval authority for timesheets and billing
  const canApproveTimesheets = hasPermission('timesheet_approve_verify_manager');
  const canApproveBilling = hasPermission('billing_monthly_approval');
  const canViewOnlyTimesheet = hasPermission('timesheet_view_only');
  const canViewOnlyBilling = hasPermission('billing_view_only');

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingApprovals: 0,
    activeProjects: 0,
    totalRevenue: 0,
    weeklyHours: 0,
    complianceScore: 0
  });

  const [recentActivity, setRecentActivity] = useState<ActivityAuditLog[]>([]);
  const [billingData, setBillingData] = useState<BillingDashboardData | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      // Load user stats
      if (canManageUsers()) {
        const userResult = await UserService.getAllUsers();
        if (!userResult.error) {
          setStats(prev => ({
            ...prev,
            totalUsers: userResult.users.length,
            pendingApprovals: userResult.users.filter(u => !u.is_approved_by_super_admin).length
          }));
        }
      }

      // Load project data
      if (canManageProjects()) {
        const projectResult = await ProjectService.getAllProjects();
        if (!projectResult.error) {
          setStats(prev => ({
            ...prev,
            activeProjects: projectResult.projects.filter(p => p.status === 'active').length
          }));
        }
      }

      // Load billing data
      if (canAccessBilling()) {
        const billingResult = await BillingService.getBillingDashboard();
        if (!billingResult.error) {
          setBillingData(billingResult);
          setStats(prev => ({
            ...prev,
            totalRevenue: billingResult.totalRevenue,
            weeklyHours: billingResult.totalBillableHours
          }));
        }
      }

      // Load audit data
      if (canAccessAuditLogs()) {
        const auditSummaryResult = await AuditLogService.getActivitySummary(7);
        const recentLogsResult = await AuditLogService.getAuditLogs({ limit: 5 });
        
        if (!recentLogsResult.error) {
          setRecentActivity(recentLogsResult.logs);
        }
        
        if (!auditSummaryResult.error) {
          // Mock compliance score calculation
          setStats(prev => ({
            ...prev,
            complianceScore: 95 - (auditSummaryResult.securityEvents > 10 ? 20 : 0)
          }));
        }
      }

      // Load timesheet data
      const timesheetResult = await TimesheetService.getTimesheetDashboard();
      if (!timesheetResult.error) {
        setStats(prev => ({
          ...prev,
          weeklyHours: timesheetResult.totalHours
        }));
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, [canManageUsers, canManageProjects, canAccessBilling, canAccessAuditLogs]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleApproveUser = async (userId: string) => {
    if (canApproveUsers()) {
      const result = await UserService.approveUser(userId);
      if (result.success) {
        loadDashboardData(); // Refresh data
        alert('User approved successfully');
      } else {
        alert(`Error approving user: ${result.error}`);
      }
    }
  };

  const handleGenerateBilling = async () => {
    if (canAccessBilling()) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      const result = await BillingService.generateWeeklySnapshot(weekStartStr);
      if (!result.error && result.snapshots.length > 0) {
        loadDashboardData(); // Refresh data
        alert(`Generated ${result.snapshots.length} billing snapshots`);
      } else {
        alert(`Error generating billing: ${result.error || 'No snapshots generated'}`);
      }
    }
  };

  const handleExportReport = async (type: 'audit' | 'billing') => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      let result;
      if (type === 'audit' && canAccessAuditLogs()) {
        result = await AuditLogService.exportAuditLogs(startDate, endDate, 'csv');
      } else if (type === 'billing' && canAccessBilling()) {
        result = await BillingService.exportBillingReport(startDate, endDate, 'csv');
      }
      
      if (result?.success) {
        alert(`${type} report exported successfully`);
      } else {
        alert(`Error exporting ${type} report: ${result?.error}`);
      }
    } catch (error) {
      console.error(`Error exporting ${type} report:`, error);
      alert(`Error exporting ${type} report`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {currentRole === 'super_admin' ? 'Super Admin' : 'Management'} Dashboard
          </h1>
          <p className="text-gray-600">
            {currentRole === 'super_admin' 
              ? 'Complete system oversight and control'
              : 'Project and team management overview'
            }
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {canManageUsers() && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
              </div>
            </div>
          )}

          {canApproveUsers() && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</p>
                </div>
              </div>
            </div>
          )}

          {canManageProjects() && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
                </div>
              </div>
            </div>
          )}

          {canAccessBilling() && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats.totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {canApproveUsers() && (
                <button 
                  onClick={() => handleApproveUser('pending-user-1')}
                  className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <UserCheck className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-sm font-medium">Approve Pending Users</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              )}

              {canAccessBilling() && (
                <button 
                  onClick={handleGenerateBilling}
                  className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                  disabled={canViewOnlyBilling}
                >
                  <div className="flex items-center">
                    <DollarSign className="h-5 w-5 text-purple-600 mr-3" />
                    <span className="text-sm font-medium">
                      {canViewOnlyBilling ? 'View Weekly Billing' : 'Generate Weekly Billing'}
                    </span>
                    {canViewOnlyBilling && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        View Only
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              )}

              {canManageProjects() && (
                <button className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center">
                    <Target className="h-5 w-5 text-blue-600 mr-3" />
                    <span className="text-sm font-medium">Create New Project</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              )}

              {canAccessAuditLogs() && (
                <button 
                  onClick={() => handleExportReport('audit')}
                  className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <Download className="h-5 w-5 text-gray-600 mr-3" />
                    <span className="text-sm font-medium">Export Audit Report</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* System Health */}
          {canAccessAuditLogs() && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Compliance Score</span>
                  <div className="flex items-center">
                    <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                      <div 
                        className="h-2 bg-green-500 rounded-full" 
                        style={{ width: `${stats.complianceScore}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{stats.complianceScore}%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Security Events</span>
                  <span className="text-sm font-medium text-green-600">Low</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">System Performance</span>
                  <span className="text-sm font-medium text-green-600">Excellent</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {canAccessAuditLogs() && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center p-2 border-l-2 border-blue-500 bg-blue-50">
                    <Activity className="h-4 w-4 text-blue-600 mr-2" />
                    <div className="text-xs">
                      <p className="font-medium text-gray-900">{activity.actor_name}</p>
                      <p className="text-gray-600">{activity.action.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Billing Overview */}
        {canAccessBilling() && billingData && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                Billing Overview
                {canViewOnlyBilling && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    View Only
                  </span>
                )}
                {canApproveBilling && (
                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Approval Authority
                  </span>
                )}
              </h3>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleExportReport('billing')}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </button>
                {canApproveBilling && (
                  <button 
                    onClick={() => {
                      const now = new Date();
                      BillingService.approveMonthlyBilling(now.getFullYear(), now.getMonth() + 1);
                      alert('Monthly billing approved');
                    }}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Approve Monthly Billing
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600">Weekly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${billingData.weeklyRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-green-600">+{billingData.revenueGrowth}% from last week</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Billable Hours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {billingData.totalBillableHours.toFixed(1)}
                </p>
                <p className="text-sm text-gray-600">This week</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Avg. Hourly Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${billingData.averageHourlyRate.toFixed(0)}
                </p>
                <p className="text-sm text-gray-600">Across all projects</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {billingData.pendingApprovals}
                </p>
                <p className="text-sm text-gray-600">Awaiting review</p>
              </div>
            </div>
          </div>
        )}

        {/* Timesheet Management Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              Timesheet Management
              {canViewOnlyTimesheet && (
                <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  View Only
                </span>
              )}
              {canApproveTimesheets && (
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Approval Authority
                </span>
              )}
            </h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  // Navigate to team review
                  window.location.hash = '#team-review';
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Users className="h-4 w-4 mr-2" />
                View Team Review
              </button>
              {canApproveTimesheets && (
                <button 
                  onClick={() => {
                    // Mock timesheet approval
                    alert('Pending timesheets approved');
                  }}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Approve Timesheets
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Total Hours This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats.weeklyHours}</p>
              <p className="text-sm text-gray-600">Across all employees</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
              <p className="text-sm text-gray-600">Awaiting review</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Approval Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {canApproveTimesheets ? 'Authority' : 'View Only'}
              </p>
              <p className="text-sm text-gray-600">Your permission level</p>
            </div>
          </div>
        </div>

        {/* Role-specific sections */}
        {currentRole === 'super_admin' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 text-red-600 mr-2" />
              Super Admin Controls
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Settings className="h-5 w-5 text-gray-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">System Configuration</p>
                  <p className="text-sm text-gray-600">Manage global settings</p>
                </div>
              </button>
              
              <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <UserCheck className="h-5 w-5 text-gray-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">User Management</p>
                  <p className="text-sm text-gray-600">Full user control</p>
                </div>
              </button>
              
              <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <BarChart3 className="h-5 w-5 text-gray-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Analytics</p>
                  <p className="text-sm text-gray-600">Comprehensive reports</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
