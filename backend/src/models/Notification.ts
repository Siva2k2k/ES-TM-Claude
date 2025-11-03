import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipient_id: mongoose.Types.ObjectId;
  sender_id?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: any; // Additional data for the notification (IDs, etc.)
  read: boolean;
  clicked: boolean;
  action_url?: string; // URL to navigate when clicked
  priority: NotificationPriority;
  expires_at?: Date;
  created_at: Date;
  read_at?: Date;
  clicked_at?: Date;
}

export enum NotificationType {
  // User management
  USER_APPROVAL = 'user_approval',
  USER_REJECTION = 'user_rejection',
  USER_REGISTRATION_PENDING = 'user_registration_pending',
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_RESTORED = 'user_restored',
  USER_ROLE_CHANGED = 'user_role_changed',
  
  // Timesheet general
  TIMESHEET_SUBMISSION = 'timesheet_submission',
  TIMESHEET_APPROVAL = 'timesheet_approval',
  TIMESHEET_REJECTION = 'timesheet_rejection',
  
  // Timesheet tier-specific approvals
  TIMESHEET_LEAD_APPROVED = 'timesheet_lead_approved',
  TIMESHEET_LEAD_REJECTED = 'timesheet_lead_rejected',
  TIMESHEET_MANAGER_APPROVED = 'timesheet_manager_approved',
  TIMESHEET_MANAGER_REJECTED = 'timesheet_manager_rejected',
  TIMESHEET_MANAGEMENT_APPROVED = 'timesheet_management_approved',
  TIMESHEET_MANAGEMENT_REJECTED = 'timesheet_management_rejected',
  TIMESHEET_FROZEN = 'timesheet_frozen',
  TIMESHEET_BILLED = 'timesheet_billed',
  TIMESHEET_REMAINDER = 'timesheet_reminder',
  
  // Project group readiness
  PROJECT_GROUP_READY_LEAD = 'project_group_ready_lead',
  PROJECT_GROUP_READY_MANAGER = 'project_group_ready_manager',
  PROJECT_GROUP_READY_MANAGEMENT = 'project_group_ready_management',
  
  // Project management
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_COMPLETED = 'project_completed',
  PROJECT_ALLOCATED = 'project_allocated',
  PROJECT_MANAGER_ASSIGNED = 'project_manager_assigned',
  PROJECT_MANAGER_REMOVED = 'project_manager_removed',
  PROJECT_DELETED = 'project_deleted',
  PROJECT_RESTORED = 'project_restored',
  
  // Project member management
  PROJECT_MEMBER_ADDED = 'project_member_added',
  PROJECT_MEMBER_REMOVED = 'project_member_removed',
  PROJECT_MEMBER_UPDATED = 'project_member_updated',
  PROJECT_MEMBER_ROLE_CHANGED = 'project_member_role_changed',
  
  // Task management
  TASK_ALLOCATED = 'task_allocated',
  TASK_RECEIVED = 'task_received',
  TASK_COMPLETED = 'task_completed',
  TASK_PENDING = 'task_pending',
  TASK_OVERDUE = 'task_overdue',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  TASK_DEADLINE_CHANGED = 'task_deadline_changed',
  TASK_ASSIGNED = 'task_assigned',
  TASK_UNASSIGNED = 'task_unassigned',
  
  // Client management
  CLIENT_CREATED = 'client_created',
  CLIENT_UPDATED = 'client_updated',
  CLIENT_DELETED = 'client_deleted',
  CLIENT_RESTORED = 'client_restored',
  
  // Billing
  BILLING_UPDATE = 'billing_update',
  BILLING_GENERATED = 'billing_generated',
  BILLING_ADJUSTMENT_CREATED = 'billing_adjustment_created',
  BILLING_ADJUSTMENT_UPDATED = 'billing_adjustment_updated',
  
  // System
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  PROFILE_UPDATE = 'profile_update'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  URGENT = 'urgent'
}

const NotificationSchema = new Schema<INotification>({
  recipient_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  clicked: {
    type: Boolean,
    default: false
  },
  action_url: {
    type: String,
    maxlength: 500
  },
  priority: {
    type: String,
    enum: Object.values(NotificationPriority),
    default: NotificationPriority.MEDIUM,
    index: true
  },
  expires_at: {
    type: Date,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  read_at: {
    type: Date
  },
  clicked_at: {
    type: Date
  }
}, {
  timestamps: false // Using custom created_at
});

// Compound indexes for efficient queries
NotificationSchema.index({ recipient_id: 1, read: 1, created_at: -1 });
NotificationSchema.index({ recipient_id: 1, type: 1, created_at: -1 });
NotificationSchema.index({ recipient_id: 1, priority: 1, created_at: -1 });
NotificationSchema.index({ recipient_id: 1, read: 1 });
NotificationSchema.index({ created_at: 1, priority: 1 });
NotificationSchema.index({ created_at: -1 });

// Pre-save middleware to set expiration for low priority notifications
NotificationSchema.pre('save', function(next) {
  if (this.isNew && this.priority === NotificationPriority.LOW && !this.expires_at) {
    // Low priority notifications expire after 30 days
    this.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
