import mongoose, { Document, Schema } from 'mongoose';

export interface IBillingSnapshot extends Document {
  timesheet_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  week_start_date: string;
  week_end_date: string;
  total_hours: number; // Total worked hours
  billable_hours: number; // After adjustments applied
  adjustment_hours?: number; // Total adjustment delta (sum of all adjustments for this timesheet)
  hourly_rate: number;
  total_amount: number; // hourly_rate × total_hours
  billable_amount: number; // hourly_rate × billable_hours
  snapshot_data?: Record<string, unknown>;

  // Delete tracking fields
  deleted_at?: Date;
  deleted_by?: mongoose.Types.ObjectId;
  deleted_reason?: string;
  is_hard_deleted: boolean;
  hard_deleted_at?: Date;
  hard_deleted_by?: mongoose.Types.ObjectId;

  created_at: Date;
  updated_at: Date;
}

const BillingSnapshotSchema: Schema = new Schema(
  {
    timesheet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timesheet',
      required: true,
      index: true
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    week_start_date: {
      type: String,
      required: true,
      index: true
    },
    week_end_date: {
      type: String,
      required: true
    },
    total_hours: {
      type: Number,
      required: true,
      min: 0
    },
    billable_hours: {
      type: Number,
      required: true,
      min: 0
    },
    adjustment_hours: {
      type: Number,
      required: false,
      default: 0
      // Stores total adjustment delta for this timesheet
    },
    hourly_rate: {
      type: Number,
      required: true,
      min: 0
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0
    },
    billable_amount: {
      type: Number,
      required: true,
      min: 0
    },
    snapshot_data: {
      type: Schema.Types.Mixed,
      default: {}
    },

    // Delete tracking fields
    deleted_at: {
      type: Date,
      default: null,
      index: { sparse: true }
    },
    deleted_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    deleted_reason: {
      type: String,
      required: false
    },
    is_hard_deleted: {
      type: Boolean,
      default: false
    },
    hard_deleted_at: {
      type: Date,
      required: false
    },
    hard_deleted_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false
    }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

// Indexes for performance
// Note: user_id, week_start_date, and deleted_at already have indexes via field definitions
BillingSnapshotSchema.index({ user_id: 1, week_start_date: 1 }); // Compound index for queries
BillingSnapshotSchema.index({ week_start_date: 1, week_end_date: 1 }); // Date range queries

// Soft delete query helpers
BillingSnapshotSchema.pre(/^find/, function(this: any) {
  this.where({ deleted_at: null });
});

export const BillingSnapshot = mongoose.model<IBillingSnapshot>('BillingSnapshot', BillingSnapshotSchema);