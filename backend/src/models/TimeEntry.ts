import mongoose, { Document, Schema } from 'mongoose';

// Backward compatibility: EntryType still exists but is now called TaskType
export type TaskType = 'project_task' | 'custom_task';
export type EntryType = TaskType; // Deprecated, use TaskType

// High-level entry categories
export type EntryCategory = 'project' | 'leave' | 'training' | 'holiday' | 'miscellaneous';

// Leave session types
export type LeaveSession = 'morning' | 'afternoon' | 'full_day';

export interface ITimeEntry extends Document {
  _id: mongoose.Types.ObjectId;
  timesheet_id: mongoose.Types.ObjectId;

  // High-level category (NEW)
  entry_category: EntryCategory;

  // For 'project' or 'training' categories
  project_id?: mongoose.Types.ObjectId;
  task_type?: TaskType; // 'project_task' or 'custom_task'
  task_id?: mongoose.Types.ObjectId; // Required if task_type = 'project_task'
  custom_task_description?: string; // Required if task_type = 'custom_task'

  // For 'leave' category
  leave_session?: LeaveSession;

  // For 'holiday' category (NEW)
  holiday_name?: string; // Name of the holiday
  holiday_type?: string; // Type of holiday (public, company, etc.)
  is_auto_generated?: boolean; // Whether this was auto-generated from company holidays

  // For 'miscellaneous' category
  miscellaneous_activity?: string;

  // Common fields
  date: Date;
  hours: number;
  description?: string;
  is_billable: boolean;
  billable_hours?: number; // Management can override billable hours (defaults to hours if is_billable=true)

  // Deprecated: entry_type (kept for backward compatibility, maps to task_type)
  entry_type?: TaskType;

  hourly_rate?: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  is_editable?: boolean;
  is_rejected?: boolean;
  rejection_reason?: string;
  rejected_at?: Date;
  rejected_by?: mongoose.Types.ObjectId;
}

const TimeEntrySchema: Schema = new Schema({
  timesheet_id: {
    type: Schema.Types.ObjectId,
    ref: 'Timesheet',
    required: true
  },

  // High-level category (NEW)
  entry_category: {
    type: String,
    enum: ['project', 'leave', 'training', 'holiday', 'miscellaneous'],
    required: true,
    default: 'project' // Default to project for backward compatibility
  },

  // For 'project' or 'training' categories
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: false
  },
  task_type: {
    type: String,
    enum: ['project_task', 'custom_task'],
    required: false
  },
  task_id: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: false
  },
  custom_task_description: {
    type: String,
    trim: true,
    required: false
  },

  // For 'leave' category
  leave_session: {
    type: String,
    enum: ['morning', 'afternoon', 'full_day'],
    required: false
  },

  // For 'holiday' category (NEW)
  holiday_name: {
    type: String,
    trim: true,
    required: false
  },
  holiday_type: {
    type: String,
    enum: ['public', 'company', 'optional'],
    required: false
  },
  is_auto_generated: {
    type: Boolean,
    default: false,
    required: false
  },

  // For 'miscellaneous' category
  miscellaneous_activity: {
    type: String,
    trim: true,
    required: false
  },

  // Common fields
  date: {
    type: Date,
    required: true
  },
  hours: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  description: {
    type: String,
    trim: true,
    required: false
  },
  is_billable: {
    type: Boolean,
    default: true
  },
  billable_hours: {
    type: Number,
    min: 0,
    max: 24,
    required: false // Will default to hours if not set
  },

  // Deprecated: entry_type (kept for backward compatibility)
  entry_type: {
    type: String,
    enum: ['project_task', 'custom_task'],
    required: false
  },

  hourly_rate: {
    type: Number,
    min: 0,
    required: false
  },
  deleted_at: {
    type: Date,
    required: false
  },
  is_rejected: {
    type: Boolean,
    default: false
  },
  rejection_reason: {
    type: String,
    trim: true,
    required: false
  },
  rejected_at: {
    type: Date,
    required: false
  },
  rejected_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
TimeEntrySchema.index({ timesheet_id: 1 });
TimeEntrySchema.index({ project_id: 1 });
TimeEntrySchema.index({ task_id: 1 });
TimeEntrySchema.index({ date: 1 });
TimeEntrySchema.index({ deleted_at: 1 });
TimeEntrySchema.index({ entry_category: 1 }); // NEW: Index for entry category

// Compound indexes
TimeEntrySchema.index({ timesheet_id: 1, date: 1 });
TimeEntrySchema.index({ timesheet_id: 1, entry_category: 1 });
TimeEntrySchema.index({ project_id: 1, date: 1 });
TimeEntrySchema.index({ entry_category: 1, date: 1 });

// Validation
TimeEntrySchema.pre('save', function(next) {
  // Backward compatibility: If entry_type is set but not task_type, copy it
  if (this.entry_type && !this.task_type) {
    this.task_type = this.entry_type;
  }

  // Validate based on entry_category
  switch (this.entry_category) {
    case 'project':
    case 'training':
      // Require project_id for project and training entries
      if (!this.project_id) {
        return next(new Error(`project_id is required for ${this.entry_category} entries`));
      }
      // Require task_type
      if (!this.task_type) {
        return next(new Error(`task_type is required for ${this.entry_category} entries`));
      }
      // If task_type is project_task, require task_id
      if (this.task_type === 'project_task' && !this.task_id) {
        return next(new Error('task_id is required when task_type is project_task'));
      }
      // If task_type is custom_task, require custom_task_description
      if (this.task_type === 'custom_task' && !this.custom_task_description) {
        return next(new Error('custom_task_description is required when task_type is custom_task'));
      }
      break;

    case 'leave':
      // Require leave_session
      if (!this.leave_session) {
        return next(new Error('leave_session is required for leave entries'));
      }
      // Auto-calculate hours based on session
      if (this.leave_session === 'full_day') {
        this.hours = 8;
      } else if (this.leave_session === 'morning' || this.leave_session === 'afternoon') {
        this.hours = 4;
      }
      // Force is_billable to false for leave
      this.is_billable = false;
      break;

    case 'holiday':
      // Require holiday_name
      if (!this.holiday_name || (typeof this.holiday_name === 'string' && this.holiday_name.trim().length === 0)) {
        return next(new Error('holiday_name is required for holiday entries'));
      }
      // Force is_billable to false for holidays
      this.is_billable = false;
      break;

    case 'miscellaneous':
      // Require miscellaneous_activity
      if (!this.miscellaneous_activity || (typeof this.miscellaneous_activity === 'string' && this.miscellaneous_activity.trim().length === 0)) {
        return next(new Error('miscellaneous_activity is required for miscellaneous entries'));
      }
      // Force is_billable to false for miscellaneous
      this.is_billable = false;
      break;

    default:
      return next(new Error(`Invalid entry_category: ${this.entry_category}`));
  }

  next();
});

// Virtual for ID as string
TimeEntrySchema.virtual('id').get(function() {
  // @ts-ignore
  return this._id.toHexString();
});

TimeEntrySchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const TimeEntry = mongoose.models.TimeEntry || mongoose.model<ITimeEntry>('TimeEntry', TimeEntrySchema);

export { TimeEntry };
export default TimeEntry;
