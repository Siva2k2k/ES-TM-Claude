import { Notification, INotification, NotificationType, NotificationPriority } from '@/models/Notification';
import { NotificationSettings } from '@/models/NotificationSettings';
import { User } from '@/models/User';
import mongoose from 'mongoose';
import { IdUtils } from '@/utils/idUtils';

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
    // Use centralized ID parsing utility
    const notification = new (Notification as any)({
      recipient_id: IdUtils.toObjectId(params.recipient_id) || undefined,
      sender_id: IdUtils.toObjectId(params.sender_id) || undefined,
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
   * Delete a specific notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await (Notification as any).deleteOne({
      _id: mongoose.Types.ObjectId.createFromHexString(notificationId),
      recipient_id: mongoose.Types.ObjectId.createFromHexString(userId)
    });

    return result.deletedCount > 0;
  }

  /**
   * Delete multiple notifications
   */
  static async deleteNotifications(notificationIds: string[], userId: string): Promise<number> {
    const objectIds = notificationIds.map(id => mongoose.Types.ObjectId.createFromHexString(id));
    
    const result = await (Notification as any).deleteMany({
      _id: { $in: objectIds },
      recipient_id: mongoose.Types.ObjectId.createFromHexString(userId)
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

  // Timesheet tier-specific approval notifications
  static async notifyTimesheetLeadApproved(params: {
    timesheetId: string;
    projectId?: string;
    recipientId: string | mongoose.Types.ObjectId;
    approvedById?: string | mongoose.Types.ObjectId;
    approvedByName?: string;
    weekStartDate?: string | Date;
  }): Promise<INotification> {
    const weekLabel = params.weekStartDate
      ? new Date(params.weekStartDate).toISOString().split('T')[0]
      : '';

    return this.create({
      recipient_id: params.recipientId,
      sender_id: params.approvedById,
      type: NotificationType.TIMESHEET_LEAD_APPROVED,
      title: 'Timesheet Approved by Lead',
      message: `${params.approvedByName || 'Your lead'} approved your timesheet${weekLabel ? ` for week of ${weekLabel}` : ''}. It's now pending manager review.`,
      data: { timesheet_id: params.timesheetId, project_id: params.projectId, week_start_date: weekLabel },
      action_url: `/timesheets/${params.timesheetId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyTimesheetLeadRejected(params: {
    timesheetId: string;
    projectId?: string;
    recipientId: string | mongoose.Types.ObjectId;
    rejectedById?: string | mongoose.Types.ObjectId;
    rejectedByName?: string;
    reason?: string;
    weekStartDate?: string | Date;
  }): Promise<INotification> {
    const weekLabel = params.weekStartDate
      ? new Date(params.weekStartDate).toISOString().split('T')[0]
      : '';

    return this.create({
      recipient_id: params.recipientId,
      sender_id: params.rejectedById,
      type: NotificationType.TIMESHEET_LEAD_REJECTED,
      title: 'Timesheet Rejected by Lead',
      message: `${params.rejectedByName || 'Your lead'} rejected your timesheet${weekLabel ? ` for week of ${weekLabel}` : ''}. ${params.reason ? `Reason: ${params.reason}` : 'Please revise and resubmit.'}`,
      data: { timesheet_id: params.timesheetId, project_id: params.projectId, week_start_date: weekLabel, reason: params.reason },
      action_url: `/timesheets/${params.timesheetId}`,
      priority: NotificationPriority.HIGH
    });
  }

  static async notifyTimesheetManagerApproved(params: {
    timesheetId: string;
    projectId?: string;
    recipientId: string | mongoose.Types.ObjectId;
    approvedById?: string | mongoose.Types.ObjectId;
    approvedByName?: string;
    weekStartDate?: string | Date;
  }): Promise<INotification> {
    const weekLabel = params.weekStartDate
      ? new Date(params.weekStartDate).toISOString().split('T')[0]
      : '';

    return this.create({
      recipient_id: params.recipientId,
      sender_id: params.approvedById,
      type: NotificationType.TIMESHEET_MANAGER_APPROVED,
      title: 'Timesheet Approved by Manager',
      message: `${params.approvedByName || 'Your manager'} approved your timesheet${weekLabel ? ` for week of ${weekLabel}` : ''}. It's now pending management review.`,
      data: { timesheet_id: params.timesheetId, project_id: params.projectId, week_start_date: weekLabel },
      action_url: `/timesheets/${params.timesheetId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyTimesheetManagerRejected(params: {
    timesheetId: string;
    projectId?: string;
    recipientId: string | mongoose.Types.ObjectId;
    rejectedById?: string | mongoose.Types.ObjectId;
    rejectedByName?: string;
    reason?: string;
    weekStartDate?: string | Date;
  }): Promise<INotification> {
    const weekLabel = params.weekStartDate
      ? new Date(params.weekStartDate).toISOString().split('T')[0]
      : '';

    return this.create({
      recipient_id: params.recipientId,
      sender_id: params.rejectedById,
      type: NotificationType.TIMESHEET_MANAGER_REJECTED,
      title: 'Timesheet Rejected by Manager',
      message: `${params.rejectedByName || 'Your manager'} rejected your timesheet${weekLabel ? ` for week of ${weekLabel}` : ''}. ${params.reason ? `Reason: ${params.reason}` : 'Please revise and resubmit.'}`,
      data: { timesheet_id: params.timesheetId, project_id: params.projectId, week_start_date: weekLabel, reason: params.reason },
      action_url: `/timesheets/${params.timesheetId}`,
      priority: NotificationPriority.HIGH
    });
  }

  static async notifyTimesheetManagementApproved(params: {
    timesheetId: string;
    projectId?: string;
    recipientId: string | mongoose.Types.ObjectId;
    approvedById?: string | mongoose.Types.ObjectId;
    approvedByName?: string;
    weekStartDate?: string | Date;
  }): Promise<INotification> {
    const weekLabel = params.weekStartDate
      ? new Date(params.weekStartDate).toISOString().split('T')[0]
      : '';

    return this.create({
      recipient_id: params.recipientId,
      sender_id: params.approvedById,
      type: NotificationType.TIMESHEET_MANAGEMENT_APPROVED,
      title: 'Timesheet Approved by Management',
      message: `Management approved your timesheet${weekLabel ? ` for week of ${weekLabel}` : ''}. Your timesheet is now frozen.`,
      data: { timesheet_id: params.timesheetId, project_id: params.projectId, week_start_date: weekLabel },
      action_url: `/timesheets/${params.timesheetId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyTimesheetManagementRejected(params: {
    timesheetId: string;
    projectId?: string;
    recipientId: string | mongoose.Types.ObjectId;
    rejectedById?: string | mongoose.Types.ObjectId;
    rejectedByName?: string;
    reason?: string;
    weekStartDate?: string | Date;
  }): Promise<INotification> {
    const weekLabel = params.weekStartDate
      ? new Date(params.weekStartDate).toISOString().split('T')[0]
      : '';

    return this.create({
      recipient_id: params.recipientId,
      sender_id: params.rejectedById,
      type: NotificationType.TIMESHEET_MANAGEMENT_REJECTED,
      title: 'Timesheet Rejected by Management',
      message: `Management rejected your timesheet${weekLabel ? ` for week of ${weekLabel}` : ''}. ${params.reason ? `Reason: ${params.reason}` : 'Please revise and resubmit.'}`,
      data: { timesheet_id: params.timesheetId, project_id: params.projectId, week_start_date: weekLabel, reason: params.reason },
      action_url: `/timesheets/${params.timesheetId}`,
      priority: NotificationPriority.HIGH
    });
  }

  static async notifyTimesheetFrozen(params: {
    timesheetId: string;
    recipientId: string | mongoose.Types.ObjectId;
    frozenById?: string | mongoose.Types.ObjectId;
    weekStartDate?: string | Date;
  }): Promise<INotification> {
    const weekLabel = params.weekStartDate
      ? new Date(params.weekStartDate).toISOString().split('T')[0]
      : '';

    return this.create({
      recipient_id: params.recipientId,
      sender_id: params.frozenById,
      type: NotificationType.TIMESHEET_FROZEN,
      title: 'Timesheet Frozen',
      message: `Your timesheet${weekLabel ? ` for week of ${weekLabel}` : ''} has been frozen and is now ready for billing.`,
      data: { timesheet_id: params.timesheetId, week_start_date: weekLabel },
      action_url: `/timesheets/${params.timesheetId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyTimesheetBilled(params: {
    timesheetId: string;
    recipientId: string | mongoose.Types.ObjectId;
    billedById?: string | mongoose.Types.ObjectId;
    weekStartDate?: string | Date;
    totalBilledAmount?: number;
  }): Promise<INotification> {
    const weekLabel = params.weekStartDate
      ? new Date(params.weekStartDate).toISOString().split('T')[0]
      : '';

    const amountLabel = params.totalBilledAmount 
      ? ` (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.totalBilledAmount)})`
      : '';

    return this.create({
      recipient_id: params.recipientId,
      sender_id: params.billedById,
      type: NotificationType.TIMESHEET_BILLED,
      title: 'Timesheet Billed',
      message: `Your timesheet${weekLabel ? ` for week of ${weekLabel}` : ''} has been processed for billing${amountLabel}.`,
      data: { timesheet_id: params.timesheetId, week_start_date: weekLabel, total_billed_amount: params.totalBilledAmount },
      action_url: `/timesheets/${params.timesheetId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  // Project group readiness notifications
  static async notifyProjectGroupReadyForLead(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    projectId: string;
    projectName: string;
    weekStartDate?: string | Date;
    memberCount?: number;
  }): Promise<INotification[]> {
    const weekLabel = params.weekStartDate
      ? new Date(params.weekStartDate).toISOString().split('T')[0]
      : '';

    const memberLabel = params.memberCount ? ` ${params.memberCount} members have` : ' All members have';

    return this.createForRecipients(params.recipientIds, {
      type: NotificationType.PROJECT_GROUP_READY_LEAD,
      title: 'Project Group Ready for Review',
      message: `Project "${params.projectName}"${weekLabel ? ` for week of ${weekLabel}` : ''} is ready for your review.${memberLabel} submitted their timesheets.`,
      data: { project_id: params.projectId, week_start_date: weekLabel, member_count: params.memberCount },
      action_url: `/team-review?project=${params.projectId}${weekLabel ? `&week=${weekLabel}` : ''}`,
      priority: NotificationPriority.HIGH
    });
  }

  static async notifyProjectGroupReadyForManager(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    projectId: string;
    projectName: string;
    weekStartDate?: string | Date;
    memberCount?: number;
  }): Promise<INotification[]> {
    const weekLabel = params.weekStartDate
      ? new Date(params.weekStartDate).toISOString().split('T')[0]
      : '';

    const memberLabel = params.memberCount ? ` ${params.memberCount} members have` : ' All members have';

    return this.createForRecipients(params.recipientIds, {
      type: NotificationType.PROJECT_GROUP_READY_MANAGER,
      title: 'Project Group Ready for Manager Review',
      message: `Project "${params.projectName}"${weekLabel ? ` for week of ${weekLabel}` : ''} is ready for your review.${memberLabel} been approved by lead.`,
      data: { project_id: params.projectId, week_start_date: weekLabel, member_count: params.memberCount },
      action_url: `/team-review?project=${params.projectId}${weekLabel ? `&week=${weekLabel}` : ''}`,
      priority: NotificationPriority.HIGH
    });
  }

  static async notifyProjectGroupReadyForManagement(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    projectId: string;
    projectName: string;
    weekStartDate?: string | Date;
    memberCount?: number;
  }): Promise<INotification[]> {
    const weekLabel = params.weekStartDate
      ? new Date(params.weekStartDate).toISOString().split('T')[0]
      : '';

    const memberLabel = params.memberCount ? ` ${params.memberCount} members have` : ' All members have';

    return this.createForRecipients(params.recipientIds, {
      type: NotificationType.PROJECT_GROUP_READY_MANAGEMENT,
      title: 'Project Group Ready for Final Review',
      message: `Project "${params.projectName}"${weekLabel ? ` for week of ${weekLabel}` : ''} is ready for final review.${memberLabel} been approved by manager.`,
      data: { project_id: params.projectId, week_start_date: weekLabel, member_count: params.memberCount },
      action_url: `/team-review?project=${params.projectId}${weekLabel ? `&week=${weekLabel}` : ''}`,
      priority: NotificationPriority.HIGH
    });
  }

  // Project member management notifications
  static async notifyProjectMemberAdded(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    projectId: string;
    projectName: string;
    userId?: string | mongoose.Types.ObjectId;
    userName?: string;
    role?: string;
    addedById?: string | mongoose.Types.ObjectId;
    addedByName?: string;
  }): Promise<INotification[]> {
    const userLabel = params.userName || 'A user';
    const roleLabel = params.role ? ` as ${params.role}` : '';

    return this.createForRecipients(params.recipientIds, {
      sender_id: params.addedById,
      type: NotificationType.PROJECT_MEMBER_ADDED,
      title: 'Member Added to Project',
      message: `${userLabel} has been added to project "${params.projectName}"${roleLabel}.`,
      data: { project_id: params.projectId, user_id: params.userId, role: params.role },
      action_url: `/projects/${params.projectId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyProjectMemberRemoved(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    projectId: string;
    projectName: string;
    userId?: string | mongoose.Types.ObjectId;
    userName?: string;
    removedById?: string | mongoose.Types.ObjectId;
    removedByName?: string;
  }): Promise<INotification[]> {
    const userLabel = params.userName || 'A user';

    return this.createForRecipients(params.recipientIds, {
      sender_id: params.removedById,
      type: NotificationType.PROJECT_MEMBER_REMOVED,
      title: 'Member Removed from Project',
      message: `${userLabel} has been removed from project "${params.projectName}".`,
      data: { project_id: params.projectId, user_id: params.userId },
      action_url: `/projects/${params.projectId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  // Project management notifications
  static async notifyProjectManagerAssigned(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    projectId: string;
    projectName: string;
    newManagerId?: string | mongoose.Types.ObjectId;
    newManagerName?: string;
    assignedById?: string | mongoose.Types.ObjectId;
    assignedByName?: string;
  }): Promise<INotification[]> {
    return this.createForRecipients(params.recipientIds, {
      sender_id: params.assignedById,
      type: NotificationType.PROJECT_MANAGER_ASSIGNED,
      title: 'Assigned as Project Manager',
      message: `You have been assigned as manager for project "${params.projectName}".`,
      data: { project_id: params.projectId },
      action_url: `/projects/${params.projectId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyProjectDeleted(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    projectId: string;
    projectName: string;
    deletedById?: string | mongoose.Types.ObjectId;
    deletedByName?: string;
    reason?: string;
  }): Promise<INotification[]> {
    return this.createForRecipients(params.recipientIds, {
      sender_id: params.deletedById,
      type: NotificationType.PROJECT_DELETED,
      title: 'Project Deleted',
      message: `Project "${params.projectName}" has been deleted${params.deletedByName ? ` by ${params.deletedByName}` : ''}.${params.reason ? ` Reason: ${params.reason}` : ''}`,
      data: { project_id: params.projectId, reason: params.reason },
      action_url: '/projects',
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyProjectRestored(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    projectId: string;
    projectName: string;
    restoredById?: string | mongoose.Types.ObjectId;
    restoredByName?: string;
  }): Promise<INotification[]> {
    return this.createForRecipients(params.recipientIds, {
      sender_id: params.restoredById,
      type: NotificationType.PROJECT_RESTORED,
      title: 'Project Restored',
      message: `Project "${params.projectName}" has been restored${params.restoredByName ? ` by ${params.restoredByName}` : ''}.`,
      data: { project_id: params.projectId },
      action_url: `/projects/${params.projectId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  // User management notifications
  static async notifyUserRegistrationPending(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    userId: string;
    userName: string;
    userEmail: string;
  }): Promise<INotification[]> {
    return this.createForRecipients(params.recipientIds, {
      type: NotificationType.USER_REGISTRATION_PENDING,
      title: 'New User Registration',
      message: `${params.userName} (${params.userEmail}) has registered and is awaiting approval.`,
      data: { user_id: params.userId, user_email: params.userEmail },
      action_url: `/users/${params.userId}`,
      priority: NotificationPriority.HIGH
    });
  }

  static async notifyUserCreated(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    userId: string;
    userName: string;
    createdById?: string | mongoose.Types.ObjectId;
    createdByName?: string;
  }): Promise<INotification[]> {
    return this.createForRecipients(params.recipientIds, {
      sender_id: params.createdById,
      type: NotificationType.USER_CREATED,
      title: 'User Created',
      message: `User "${params.userName}" has been created${params.createdByName ? ` by ${params.createdByName}` : ''}.`,
      data: { user_id: params.userId },
      action_url: `/users/${params.userId}`,
      priority: NotificationPriority.LOW
    });
  }

  static async notifyUserDeleted(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    userId: string;
    userName: string;
    deletedById?: string | mongoose.Types.ObjectId;
    deletedByName?: string;
    reason?: string;
  }): Promise<INotification[]> {
    return this.createForRecipients(params.recipientIds, {
      sender_id: params.deletedById,
      type: NotificationType.USER_DELETED,
      title: 'User Deleted',
      message: `User "${params.userName}" has been deleted${params.deletedByName ? ` by ${params.deletedByName}` : ''}.${params.reason ? ` Reason: ${params.reason}` : ''}`,
      data: { user_id: params.userId, reason: params.reason },
      action_url: '/users',
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyUserRestored(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    userId: string;
    userName: string;
    restoredById?: string | mongoose.Types.ObjectId;
    restoredByName?: string;
  }): Promise<INotification[]> {
    return this.createForRecipients(params.recipientIds, {
      sender_id: params.restoredById,
      type: NotificationType.USER_RESTORED,
      title: 'User Restored',
      message: `User "${params.userName}" has been restored${params.restoredByName ? ` by ${params.restoredByName}` : ''}.`,
      data: { user_id: params.userId },
      action_url: `/users/${params.userId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  // Client management notifications
  static async notifyClientCreated(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    clientId: string;
    clientName: string;
    createdById?: string | mongoose.Types.ObjectId;
    createdByName?: string;
  }): Promise<INotification[]> {
    return this.createForRecipients(params.recipientIds, {
      sender_id: params.createdById,
      type: NotificationType.CLIENT_CREATED,
      title: 'Client Created',
      message: `Client "${params.clientName}" has been created${params.createdByName ? ` by ${params.createdByName}` : ''}.`,
      data: { client_id: params.clientId },
      action_url: `/clients/${params.clientId}`,
      priority: NotificationPriority.LOW
    });
  }

  static async notifyClientDeleted(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    clientId: string;
    clientName: string;
    deletedById?: string | mongoose.Types.ObjectId;
    deletedByName?: string;
    reason?: string;
  }): Promise<INotification[]> {
    return this.createForRecipients(params.recipientIds, {
      sender_id: params.deletedById,
      type: NotificationType.CLIENT_DELETED,
      title: 'Client Deleted',
      message: `Client "${params.clientName}" has been deleted${params.deletedByName ? ` by ${params.deletedByName}` : ''}.${params.reason ? ` Reason: ${params.reason}` : ''}`,
      data: { client_id: params.clientId, reason: params.reason },
      action_url: '/clients',
      priority: NotificationPriority.MEDIUM
    });
  }

  static async notifyClientRestored(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    clientId: string;
    clientName: string;
    restoredById?: string | mongoose.Types.ObjectId;
    restoredByName?: string;
  }): Promise<INotification[]> {
    return this.createForRecipients(params.recipientIds, {
      sender_id: params.restoredById,
      type: NotificationType.CLIENT_RESTORED,
      title: 'Client Restored',
      message: `Client "${params.clientName}" has been restored${params.restoredByName ? ` by ${params.restoredByName}` : ''}.`,
      data: { client_id: params.clientId },
      action_url: `/clients/${params.clientId}`,
      priority: NotificationPriority.MEDIUM
    });
  }

  // Billing notifications
  static async notifyBillingGenerated(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    billingId: string;
    periodStart: string | Date;
    periodEnd: string | Date;
    totalAmount?: number;
    generatedById?: string | mongoose.Types.ObjectId;
    generatedByName?: string;
  }): Promise<INotification[]> {
    const amountLabel = params.totalAmount
      ? ` Total: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.totalAmount)}`
      : '';

    return this.createForRecipients(params.recipientIds, {
      sender_id: params.generatedById,
      type: NotificationType.BILLING_GENERATED,
      title: 'Billing Report Generated',
      message: `Billing report for period ${new Date(params.periodStart).toLocaleDateString()} - ${new Date(params.periodEnd).toLocaleDateString()} has been generated.${amountLabel}`,
      data: {
        billing_id: params.billingId,
        period_start: params.periodStart,
        period_end: params.periodEnd,
        total_amount: params.totalAmount
      },
      action_url: `/billing/reports/${params.billingId}`,
      priority: NotificationPriority.HIGH
    });
  }

  static async notifyBillingAdjustmentCreated(params: {
    recipientIds: Array<string | mongoose.Types.ObjectId | undefined | null>;
    adjustmentId: string;
    projectId?: string;
    projectName?: string;
    userId?: string;
    userName?: string;
    adjustmentAmount?: number;
    adjustedById?: string | mongoose.Types.ObjectId;
    adjustedByName?: string;
  }): Promise<INotification[]> {
    const amountLabel = params.adjustmentAmount
      ? ` (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(params.adjustmentAmount)})`
      : '';

    return this.createForRecipients(params.recipientIds, {
      sender_id: params.adjustedById,
      type: NotificationType.BILLING_ADJUSTMENT_CREATED,
      title: 'Billing Adjustment Created',
      message: `Billing adjustment created for ${params.userName || 'user'}${params.projectName ? ` on project "${params.projectName}"` : ''}${amountLabel}.`,
      data: {
        adjustment_id: params.adjustmentId,
        project_id: params.projectId,
        user_id: params.userId,
        adjustment_amount: params.adjustmentAmount
      },
      action_url: `/billing/adjustments/${params.adjustmentId}`,
      priority: NotificationPriority.MEDIUM
    });
  }
}
