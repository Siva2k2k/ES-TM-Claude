import React from 'react';
import { useAuth } from '../store/AuthContext';
import { Users, Activity, TrendingUp, Shield } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      name: 'Total Users',
      stat: '1,234',
      icon: Users,
      change: '+4.75%',
      changeType: 'increase',
    },
    {
      name: 'Active Sessions',
      stat: '89',
      icon: Activity,
      change: '+54.02%',
      changeType: 'increase',
    },
    {
      name: 'Growth Rate',
      stat: '12.5%',
      icon: TrendingUp,
      change: '+2.1%',
      changeType: 'increase',
    },
    {
      name: 'Security Score',
      stat: '98.2%',
      icon: Shield,
      change: '+0.5%',
      changeType: 'increase',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Here's what's happening with your account today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="bg-card overflow-hidden border border-border rounded-lg p-5"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <item.icon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">
                    {item.name}
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-foreground">
                      {item.stat}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm">
                <span
                  className={
                    item.changeType === 'increase'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }
                >
                  {item.change}
                </span>
                <span className="ml-2 text-muted-foreground">from last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {[
              {
                action: 'User logged in',
                time: '2 minutes ago',
                type: 'login',
              },
              {
                action: 'Profile updated',
                time: '1 hour ago',
                type: 'update',
              },
              {
                action: 'Password changed',
                time: '3 hours ago',
                type: 'security',
              },
              {
                action: 'New user registered',
                time: '5 hours ago',
                type: 'user',
              },
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div
                  className={`flex-shrink-0 w-2 h-2 rounded-full ${
                    activity.type === 'login'
                      ? 'bg-green-400'
                      : activity.type === 'security'
                      ? 'bg-red-400'
                      : activity.type === 'update'
                      ? 'bg-blue-400'
                      : 'bg-purple-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.action}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <button className="flex items-center justify-start p-3 text-sm font-medium text-foreground bg-accent hover:bg-accent/80 rounded-lg transition-colors">
              <Users className="h-4 w-4 mr-3" />
              Manage Users
            </button>
            <button className="flex items-center justify-start p-3 text-sm font-medium text-foreground bg-accent hover:bg-accent/80 rounded-lg transition-colors">
              <Shield className="h-4 w-4 mr-3" />
              Security Settings
            </button>
            <button className="flex items-center justify-start p-3 text-sm font-medium text-foreground bg-accent hover:bg-accent/80 rounded-lg transition-colors">
              <Activity className="h-4 w-4 mr-3" />
              View Analytics
            </button>
            <button className="flex items-center justify-start p-3 text-sm font-medium text-foreground bg-accent hover:bg-accent/80 rounded-lg transition-colors">
              <TrendingUp className="h-4 w-4 mr-3" />
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;