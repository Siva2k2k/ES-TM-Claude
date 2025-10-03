import * as React from 'react';
import { useAuth } from '../../store/contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Progress } from '../../components/ui/Progress';
import { Clock, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDate, formatDuration } from '../../utils/formatting';

/**
 * DashboardPage Component
 * Main dashboard with role-specific content
 * Example implementation using new components
 */
export const DashboardPage: React.FC = () => {
  const { currentUser, currentUserRole } = useAuth();
  const permissions = usePermissions();

  // Mock data
  const stats = [
    {
      label: 'Hours This Week',
      value: '40.5',
      change: '+5%',
      icon: Clock,
      color: 'text-blue-600',
    },
    {
      label: 'Projects Active',
      value: '8',
      change: '+2',
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      label: 'Tasks Completed',
      value: '24',
      change: '+12',
      icon: CheckCircle,
      color: 'text-purple-600',
    },
    {
      label: 'Pending Approvals',
      value: '3',
      change: '-1',
      icon: AlertCircle,
      color: 'text-yellow-600',
    },
  ];

  const recentTimesheets = [
    {
      id: 1,
      week: 'Week of Sep 25',
      hours: 42.5,
      status: 'approved' as const,
      date: '2025-09-30',
    },
    {
      id: 2,
      week: 'Week of Oct 2',
      hours: 40.5,
      status: 'submitted' as const,
      date: '2025-10-06',
    },
    {
      id: 3,
      week: 'Week of Oct 9',
      hours: 8.0,
      status: 'draft' as const,
      date: '2025-10-10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${currentUser?.full_name || 'User'}!`}
        description={`Here's what's happening with your work today.`}
        actions={
          <Button>
            <Clock className="w-4 h-4 mr-2" />
            New Timesheet
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                      {stat.value}
                    </p>
                    <p className="text-sm text-green-600 mt-1">{stat.change} from last week</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-slate-50`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Timesheets */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Timesheets</CardTitle>
            <CardDescription>Your recent timesheet submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTimesheets.map((timesheet) => (
                <div
                  key={timesheet.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">{timesheet.week}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {formatDuration(timesheet.hours)} • {formatDate(timesheet.date)}
                    </p>
                  </div>
                  <StatusBadge status={timesheet.status} type="timesheet" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
            <CardDescription>Current week status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Hours Logged</span>
                  <span className="text-sm font-bold text-slate-900">40.5 / 40</span>
                </div>
                <Progress value={40.5} max={40} variant="success" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Tasks Completed</span>
                  <span className="text-sm font-bold text-slate-900">8 / 12</span>
                </div>
                <Progress value={8} max={12} variant="default" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Projects Active</span>
                  <span className="text-sm font-bold text-slate-900">5 / 8</span>
                </div>
                <Progress value={5} max={8} variant="warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role-specific section */}
      {permissions.canManageUsers && (
        <Card>
          <CardHeader>
            <CardTitle>Management Overview</CardTitle>
            <CardDescription>Team and organizational metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Additional management metrics and team overview would appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
