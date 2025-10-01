import React, { useState, useEffect } from 'react';
import { useRoleManager } from '../hooks/useRoleManager';
import { useAuth } from '../store/contexts/AuthContext';
import { BillingService } from '../services/BillingService';
import { ProjectService } from '../services/ProjectService';
import { UserService } from '../services/UserService';
import {
  BarChart3,
  Download,
  Calendar,
  Shield,
  TrendingUp,
  FileText,
  Users,
  DollarSign,
  Clock,
  Building,
  Filter,
  Search,
  PieChart,
  LineChart,
  Activity,
  Target,
  Plus,
  Settings,
  Eye,
  RefreshCw
} from 'lucide-react';
import type { Project, User } from '../types';
import { showSuccess, showError, showInfo } from '../utils/toast';

interface ReportData {
  name: string;
  description: string;
  type: 'financial' | 'timesheet' | 'project' | 'user' | 'custom';
  format: 'csv' | 'pdf' | 'excel';
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    projectIds?: string[];
    userIds?: string[];
    departments?: string[];
    status?: string[];
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    enabled: boolean;
    nextRun?: string;
  };
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'financial' | 'timesheet' | 'project' | 'user';
  category: string;
  defaultFilters: any;
  availableFormats: ('csv' | 'pdf' | 'excel')[];
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'financial-summary',
    name: 'Financial Summary Report',
    description: 'Comprehensive financial overview with revenue, billing, and profitability metrics',
    type: 'financial',
    category: 'Financial',
    defaultFilters: { period: 'monthly' },
    availableFormats: ['csv', 'pdf', 'excel']
  },
  {
    id: 'timesheet-utilization',
    name: 'Timesheet Utilization Report',
    description: 'Employee time tracking, utilization rates, and productivity analysis',
    type: 'timesheet',
    category: 'Time Tracking',
    defaultFilters: { period: 'weekly' },
    availableFormats: ['csv', 'excel']
  },
  {
    id: 'project-performance',
    name: 'Project Performance Report',
    description: 'Project status, budget utilization, team performance, and delivery metrics',
    type: 'project',
    category: 'Project Management',
    defaultFilters: { status: ['active', 'completed'] },
    availableFormats: ['csv', 'pdf', 'excel']
  },
  {
    id: 'employee-productivity',
    name: 'Employee Productivity Report',
    description: 'Individual and team productivity metrics, attendance, and performance tracking',
    type: 'user',
    category: 'Human Resources',
    defaultFilters: { roles: ['employee', 'lead'] },
    availableFormats: ['csv', 'excel']
  },
  {
    id: 'client-billing',
    name: 'Client Billing Report',
    description: 'Client-specific billing details, revenue breakdown, and payment tracking',
    type: 'financial',
    category: 'Client Management',
    defaultFilters: { groupBy: 'client' },
    availableFormats: ['csv', 'pdf']
  },
  {
    id: 'resource-allocation',
    name: 'Resource Allocation Report',
    description: 'Team allocation across projects, capacity planning, and workload distribution',
    type: 'project',
    category: 'Resource Management',
    defaultFilters: { includeCapacity: true },
    availableFormats: ['csv', 'excel']
  }
];

export const EnhancedReports: React.FC = () => {
  const { canExportReports, hasPermission, currentRole } = useRoleManager();
  const { currentUser } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState('templates');
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Report builder states
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [customReport, setCustomReport] = useState<ReportData | null>(null);
  const [showReportBuilder, setShowReportBuilder] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [reportHistory, setReportHistory] = useState<any[]>([]);

  useEffect(() => {
    if (hasPermission('reports_all')) {
      loadInitialData();
    }
  }, [hasPermission]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [projectsResult, usersResult] = await Promise.all([
        ProjectService.getAllProjects(),
        UserService.getAllUsers()
      ]);

      if (!projectsResult.error) {
        setProjects(projectsResult.projects);
      }

      if (!usersResult.error) {
        setUsers(usersResult.users);
      }

      // Load mock report history
      setReportHistory([
        {
          id: '1',
          name: 'Monthly Financial Summary - October 2024',
          type: 'financial',
          format: 'pdf',
          generatedAt: '2024-10-31T23:59:59Z',
          status: 'completed',
          downloadUrl: '#'
        },
        {
          id: '2',
          name: 'Weekly Timesheet Report - Week 43',
          type: 'timesheet',
          format: 'excel',
          generatedAt: '2024-10-27T18:30:00Z',
          status: 'completed',
          downloadUrl: '#'
        }
      ]);
    } catch (err) {
      setError('Failed to load initial data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (template: ReportTemplate, options: any) => {
    setLoading(true);
    try {
      const startDate = options.dateRange?.start || '';
      const endDate = options.dateRange?.end || '';
      const format = options.format || 'pdf';

      const result = await BillingService.exportBillingReport(startDate, endDate, format);

      if (result.error) {
        showError(`Report generation failed: ${result.error}`);
        return;
      }

      // Add to history
      const newReport = {
        id: Date.now().toString(),
        name: `${template.name} - ${new Date().toLocaleDateString()}`,
        type: template.type,
        format: format,
        generatedAt: new Date().toISOString(),
        status: 'completed',
        downloadUrl: result.downloadUrl || '#'
      };

      setReportHistory(prev => [newReport, ...prev]);
      showSuccess('Report generated successfully!');
    } catch (err) {
      showError('Report generation failed');
      console.error('Report generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = (report: any) => {
    // In a real implementation, this would trigger the actual download
    console.log('Downloading report:', report.name);
    showInfo(`Downloading: ${report.name}`);
  };

  const filteredTemplates = REPORT_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesType = typeFilter === 'all' || template.type === typeFilter;

    return matchesSearch && matchesCategory && matchesType;
  });

  const categories = Array.from(new Set(REPORT_TEMPLATES.map(t => t.category)));
  const types = Array.from(new Set(REPORT_TEMPLATES.map(t => t.type)));

  // Check if user can access reports (broader permission check)
  const canAccessReports = hasPermission('reports_all');

  if (!canAccessReports) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access Reports & Analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
              <p className="text-gray-600">
                {currentRole === 'super_admin'
                  ? 'Comprehensive system analytics and custom report generation'
                  : currentRole === 'management'
                  ? 'Organization-wide reporting and analytics'
                  : 'Team and project analytics with export capabilities'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowReportBuilder(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Custom Report
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('templates')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'templates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Report Templates
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Report History ({reportHistory.length})
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Live Analytics
              </button>
            </nav>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Report Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="relative">
                  <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <BarChart3 className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    {types.map(type => (
                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="text-sm text-gray-600 flex items-center">
                  Found {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Report Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <ReportTemplateCard
                  key={template.id}
                  template={template}
                  onGenerate={handleGenerateReport}
                  loading={loading}
                />
              ))}
            </div>
          </div>
        )}

        {/* Report History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Generated Reports</h3>
              </div>

              {reportHistory.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {reportHistory.map((report) => (
                    <div key={report.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-medium text-gray-900">{report.name}</h4>
                            <ReportTypeBadge type={report.type} />
                            <FormatBadge format={report.format} />
                          </div>
                          <div className="text-sm text-gray-600">
                            Generated on {new Date(report.generatedAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            report.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : report.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {report.status}
                          </span>

                          {report.status === 'completed' && (
                            <button
                              onClick={() => handleDownloadReport(report)}
                              className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Generated</h3>
                  <p className="text-gray-600 mb-6">Generate your first report using the templates above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <AnalyticsCard
                title="Active Projects"
                value={projects.filter(p => p.status === 'active').length.toString()}
                icon={Building}
                color="blue"
                trend="up"
                change="+12%"
              />
              <AnalyticsCard
                title="Total Users"
                value={users.length.toString()}
                icon={Users}
                color="green"
                trend="up"
                change="+5%"
              />
              <AnalyticsCard
                title="Avg. Utilization"
                value="87.3%"
                icon={Target}
                color="purple"
                trend="up"
                change="+3.2%"
              />
              <AnalyticsCard
                title="Report Views"
                value="1,247"
                icon={Eye}
                color="yellow"
                trend="down"
                change="-2.1%"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Generation Trends</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <LineChart className="h-12 w-12 mx-auto mb-2" />
                    <p>Chart visualization would appear here</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Report Types</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <PieChart className="h-12 w-12 mx-auto mb-2" />
                    <p>Chart visualization would appear here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Report Template Card Component
const ReportTemplateCard: React.FC<{
  template: ReportTemplate;
  onGenerate: (template: ReportTemplate, options: any) => void;
  loading: boolean;
}> = ({ template, onGenerate, loading }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'pdf' | 'excel'>('pdf');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'financial': return DollarSign;
      case 'timesheet': return Clock;
      case 'project': return Building;
      case 'user': return Users;
      default: return FileText;
    }
  };

  const TypeIcon = getTypeIcon(template.type);

  const handleGenerate = () => {
    onGenerate(template, {
      format: selectedFormat,
      dateRange,
      ...template.defaultFilters
    });
    setShowOptions(false);
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className={`p-2 rounded-lg ${
            template.type === 'financial' ? 'bg-green-100 text-green-600' :
            template.type === 'timesheet' ? 'bg-blue-100 text-blue-600' :
            template.type === 'project' ? 'bg-purple-100 text-purple-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            <TypeIcon className="h-6 w-6" />
          </div>
          <div className="ml-3">
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {template.category}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
        <p className="text-gray-600 text-sm mb-4">{template.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {template.availableFormats.map(format => (
              <span key={format} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                {format.toUpperCase()}
              </span>
            ))}
          </div>

          <button
            onClick={() => setShowOptions(true)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Generate
          </button>
        </div>
      </div>

      {/* Options Modal */}
      {showOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Generate {template.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as 'csv' | 'pdf' | 'excel')}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  {template.availableFormats.map(format => (
                    <option key={format} value={format}>{format.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="p-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowOptions(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Utility Components
const ReportTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const colorMap: { [key: string]: string } = {
    financial: 'bg-green-100 text-green-800',
    timesheet: 'bg-blue-100 text-blue-800',
    project: 'bg-purple-100 text-purple-800',
    user: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorMap[type] || 'bg-gray-100 text-gray-800'}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
};

const FormatBadge: React.FC<{ format: string }> = ({ format }) => (
  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
    {format.toUpperCase()}
  </span>
);

const AnalyticsCard: React.FC<{
  title: string;
  value: string;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'yellow';
  trend?: 'up' | 'down';
  change?: string;
}> = ({ title, value, icon: Icon, color, trend, change }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <span className={`ml-2 text-sm font-medium ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {change}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedReports;