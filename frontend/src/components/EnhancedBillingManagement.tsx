import React, { useState, useEffect } from 'react';
import { useRoleManager } from '../hooks/useRoleManager';
import { useAuth } from '../store/contexts/AuthContext';
import { BillingService } from '../services/BillingService';
import { ProjectService } from '../services/ProjectService';
import { UserService } from '../services/UserService';
import {
  DollarSign,
  Download,
  Calendar,
  Shield,
  TrendingUp,
  FileText,
  CreditCard,
  Filter,
  Search,
  Clock,
  Users,
  Building,
  Edit3,
  Save,
  X,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import type { Project, User } from '../types';
import { showSuccess, showError, showWarning } from '../utils/toast';

interface BillingSummary {
  total_revenue: number;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  average_rate: number;
  entries: Array<{
    id: string;
    name: string;
    hours: number;
    billable_hours: number;
    revenue: number;
    week_start: string;
    is_editable: boolean;
  }>;
}

interface EditingEntry {
  id: string;
  original_hours: number;
  new_hours: number;
}

export const EnhancedBillingManagement: React.FC = () => {
  const { canAccessBilling, hasPermission, currentRole } = useRoleManager();
  const { currentUser } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [billingData, setBillingData] = useState<any>(null);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [revenueByProject, setRevenueByProject] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [filterType, setFilterType] = useState<'project' | 'employee'>('project');
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Editing states
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Permission checks
  const canEditHours = hasPermission('billing_hours_edit') || ['management', 'super_admin'].includes(currentRole);
  const canGenerateReports = hasPermission('billing_reports') || ['management', 'super_admin'].includes(currentRole);

  useEffect(() => {
    if (canAccessBilling()) {
      loadInitialData();
    }
  }, [canAccessBilling]);

  useEffect(() => {
    if (canAccessBilling()) {
      loadBillingSummary();
    }
  }, [period, filterType, selectedFilter, dateRange]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardResult, revenueResult, projectsResult, usersResult] = await Promise.all([
        BillingService.getBillingDashboard(),
        BillingService.getRevenueByProject(),
        ProjectService.getAllProjects(),
        UserService.getAllUsers()
      ]);

      if (dashboardResult.error) {
        setError(dashboardResult.error);
      } else {
        setBillingData(dashboardResult);
      }

      if (!revenueResult.error) {
        setRevenueByProject(revenueResult.projects);
      }

      if (!projectsResult.error) {
        setProjects(projectsResult.projects);
      }

      if (!usersResult.error) {
        setUsers(usersResult.users);
      }
    } catch (err) {
      setError('Failed to load billing data');
      console.error('Error loading billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBillingSummary = async () => {
    if (!selectedFilter && filterType !== 'all') return;

    try {
      const result = await BillingService.getBillingSummary(
        period,
        filterType,
        selectedFilter,
        dateRange.start,
        dateRange.end
      );

      if (result.error) {
        setError(result.error);
      } else {
        setBillingSummary(result.summary);
      }
    } catch (err) {
      console.error('Error loading billing summary:', err);
    }
  };

  const handleEditHours = (entry: any) => {
    setEditingEntry({
      id: entry.id,
      original_hours: entry.hours,
      new_hours: entry.hours
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry || !canEditHours) return;

    try {
      const result = await BillingService.updateBillableHours(
        editingEntry.id,
        editingEntry.new_hours
      );

      if (result.error) {
        showError(`Error updating hours: ${result.error}`);
        return;
      }

      showSuccess('Hours updated successfully');
      setShowEditModal(false);
      setEditingEntry(null);
      loadBillingSummary();
    } catch (err) {
      showError('Error updating hours');
      console.error('Error updating hours:', err);
    }
  };

  const handleExportReport = async (format: 'csv' | 'pdf' | 'excel') => {
    if (!canGenerateReports) {
      showError('You do not have permission to generate reports');
      return;
    }

    try {
      const result = await BillingService.exportBillingReport(
        dateRange.start,
        dateRange.end,
        format
      );

      if (result.error) {
        showError(`Export failed: ${result.error}`);
        return;
      }

      // In a real implementation, this would trigger a download
      showSuccess(`${format.toUpperCase()} report generated successfully`);
    } catch (err) {
      showError('Export failed');
      console.error('Export error:', err);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing Management</h1>
          <p className="text-gray-600">
            {currentRole === 'super_admin' || currentRole === 'management'
              ? 'Complete billing overview with editing capabilities'
              : 'Billing summaries and reports for your managed projects'}
          </p>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dashboard
              </button>

              <button
                onClick={() => setActiveTab('summaries')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'summaries'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Billing Summaries
              </button>

              {canGenerateReports && (
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'reports'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Reports & Export
                </button>
              )}
            </nav>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && billingData && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                    <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${billingData.monthlyRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Billable Hours</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {billingData.totalBillableHours.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg. Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${billingData.averageHourlyRate.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue by Project */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Revenue by Project</h3>
              </div>
              <div className="p-6">
                {revenueByProject.length > 0 ? (
                  <div className="space-y-4">
                    {revenueByProject.slice(0, 10).map((project, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{project.projectName}</h4>
                          <p className="text-sm text-gray-600">{project.hours.toFixed(1)} hours</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">${project.revenue.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">${project.rate.toFixed(2)}/hr</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No project revenue data available</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summaries Tab */}
        {activeTab === 'summaries' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Filters</h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as 'weekly' | 'monthly')}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter By</label>
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value as 'project' | 'employee');
                      setSelectedFilter('');
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="project">Project</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {filterType === 'project' ? 'Select Project' : 'Select Employee'}
                  </label>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All {filterType === 'project' ? 'Projects' : 'Employees'}</option>
                    {filterType === 'project'
                      ? projects.map(project => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))
                      : users.filter(user => ['employee', 'lead', 'manager'].includes(user.role)).map(user => (
                          <option key={user.id} value={user.id}>
                            {user.full_name}
                          </option>
                        ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={loadBillingSummary}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Apply Filters
              </button>
            </div>

            {/* Summary Results */}
            {billingSummary && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-xl font-bold text-green-600">
                      ${billingSummary.total_revenue.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <p className="text-sm text-gray-600">Total Hours</p>
                    <p className="text-xl font-bold text-blue-600">
                      {billingSummary.total_hours.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <p className="text-sm text-gray-600">Billable Hours</p>
                    <p className="text-xl font-bold text-purple-600">
                      {billingSummary.billable_hours.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <p className="text-sm text-gray-600">Non-Billable</p>
                    <p className="text-xl font-bold text-gray-600">
                      {billingSummary.non_billable_hours.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <p className="text-sm text-gray-600">Avg. Rate</p>
                    <p className="text-xl font-bold text-yellow-600">
                      ${billingSummary.average_rate.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Detailed Entries */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Billing Entries</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Period
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Billable Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Revenue
                          </th>
                          {canEditHours && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {billingSummary.entries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {entry.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {entry.hours.toFixed(1)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {entry.billable_hours.toFixed(1)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${entry.revenue.toLocaleString()}
                            </td>
                            {canEditHours && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.is_editable && (
                                  <button
                                    onClick={() => handleEditHours(entry)}
                                    className="text-blue-600 hover:text-blue-900 flex items-center"
                                  >
                                    <Edit3 className="h-4 w-4 mr-1" />
                                    Edit
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && canGenerateReports && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Billing Reports</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <button
                  onClick={() => handleExportReport('csv')}
                  className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="text-center">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">CSV Export</h4>
                    <p className="text-sm text-gray-600">Spreadsheet format</p>
                  </div>
                </button>

                <button
                  onClick={() => handleExportReport('pdf')}
                  className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="text-center">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">PDF Report</h4>
                    <p className="text-sm text-gray-600">Formatted document</p>
                  </div>
                </button>

                <button
                  onClick={() => handleExportReport('excel')}
                  className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Excel Report</h4>
                    <p className="text-sm text-gray-600">With charts & analysis</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Hours Modal */}
        {showEditModal && editingEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Billable Hours</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Original Hours: {editingEntry.original_hours}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={editingEntry.new_hours}
                    onChange={(e) => setEditingEntry({
                      ...editingEntry,
                      new_hours: parseFloat(e.target.value) || 0
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};