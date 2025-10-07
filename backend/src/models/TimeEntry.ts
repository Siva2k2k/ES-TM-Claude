import mongoose, { Document, Schema } from 'mongoose';

export type EntryType = 'project_task' | 'custom_task';

export interface ITimeEntry extends Document {
  _id: mongoose.Types.ObjectId;
  timesheet_id: mongoose.Types.ObjectId;
  project_id?: mongoose.Types.ObjectId;
  task_id?: mongoose.Types.ObjectId;
  date: Date;
  hours: number;
  description?: string;
  is_billable: boolean;
  billable_hours?: number; // Management can override billable hours (defaults to hours if is_billable=true)
  custom_task_description?: string;
  entry_type: EntryType;
  hourly_rate?: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

const TimeEntrySchema: Schema = new Schema({
  timesheet_id: {
    type: Schema.Types.ObjectId,
    ref: 'Timesheet',
    required: true
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: false
  },
  task_id: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: false
  },
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
  custom_task_description: {
    type: String,
    trim: true,
    required: false
  },
  entry_type: {
    type: String,
    enum: ['project_task', 'custom_task'],
    default: 'project_task'
  },
  hourly_rate: {
    type: Number,
    min: 0,
    required: false
  },
  deleted_at: {
    type: Date,
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

// Compound indexes
TimeEntrySchema.index({ timesheet_id: 1, date: 1 });
TimeEntrySchema.index({ project_id: 1, date: 1 });

// Validation
TimeEntrySchema.pre('save', function(next) {
  // Ensure either project_id is set OR custom_task_description is provided
  if (this.entry_type === 'project_task' && !this.project_id) {
    next(new Error('project_id is required for project_task entries'));
  } else if (this.entry_type === 'custom_task' && !this.custom_task_description) {
    next(new Error('custom_task_description is required for custom_task entries'));
  } else {
    next();
  }
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