import mongoose, { Document, Model, Schema } from 'mongoose';

export type HolidayType = 'public' | 'company' | 'optional';

export interface ICompanyHoliday extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  date: Date;
  holiday_type: HolidayType;
  description?: string;
  is_active: boolean;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

const CompanyHolidaySchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  holiday_type: {
    type: String,
    enum: ['public', 'company', 'optional'],
    default: 'public',
    required: true
  },
  description: {
    type: String,
    trim: true,
    required: false
  },
  is_active: {
    type: Boolean,
    default: true,
    required: true
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
CompanyHolidaySchema.index({ date: 1 });
CompanyHolidaySchema.index({ is_active: 1 });
CompanyHolidaySchema.index({ deleted_at: 1 });
CompanyHolidaySchema.index({ holiday_type: 1 });

// Compound index for efficient queries
CompanyHolidaySchema.index({
  is_active: 1,
  date: 1
}, {
  partialFilterExpression: {
    deleted_at: null
  }
});

// Virtual for ID as string
CompanyHolidaySchema.virtual('id').get(function() {
  return (this._id as mongoose.Types.ObjectId).toHexString();
});

CompanyHolidaySchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const CompanyHoliday: Model<ICompanyHoliday> =
  mongoose.models.CompanyHoliday ||
  mongoose.model<ICompanyHoliday>('CompanyHoliday', CompanyHolidaySchema);

export { CompanyHoliday };
export default CompanyHoliday;
