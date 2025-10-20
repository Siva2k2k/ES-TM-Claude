import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from './User';

export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface IProjectApprovalSettings {
  lead_approval_auto_escalates: boolean;
}

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  client_id: mongoose.Types.ObjectId;
  primary_manager_id: mongoose.Types.ObjectId;
  status: ProjectStatus;
  start_date: Date;
  end_date?: Date;
  budget?: number;
  description?: string;
  is_billable: boolean;
  approval_settings?: IProjectApprovalSettings;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  deleted_by?: string;
  deleted_reason?: string;
  is_hard_deleted?: boolean;
  hard_deleted_at?: Date;
  hard_deleted_by?: string;
}

export interface IProjectMember extends Document {
  _id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  project_role: UserRole;
  is_primary_manager: boolean;
  is_secondary_manager: boolean;
  assigned_at: Date;
  removed_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

const ProjectSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  client_id: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  primary_manager_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: false
  },
  budget: {
    type: Number,
    min: 0,
    required: false
  },
  description: {
    type: String,
    trim: true,
    required: false
  },
  is_billable: {
    type: Boolean,
    default: true
  },
  approval_settings: {
    type: {
      lead_approval_auto_escalates: {
        type: Boolean,
        default: false
      }
    },
    required: false,
    default: () => ({ lead_approval_auto_escalates: false })
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

const ProjectMemberSchema: Schema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project_role: {
    type: String,
    enum: ['super_admin', 'management', 'manager', 'lead', 'employee'],
    required: true
  },
  is_primary_manager: {
    type: Boolean,
    default: false
  },
  is_secondary_manager: {
    type: Boolean,
    default: false
  },
  assigned_at: {
    type: Date,
    default: Date.now
  },
  removed_at: {
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
ProjectSchema.index({ client_id: 1 });
ProjectSchema.index({ primary_manager_id: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ deleted_at: 1 });

ProjectMemberSchema.index({ project_id: 1 });
ProjectMemberSchema.index({ user_id: 1 });
ProjectMemberSchema.index({ project_role: 1 });
ProjectMemberSchema.index({ deleted_at: 1 });
ProjectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true });

// Virtuals for ID as string
ProjectSchema.virtual('id').get(function() {
  // @ts-ignore
  return this._id.toHexString();
});

ProjectMemberSchema.virtual('id').get(function() {
  // @ts-ignore
  return this._id.toHexString();
});

ProjectSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

ProjectMemberSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Project = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
export const ProjectMember = mongoose.models.ProjectMember || mongoose.model<IProjectMember>('ProjectMember', ProjectMemberSchema);

export default Project;