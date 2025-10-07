import mongoose, { Schema, Document } from 'mongoose';
import { NotificationType } from './Notification';

export interface INotificationSettings extends Document {
  user_id: mongoose.Types.ObjectId;
  email_notifications: boolean;
  push_notifications: boolean;
  notification_types: Map<string, {
    enabled: boolean;
    email: boolean;
    push: boolean;
  }>;
  quiet_hours: {
    enabled: boolean;
    start_time: string; // "22:00"
    end_time: string;   // "08:00"
    timezone: string;
  };
  created_at: Date;
  updated_at: Date;
}

const NotificationSettingsSchema = new Schema<INotificationSettings>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  email_notifications: {
    type: Boolean,
    default: true
  },
  push_notifications: {
    type: Boolean,
    default: true
  },
  notification_types: {
    type: Map,
    of: new Schema({
      enabled: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }, { _id: false }),
    default: () => {
      const defaults = new Map();
      Object.values(NotificationType).forEach(type => {
        defaults.set(type, {
          enabled: true,
          email: true,
          push: true
        });
      });
      return defaults;
    }
  },
  quiet_hours: {
    enabled: { type: Boolean, default: false },
    start_time: { type: String, default: "22:00" },
    end_time: { type: String, default: "08:00" },
    timezone: { type: String, default: "UTC" }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

NotificationSettingsSchema.pre('save', function(next) {
  (this as any).updated_at = new Date();
  next();
});

export const NotificationSettings = mongoose.model<INotificationSettings>('NotificationSettings', NotificationSettingsSchema);