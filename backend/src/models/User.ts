import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'super_admin' | 'management' | 'manager' | 'lead' | 'employee';

export interface  IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  full_name: string;
  role: UserRole;
  hourly_rate: number;
  is_active: boolean;
  is_approved_by_super_admin: boolean;
  manager_id?: mongoose.Types.ObjectId;
  password_hash?: string;

  // Secure credential management fields
  temporary_password?: string;
  password_expires_at?: Date;
  is_temporary_password: boolean;
  password_reset_token?: string;
  password_reset_expires?: Date;
  failed_login_attempts: number;
  last_failed_login?: Date;
  account_locked_until?: Date;
  last_password_change?: Date;
  force_password_change: boolean;

  created_at: Date;
  updated_at: Date;

  // Soft delete fields
  deleted_at?: Date;
  deleted_by?: mongoose.Types.ObjectId;
  deleted_reason?: string;

  // Hard delete fields
  is_hard_deleted: boolean;
  hard_deleted_at?: Date;
  hard_deleted_by?: mongoose.Types.ObjectId;
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'management', 'manager', 'lead', 'employee'],
    default: 'employee'
  },
  hourly_rate: {
    type: Number,
    default: 0,
    min: 0
  },
  is_active: {
    type: Boolean,
    default: true
  },
  is_approved_by_super_admin: {
    type: Boolean,
    default: false
  },
  manager_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  password_hash: {
    type: String,
    required: false
  },

  // Secure credential management fields
  temporary_password: {
    type: String,
    required: false,
    select: false // Never include in regular queries for security
  },
  password_expires_at: {
    type: Date,
    required: false
  },
  is_temporary_password: {
    type: Boolean,
    default: false
  },
  password_reset_token: {
    type: String,
    required: false,
    select: false // Never include in regular queries for security
  },
  password_reset_expires: {
    type: Date,
    required: false
  },
  failed_login_attempts: {
    type: Number,
    default: 0
  },
  last_failed_login: {
    type: Date,
    required: false
  },
  account_locked_until: {
    type: Date,
    required: false
  },
  last_password_change: {
    type: Date,
    required: false
  },
  force_password_change: {
    type: Boolean,
    default: false
  },

  // Soft delete fields
  deleted_at: {
    type: Date,
    required: false
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

  // Hard delete fields
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
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
// Note: email already has unique index via unique: true in schema definition
UserSchema.index({ role: 1 });
UserSchema.index({ is_active: 1 });
UserSchema.index({ manager_id: 1 });
UserSchema.index({ deleted_at: 1 }, { sparse: true }); // Sparse index for soft delete queries
UserSchema.index({ password_reset_token: 1 }, { sparse: true }); // Sparse index, rarely used
UserSchema.index({ password_expires_at: 1 }, { sparse: true }); // Sparse index for expired passwords
UserSchema.index({ account_locked_until: 1 }, { sparse: true }); // Sparse index for locked accounts

// Virtual for ID as string
UserSchema.virtual('id').get(function() {
  return (this._id as any).toHexString();
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc: any, ret: any) {
    delete ret._id;
    delete ret.__v;
    // Never expose sensitive security fields
    if (ret.password_hash) delete ret.password_hash;
    if (ret.temporary_password) delete ret.temporary_password;
    if (ret.password_reset_token) delete ret.password_reset_token;
    return ret;
  }
});

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export { User };
export default User;