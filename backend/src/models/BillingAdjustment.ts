import mongoose, { Schema, Document } from 'mongoose';

/**
 * BillingAdjustment Model
 *
 * Stores Management adjustments to billable hours using an ADJUSTMENT MODEL.
 * Supports both per-project and per-timesheet (all projects) adjustments.
 *
 * Logic:
 * - total_billable_hours = total_worked_hours + adjustment_hours
 * - adjustment_hours can be negative (reduce billing) or positive (increase billing)
 * - Adjustment persists as new hours are added to the timesheet
 *
 * Example:
 * - Week 1: User works 40h on Project A
 * - Management adjusts: -5h (billable = 35h)
 * - Week 1 continued: User works 20h more (total 60h)
 * - Result: billable = 60 + (-5) = 55h (adjustment persists!)
 */

export type AdjustmentScope = 'project' | 'timesheet';

export interface IBillingAdjustment extends Document {
  _id: mongoose.Types.ObjectId;
  timesheet_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;

  // Scope: 'project' = adjustment for specific project, 'timesheet' = adjustment for all projects
  adjustment_scope: AdjustmentScope;
  project_id?: mongoose.Types.ObjectId; // Required if scope='project', null if scope='timesheet'
  task_id?: mongoose.Types.ObjectId; // Optional, for granular tracking

  // Billing period
  billing_period_start: Date;
  billing_period_end: Date;

  // Adjustment Model Fields
  total_worked_hours: number; // Auto-calculated from TimeEntries (snapshot at time of adjustment)
  adjustment_hours: number; // Delta: Can be negative (reduce) or positive (increase)
  total_billable_hours: number; // Calculated: worked_hours + adjustment_hours

  // Legacy fields (for backward compatibility)
  original_billable_hours: number; // Deprecated: Use total_worked_hours
  adjusted_billable_hours: number; // Deprecated: Use total_billable_hours

  // Audit trail
  reason?: string;
  adjusted_by: mongoose.Types.ObjectId; // Management user who made adjustment
  adjusted_at: Date;

  // Delete tracking
  deleted_at?: Date;
  deleted_by?: mongoose.Types.ObjectId;

  created_at: Date;
  updated_at: Date;
}

const BillingAdjustmentSchema = new Schema<IBillingAdjustment>({
  timesheet_id: {
    type: Schema.Types.ObjectId,
    ref: 'Timesheet',
    required: true,
    index: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  adjustment_scope: {
    type: String,
    enum: ['project', 'timesheet'],
    required: true,
    default: 'project',
    index: true
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: false, // Required only if scope='project'
    index: true
  },
  task_id: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: false
  },
  billing_period_start: {
    type: Date,
    required: true
  },
  billing_period_end: {
    type: Date,
    required: true
  },
  total_worked_hours: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  adjustment_hours: {
    type: Number,
    required: true,
    default: 0
    // Can be negative or positive
  },
  total_billable_hours: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  // Legacy fields for backward compatibility
  original_billable_hours: {
    type: Number,
    required: false,
    min: 0
  },
  adjusted_billable_hours: {
    type: Number,
    required: false,
    min: 0
  },
  reason: {
    type: String,
    maxlength: 500
  },
  adjusted_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adjusted_at: {
    type: Date,
    default: Date.now,
    required: true
  },
  deleted_at: {
    type: Date,
    default: null,
    index: { sparse: true }
  },
  deleted_by: {
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

// Compound indexes for efficient queries
BillingAdjustmentSchema.index({ timesheet_id: 1, project_id: 1 }); // Query by timesheet + project
BillingAdjustmentSchema.index({ timesheet_id: 1, adjustment_scope: 1 }); // Query by timesheet + scope
BillingAdjustmentSchema.index({ user_id: 1, adjusted_at: -1 }); // User's adjustment history
BillingAdjustmentSchema.index({ billing_period_start: 1, billing_period_end: 1 }); // Date range queries
BillingAdjustmentSchema.index({ adjusted_by: 1 }); // Who made adjustments

// Validation: project_id required if scope='project'
BillingAdjustmentSchema.pre('save', function(next) {
  if (this.adjustment_scope === 'project' && !this.project_id) {
    return next(new Error('project_id is required when adjustment_scope is "project"'));
  }
  if (this.adjustment_scope === 'timesheet' && this.project_id) {
    this.project_id = undefined; // Clear project_id if scope is timesheet-wide
  }
  next();
});

// Auto-calculate total_billable_hours before save
BillingAdjustmentSchema.pre('save', function(next) {
  this.total_billable_hours = Math.max(0, this.total_worked_hours + this.adjustment_hours);

  // Maintain backward compatibility with legacy fields
  if (!this.original_billable_hours) {
    this.original_billable_hours = this.total_worked_hours;
  }
  if (!this.adjusted_billable_hours) {
    this.adjusted_billable_hours = this.total_billable_hours;
  }

  next();
});

// Soft delete query helpers
BillingAdjustmentSchema.pre(/^find/, function(this: any) {
  this.where({ deleted_at: null });
});

export const BillingAdjustment = mongoose.model<IBillingAdjustment>('BillingAdjustment', BillingAdjustmentSchema);

export default BillingAdjustment;