import React from 'react';
import { useRoleManager } from '../hooks/useRoleManager';
import { BarChart3, Download, Calendar, Shield, TrendingUp, FileText, Users, DollarSign } from 'lucide-react';

export const Reports: React.FC = () => {
  const { canExportReports, currentRole } = useRoleManager();

  if (!canExportReports()) {
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

  const handleExportReport = (reportType: string) => {
    // In real implementation, this would call the appropriate service
    console.log(`Exporting ${reportType} report...`);
    alert(`${reportType} report export initiated. This would generate a downloadable file in a real implementation.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">
            {currentRole === 'super_admin' 
              ? 'Comprehensive system analytics and reports'
              : 'Team and project analytics'
            }
          </p>
        </div>

        {/* Report Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* User Reports */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">User Reports</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">User activity, performance, and attendance reports</p>
            <div className="space-y-2">
              <button 
                onClick={() => handleExportReport('User Activity')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                User Activity Report
              </button>
              <button 
                onClick={() => handleExportReport('Attendance')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Attendance Summary
              </button>
              <button 
                onClick={() => handleExportReport('Performance')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Performance Metrics
              </button>
            </div>
          </div>

          {/* Project Reports */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Project Reports</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">Project progress, budget, and resource utilization</p>
            <div className="space-y-2">
              <button 
                onClick={() => handleExportReport('Project Status')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Project Status Report
              </button>
              <button 
                onClick={() => handleExportReport('Budget Analysis')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Budget Analysis
              </button>
              <button 
                onClick={() => handleExportReport('Resource Utilization')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Resource Utilization
              </button>
            </div>
          </div>

          {/* Financial Reports */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Financial Reports</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">Revenue, billing, and financial analytics</p>
            <div className="space-y-2">
              <button 
                onClick={() => handleExportReport('Revenue Report')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Revenue Report
              </button>
              <button 
                onClick={() => handleExportReport('Billing Summary')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Billing Summary
              </button>
              <button 
                onClick={() => handleExportReport('Profit Analysis')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Profit Analysis
              </button>
            </div>
          </div>

          {/* Timesheet Reports */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Timesheet Reports</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">Time tracking, hours worked, and timesheet analytics</p>
            <div className="space-y-2">
              <button 
                onClick={() => handleExportReport('Time Summary')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Time Summary Report
              </button>
              <button 
                onClick={() => handleExportReport('Hours by Project')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Hours by Project
              </button>
              <button 
                onClick={() => handleExportReport('Overtime Analysis')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Overtime Analysis
              </button>
            </div>
          </div>

          {/* Analytics */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Analytics</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">Trends, forecasts, and business intelligence</p>
            <div className="space-y-2">
              <button 
                onClick={() => handleExportReport('Trend Analysis')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Trend Analysis
              </button>
              <button 
                onClick={() => handleExportReport('Productivity Metrics')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Productivity Metrics
              </button>
              <button 
                onClick={() => handleExportReport('Business Intelligence')}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
              >
                Business Intelligence
              </button>
            </div>
          </div>

          {/* Custom Reports */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Custom Reports</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">Create and schedule custom reports</p>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50">
                Create Custom Report
              </button>
              <button className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50">
                Scheduled Reports
              </button>
              <button className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50">
                Report Templates
              </button>
            </div>
          </div>
        </div>

        {/* Quick Export Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Export</h3>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => handleExportReport('All Data')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </button>
            
            <button 
              onClick={() => handleExportReport('Monthly Summary')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Monthly Summary
            </button>
            
            <button 
              onClick={() => handleExportReport('Executive Summary')}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Executive Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
