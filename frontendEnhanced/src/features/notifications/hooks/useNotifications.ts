/**
 * useNotifications Hook
 * Real-time notifications with polling
 * Cognitive Complexity: 7
 */
import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import type { Notification, NotificationFilters } from '../types/notification.types';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export const useNotifications = (
  filters?: NotificationFilters,
  pollInterval: number = 30000 // 30 seconds
): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const data = await notificationService.getNotifications(filters);
      setNotifications(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Poll for new notifications
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount, pollInterval]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif => (notif._id === id ? { ...notif, read: true } : notif))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      throw new Error('Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
    } catch (err) {
      throw new Error('Failed to mark all as read');
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(notif => notif._id !== id));
      const deletedNotif = notifications.find(n => n._id === id);
      if (deletedNotif && !deletedNotif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      throw new Error('Failed to delete notification');
    }
  }, [notifications]);

  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    await fetchNotifications();
    await fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    deleteNotification,
  };
};
