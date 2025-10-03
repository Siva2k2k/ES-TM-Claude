import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  setting_key: string;
  setting_value: any;
  description?: string;
  category: 'general' | 'security' | 'notifications' | 'reports' | 'integration' | 'appearance';
  data_type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  is_public: boolean; // Whether this setting can be read by non-admins
  requires_restart: boolean;
  validation_rules?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  updated_by: string;
  version: number;
  created_at: Date;
  updated_at: Date;
}

const SystemSettingsSchema: Schema = new Schema({
  setting_key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    match: /^[a-z][a-z0-9_]*$/,  // snake_case validation
    maxlength: 100
  },
  setting_value: {
    type: Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['general', 'security', 'notifications', 'reports', 'integration', 'appearance'],
    required: true,
    index: true
  },
  data_type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  is_public: {
    type: Boolean,
    default: false
  },
  requires_restart: {
    type: Boolean,
    default: false
  },
  validation_rules: {
    min: Number,
    max: Number,
    pattern: String,
    enum: [Schema.Types.Mixed]
  },
  updated_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  version: {
    type: Number,
    default: 1,
    min: 1
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
SystemSettingsSchema.index({ category: 1, is_public: 1 });
SystemSettingsSchema.index({ updated_by: 1, updated_at: -1 });

// Pre-save validation
SystemSettingsSchema.pre('save', function(next) {
  // Increment version on updates
  if (this.isModified('setting_value')) {
    (this as any).version = ((this as any).version || 0) + 1;
  }
  
  // Validate setting_value against data_type
  const value = this.setting_value;
  const type = this.data_type;
  
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return next(new Error('Setting value must be a string'));
      }
      break;
    case 'number':
      if (typeof value !== 'number') {
        return next(new Error('Setting value must be a number'));
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        return next(new Error('Setting value must be a boolean'));
      }
      break;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        return next(new Error('Setting value must be an object'));
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        return next(new Error('Setting value must be an array'));
      }
      break;
  }
  
  next();
});

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);