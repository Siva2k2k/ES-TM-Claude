import mongoose, { Schema, Document } from 'mongoose';

export interface ISearchIndex extends Document {
  title: string;
  description: string;
  category: SearchCategory;
  type: SearchItemType;
  url: string;
  keywords: string[];
  entity_id?: string; // For dynamic items like users, projects, etc.
  meta_data?: any;
  search_weight: number; // For ranking results
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export enum SearchCategory {
  NAVIGATION = 'navigation',
  USERS = 'users',
  PROJECTS = 'projects', 
  TASKS = 'tasks',
  TIMESHEETS = 'timesheets',
  REPORTS = 'reports',
  SETTINGS = 'settings',
  BILLING = 'billing'
}

export enum SearchItemType {
  PAGE = 'page',
  ACTION = 'action',
  USER = 'user',
  PROJECT = 'project',
  TASK = 'task',
  TIMESHEET = 'timesheet',
  REPORT = 'report'
}

const SearchIndexSchema = new Schema<ISearchIndex>({
  title: {
    type: String,
    required: true,
    maxlength: 200,
    index: 'text'
  },
  description: {
    type: String,
    required: true,
    maxlength: 500,
    index: 'text'
  },
  category: {
    type: String,
    enum: Object.values(SearchCategory),
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(SearchItemType),
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true,
    maxlength: 500
  },
  keywords: {
    type: [String],
    default: [],
    index: 'text'
  },
  entity_id: {
    type: String,
    sparse: true,
    index: true
  },
  meta_data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  search_weight: {
    type: Number,
    default: 1,
    min: 0,
    max: 10
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true
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
  timestamps: false
});

// Text index for full-text search
SearchIndexSchema.index({
  title: 'text',
  description: 'text',
  keywords: 'text'
}, {
  weights: {
    title: 10,
    keywords: 5,
    description: 1
  }
});

// Compound indexes for efficient filtering
SearchIndexSchema.index({ category: 1, is_active: 1, search_weight: -1 });
SearchIndexSchema.index({ type: 1, is_active: 1, search_weight: -1 });

SearchIndexSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

export const SearchIndex = mongoose.model<ISearchIndex>('SearchIndex', SearchIndexSchema);