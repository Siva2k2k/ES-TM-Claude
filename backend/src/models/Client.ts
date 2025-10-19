import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  contact_person?: string;
  contact_email?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  deleted_by?: string;
  deleted_reason?: string;
  is_hard_deleted?: boolean;
  hard_deleted_at?: Date;
  hard_deleted_by?: string;
}

const ClientSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contact_person: {
    type: String,
    trim: true,
    required: false
  },
  contact_email: {
    type: String,
    lowercase: true,
    trim: true,
    required: false
  },
  is_active: {
    type: Boolean,
    default: true
  },
  deleted_at: {
    type: Date,
    required: false
  },
  deleted_by: {
    type: String,
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
    type: String,
    required: false
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
ClientSchema.index({ name: 1 });
ClientSchema.index({ is_active: 1 });
ClientSchema.index({ deleted_at: 1 });

// Virtual for ID as string
ClientSchema.virtual('id').get(function() {
  return (this._id as any).toHexString();
});

ClientSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc: any, ret: any) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);