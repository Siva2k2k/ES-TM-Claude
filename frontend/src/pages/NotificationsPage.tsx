import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, ArrowLeft } from 'lucide-react';
import { backendApi } from '../services/BackendAPI';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  created_at: string;
  sender_id?: {
    full_name: string;
    email: string;
  };
  action_url?: string;
}

interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    total: number;
    unread: number;
  };
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);

  const apiClient = backendApi;

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: '0'
      });
      
      if (filter === 'unread') {
        params.append('read', 'false');
      } else if (filter === 'read') {
        params.append('read', 'true');
      }

      const data = await apiClient.get<NotificationsResponse>(`/notifications?${params}`);
      setNotifications(data.data.notifications || []);
      setTotal(data.data.total || 0);
      setUnread(data.data.unread || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
      setUnread(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnread(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-dashboard'))}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Dashboard
              </button>
              <div className="flex items-center space-x-2">
                <Bell className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">All Notifications</h1>
              </div>
            </div>
            
            {unread > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read ({unread})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex border-b">
            {[
              { key: 'all', label: `All (${total})` },
              { key: 'unread', label: `Unread (${unread})` },
              { key: 'read', label: `Read (${total - unread})` }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm border">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No notifications found</h3>
              <p>
                {filter === 'unread' 
                  ? "You're all caught up! No unread notifications." 
                  : filter === 'read'
                  ? "No read notifications yet."
                  : "You don't have any notifications yet."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notification.read ? `border-l-4 ${getPriorityColor(notification.priority)}` : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className={`text-lg ${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{notification.message}</p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          {notification.sender_id && (
                            <span>From: {notification.sender_id.full_name}</span>
                          )}
                          <span className="capitalize">{notification.type.replace('_', ' ')}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                            notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {notification.priority}
                          </span>
                        </div>
                        <span>{formatTimeAgo(notification.created_at)}</span>
                      </div>
                    </div>
                    
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification._id);
                        }}
                        className="ml-4 flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;