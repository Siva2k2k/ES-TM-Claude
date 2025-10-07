import mongoose, { Schema, Document } from 'mongoose';

export interface IBillingAdjustment extends Document {
  user_id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
  task_id?: mongoose.Types.ObjectId;
  billing_period_start: Date;
  billing_period_end: Date;
  original_billable_hours: number;
  adjusted_billable_hours: number;
  reason?: string;
  adjusted_by: mongoose.Types.ObjectId; // Admin/Manager who made the adjustment
  created_at: Date;
  updated_at: Date;
}

const BillingAdjustmentSchema = new Schema<IBillingAdjustment>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
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
  original_billable_hours: {
    type: Number,
    required: true,
    min: 0
  },
  adjusted_billable_hours: {
    type: Number,
    required: true,
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
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one adjustment per user-project-period combination
BillingAdjustmentSchema.index({
  user_id: 1,
  project_id: 1,
  billing_period_start: 1,
  billing_period_end: 1
}, { unique: true });

// Index for efficient queries
BillingAdjustmentSchema.index({ user_id: 1, project_id: 1 });
BillingAdjustmentSchema.index({ billing_period_start: 1, billing_period_end: 1 });
BillingAdjustmentSchema.index({ adjusted_by: 1 });

BillingAdjustmentSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export const BillingAdjustment = mongoose.model<IBillingAdjustment>('BillingAdjustment', BillingAdjustmentSchema);