import React from 'react';
import { useRoleManager } from '../hooks/useRoleManager';
import { BillingService } from '../services/BillingService';
import { DollarSign, Download, Calendar, Shield, TrendingUp, FileText, CreditCard } from 'lucide-react';

export const BillingManagement: React.FC = () => {
  const { canAccessBilling, hasPermission } = useRoleManager();
  const [billingData, setBillingData] = React.useState<any>(null);
  const [revenueByProject, setRevenueByProject] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Check specific permissions based on corrected role definitions
  const canApproveBilling = hasPermission('billing_monthly_approval');
  const canViewOnlyBilling = hasPermission('billing_view_only');
  const canGenerateSnapshots = hasPermission('billing_weekly_snapshots');

  // Load billing data from Supabase
  React.useEffect(() => {
    const loadBillingData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [dashboardResult, revenueResult] = await Promise.all([
          BillingService.getBillingDashboard(),
          BillingService.getRevenueByProject()
        ]);
        
        if (dashboardResult.error) {
          setError(dashboardResult.error);
        } else {
          setBillingData(dashboardResult);
        }
        
        if (!revenueResult.error) {
          setRevenueByProject(revenueResult.projects);
        }
      } catch (err) {
        setError('Failed to load billing data');
        console.error('Error loading billing data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (canAccessBilling()) {
      loadBillingData();
    }
  }, [canAccessBilling]);

  if (!canAccessBilling()) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access Billing Management.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Billing Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const handleGenerateSnapshot = async () => {
    if (!canGenerateSnapshots) {
      alert('You can only view billing data. Snapshot generation requires Management role.');
      return;
    }
    
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      const result = await BillingService.generateWeeklySnapshot(weekStartStr);
      if (result.error) {
        alert(`Error generating snapshots: ${result.error}`);
      } else {
        alert(`Generated ${result.snapshots.length} billing snapshots for week of ${weekStartStr}`);
      }
    } catch (err) {
      alert('Error generating billing snapshot');
      console.error('Error generating snapshot:', err);
    }
  };

  const handleApproveMonthly = async () => {
    if (!canApproveBilling) {
      alert('You can only view billing data. Monthly approval requires Management role.');
      return;
    }
    
    try {
      const now = new Date();
      const result = await BillingService.approveMonthlyBilling(now.getFullYear(), now.getMonth() + 1);
      if (result.success) {
        alert('Monthly billing approved successfully');
      } else {
        alert(`Error approving monthly billing: ${result.error}`);
      }
    } catch (err) {
      alert('Error approving monthly billing');
      console.error('Error approving monthly billing:', err);
    }
  };

  const handleExportReport = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const result = await BillingService.exportBillingReport(startDate, endDate, 'csv');
      if (result.success) {
        alert('Billing report exported successfully');
      } else {
        alert(`Error exporting report: ${result.error}`);
      }
    } catch (err) {
      alert('Error exporting billing report');
      console.error('Error exporting report:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            Billing Management
            {canViewOnlyBilling && (
              <span className="ml-3 text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                View Only
              </span>
            )}
            {canApproveBilling && (
              <span className="ml-3 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                Approval Authority
              </span>
            )}
          </h1>
          <p className="text-gray-600">
            {canViewOnlyBilling
              ? 'View billing data and reports for system oversight'
              : 'Complete billing control, approvals, and monthly processing'
            }
          </p>
        </div>

        {/* Dashboard Stats */}
        {billingData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${billingData.totalRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Weekly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${billingData.weeklyRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${billingData.averageHourlyRate.toFixed(0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <FileText className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{billingData.pendingApprovals}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Billing Actions
          </h3>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleGenerateSnapshot}
              disabled={canViewOnlyBilling}
              className={`flex items-center px-4 py-2 rounded-lg ${
                canViewOnlyBilling 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {canViewOnlyBilling ? 'View Snapshots' : 'Generate Weekly Snapshot'}
            </button>
            
            <button 
              onClick={handleApproveMonthly}
              disabled={canViewOnlyBilling}
              className={`flex items-center px-4 py-2 rounded-lg ${
                canViewOnlyBilling 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {canViewOnlyBilling ? 'View Monthly Billing' : 'Approve Monthly Billing'}
            </button>
            
            <button 
              onClick={handleExportReport}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Revenue by Project */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Project</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg. Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {revenueByProject.map((project) => (
                  <tr key={project.projectId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {project.projectName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${project.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {project.hours}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${project.rate.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Billing Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Billable Hours</span>
                <span className="text-sm font-medium text-gray-900">
                  {billingData.totalBillableHours.toFixed(1)}h
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Revenue Growth</span>
                <span className="text-sm font-medium text-green-600">
                  +{billingData.revenueGrowth}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${billingData.revenueGrowth}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};