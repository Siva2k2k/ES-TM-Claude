import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, ArrowLeft, Trash2, Filter, X, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { backendApi } from '../services/BackendAPI';
import * as formatting from '../utils/formatting';

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
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();
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

  const deleteNotification = async (notificationId: string) => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      setTotal(prev => prev - 1);
      // Update unread count if deleted notification was unread
      const deletedNotification = notifications.find(n => n._id === notificationId);
      if (deletedNotification && !deletedNotification.read) {
        setUnread(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification');
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteSelectedNotifications = async () => {
    if (selectedNotifications.length === 0) return;
    
    setIsDeleting(true);
    try {
      await Promise.all(
        selectedNotifications.map(id => apiClient.delete(`/notifications/${id}`))
      );
      
      // Count unread notifications being deleted
      const deletedUnread = notifications.filter(n => 
        selectedNotifications.includes(n._id) && !n.read
      ).length;
      
      setNotifications(prev => 
        prev.filter(notif => !selectedNotifications.includes(notif._id))
      );
      setTotal(prev => prev - selectedNotifications.length);
      setUnread(prev => Math.max(0, prev - deletedUnread));
      setSelectedNotifications([]);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      alert('Failed to delete selected notifications');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAllVisible = () => {
    setSelectedNotifications(filteredNotifications.map(n => n._id));
  };

  const clearSelection = () => {
    setSelectedNotifications([]);
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

  const filteredNotifications = notifications.filter(notification => {
    
    
    // Advanced filters
    let passesFilters = true;
    
    // Type filter
    if (typeFilter !== 'all' && notification.type !== typeFilter) {
      passesFilters = false;
    }
    
    // Priority filter
    if (priorityFilter !== 'all' && notification.priority !== priorityFilter) {
      passesFilters = false;
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const notificationDate = new Date(notification.created_at);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'today':
          if (daysDiff > 0) passesFilters = false;
          break;
        case 'week':
          if (daysDiff > 7) passesFilters = false;
          break;
        case 'month':
          if (daysDiff > 30) passesFilters = false;
          break;
      }
    }

    // Basic read/unread filter
    if (filter === 'unread') return (!notification.read && passesFilters);
    if (filter === 'read') return (notification.read  && passesFilters);
    
    return passesFilters;
  });

  // Get unique notification types for filter options
  const notificationTypes = [...new Set(notifications.map(n => n.type))];

  const resetAdvancedFilters = () => {
    setTypeFilter('all');
    setPriorityFilter('all');
    setDateFilter('all');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
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
            
            <div className="flex items-center space-x-4">
              {unread > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All Read ({unread})
                </button>
              )}
              
              {selectedNotifications.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {selectedNotifications.length} selected
                  </span>
                  <button
                    onClick={deleteSelectedNotifications}
                    disabled={isDeleting}
                    className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={clearSelection}
                    className="flex items-center px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  showAdvancedFilters || typeFilter !== 'all' || priorityFilter !== 'all' || dateFilter !== 'all'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {(typeFilter !== 'all' || priorityFilter !== 'all' || dateFilter !== 'all') && (
                  <span className="ml-2 h-2 w-2 bg-blue-500 rounded-full"></span>
                )}
              </button>
            </div>
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
                onClick={() => setFilter(tab.key as 'all' | 'unread' | 'read')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
            
            {filteredNotifications.length > 0 && (
              <div className="ml-auto flex items-center px-6 py-3">
                <button
                  onClick={selectAllVisible}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All Visible ({filteredNotifications.length})
                </button>
              </div>
            )}
          </div>
          
          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="p-4 bg-gray-50 border-t">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    {notificationTypes.map(type => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Date Range
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={resetAdvancedFilters}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                Showing {filteredNotifications.length} of {notifications.length} notifications
              </div>
            </div>
          )}
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
                  className={`p-6 transition-colors ${
                    notification.read ? '' : `border-l-4 ${getPriorityColor(notification.priority)}`
                  } ${selectedNotifications.includes(notification._id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification._id)}
                        onChange={() => toggleNotificationSelection(notification._id)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      {/* Notification Content */}
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNotificationClick(notification);
                          }
                        }}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className={`text-lg ${notification.read ? 'font-medium' : 'font-semibold'} text-gray-900`}>
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
                          <span>{formatting.formatRelativeTime(notification.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification._id);
                          }}
                          className="flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark Read
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this notification?')) {
                            deleteNotification(notification._id);
                          }
                        }}
                        disabled={isDeleting}
                        className="flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
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