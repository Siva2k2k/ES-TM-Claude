import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from './User';

export type ReportCategory =
  | 'personal'      // Employee's own reports
  | 'team'          // Team-level reports (Lead+)
  | 'project'       // Project reports (Manager+)
  | 'financial'     // Financial reports (Manager+)
  | 'executive'     // Executive reports (Management+)
  | 'system';       // System reports (Super Admin)

export type ReportFormat = 'pdf' | 'excel' | 'csv';

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface IReportTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  template_id: string;
  name: string;
  description: string;
  category: ReportCategory;

  // Access Control
  allowed_roles: UserRole[];
  required_permissions: string[];

  // Data Configuration
  data_source: {
    collection: string;
    aggregation_pipeline?: any[];
    include_related?: string[];
  };

  // Format Options
  available_formats: ReportFormat[];
  default_format: ReportFormat;

  // Filters
  default_filters: Record<string, any>;
  available_filters: {
    name: string;
    type: 'date' | 'select' | 'multi-select' | 'text' | 'number';
    options?: any[];
    required: boolean;
  }[];

  // Role-based Data Access Rules
  data_access_rules: {
    [key in UserRole]?: {
      can_access_own_data: boolean;
      can_access_team_data: boolean;
      can_access_project_data: boolean;
      can_access_org_data: boolean;
      additional_filters?: Record<string, any>;
    };
  };

  // Scheduling
  can_be_scheduled: boolean;
  default_schedule?: {
    frequency: ReportFrequency;
    enabled: boolean;
    day_of_week?: number;
    day_of_month?: number;
    time: string;
  };

  // UI Configuration
  icon?: string;
  color?: string;
  featured: boolean;
  sort_order: number;

  // Status
  is_active: boolean;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const ReportTemplateSchema: Schema = new Schema({
  template_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['personal', 'team', 'project', 'financial', 'executive', 'system'],
    required: true,
    index: true
  },

  // Access Control
  allowed_roles: [{
    type: String,
    enum: ['employee', 'lead', 'manager', 'management', 'super_admin'],
    required: true
  }],
  required_permissions: [{
    type: String
  }],

  // Data Configuration
  data_source: {
    collection: {
      type: String,
      required: true
    },
    aggregation_pipeline: [{
      type: Schema.Types.Mixed
    }],
    include_related: [{
      type: String
    }]
  },

  // Format Options
  available_formats: [{
    type: String,
    enum: ['pdf', 'excel', 'csv'],
    required: true
  }],
  default_format: {
    type: String,
    enum: ['pdf', 'excel', 'csv'],
    required: true
  },

  // Filters
  default_filters: {
    type: Schema.Types.Mixed,
    default: {}
  },
  available_filters: [{
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['date', 'select', 'multi-select', 'text', 'number'],
      required: true
    },
    options: [Schema.Types.Mixed],
    required: { type: Boolean, default: false }
  }],

  // Role-based Data Access Rules
  data_access_rules: {
    type: Schema.Types.Mixed,
    default: {}
  },

  // Scheduling
  can_be_scheduled: {
    type: Boolean,
    default: false
  },
  default_schedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    enabled: { type: Boolean, default: false },
    day_of_week: { type: Number, min: 0, max: 6 },
    day_of_month: { type: Number, min: 1, max: 31 },
    time: String
  },

  // UI Configuration
  icon: String,
  color: String,
  featured: {
    type: Boolean,
    default: false
  },
  sort_order: {
    type: Number,
    default: 0
  },

  // Status
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
ReportTemplateSchema.index({ category: 1, is_active: 1 });
ReportTemplateSchema.index({ allowed_roles: 1, is_active: 1 });
ReportTemplateSchema.index({ featured: 1, sort_order: 1 });

// Virtual for ID as string
ReportTemplateSchema.virtual('id').get(function(this: any) {
  return this._id.toHexString();
});

ReportTemplateSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const ReportTemplate = mongoose.models.ReportTemplate ||
  mongoose.model<IReportTemplate>('ReportTemplate', ReportTemplateSchema);

export default ReportTemplate;
