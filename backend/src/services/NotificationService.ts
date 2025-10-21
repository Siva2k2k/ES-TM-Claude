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
    const validObjectId = (id: any) =>
      mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id; 


    const notification = new (Notification as any)({
      recipient_id: validObjectId(params.recipient_id)
        ? new mongoose.Types.ObjectId(params.recipient_id)
        : undefined,
      sender_id: params.sender_id && validObjectId(params.sender_id)
        ? new mongoose.Types.ObjectId(params.sender_id)
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

  private static normalizeRecipientId(recipientId: string | mongoose.Types.ObjectId | undefined | null): string | null {
    if (!recipientId) {
      return null;
    }

    if (recipientId instanceof mongoose.Types.ObjectId) {
      return recipientId.toString();
    }

    if (typeof recipientId === 'string' && mongoose.Types.ObjectId.isValid(recipientId)) {
      return new mongoose.Types.ObjectId(recipientId).toString();
    }

    return null;
  }

  private static async createForRecipients(
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>,
    params: Omit<CreateNotificationParams, 'recipient_id'>
  ): Promise<INotification[]> {
    const uniqueRecipientIds = Array.from(
      new Set(
        recipientIds
          .map(id => this.normalizeRecipientId(id))
          .filter((id): id is string => Boolean(id))
      )
    );

    if (uniqueRecipientIds.length === 0) {
      return [];
    }

    const notifications: INotification[] = [];
    for (const recipientId of uniqueRecipientIds) {
      const notification = await this.create({
        ...params,
        recipient_id: recipientId
      });
      notifications.push(notification);
    }

    return notifications;
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
  static async notifyTimesheetApproval(userId: string, timesheetId: string, approvedBy?: string): Promise<INotification> {
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

  static async notifyTimesheetSubmission(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    timesheetId: string;
    submittedById?: string | mongoose.Types.ObjectId;
    submittedByName?: string;
    weekStartDate?: string | Date;
    totalHours?: number;
  }): Promise<INotification[]> {
    const {
      recipientIds,
      timesheetId,
      submittedById,
      submittedByName,
      weekStartDate,
      totalHours
    } = params;

    const weekLabel = weekStartDate
      ? new Date(weekStartDate).toISOString().split('T')[0]
      : undefined;

    const hoursLabel = typeof totalHours === 'number' && !Number.isNaN(totalHours)
      ? ` (${totalHours}h logged)`
      : '';

    const submitterLabel = submittedByName || 'A team member';

    return this.createForRecipients(recipientIds, {
      sender_id: submittedById,
      type: NotificationType.TIMESHEET_SUBMISSION,
      title: 'Timesheet Submitted',
      message: `${submitterLabel} submitted a timesheet${weekLabel ? ` for week of ${weekLabel}` : ''}${hoursLabel}.`,
      data: {
        timesheet_id: timesheetId,
        week_start_date: weekLabel,
        total_hours: totalHours
      },
      action_url: `/timesheets/${timesheetId}`,
      priority: NotificationPriority.HIGH
    });
  }

  // Project notifications
  static async notifyProjectCreated(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    projectId: string;
    projectName: string;
    createdById?: string | mongoose.Types.ObjectId;
    createdByName?: string;
  }): Promise<INotification[]> {
    const { recipientIds, projectId, projectName, createdById, createdByName } = params;

    return this.createForRecipients(recipientIds, {
      sender_id: createdById,
      type: NotificationType.PROJECT_CREATED,
      title: 'Project Created',
      message: `Project "${projectName}" was created${createdByName ? ` by ${createdByName}` : ''}.`,
      data: { project_id: projectId },
      action_url: `/projects/${projectId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyProjectUpdated(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    projectId: string;
    projectName: string;
    updatedById?: string | mongoose.Types.ObjectId;
    updatedByName?: string;
    updatedFields?: string[];
  }): Promise<INotification[]> {
    const {
      recipientIds,
      projectId,
      projectName,
      updatedById,
      updatedByName,
      updatedFields = []
    } = params;

    const formattedFields = updatedFields.length > 0
      ? updatedFields.map(field => field.replace(/_/g, ' ')).join(', ')
      : 'project details';

    return this.createForRecipients(recipientIds, {
      sender_id: updatedById,
      type: NotificationType.PROJECT_UPDATED,
      title: 'Project Updated',
      message: `${updatedByName || 'A team member'} updated ${formattedFields} for project "${projectName}".`,
      data: { project_id: projectId, updated_fields: updatedFields },
      action_url: `/projects/${projectId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyProjectCompleted(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    projectId: string;
    projectName: string;
    completedById?: string | mongoose.Types.ObjectId;
    completedByName?: string;
  }): Promise<INotification[]> {
    const { recipientIds, projectId, projectName, completedById, completedByName } = params;

    return this.createForRecipients(recipientIds, {
      sender_id: completedById,
      type: NotificationType.PROJECT_COMPLETED,
      title: 'Project Completed',
      message: `Project "${projectName}" has been marked as completed${completedByName ? ` by ${completedByName}` : ''}.`,
      data: { project_id: projectId },
      action_url: `/projects/${projectId}`,
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

  static async notifyTaskReceived(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    taskId: string;
    taskName: string;
    projectName?: string;
    projectId?: string;
    assignedById?: string | mongoose.Types.ObjectId;
    assignedByName?: string;
  }): Promise<INotification[]> {
    const {
      recipientIds,
      taskId,
      taskName,
      projectName,
      projectId,
      assignedById,
      assignedByName
    } = params;

    const projectLabel = projectName ? ` in project "${projectName}"` : '';
    const assignedLabel = assignedByName
      ? `${assignedByName} assigned you task "${taskName}"${projectLabel}.`
      : `You have been assigned task "${taskName}"${projectLabel}.`;

    return this.createForRecipients(recipientIds, {
      sender_id: assignedById,
      type: NotificationType.TASK_RECEIVED,
      title: 'New Task Assigned',
      message: assignedLabel,
      data: { task_id: taskId, project_id: projectId, project_name: projectName },
      action_url: `/tasks/${taskId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyTaskCompleted(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    taskId: string;
    taskName: string;
    projectName?: string;
    projectId?: string;
    completedById?: string | mongoose.Types.ObjectId;
    completedByName?: string;
  }): Promise<INotification[]> {
    const {
      recipientIds,
      taskId,
      taskName,
      projectName,
      projectId,
      completedById,
      completedByName
    } = params;

    const projectLabel = projectName ? ` in project "${projectName}"` : '';

    return this.createForRecipients(recipientIds, {
      sender_id: completedById,
      type: NotificationType.TASK_COMPLETED,
      title: 'Task Completed',
      message: `${completedByName || 'A team member'} marked task "${taskName}"${projectLabel} as completed.`,
      data: { task_id: taskId, project_id: projectId, project_name: projectName },
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
