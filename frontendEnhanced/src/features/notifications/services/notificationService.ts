/**
 * Notification Service
 * API communication for notifications
 * Cognitive Complexity: 4
 */
import { apiClient } from '../../../core/api/client';
import type { Notification, NotificationFilters, NotificationStats } from '../types/notification.types';

export const notificationService = {
  async getNotifications(filters?: NotificationFilters): Promise<Notification[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.read !== undefined) params.append('read', String(filters.read));
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);

    const response = await apiClient.get<{ notifications: Notification[] }>(
      `/notifications${params.toString() ? '?' + params : ''}`
    );
    return response.notifications;
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ unread_count: number }>('/notifications/unread-count');
    return response.unread_count;
  },

  async getStats(): Promise<NotificationStats> {
    return apiClient.get<NotificationStats>('/notifications/stats');
  },

  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.patch(`/notifications/${notificationId}/read`, {});
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.put('/notifications/mark-all-read', {});
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  },

  async clearAll(): Promise<void> {
    await apiClient.delete('/notifications/clear-all');
  },
};
