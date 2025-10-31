import mongoose, { Document, Model, Schema } from 'mongoose';

export type CalendarType = 'system' | 'company' | 'regional' | 'personal';

export interface ICalendar extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: CalendarType;
  timezone: string;
  is_default: boolean;
  is_active: boolean;

  // Holiday-related settings
  include_public_holidays: boolean;
  include_company_holidays: boolean;

  // Timesheet-related settings
  working_days: number[]; // Array of day numbers (0=Sunday, 1=Monday, etc.)
  business_hours_start?: string; // HH:MM format
  business_hours_end?: string; // HH:MM format
  working_hours_per_day: number; // Standard working hours per day

  // Management fields
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

const CalendarSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['system', 'company', 'regional', 'personal'],
    default: 'company',
    required: true
  },
  timezone: {
    type: String,
    required: true,
    default: 'UTC'
  },
  is_default: {
    type: Boolean,
    default: false,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true,
    required: true
  },

  // Holiday settings
  include_public_holidays: {
    type: Boolean,
    default: true,
    required: true
  },
  include_company_holidays: {
    type: Boolean,
    default: true,
    required: true
  },

  // Timesheet settings
  working_days: {
    type: [Number],
    default: [1, 2, 3, 4, 5], // Monday to Friday
    validate: {
      validator: function(days: number[]) {
        return days.every(day => day >= 0 && day <= 6);
      },
      message: 'Working days must be between 0 (Sunday) and 6 (Saturday)'
    }
  },
  business_hours_start: {
    type: String,
    validate: {
      validator: function(time: string) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
      },
      message: 'Business hours start must be in HH:MM format'
    }
  },
  business_hours_end: {
    type: String,
    validate: {
      validator: function(time: string) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
      },
      message: 'Business hours end must be in HH:MM format'
    }
  },
  working_hours_per_day: {
    type: Number,
    default: 8,
    min: 1,
    max: 24
  },

  // Management
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
CalendarSchema.index({ type: 1, is_active: 1 });
CalendarSchema.index({ is_default: 1 });
CalendarSchema.index({ created_by: 1 });
CalendarSchema.index({ deleted_at: 1 });

// Pre-save middleware to ensure only one default calendar per type
CalendarSchema.pre('save', async function(next) {
  if (this.is_default) {
    await Calendar.updateMany(
      {
        type: this.type,
        _id: { $ne: this._id },
        deleted_at: { $exists: false }
      },
      { is_default: false }
    );
  }
  next();
});

// Virtual for ID as string
CalendarSchema.virtual('id').get(function() {
  return (this._id as mongoose.Types.ObjectId).toHexString();
});

CalendarSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Static methods
CalendarSchema.statics = {
  // Get default calendar for a type
  async getDefaultCalendar(type: CalendarType = 'company'): Promise<ICalendar | null> {
    return this.findOne({
      type,
      is_default: true,
      is_active: true,
      deleted_at: { $exists: false }
    });
  },

  // Get active calendars for a user
  async getActiveCalendars(createdBy?: mongoose.Types.ObjectId): Promise<ICalendar[]> {
    const query: any = {
      is_active: true,
      deleted_at: { $exists: false }
    };

    if (createdBy) {
      query.created_by = createdBy;
    }

    return this.find(query).sort({ name: 1 });
  }
};

const Calendar: Model<ICalendar> =
  mongoose.models.Calendar ||
  mongoose.model<ICalendar>('Calendar', CalendarSchema);

export { Calendar };
export default Calendar;