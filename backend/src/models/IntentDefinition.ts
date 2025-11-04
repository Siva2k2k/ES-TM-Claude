import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIntentDefinition extends Document {
  intent: string;
  category: 'project' | 'user' | 'client' | 'timesheet' | 'team_review' | 'billing' | 'audit';
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  fieldTypes: Map<string, 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array'>;
  enumValues?: Map<string, string[]>;
  contextRequired: Array<'projects' | 'users' | 'clients' | 'tasks' | 'timesheets' | 'projectWeekGroups'>;
  allowedRoles: Array<'super_admin' | 'management' | 'manager' | 'lead' | 'employee'>;
  exampleCommand: string;
  redirectUrlTemplate?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IntentDefinitionSchema = new Schema<IIntentDefinition>(
  {
    intent: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: ['project', 'user', 'client', 'timesheet', 'team_review', 'billing', 'audit'],
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    requiredFields: [{
      type: String,
      trim: true
    }],
    optionalFields: [{
      type: String,
      trim: true
    }],
    fieldTypes: {
      type: Map,
      of: String,
      required: true
    },
    enumValues: {
      type: Map,
      of: [String]
    },
    contextRequired: [{
      type: String,
      enum: ['projects', 'users', 'clients', 'tasks', 'timesheets', 'projectWeekGroups']
    }],
    allowedRoles: [{
      type: String,
      enum: ['super_admin', 'management', 'manager', 'lead', 'employee'],
      required: true
    }],
    exampleCommand: {
      type: String,
      required: true,
      trim: true
    },
    redirectUrlTemplate: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for performance
IntentDefinitionSchema.index({ isActive: 1, category: 1 });
IntentDefinitionSchema.index({ allowedRoles: 1, isActive: 1 });

// Virtual ID
IntentDefinitionSchema.virtual('id').get(function (this: any) {
  return this._id?.toHexString();
});

// Prevent model overwrite error in development
const IntentDefinition: Model<IIntentDefinition> = mongoose.models.IntentDefinition || 
  mongoose.model<IIntentDefinition>('IntentDefinition', IntentDefinitionSchema);

export default IntentDefinition;
