/**
 * Phase 7: Approval History Model
 * Tracks timeline of all approval/rejection actions for timesheets
 */

import mongoose, { Document, Model, Schema } from 'mongoose';
import type { TimesheetStatus } from './Timesheet';

export type ApprovalAction = 'approved' | 'rejected' | 'verified' | 'billed';

export interface IApprovalHistory extends Document {
  _id: mongoose.Types.ObjectId;

  // References
  timesheet_id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId; // Employee whose timesheet is being approved

  // Approver details
  approver_id: mongoose.Types.ObjectId;
  approver_role: string;

  // Action details
  action: ApprovalAction;
  status_before: TimesheetStatus;
  status_after: TimesheetStatus;

  // Optional reason (for rejections)
  reason?: string;

  created_at: Date;
}

const ApprovalHistorySchema: Schema = new Schema({
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
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Approver details
  approver_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approver_role: {
    type: String,
    enum: ['lead', 'manager', 'management', 'super_admin'],
    required: true
  },

  // Action details
  action: {
    type: String,
    enum: ['approved', 'rejected', 'verified', 'billed'],
    required: true
  },
  status_before: {
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
    required: true
  },
  status_after: {
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
    required: true
  },

  // Optional reason (for rejections)
  reason: {
    type: String,
    trim: true,
    maxlength: 500,
    required: false
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: false // No updates, this is append-only
  }
});

// Indexes for efficient queries
ApprovalHistorySchema.index({ timesheet_id: 1, created_at: -1 });
ApprovalHistorySchema.index({ user_id: 1, created_at: -1 });
ApprovalHistorySchema.index({ approver_id: 1, created_at: -1 });
ApprovalHistorySchema.index({ project_id: 1, created_at: -1 });

// Compound index for user's approval history
ApprovalHistorySchema.index({
  user_id: 1,
  timesheet_id: 1,
  created_at: -1
});

// Virtual for ID as string
ApprovalHistorySchema.virtual('id').get(function() {
  return this._id.toHexString();
});

ApprovalHistorySchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const ApprovalHistory: Model<IApprovalHistory> =
  mongoose.models.ApprovalHistory ||
  mongoose.model<IApprovalHistory>('ApprovalHistory', ApprovalHistorySchema);

export { ApprovalHistory };
export default ApprovalHistory;
