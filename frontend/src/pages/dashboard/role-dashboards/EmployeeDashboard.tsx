import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Target, CheckCircle, Clock, Plus, FileText, TrendingUp } from 'lucide-react';
import type { EmployeeDashboardData } from '../../../services/DashboardService';
import {
  StatsCard,
  KPIWidget,
  LineChartCard,
  PieChartCard,
  AreaChartCard,
  GaugeChart,
  QuickActions,
  RecentActivity,
} from '../components';

interface EmployeeDashboardProps {
  data: EmployeeDashboardData;
}

/**
 * EmployeeDashboard Component
 * HIERARCHY: Foundation level - Personal productivity & time tracking
 * Individual work focus, timesheet management, task completion
 */
export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ data }) => {
  const navigate = useNavigate();

  // ========== DATA PREPARATION ==========
  const weeklyHoursTrend = data.weekly_hours_trend || [
    { name: 'Week 1', hours: 38, billable: 32 },
    { name: 'Week 2', hours: 42, billable: 36 },
    { name: 'Week 3', hours: 40, billable: 35 },
    { name: 'Week 4', hours: 40.5, billable: 35 },
    { name: 'Week 5', hours: 41, billable: 37 },
  ];

  const projectTimeDistribution = data.project_time_distribution || data.project_assignments.map((p) => ({
    name: p.project_name,
    value: p.hours_logged,
  }));

  const taskStatusData = data.task_status || [
    { name: 'Completed', value: data.personal_overview.completed_tasks },
    { name: 'In Progress', value: data.personal_overview.assigned_tasks },
  ];

  const billableRatio = data.personal_overview.weekly_hours > 0
    ? (data.timesheet_status.billable_hours / data.personal_overview.weekly_hours) * 100
    : 0;

  const productivityScore = data.personal_overview.assigned_tasks > 0
    ? (data.personal_overview.completed_tasks / data.personal_overview.assigned_tasks) * 100
    : 0;

  const quickActions = [
    {
      title: 'Submit Timesheet',
      description: 'Submit weekly hours',
      icon: Clock,
      onClick: () => navigate('/dashboard/timesheets?modal=create'),
      color: 'blue' as const,
    },
    {
      title: 'View Projects',
      description: 'See assignments',
      icon: Building2,
      onClick: () => navigate('/dashboard/projects'),
      color: 'purple' as const,
    },
    {
      title: 'View Tasks',
      description: 'Check your tasks',
      icon: CheckCircle,
      onClick: () => navigate('/dashboard/projects/tasks'),
      color: 'green' as const,
    },
    {
      title: 'View Reports',
      description: 'Access reports',
      icon: FileText,
      onClick: () => navigate('/dashboard/reports'),
      color: 'orange' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* HIERARCHY LEVEL 1: Personal Performance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GaugeChart
          title="Productivity Score"
          value={productivityScore}
          max={100}
          unit="%"
          thresholds={{ low: 60, medium: 80, high: 100 }}
          colors={{ low: '#EF4444', medium: '#F59E0B', high: '#10B981' }}
          height={180}
        />

        <KPIWidget
          title="Weekly Hours"
          value={data.personal_overview.weekly_hours}
          format="hours"
          icon={Clock}
          color="blue"
          target={40}
          comparison={{ period: 'WoW', previousValue: data.personal_overview.weekly_hours - 2, change: 2, changePercentage: 5 }}
          sparklineData={weeklyHoursTrend.map((w) => w.hours)}
        />

        <KPIWidget
          title="Billable Ratio"
          value={billableRatio}
          format="percentage"
          icon={TrendingUp}
          color="green"
          target={85}
          subtitle={`${data.timesheet_status.billable_hours}h billable`}
        />
      </div>

      {/* HIERARCHY LEVEL 2: Personal Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Current Projects"
          value={data.personal_overview.current_projects}
          icon={Building2}
          color="blue"
          subtitle="Active assignments"
        />
        <StatsCard
          title="Assigned Tasks"
          value={data.personal_overview.assigned_tasks}
          icon={Target}
          color="yellow"
          subtitle="In progress"
        />
        <StatsCard
          title="Completed Tasks"
          value={data.personal_overview.completed_tasks}
          icon={CheckCircle}
          color="green"
          subtitle="This month"
        />
        <StatsCard
          title="Weekly Hours"
          value={data.personal_overview.weekly_hours.toFixed(1)}
          icon={Clock}
          color="purple"
          subtitle={`${data.timesheet_status.billable_hours.toFixed(1)} billable`}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />

      {/* HIERARCHY LEVEL 3: Timesheet Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 border border-transparent dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Current Timesheet Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Week</div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{data.timesheet_status.current_week}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</div>
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                data.timesheet_status.status === 'approved'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : data.timesheet_status.status === 'pending_approval'
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              {data.timesheet_status.status}
            </span>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Hours</div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{data.timesheet_status.total_hours.toFixed(1)}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Billable Hours</div>
            <div className="font-semibold text-green-600 dark:text-green-400">{data.timesheet_status.billable_hours.toFixed(1)}</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Action</div>
            {data.timesheet_status.can_submit ? (
              <button
                onClick={() => navigate('/dashboard/timesheets?modal=create')}
                className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                Submit
              </button>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">Submitted</span>
            )}
          </div>
        </div>
      </div>

      {/* HIERARCHY LEVEL 4: Time Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AreaChartCard
          title="Weekly Hours Trend"
          data={weeklyHoursTrend}
          dataKeys={[
            { key: 'hours', color: '#3B82F6', name: 'Total Hours' },
            { key: 'billable', color: '#10B981', name: 'Billable Hours' },
          ]}
          height={300}
        />

        <PieChartCard title="Task Status Distribution" data={taskStatusData} dataKey="value" nameKey="name" height={300} />
      </div>

      {/* HIERARCHY LEVEL 5: Project Time Distribution */}
      {projectTimeDistribution.length > 0 && (
        <PieChartCard
          title="Project Time Distribution"
          data={projectTimeDistribution}
          dataKey="value"
          nameKey="name"
          height={300}
        />
      )}

      {/* HIERARCHY LEVEL 6: Project Assignments & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Assignments */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 border border-transparent dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Assignments</h3>
          </div>
          <div className="p-6 space-y-4">
            {data.project_assignments.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No project assignments</p>
            ) : (
              data.project_assignments.map((assignment, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{assignment.project_name}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                        {assignment.role}
                      </span>
                      {assignment.is_billable && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                          Billable
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>{assignment.active_tasks} active tasks</div>
                    <div>{assignment.hours_logged.toFixed(1)} hours logged</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivity activities={data.recent_activity} maxItems={8} />
      </div>
    </div>
  );
};

export default EmployeeDashboard;
