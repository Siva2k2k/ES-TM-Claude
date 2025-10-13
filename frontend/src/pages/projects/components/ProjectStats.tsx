import React from 'react';
import { Building2, CheckCircle, DollarSign, ListTodo, TrendingUp } from 'lucide-react';
import { StatsCard } from '../../dashboard/components';

interface ProjectAnalytics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  budgetUtilization: number;
}

interface ProjectStatsProps {
  analytics: ProjectAnalytics | null;
  loading?: boolean;
}

/**
 * ProjectStats Component
 * Displays project analytics fetched from backend
 *
 * Features:
 * - 6 Key metrics
 * - Reuses StatsCard from dashboard
 * - Calculated percentages
 * - Dark mode support
 * - Mobile-first responsive grid
 * - Backend data (no frontend computation)
 */
export const ProjectStats: React.FC<ProjectStatsProps> = ({
  analytics,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Calculate task completion rate (backend could provide this)
  const taskCompletionRate =
    analytics.totalTasks > 0
      ? Math.round((analytics.completedTasks / analytics.totalTasks) * 100)
      : 0;

  // Calculate project completion rate
  const projectCompletionRate =
    analytics.totalProjects > 0
      ? Math.round((analytics.completedProjects / analytics.totalProjects) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
      {/* Total Projects */}
      <StatsCard
        title="Total Projects"
        value={analytics.totalProjects}
        icon={Building2}
        color="blue"
      />

      {/* Active Projects */}
      <StatsCard
        title="Active Projects"
        value={analytics.activeProjects}
        icon={TrendingUp}
        color="green"
        subtitle={`${analytics.totalProjects - analytics.activeProjects} inactive`}
      />

      {/* Completed Projects */}
      <StatsCard
        title="Completed"
        value={analytics.completedProjects}
        icon={CheckCircle}
        color="purple"
        trend={projectCompletionRate > 50 ? { direction: 'up', value: `${projectCompletionRate}%` } : undefined}
        subtitle={`${projectCompletionRate}% completion rate`}
      />

      {/* Total Tasks */}
      <StatsCard
        title="Total Tasks"
        value={analytics.totalTasks}
        icon={ListTodo}
        color="indigo"
      />

      {/* Completed Tasks */}
      <StatsCard
        title="Tasks Done"
        value={analytics.completedTasks}
        icon={CheckCircle}
        color="green"
        subtitle={`${analytics.totalTasks - analytics.completedTasks} remaining`}
      />

      {/* Budget Utilization */}
      <StatsCard
        title="Budget Used"
        value={`${analytics.budgetUtilization}%`}
        icon={DollarSign}
        color={analytics.budgetUtilization > 90 ? 'red' : analytics.budgetUtilization > 75 ? 'yellow' : 'green'}
        trend={
          analytics.budgetUtilization > 100
            ? { direction: 'up', value: 'Over budget!' }
            : undefined
        }
        subtitle="of allocated budget"
      />
    </div>
  );
};
