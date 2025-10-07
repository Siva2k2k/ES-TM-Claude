/**
 * Notification Bell Component
 * Real-time notification dropdown with auto-polling
 * Cognitive Complexity: 6
 * File Size: ~180 LOC
 */
import React, { useState } from 'react';
import { Bell, X, Check, Clock, AlertCircle, User } from 'lucide-react';
import { Button, Badge } from '../../../../shared/components/ui';
import { cn } from '../../../../shared/utils/cn';
import { useNotifications } from '../../hooks';
import type { Notification, NotificationPriority } from '../../types/notification.types';

interface NotificationBellProps {
  className?: string;
  onNavigate?: (url: string) => void;
}

const priorityConfig: Record<NotificationPriority, { icon: React.ElementType; className: string }> = {
  urgent: { icon: AlertCircle, className: 'text-red-600 dark:text-red-400' },
  high: { icon: AlertCircle, className: 'text-orange-600 dark:text-orange-400' },
  medium: { icon: Clock, className: 'text-blue-600 dark:text-blue-400' },
  low: { icon: Clock, className: 'text-gray-600 dark:text-gray-400' },
};

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className,
  onNavigate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification._id);

    if (notification.action_url) {
      if (onNavigate) {
        onNavigate(notification.action_url);
      } else {
        window.location.href = notification.action_url;
      }
    }

    setIsOpen(false);
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

  return (
    <div className={cn('relative', className)}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            refreshNotifications();
          }
        }}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-2">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const config = priorityConfig[notification.priority];
                  const PriorityIcon = config.icon;

                  return (
                    <div
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors',
                        !notification.read && 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 dark:border-l-blue-400'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <PriorityIcon className={cn('h-4 w-4', config.className)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {notification.title}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          {notification.sender_id && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <User className="h-3 w-3" />
                              <span>{notification.sender_id.full_name}</span>
                            </div>
                          )}
                        </div>
                        {!notification.read && (
                          <div className="flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('/notifications');
                    }
                    setIsOpen(false);
                  }}
                  className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
