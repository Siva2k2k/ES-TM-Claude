/**
 * Phase 7: Timesheet Project Approval Model
 * Tracks approval status per project for multi-manager scenarios
 */

import mongoose, { Document, Model, Schema } from 'mongoose';

export type ApprovalStatus = 'approved' | 'rejected' | 'pending' | 'not_required';

export interface ITimesheetProjectApproval extends Document {
  _id: mongoose.Types.ObjectId;

  // Timesheet and project reference
  timesheet_id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;

  // Lead approval (if project has a lead)
  lead_id?: mongoose.Types.ObjectId;
  lead_status: ApprovalStatus;
  lead_approved_at?: Date;
  lead_rejection_reason?: string;

  // Manager approval (always required)
  manager_id: mongoose.Types.ObjectId;
  manager_status: ApprovalStatus;
  manager_approved_at?: Date;
  manager_rejection_reason?: string;

  // Management verification (Tier 3) - NEW
  management_status: ApprovalStatus;
  management_approved_at?: Date;
  management_rejection_reason?: string;

  // Time tracking for this project
  entries_count: number;
  total_hours: number;

  created_at: Date;
  updated_at: Date;
}

const TimesheetProjectApprovalSchema: Schema = new Schema({
  timesheet_id: {
    type: Schema.Types.ObjectId,
    ref: 'Timesheet',
    required: true,
    index: true
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },

  // Lead approval fields
  lead_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  lead_status: {
    type: String,
    enum: ['approved', 'rejected', 'pending', 'not_required'],
    default: 'not_required'
  },
  lead_approved_at: {
    type: Date,
    required: false
  },
  lead_rejection_reason: {
    type: String,
    trim: true,
    maxlength: 500,
    required: false
  },

  // Manager approval fields
  manager_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  manager_status: {
    type: String,
    enum: ['approved', 'rejected', 'pending', 'not_required'],
    default: 'pending'
  },
  manager_approved_at: {
    type: Date,
    required: false
  },
  manager_rejection_reason: {
    type: String,
    trim: true,
    maxlength: 500,
    required: false
  },

  // Management verification fields (Tier 3) - NEW
  management_status: {
    type: String,
    enum: ['approved', 'rejected', 'pending', 'not_required'],
    default: 'pending'
  },
  management_approved_at: {
    type: Date,
    required: false
  },
  management_rejection_reason: {
    type: String,
    trim: true,
    maxlength: 500,
    required: false
  },

  // Project time tracking
  entries_count: {
    type: Number,
    default: 0,
    min: 0
  },
  total_hours: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes for efficient queries
TimesheetProjectApprovalSchema.index({ timesheet_id: 1, project_id: 1 }, { unique: true });
TimesheetProjectApprovalSchema.index({ manager_id: 1, manager_status: 1 });
TimesheetProjectApprovalSchema.index({ lead_id: 1, lead_status: 1 });

// Compound index for pending approvals
TimesheetProjectApprovalSchema.index({
  manager_status: 1,
  manager_id: 1
}, {
  partialFilterExpression: {
    manager_status: 'pending'
  }
});

// Virtual for ID as string
TimesheetProjectApprovalSchema.virtual('id').get(function() {
  return (this._id as mongoose.Types.ObjectId).toHexString();
});

TimesheetProjectApprovalSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const TimesheetProjectApproval: Model<ITimesheetProjectApproval> =
  mongoose.models.TimesheetProjectApproval ||
  mongoose.model<ITimesheetProjectApproval>('TimesheetProjectApproval', TimesheetProjectApprovalSchema);

export { TimesheetProjectApproval };
export default TimesheetProjectApproval;
