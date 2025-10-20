import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  assigned_to_user_id?: mongoose.Types.ObjectId;
  status: string;
  estimated_hours?: number;
  is_billable: boolean;
  created_by_user_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  deleted_by?: string;
  deleted_reason?: string;
  is_hard_deleted?: boolean;
  hard_deleted_at?: Date;
  hard_deleted_by?: string;
}

const TaskSchema: Schema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    required: false
  },
  assigned_to_user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  status: {
    type: String,
    default: 'open',
    trim: true
  },
  estimated_hours: {
    type: Number,
    min: 0,
    required: false
  },
  is_billable: {
    type: Boolean,
    default: true
  },
  created_by_user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
TaskSchema.index({ project_id: 1 });
TaskSchema.index({ assigned_to_user_id: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ created_by_user_id: 1 });
TaskSchema.index({ deleted_at: 1 });

// Virtual for ID as string
TaskSchema.virtual('id').get(function() {
  // @ts-ignore
  return this._id.toHexString();
});

TaskSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);