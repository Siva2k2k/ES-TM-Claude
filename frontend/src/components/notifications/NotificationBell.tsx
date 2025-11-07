import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Clock, AlertCircle } from 'lucide-react';
import { BackendApiClient } from '../../lib/backendApi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/contexts/AuthContext';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  data?: Record<string, unknown>;
  sender_id?: {
    full_name: string;
    email: string;
  };
}

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();

  const apiClient = new BackendApiClient();

  const fetchNotifications = async () => {
    if (!isAuthenticated || !currentUser) {
      return;
    }
    
    setLoading(true);
    try {
      const data = await apiClient.get<{success: boolean; data: {notifications: Notification[]}}>('/notifications');
      setNotifications(data.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!isAuthenticated || !currentUser) {
      return;
    }
    
    try {
      const data = await apiClient.get<{success: boolean; data: {unread_count: number}}>('/notifications/unread-count');
      setUnreadCount(data.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // Reset count on error to avoid stale data
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    // Only fetch notifications if user is authenticated
    if (!isAuthenticated || !currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds only if authenticated
    const interval = setInterval(() => {
      if (isAuthenticated && currentUser) {
        fetchUnreadCount();
      }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser]);

  const markAsRead = async (notificationId: string) => {
    if (!isAuthenticated || !currentUser) {
      return;
    }
    
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!isAuthenticated || !currentUser) {
      return;
    }
    
    try {
      await apiClient.put('/notifications/mark-all-read');

      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const resolveNotificationRoute = (notification: Notification): string => {
    const data = notification.data || {};
    const projectId = data.project_id as string | undefined;
    const timesheetId = data.timesheet_id as string | undefined;
    const userId = data.user_id as string | undefined;
    const clientId = data.client_id as string | undefined;

    switch (notification.type) {
      // Timesheet notifications
      case 'timesheet_submission':
      case 'project_group_ready_lead':
      case 'project_group_ready_manager':
      case 'project_group_ready_management':
        return '/dashboard/team-review';
      
      case 'timesheet_approval':
      case 'timesheet_lead_approved':
      case 'timesheet_manager_approved':
      case 'timesheet_management_approved':
      case 'timesheet_frozen':
      case 'timesheet_billed':
        return timesheetId ? `/dashboard/timesheets/${timesheetId}` : '/dashboard/timesheets/status';
      
      case 'timesheet_rejection':
      case 'timesheet_lead_rejected':
      case 'timesheet_manager_rejected':
      case 'timesheet_management_rejected':
        return timesheetId ? `/dashboard/timesheets/${timesheetId}` : '/dashboard/timesheets';
      
      // Project notifications
      case 'project_created':
      case 'project_updated':
      case 'project_completed':
      case 'project_allocated':
      case 'project_manager_assigned':
      case 'project_manager_removed':
      case 'project_member_added':
      case 'project_member_removed':
      case 'project_member_updated':
        return projectId ? `/dashboard/projects/${projectId}` : '/dashboard/projects';
      
      case 'project_deleted':
      case 'project_restored':
        return '/dashboard/projects';
      
      // Task notifications
      case 'task_allocated':
      case 'task_received':
      case 'task_completed':
      case 'task_pending':
      case 'task_overdue':
      case 'task_created':
      case 'task_updated':
      case 'task_deleted':
      case 'task_deadline_changed':
      case 'task_assigned':
      case 'task_unassigned':
        return projectId ? `/dashboard/projects/${projectId}` : '/dashboard/projects';
      
      // User notifications
      case 'user_approval':
      case 'user_rejection':
      case 'user_registration_pending':
      case 'user_created':
      case 'user_updated':
      case 'user_deleted':
      case 'user_restored':
      case 'user_role_changed':
        return userId ? `/dashboard/users/${userId}` : '/dashboard/users';
      
      // Client notifications
      case 'client_created':
      case 'client_updated':
      case 'client_deleted':
      case 'client_restored':
        return clientId ? `/dashboard/clients/${clientId}` : '/dashboard/clients';
      
      // Billing notifications
      case 'billing_update':
      case 'billing_generated':
      case 'billing_adjustment_created':
      case 'billing_adjustment_updated':
        return '/dashboard/billing';
      
      // System notifications
      case 'system_announcement':
      case 'profile_update':
        return '/dashboard/notifications';
      
      default:
        break;
    }

    const actionUrl = notification.action_url;
    if (actionUrl) {
      if (actionUrl.startsWith('http')) {
        return actionUrl;
      }

      if (actionUrl.startsWith('/dashboard')) {
        return actionUrl;
      }

      if (actionUrl.startsWith('/')) {
        return `/dashboard${actionUrl}`.replace(/\/\/+/g, '/');
      }

      return `/dashboard/${actionUrl}`.replace(/\/\/+/g, '/');
    }

    return '/dashboard/notifications';
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification._id);
    
    const target = resolveNotificationRoute(notification);

    if (target.startsWith('http')) {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      navigate(target);
    }
    
    setIsOpen(false);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Show a maximum of 3 notifications in the bell dropdown
  const visibleNotifications = notifications.slice(0, 3);

  // Don't render the notification bell if user is not authenticated
  if (!isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Bell Icon */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Notifications {unreadCount > 0 && `(${unreadCount})`}</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No notifications</p>
              </div>
            ) : (
              visibleNotifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getPriorityIcon(notification.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      {notification.sender_id && (
                        <p className="text-xs text-gray-500 mt-1">
                          From: {notification.sender_id.full_name}
                        </p>
                      )}
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification._id);
                          }}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => {
                  navigate('/dashboard/notifications');
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
