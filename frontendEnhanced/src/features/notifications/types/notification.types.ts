/**
 * Notification Feature Type Definitions
 * Real-time notification system with priority and read tracking
 */

export type NotificationType =
  | 'timesheet_submitted'
  | 'timesheet_approved'
  | 'timesheet_rejected'
  | 'task_assigned'
  | 'project_update'
  | 'billing_alert'
  | 'system'
  | 'general';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationSender {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

export interface Notification {
  _id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  read: boolean;
  action_url?: string;
  sender_id?: NotificationSender;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NotificationFilters {
  type?: NotificationType;
  priority?: NotificationPriority;
  read?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
  by_priority: Record<NotificationPriority, number>;
}
