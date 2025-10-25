import React from 'react';
import { Building2, Target, CheckSquare, Clock } from 'lucide-react';

interface ProjectAnalytics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  budgetUtilization: number;
}

interface ProjectAnalyticsTabProps {
  analytics: ProjectAnalytics | null;
}

/**
 * ProjectAnalyticsTab Component
 * Displays project analytics with metric cards
 *
 * Features:
 * - Total projects count
 * - Active projects count
 * - Total tasks count
 * - Completed tasks count
 * - Gradient background cards
 * - Responsive grid layout
 */
export const ProjectAnalyticsTab: React.FC<ProjectAnalyticsTabProps> = ({ analytics }) => {
  if (!analytics) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Projects */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium opacity-90">Total Projects</p>
              <p className="text-3xl font-bold">{analytics.totalProjects}</p>
            </div>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Target className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium opacity-90">Active Projects</p>
              <p className="text-3xl font-bold">{analytics.activeProjects}</p>
            </div>
          </div>
        </div>

        {/* Total Tasks */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium opacity-90">Total Tasks</p>
              <p className="text-3xl font-bold">{analytics.totalTasks}</p>
            </div>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium opacity-90">Completed Tasks</p>
              <p className="text-3xl font-bold">{analytics.completedTasks}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
