import { Notification, INotification, NotificationType, NotificationPriority } from '@/models/Notification';
import { NotificationSettings } from '@/models/NotificationSettings';
import { User } from '@/models/User';
import mongoose from 'mongoose';

export interface CreateNotificationParams {
  recipient_id: string | mongoose.Types.ObjectId;
  sender_id?: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  action_url?: string;
  priority?: NotificationPriority;
  expires_at?: Date;
}

export interface NotificationFilters {
  recipient_id?: string;
  type?: NotificationType | NotificationType[];
  read?: boolean;
  priority?: NotificationPriority | NotificationPriority[];
  limit?: number;
  offset?: number;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async create(params: CreateNotificationParams): Promise<INotification> {
    const notification = new (Notification as any)({
      recipient_id: typeof params.recipient_id === 'string' 
        ? mongoose.Types.ObjectId.createFromHexString(params.recipient_id)
        : params.recipient_id,
      sender_id: params.sender_id 
        ? (typeof params.sender_id === 'string' 
           ? mongoose.Types.ObjectId.createFromHexString(params.sender_id)
           : params.sender_id)
        : undefined,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data || {},
      action_url: params.action_url,
      priority: params.priority || NotificationPriority.MEDIUM,
      expires_at: params.expires_at
    });

    await notification.save();
    return notification;
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(filters: NotificationFilters): Promise<{
    notifications: INotification[];
    total: number;
    unread: number;
  }> {
    const query: any = {};
    
    if (filters.recipient_id) {
      query.recipient_id = mongoose.Types.ObjectId.createFromHexString(filters.recipient_id);
    }
    
    if (filters.type) {
      if (Array.isArray(filters.type)) {
        query.type = { $in: filters.type };
      } else {
        query.type = filters.type;
      }
    }
    
    if (filters.read !== undefined) {
      query.read = filters.read;
    }
    
    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        query.priority = { $in: filters.priority };
      } else {
        query.priority = filters.priority;
      }
    }

    // Get total count and unread count
    const [total, unread] = await Promise.all([
      (Notification as any).countDocuments(query),
      (Notification as any).countDocuments({ ...query, read: false })
    ]);

    // Get notifications with pagination
    const notifications = await (Notification as any)
      .find(query)
      .populate('sender_id', 'full_name email role')
      .sort({ created_at: -1 })
      .limit(filters.limit || 20)
      .skip(filters.offset || 0)
      .lean();

    return {
      notifications,
      total,
      unread
    };
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await (Notification as any).updateOne(
      { 
        _id: mongoose.Types.ObjectId.createFromHexString(notificationId),
        recipient_id: mongoose.Types.ObjectId.createFromHexString(userId)
      },
      { 
        read: true, 
        read_at: new Date() 
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Mark notification as clicked
   */
  static async markAsClicked(notificationId: string, userId: string): Promise<boolean> {
    const result = await (Notification as any).updateOne(
      { 
        _id: mongoose.Types.ObjectId.createFromHexString(notificationId),
        recipient_id: mongoose.Types.ObjectId.createFromHexString(userId)
      },
      { 
        clicked: true, 
        clicked_at: new Date(),
        // Also mark as read when clicked
        read: true,
        read_at: new Date()
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const result = await (Notification as any).updateMany(
      { 
        recipient_id: mongoose.Types.ObjectId.createFromHexString(userId),
        read: false
      },
      { 
        read: true, 
        read_at: new Date() 
      }
    );

    return result.modifiedCount;
  }

  /**
   * Delete old notifications (cleanup job)
   */
  static async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const result = await (Notification as any).deleteMany({
      created_at: { $lt: cutoffDate },
      priority: { $in: [NotificationPriority.LOW, NotificationPriority.MEDIUM] }
    });

    return result.deletedCount;
  }

  /**
   * Helper methods for specific notification types
   */
  
  // User approval notifications
  static async notifyUserApproval(userId: string, approvedBy: string): Promise<INotification> {
    return this.create({
      recipient_id: userId,
      sender_id: approvedBy,
      type: NotificationType.USER_APPROVAL,
      title: 'Account Approved',
      message: 'Your account has been approved and is now active.',
      action_url: '/dashboard',
      priority: NotificationPriority.HIGH
    });
  }

  static async notifyUserRejection(userId: string, rejectedBy: string, reason?: string): Promise<INotification> {
    return this.create({
      recipient_id: userId,
      sender_id: rejectedBy,
      type: NotificationType.USER_REJECTION,
      title: 'Account Rejected',
      message: reason || 'Your account application has been rejected.',
      action_url: '/contact-support',
      priority: NotificationPriority.HIGH
    });
  }

  // Timesheet notifications
  static async notifyTimesheetApproval(userId: string, timesheetId: string, approvedBy: string): Promise<INotification> {
    return this.create({
      recipient_id: userId,
      sender_id: approvedBy,
      type: NotificationType.TIMESHEET_APPROVAL,
      title: 'Timesheet Approved',
      message: 'Your timesheet has been approved.',
      data: { timesheet_id: timesheetId },
      action_url: `/timesheets/${timesheetId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyTimesheetRejection(userId: string, timesheetId: string, rejectedBy: string, reason?: string): Promise<INotification> {
    return this.create({
      recipient_id: userId,
      sender_id: rejectedBy,
      type: NotificationType.TIMESHEET_REJECTION,
      title: 'Timesheet Rejected',
      message: reason || 'Your timesheet has been rejected and needs revision.',
      data: { timesheet_id: timesheetId },
      action_url: `/timesheets/${timesheetId}`,
      priority: NotificationPriority.HIGH
    });
  }

  // Project/Task allocation notifications
  static async notifyProjectAllocation(userId: string, projectId: string, projectName: string, allocatedBy: string): Promise<INotification> {
    return this.create({
      recipient_id: userId,
      sender_id: allocatedBy,
      type: NotificationType.PROJECT_ALLOCATED,
      title: 'New Project Assigned',
      message: `You have been assigned to project: ${projectName}`,
      data: { project_id: projectId },
      action_url: `/projects/${projectId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyTaskAllocation(userId: string, taskId: string, taskName: string, projectName: string, allocatedBy: string): Promise<INotification> {
    return this.create({
      recipient_id: userId,
      sender_id: allocatedBy,
      type: NotificationType.TASK_ALLOCATED,
      title: 'New Task Assigned',
      message: `You have been assigned task "${taskName}" in project "${projectName}"`,
      data: { task_id: taskId },
      action_url: `/tasks/${taskId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  // Task alerts
  static async notifyPendingTask(userId: string, taskId: string, taskName: string, daysOverdue: number = 0): Promise<INotification> {
    const isOverdue = daysOverdue > 0;
    return this.create({
      recipient_id: userId,
      type: isOverdue ? NotificationType.TASK_OVERDUE : NotificationType.TASK_PENDING,
      title: isOverdue ? 'Task Overdue' : 'Task Due Soon',
      message: isOverdue 
        ? `Task "${taskName}" is ${daysOverdue} day(s) overdue`
        : `Task "${taskName}" is due soon`,
      data: { task_id: taskId, days_overdue: daysOverdue },
      action_url: `/tasks/${taskId}`,
      priority: isOverdue ? NotificationPriority.URGENT : NotificationPriority.HIGH
    });
  }
}