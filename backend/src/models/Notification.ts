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
  USER_APPROVAL = 'user_approval',
  USER_REJECTION = 'user_rejection', 
  TIMESHEET_SUBMISSION = 'timesheet_submission',
  TIMESHEET_APPROVAL = 'timesheet_approval',
  TIMESHEET_REJECTION = 'timesheet_rejection',
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_COMPLETED = 'project_completed',
  PROJECT_ALLOCATED = 'project_allocated',
  TASK_ALLOCATED = 'task_allocated',
  TASK_RECEIVED = 'task_received',
  TASK_COMPLETED = 'task_completed',
  TASK_PENDING = 'task_pending',
  TASK_OVERDUE = 'task_overdue',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  BILLING_UPDATE = 'billing_update',
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
