import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICalendarModel extends Model<ICalendar> {
  getCompanyCalendar(): Promise<ICalendar | null>;
  getOrCreateCompanyCalendar(createdBy: mongoose.Types.ObjectId): Promise<ICalendar>;
}

export interface ICalendar extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  timezone: string;
  is_active: boolean;

  // Holiday-related settings
  auto_create_holiday_entries: boolean; // Automatically create holiday entries in timesheets
  default_holiday_hours: number; // Default hours for holiday entries (adjustable by users)

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
    maxlength: 100,
    default: 'Company Calendar'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: 'Default company calendar for holidays and timesheet settings'
  },
  timezone: {
    type: String,
    required: true,
    default: 'UTC'
  },
  is_active: {
    type: Boolean,
    default: true,
    required: true
  },

  // Holiday settings - simplified
  auto_create_holiday_entries: {
    type: Boolean,
    default: true,
    required: true
  },
  default_holiday_hours: {
    type: Number,
    default: 8,
    min: 0,
    max: 24
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
CalendarSchema.index({ is_active: 1 });
CalendarSchema.index({ created_by: 1 });
CalendarSchema.index({ deleted_at: 1 });

// Ensure only one active calendar exists
CalendarSchema.pre('save', async function(next) {
  if (this.is_active) {
    await Calendar.updateMany(
      {
        _id: { $ne: this._id },
        deleted_at: { $exists: false }
      },
      { is_active: false }
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
  // Get the active company calendar
  async getCompanyCalendar(): Promise<ICalendar | null> {
    return this.findOne({
      is_active: true,
      deleted_at: { $exists: false }
    });
  },

  // Get or create default company calendar
  async getOrCreateCompanyCalendar(createdBy: mongoose.Types.ObjectId): Promise<ICalendar> {
    let calendar = await this.findOne({
      is_active: true,
      deleted_at: { $exists: false }
    });

    if (!calendar) {
      calendar = await this.create({
        name: 'Company Calendar',
        description: 'Default company calendar for holidays and timesheet settings',
        timezone: 'UTC',
        is_active: true,
        auto_create_holiday_entries: true,
        default_holiday_hours: 8,
        working_days: [1, 2, 3, 4, 5], // Monday to Friday
        working_hours_per_day: 8,
        created_by: createdBy
      });
    }

    return calendar;
  }
};

const Calendar = (mongoose.models.Calendar ||
  mongoose.model<ICalendar, ICalendarModel>('Calendar', CalendarSchema)) as ICalendarModel;

export { Calendar };
export default Calendar;