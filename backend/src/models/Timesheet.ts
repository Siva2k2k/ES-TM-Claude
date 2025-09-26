import mongoose, { Document, Schema } from 'mongoose';

export type TimesheetStatus =
  | 'draft'
  | 'submitted'
  | 'manager_approved'
  | 'manager_rejected'
  | 'management_pending'
  | 'management_rejected'
  | 'frozen'
  | 'billed';

export interface ITimesheet extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  week_start_date: Date;
  week_end_date: Date;
  total_hours: number;
  status: TimesheetStatus;

  // Manager approval fields
  approved_by_manager_id?: mongoose.Types.ObjectId;
  approved_by_manager_at?: Date;
  manager_rejection_reason?: string;
  manager_rejected_at?: Date;

  // Management approval fields
  approved_by_management_id?: mongoose.Types.ObjectId;
  approved_by_management_at?: Date;
  management_rejection_reason?: string;
  management_rejected_at?: Date;

  // Verification fields
  verified_by_id?: mongoose.Types.ObjectId;
  verified_at?: Date;
  is_verified: boolean;
  is_frozen: boolean;

  // Billing integration
  billing_snapshot_id?: mongoose.Types.ObjectId;

  // Submission tracking
  submitted_at?: Date;

  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

const TimesheetSchema: Schema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  week_start_date: {
    type: Date,
    required: true
  },
  week_end_date: {
    type: Date,
    required: true
  },
  total_hours: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: [
      'draft',
      'submitted',
      'manager_approved',
      'manager_rejected',
      'management_pending',
      'management_rejected',
      'frozen',
      'billed'
    ],
    default: 'draft'
  },

  // Manager approval fields
  approved_by_manager_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  approved_by_manager_at: {
    type: Date,
    required: false
  },
  manager_rejection_reason: {
    type: String,
    trim: true,
    required: false
  },
  manager_rejected_at: {
    type: Date,
    required: false
  },

  // Management approval fields
  approved_by_management_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  approved_by_management_at: {
    type: Date,
    required: false
  },
  management_rejection_reason: {
    type: String,
    trim: true,
    required: false
  },
  management_rejected_at: {
    type: Date,
    required: false
  },

  // Verification fields
  verified_by_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  verified_at: {
    type: Date,
    required: false
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  is_frozen: {
    type: Boolean,
    default: false
  },

  // Billing integration
  billing_snapshot_id: {
    type: Schema.Types.ObjectId,
    required: false
  },

  // Submission tracking
  submitted_at: {
    type: Date,
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
TimesheetSchema.index({ user_id: 1, week_start_date: 1 }, { unique: true });
TimesheetSchema.index({ status: 1 });
TimesheetSchema.index({ week_start_date: -1 });
TimesheetSchema.index({ submitted_at: 1 });
TimesheetSchema.index({ deleted_at: 1 });

// Compound indexes for queries
TimesheetSchema.index({
  status: 1,
  submitted_at: 1
}, {
  partialFilterExpression: {
    status: { $in: ['submitted', 'manager_approved', 'management_pending'] }
  }
});

// Virtual for ID as string
TimesheetSchema.virtual('id').get(function() {
  // @ts-ignore
  return this._id.toHexString();
});

TimesheetSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Timesheet = mongoose.models.Timesheet || mongoose.model<ITimesheet>('Timesheet', TimesheetSchema);

export { Timesheet };
export default Timesheet;