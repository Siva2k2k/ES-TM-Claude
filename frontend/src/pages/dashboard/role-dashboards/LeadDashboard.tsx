import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, CheckCircle, AlertCircle, Users, Plus, ListTodo, TrendingUp, Clock } from 'lucide-react';
import type { LeadDashboardData } from '../../../services/DashboardService';
import {
  StatsCard,
  KPIWidget,
  LineChartCard,
  BarChartCard,
  PieChartCard,
  QuickActions,
  ProgressTracker,
  type ProgressItem,
} from '../components';

interface LeadDashboardProps {
  data: LeadDashboardData;
}

/**
 * LeadDashboard Component
 * HIERARCHY: Has ALL Employee features + Task Coordination & Team Leadership
 * Task management, team collaboration, project coordination
 */
export const LeadDashboard: React.FC<LeadDashboardProps> = ({ data }) => {
  const navigate = useNavigate();

  // ========== DATA PREPARATION ==========
  const taskTrend = data.task_completion_trend || [
    { name: 'Week 1', completed: 12, pending: 8 },
    { name: 'Week 2', completed: 14, pending: 7 },
    { name: 'Week 3', completed: 15, pending: 8 },
    { name: 'Week 4', completed: 15, pending: 6 },
    { name: 'Week 5', completed: 18, pending: 5 },
  ];

  const teamWorkload = data.team_workload || data.team_collaboration.map((m) => ({
    name: m.user_name.split(' ')[0],
    tasks: m.pending_tasks,
  }));

  const taskStatusData = [
    { name: 'Completed', value: data.task_overview.completed_tasks },
    { name: 'In Progress', value: data.task_overview.assigned_tasks },
    { name: 'Overdue', value: data.task_overview.overdue_tasks },
  ];

  // Project progress items
  const projectProgress: ProgressItem[] = data.project_coordination.slice(0, 4).map((p, idx) => ({
    id: p.project_id,
    title: p.project_name,
    subtitle: `${p.team_size} members • ${p.my_role}`,
    progress: p.completion_percentage,
    status: p.completion_percentage >= 75 ? 'in_progress' : p.completion_percentage >= 50 ? 'in_progress' : 'at_risk',
    owner: 'Me',
  }));

  const completionRate = data.task_overview.assigned_tasks > 0
    ? (data.task_overview.completed_tasks / (data.task_overview.completed_tasks + data.task_overview.assigned_tasks)) * 100
    : 0;

  const quickActions = [
    { title: 'Create Task', description: 'Add new task', icon: Plus, onClick: () => navigate('/dashboard/projects/tasks'), color: 'blue' as const },
    { title: 'View Tasks', description: 'All team tasks', icon: ListTodo, onClick: () => navigate('/dashboard/projects/tasks'), color: 'purple' as const },
    { title: 'Projects', description: 'Coordinate projects', icon: Target, onClick: () => navigate('/dashboard/projects'), color: 'green' as const },
    { title: 'Team', description: 'Team collaboration', icon: Users, onClick: () => navigate('/dashboard/team'), color: 'orange' as const },
  ];

  return (
    <div className="space-y-6">
      {/* HIERARCHY LEVEL 1: Leadership KPIs (Lead Exclusive) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPIWidget
          title="Task Completion Rate"
          value={completionRate}
          format="percentage"
          icon={TrendingUp}
          color="green"
          target={85}
          comparison={{ period: 'WoW', previousValue: completionRate - 8, change: 8, changePercentage: 10 }}
          sparklineData={taskTrend.map((t) => (t.completed / (t.completed + t.pending)) * 100)}
        />

        <KPIWidget
          title="Team Tasks"
          value={data.task_overview.team_tasks}
          format="number"
          icon={Users}
          color="purple"
          subtitle={`${data.task_overview.assigned_tasks} assigned to me`}
        />

        <KPIWidget
          title="Overdue Tasks"
          value={data.task_overview.overdue_tasks}
          format="number"
          icon={AlertCircle}
          color="red"
          alerts={data.task_overview.overdue_tasks > 0 ? [{ type: 'critical', message: `${data.task_overview.overdue_tasks} tasks need attention` }] : []}
        />
      </div>

      {/* HIERARCHY LEVEL 2: Task Overview (From Employee + Lead data) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard title="Assigned Tasks" value={data.task_overview.assigned_tasks} icon={Target} color="blue" subtitle="My tasks" />
        <StatsCard title="Completed" value={data.task_overview.completed_tasks} icon={CheckCircle} color="green" trend={{ direction: 'up', value: '+12%' }} />
        <StatsCard title="Overdue" value={data.task_overview.overdue_tasks} icon={AlertCircle} color="red" />
        <StatsCard title="Team Total" value={data.task_overview.team_tasks} icon={Users} color="purple" />
      </div>

      {/* Quick Actions */}
      <QuickActions actions={quickActions} />

      {/* HIERARCHY LEVEL 3: Task & Team Performance (Lead features) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChartCard
          title="Task Completion Trend"
          data={taskTrend}
          dataKeys={[
            { key: 'completed', color: '#10B981', name: 'Completed' },
            { key: 'pending', color: '#F59E0B', name: 'Pending' },
          ]}
          height={300}
        />

        <BarChartCard
          title="Team Workload Distribution"
          data={teamWorkload}
          dataKeys={[{ key: 'tasks', color: '#3B82F6', name: 'Active Tasks' }]}
          height={300}
        />
      </div>

      {/* HIERARCHY LEVEL 4: Task Status & Project Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard title="Task Status Distribution" data={taskStatusData} dataKey="value" nameKey="name" height={300} />

        <ProgressTracker title="Project Coordination" items={projectProgress} showPercentage maxItems={5} />
      </div>

      {/* HIERARCHY LEVEL 5: Project & Team Details (Employee features inherited) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 border border-transparent dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">My Projects</h3>
          <div className="space-y-4">
            {data.project_coordination.map((project, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{project.project_name}</h4>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                    {project.my_role}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center"><Users className="w-3 h-3 mr-1" />{project.team_size} members</span>
                    <span className="flex items-center"><Target className="w-3 h-3 mr-1" />{project.active_tasks} tasks</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${project.completion_percentage}%` }} />
                  </div>
                  <div className="text-xs text-right">{project.completion_percentage}% complete</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6 border border-transparent dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Team Collaboration</h3>
          <div className="space-y-3">
            {data.team_collaboration.map((member, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{member.user_name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {member.shared_projects} shared projects • {member.pending_tasks} pending tasks
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600 dark:text-green-400">
                    {member.collaboration_score}/100
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">score</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDashboard;
