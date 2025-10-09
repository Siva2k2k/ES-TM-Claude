import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { dashboardService, DashboardStats, UserAnalytics, AdminAnalytics, SuperAdminAnalytics } from '../services/dashboardService';
import { toast } from '../hooks/useToast';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Shield, 
  UserCheck,
  UserX,
  Calendar,
  BarChart3,
  Settings,
  Loader2
} from 'lucide-react';

export function DashboardPage() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    const fetchData = async () => {
      if (!isMounted) return;
      await loadDashboardData(isMounted, abortController.signal);
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const loadDashboardData = async (isMounted: boolean = true, signal?: AbortSignal) => {
    try {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      const response = await dashboardService.getDashboardData('30d');
      
      if (!isMounted) return;
      
      if (response.success && response.data) {
        setDashboardData(response.data);
      } else {
        setError(response.message || 'Failed to load dashboard data');
      }
    } catch (err: any) {
      if (!isMounted || signal?.aborted) return;
      
      console.error('Dashboard data error:', err);
      setError(err.message || 'Failed to load dashboard data');
      
      // If user doesn't have admin access, show limited dashboard
      if (err.message?.includes('Access denied') || err.message?.includes('403')) {
        setError(null); // Clear error for non-admin users
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }
  };

  const getActivityColor = (action: string): string => {
    switch (action.toLowerCase()) {
      case 'user_login':
      case 'user_registered':
        return 'bg-green-400';
      case 'user_logout':
        return 'bg-blue-400';
      case 'password_changed':
      case 'email_verified':
        return 'bg-purple-400';
      case 'user_deleted':
      case 'bulk_delete':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  const formatActionText = (action: string): string => {
    return action.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStats = () => {
    if (!dashboardData) {
      if (hasRole(['Admin', 'SuperAdmin'])) {
        // Return loading placeholders for admin users
        return [
          { name: 'Total Users', stat: '...', icon: Users, change: '...', changeType: 'increase' as const },
          { name: 'Active Users', stat: '...', icon: UserCheck, change: '...', changeType: 'increase' as const },
          { name: 'New This Month', stat: '...', icon: TrendingUp, change: '...', changeType: 'increase' as const },
          { name: 'System Activity', stat: '...', icon: Activity, change: '...', changeType: 'increase' as const },
        ];
      } else {
        // Basic stats for regular users
        return [
          { name: 'Profile Status', stat: user?.isEmailVerified ? 'Verified' : 'Unverified', icon: UserCheck, change: '', changeType: 'increase' as const },
          { name: 'Account Type', stat: user?.role || 'User', icon: Shield, change: '', changeType: 'increase' as const },
          { name: 'Member Since', stat: user?.createdAt ? new Date(user.createdAt).getFullYear().toString() : '2024', icon: Calendar, change: '', changeType: 'increase' as const },
          { name: 'Last Login', stat: user?.lastLogin ? 'Recent' : 'New', icon: Activity, change: '', changeType: 'increase' as const },
        ];
      }
    }

    // Handle role-based data display
    if (dashboardService.isUserAnalytics(dashboardData)) {
      // User-level analytics
      const { profile } = dashboardData;
      return [
        { name: 'Profile Status', stat: profile.status, icon: UserCheck, change: '', changeType: 'increase' as const },
        { name: 'Account Type', stat: profile.accountType, icon: Shield, change: '', changeType: 'increase' as const },
        { name: 'Member Since', stat: profile.memberSince, icon: Calendar, change: '', changeType: 'increase' as const },
        { name: 'Last Active', stat: profile.lastActive, icon: Activity, change: '', changeType: 'increase' as const },
      ];
    } else if (dashboardService.isAdminAnalytics(dashboardData) || dashboardService.isSuperAdminAnalytics(dashboardData)) {
      // Admin/SuperAdmin level analytics
      const { users, system } = dashboardData;
      const totalUsers = users.totalUsers || users.total || 0;
      const activeUsers = users.active || 0;
      const newThisMonth = users.newUsersThisMonth || 0;
      const systemActivity = system.logsToday || 0;

      // Calculate growth rates (mock calculation for now)
      const userGrowth = users.newUsersThisWeek > 0 ? '+' + ((users.newUsersThisWeek / Math.max(totalUsers - users.newUsersThisWeek, 1)) * 100).toFixed(1) + '%' : '0%';
      const activityGrowth = system.logsThisWeek > system.logsToday ? '+' + (((system.logsThisWeek - system.logsToday) / Math.max(system.logsToday, 1)) * 100).toFixed(1) + '%' : '0%';

      return [
        {
          name: 'Total Users',
          stat: formatNumber(totalUsers),
          icon: Users,
          change: userGrowth,
          changeType: 'increase' as const,
        },
        {
          name: 'Active Users',
          stat: formatNumber(activeUsers),
          icon: UserCheck,
          change: `${Math.round((activeUsers / Math.max(totalUsers, 1)) * 100)}%`,
          changeType: 'increase' as const,
        },
        {
          name: 'New This Month',
          stat: formatNumber(newThisMonth),
          icon: TrendingUp,
          change: `+${newThisMonth}`,
          changeType: 'increase' as const,
        },
        {
          name: 'System Activity',
          stat: formatNumber(systemActivity),
          icon: Activity,
          change: activityGrowth,
          changeType: 'increase' as const,
        },
      ];
    }

    // Fallback to basic user stats
    return [
      { name: 'Profile Status', stat: user?.isEmailVerified ? 'Verified' : 'Unverified', icon: UserCheck, change: '', changeType: 'increase' as const },
      { name: 'Account Type', stat: user?.role || 'User', icon: Shield, change: '', changeType: 'increase' as const },
      { name: 'Member Since', stat: user?.createdAt ? new Date(user.createdAt).getFullYear().toString() : '2024', icon: Calendar, change: '', changeType: 'increase' as const },
      { name: 'Last Login', stat: user?.lastLogin ? 'Recent' : 'New', icon: Activity, change: '', changeType: 'increase' as const },
    ];
  };

  const getRecentActivity = () => {
    // For user analytics, show mock personal activity
    if (dashboardData && dashboardService.isUserAnalytics(dashboardData)) {
      return [
        { action: 'Logged in', time: '2 minutes ago', type: 'login' },
        { action: 'Profile viewed', time: '1 hour ago', type: 'view' },
        { action: 'Settings updated', time: '2 days ago', type: 'update' },
      ];
    }

    // For admin/superadmin, show actual system activity if available
    if (dashboardData && (dashboardService.isAdminAnalytics(dashboardData) || dashboardService.isSuperAdminAnalytics(dashboardData))) {
      if (dashboardData.recentActivity && dashboardData.recentActivity.length > 0) {
        return dashboardData.recentActivity.slice(0, 4).map(activity => ({
          action: formatActionText(activity.action),
          time: formatRelativeTime(activity.timestamp),
          type: activity.action.toLowerCase(),
        }));
      }
    }

    // Default/fallback activity
    return [
      { action: 'User logged in', time: '2 minutes ago', type: 'login' },
      { action: 'Profile updated', time: '1 hour ago', type: 'update' },
      { action: 'New user registered', time: '3 hours ago', type: 'user' },
    ];
  };

  const stats = getStats();
  const recentActivity = getRecentActivity();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center space-x-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Loading Dashboard...
              </h1>
              <p className="text-muted-foreground">
                Please wait while we fetch your data.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          {hasRole(['Admin', 'SuperAdmin']) 
            ? "Here's your system overview and recent activity." 
            : "Here's your account overview and recent activity."
          }
        </p>
        {error && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              Limited data available: {error}
            </p>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="bg-card overflow-hidden border border-border rounded-lg p-5 hover:shadow-md transition-shadow"
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
            {item.change && (
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
                  <span className="ml-2 text-muted-foreground">from last period</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent activity and quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div
                  className={`flex-shrink-0 w-2 h-2 rounded-full ${getActivityColor(activity.type)}`}
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
          {dashboardData && (dashboardService.isAdminAnalytics(dashboardData) || dashboardService.isSuperAdminAnalytics(dashboardData)) && 
           dashboardData.recentActivity && dashboardData.recentActivity.length > 4 && (
            <div className="mt-4 pt-4 border-t border-border">
              <button 
                onClick={() => navigate('/admin/audit-logs')}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                View all activity →
              </button>
            </div>
          )}
        </div>

        {/* Quick actions card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {hasRole(['Admin', 'SuperAdmin']) && (
              <button 
                onClick={() => navigate('/admin/users')}
                className="flex items-center justify-start p-3 text-sm font-medium text-foreground bg-accent hover:bg-accent/80 rounded-lg transition-colors"
              >
                <Users className="h-4 w-4 mr-3" />
                Manage Users
              </button>
            )}
            {hasRole(['SuperAdmin']) && (
              <button 
                onClick={() => navigate('/admin/settings')}
                className="flex items-center justify-start p-3 text-sm font-medium text-foreground bg-accent hover:bg-accent/80 rounded-lg transition-colors"
              >
                <Settings className="h-4 w-4 mr-3" />
                System Settings
              </button>
            )}
            {hasRole(['Admin', 'SuperAdmin']) && (
              <button 
                onClick={() => navigate('/admin/analytics')}
                className="flex items-center justify-start p-3 text-sm font-medium text-foreground bg-accent hover:bg-accent/80 rounded-lg transition-colors"
              >
                <BarChart3 className="h-4 w-4 mr-3" />
                View Analytics
              </button>
            )}
            <button 
              onClick={() => navigate('/profile')}
              className="flex items-center justify-start p-3 text-sm font-medium text-foreground bg-accent hover:bg-accent/80 rounded-lg transition-colors"
            >
              <Shield className="h-4 w-4 mr-3" />
              Update Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;