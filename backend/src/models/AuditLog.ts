import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'VERIFY'
  | 'FREEZE'
  | 'SUBMIT'
  | 'ESCALATE'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATED'
  | 'USER_APPROVED'
  | 'USER_DEACTIVATED'
  | 'USER_ROLE_CHANGED'
  | 'TIMESHEET_SUBMITTED'
  | 'TIMESHEET_APPROVED'
  | 'TIMESHEET_VERIFIED'
  | 'TIMESHEET_REJECTED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'BILLING_SNAPSHOT_GENERATED'
  | 'BILLING_APPROVED'
  | 'ROLE_SWITCHED'
  | 'PERMISSION_DENIED'
  | 'SYSTEM_CONFIG_CHANGED';

export interface IAuditLog extends Document {
  table_name: string;
  record_id: string;
  action: AuditAction;
  actor_id?: mongoose.Types.ObjectId;
  actor_name: string;
  timestamp: Date;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    table_name: {
      type: String,
      required: true,
      index: true
    },
    record_id: {
      type: String,
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: [
        'INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'VERIFY', 'FREEZE',
        'SUBMIT', 'ESCALATE', 'USER_LOGIN', 'USER_LOGOUT', 'USER_CREATED',
        'USER_APPROVED', 'USER_DEACTIVATED', 'USER_ROLE_CHANGED',
        'TIMESHEET_SUBMITTED', 'TIMESHEET_APPROVED', 'TIMESHEET_VERIFIED',
        'TIMESHEET_REJECTED', 'PROJECT_CREATED', 'PROJECT_UPDATED',
        'PROJECT_DELETED', 'BILLING_SNAPSHOT_GENERATED', 'BILLING_APPROVED',
        'ROLE_SWITCHED', 'PERMISSION_DENIED', 'SYSTEM_CONFIG_CHANGED'
      ],
      required: true,
      index: true
    },
    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: { sparse: true }
    },
    actor_name: {
      type: String,
      required: true,
      index: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    details: {
      type: Schema.Types.Mixed,
      default: null
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null
    },
    old_data: {
      type: Schema.Types.Mixed,
      default: null
    },
    new_data: {
      type: Schema.Types.Mixed,
      default: null
    },
    deleted_at: {
      type: Date,
      default: null,
      index: { sparse: true }
    }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

// Compound indexes for common queries
AuditLogSchema.index({ table_name: 1, record_id: 1 });
AuditLogSchema.index({ actor_id: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1, deleted_at: 1 });

// Soft delete query helpers
AuditLogSchema.pre(/^find/, function() {
  this.where({ deleted_at: null });
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);