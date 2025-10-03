import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from './User';

export interface IUserSettings extends Document {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  notifications: {
    email_enabled: boolean;
    push_enabled: boolean;
    timesheet_reminders: boolean;
    approval_notifications: boolean;
    team_updates: boolean;
    system_announcements: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  display_preferences: {
    sidebar_collapsed: boolean;
    table_page_size: number;
    dashboard_widgets: string[];
    chart_preferences: {
      default_period: '7d' | '30d' | '90d' | '1y';
      show_animations: boolean;
    };
  };
  privacy_settings: {
    profile_visibility: 'public' | 'team' | 'private';
    show_activity_status: boolean;
    share_analytics: boolean;
  };
  created_at: Date;
  updated_at: Date;
}

const UserSettingsSchema: Schema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'light'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  date_format: {
    type: String,
    enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
    default: 'MM/DD/YYYY'
  },
  time_format: {
    type: String,
    enum: ['12h', '24h'],
    default: '12h'
  },
  notifications: {
    email_enabled: { type: Boolean, default: true },
    push_enabled: { type: Boolean, default: false },
    timesheet_reminders: { type: Boolean, default: true },
    approval_notifications: { type: Boolean, default: true },
    team_updates: { type: Boolean, default: true },
    system_announcements: { type: Boolean, default: true },
    frequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly'],
      default: 'immediate'
    }
  },
  display_preferences: {
    sidebar_collapsed: { type: Boolean, default: false },
    table_page_size: { type: Number, default: 10, min: 5, max: 100 },
    dashboard_widgets: {
      type: [String],
      default: ['projects', 'tasks', 'timesheet', 'analytics']
    },
    chart_preferences: {
      default_period: {
        type: String,
        enum: ['7d', '30d', '90d', '1y'],
        default: '30d'
      },
      show_animations: { type: Boolean, default: true }
    }
  },
  privacy_settings: {
    profile_visibility: {
      type: String,
      enum: ['public', 'team', 'private'],
      default: 'team'
    },
    show_activity_status: { type: Boolean, default: true },
    share_analytics: { type: Boolean, default: false }
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for performance
UserSettingsSchema.index({ user_id: 1 });
UserSettingsSchema.index({ 'notifications.email_enabled': 1 });
UserSettingsSchema.index({ theme: 1 });

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);