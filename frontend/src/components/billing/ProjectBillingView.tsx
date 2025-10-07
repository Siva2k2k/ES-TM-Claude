import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  Clock,
  DollarSign,
  Building,
  Filter,
  Download,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface ProjectBillingData {
  project_id: string;
  project_name: string;
  client_name?: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  total_amount: number;
  resources: ResourceBillingData[];
}

interface ResourceBillingData {
  user_id: string;
  user_name: string;
  role: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  hourly_rate: number;
  total_amount: number;
  weekly_breakdown?: WeeklyBreakdown[];
}

interface WeeklyBreakdown {
  week_start: string;
  total_hours: number;
  billable_hours: number;
  amount: number;
}

interface ProjectBillingResponse {
  projects: ProjectBillingData[];
  summary: {
    total_projects: number;
    total_hours: number;
    total_billable_hours: number;
    total_amount: number;
  };
  period: {
    startDate: string;
    endDate: string;
    view: string;
  };
}

export const ProjectBillingView: React.FC = () => {
  const [data, setData] = useState<ProjectBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });
  const [view, setView] = useState<'weekly' | 'monthly'>('monthly');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [editingHours, setEditingHours] = useState<{
    projectId: string;
    userId: string;
    originalBillable: number;
    newBillable: number;
  } | null>(null);

  useEffect(() => {
    loadProjectBillingData();
  }, [startDate, endDate, view, selectedProjects]);

  const loadProjectBillingData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        view
      });

      if (selectedProjects.length > 0) {
        params.append('projectIds', selectedProjects.join(','));
      }

      const response = await fetch(`/api/v1/project-billing/projects?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        console.error('Failed to load project billing data:', result.error);
      }
    } catch (error) {
      console.error('Error loading project billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProjectExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const startEditingHours = (projectId: string, userId: string, currentBillable: number) => {
    setEditingHours({
      projectId,
      userId,
      originalBillable: currentBillable,
      newBillable: currentBillable
    });
  };

  const saveHoursEdit = async () => {
    if (!editingHours) return;

    try {
      const response = await fetch('/api/v1/project-billing/billable-hours', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: editingHours.userId,
          project_id: editingHours.projectId,
          start_date: startDate,
          end_date: endDate,
          billable_hours: editingHours.newBillable,
          total_hours: editingHours.originalBillable, // Pass original for reference
          reason: 'Manual adjustment from project billing view'
        })
      });

      const result = await response.json();
      if (result.success) {
        setEditingHours(null);
        await loadProjectBillingData(); // Reload data
        alert(`Successfully updated ${result.data.entries_updated} time entries`);
      } else {
        alert(`Failed to update hours: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating billable hours:', error);
      alert('Failed to update billable hours');
    }
  };

  const cancelHoursEdit = () => {
    setEditingHours(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Project Billing View</h1>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">View</label>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as 'weekly' | 'monthly')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.total_projects}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{formatHours(data.summary.total_hours)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Billable Hours</p>
                <p className="text-2xl font-bold text-gray-900">{formatHours(data.summary.total_billable_hours)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.summary.total_amount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project List */}
      {data && (
        <div className="space-y-4">
          {data.projects.map((project) => (
            <div key={project.project_id} className="bg-white rounded-lg shadow border">
              {/* Project Header */}
              <div 
                className="p-4 border-b cursor-pointer hover:bg-gray-50"
                onClick={() => toggleProjectExpansion(project.project_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {expandedProjects.has(project.project_id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{project.project_name}</h3>
                      {project.client_name && (
                        <p className="text-sm text-gray-500">{project.client_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <p className="font-medium text-gray-900">{formatHours(project.total_hours)}</p>
                      <p className="text-gray-500">Total Hours</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-green-600">{formatHours(project.billable_hours)}</p>
                      <p className="text-gray-500">Billable</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-600">{formatHours(project.non_billable_hours)}</p>
                      <p className="text-gray-500">Non-billable</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-blue-600">{formatCurrency(project.total_amount)}</p>
                      <p className="text-gray-500">Amount</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Resource Details */}
              {expandedProjects.has(project.project_id) && (
                <div className="p-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Resources</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Resource
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Billable Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {project.resources.map((resource) => (
                          <tr key={resource.user_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {resource.user_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {resource.role}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatHours(resource.total_hours)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {editingHours?.projectId === project.project_id && 
                               editingHours?.userId === resource.user_id ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={resource.total_hours}
                                    value={editingHours.newBillable}
                                    onChange={(e) => setEditingHours({
                                      ...editingHours,
                                      newBillable: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-20 px-2 py-1 text-sm border rounded"
                                  />
                                  <button
                                    onClick={saveHoursEdit}
                                    className="p-1 text-green-600 hover:text-green-800"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={cancelHoursEdit}
                                    className="p-1 text-red-600 hover:text-red-800"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-green-600 font-medium">
                                  {formatHours(resource.billable_hours)}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(resource.hourly_rate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                              {formatCurrency(resource.total_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editingHours?.projectId === project.project_id && 
                               editingHours?.userId === resource.user_id ? null : (
                                <button
                                  onClick={() => startEditingHours(
                                    project.project_id, 
                                    resource.user_id, 
                                    resource.billable_hours
                                  )}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Weekly Breakdown (if view is weekly) */}
                  {view === 'weekly' && project.resources[0]?.weekly_breakdown && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Weekly Breakdown</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {project.resources[0].weekly_breakdown.map((week) => (
                          <div key={week.week_start} className="bg-gray-50 p-3 rounded">
                            <p className="text-sm font-medium">Week of {new Date(week.week_start).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-600">{formatHours(week.billable_hours)} billable</p>
                            <p className="text-xs text-blue-600">{formatCurrency(week.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!data?.projects.length && !loading && (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No project billing data found for the selected period.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectBillingView;