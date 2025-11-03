import mongoose, { Document, Schema } from 'mongoose';

export interface IUtilizationMetrics {
  utilization_percentage: number; // (billable_hours / total_worked_hours) * 100
  billable_efficiency: number; // billable_hours / expected_work_hours * 100
  productivity_score: number; // Composite score based on multiple factors
}

export interface IPunctualityMetrics {
  submission_timeliness: number; // Days from week end to submission (negative = early, positive = late)
  is_on_time: boolean; // true if submitted within expected timeframe
  submission_streak: number; // Consecutive weeks of on-time submissions
  punctuality_score: number; // Score from 0-100 based on submission patterns
}

export interface IQualityMetrics {
  rejection_count: number; // Number of rejections this week
  approval_level_reached: string; // 'lead_approved', 'manager_approved', 'management_pending', etc.
  quality_score: number; // Score from 0-100 based on rejection history
  consecutive_approvals: number; // Streak of approvals without rejection
}

export interface IPerformanceMetrics {
  project_count: number; // Number of different projects worked on
  avg_hours_per_project: number; // Average hours distributed across projects
  project_diversity_score: number; // Score based on project spread
  consistency_score: number; // Score based on daily hour consistency
}

export interface IProjectBreakdown {
  project_id: mongoose.Types.ObjectId;
  project_name: string;
  total_hours: number;
  billable_hours: number;
  percentage_of_week: number;
  is_training: boolean;
}

export interface IUserWeekSummary extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  timesheet_id: mongoose.Types.ObjectId;
  week_start_date: Date;
  week_end_date: Date;
  
  // Core hour aggregations
  total_worked_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  training_hours: number;
  leave_hours: number;
  holiday_hours: number;
  miscellaneous_hours: number;
  
  // Daily metrics
  avg_daily_hours: number;
  working_days_count: number; // Days with entries (excluding holidays/leave)
  max_daily_hours: number;
  min_daily_hours: number;
  
  // Performance metrics
  utilization_metrics: IUtilizationMetrics;
  punctuality_metrics: IPunctualityMetrics;
  quality_metrics: IQualityMetrics;
  performance_metrics: IPerformanceMetrics;
  
  // Project breakdown
  project_breakdown: IProjectBreakdown[];
  
  // Submission tracking
  submitted_at?: Date;
  status: string; // Same as timesheet status
  
  // Aggregation metadata
  last_aggregated_at: Date;
  aggregation_version: number; // For schema evolution
  
  created_at: Date;
  updated_at: Date;
}

const UtilizationMetricsSchema = new Schema({
  utilization_percentage: { type: Number, default: 0, min: 0, max: 100 },
  billable_efficiency: { type: Number, default: 0, min: 0 },
  productivity_score: { type: Number, default: 0, min: 0, max: 100 }
}, { _id: false });

const PunctualityMetricsSchema = new Schema({
  submission_timeliness: { type: Number, default: 0 }, // Days difference
  is_on_time: { type: Boolean, default: false },
  submission_streak: { type: Number, default: 0, min: 0 },
  punctuality_score: { type: Number, default: 0, min: 0, max: 100 }
}, { _id: false });

const QualityMetricsSchema = new Schema({
  rejection_count: { type: Number, default: 0, min: 0 },
  approval_level_reached: { 
    type: String, 
    enum: ['draft', 'submitted', 'lead_approved', 'lead_rejected', 'manager_approved', 'manager_rejected', 'management_pending', 'management_rejected', 'frozen', 'billed'],
    default: 'draft'
  },
  quality_score: { type: Number, default: 100, min: 0, max: 100 },
  consecutive_approvals: { type: Number, default: 0, min: 0 }
}, { _id: false });

const PerformanceMetricsSchema = new Schema({
  project_count: { type: Number, default: 0, min: 0 },
  avg_hours_per_project: { type: Number, default: 0, min: 0 },
  project_diversity_score: { type: Number, default: 0, min: 0, max: 100 },
  consistency_score: { type: Number, default: 0, min: 0, max: 100 }
}, { _id: false });

const ProjectBreakdownSchema = new Schema({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  project_name: { type: String, required: true },
  total_hours: { type: Number, default: 0, min: 0 },
  billable_hours: { type: Number, default: 0, min: 0 },
  percentage_of_week: { type: Number, default: 0, min: 0, max: 100 },
  is_training: { type: Boolean, default: false }
}, { _id: false });

const UserWeekSummarySchema: Schema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timesheet_id: {
    type: Schema.Types.ObjectId,
    ref: 'Timesheet',
    required: true,
    unique: true // One summary per timesheet
  },
  week_start_date: {
    type: Date,
    required: true
  },
  week_end_date: {
    type: Date,
    required: true
  },
  
  // Core hour aggregations
  total_worked_hours: {
    type: Number,
    default: 0,
    min: 0
  },
  billable_hours: {
    type: Number,
    default: 0,
    min: 0
  },
  non_billable_hours: {
    type: Number,
    default: 0,
    min: 0
  },
  training_hours: {
    type: Number,
    default: 0,
    min: 0
  },
  leave_hours: {
    type: Number,
    default: 0,
    min: 0
  },
  holiday_hours: {
    type: Number,
    default: 0,
    min: 0
  },
  miscellaneous_hours: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Daily metrics
  avg_daily_hours: {
    type: Number,
    default: 0,
    min: 0
  },
  working_days_count: {
    type: Number,
    default: 0,
    min: 0,
    max: 7
  },
  max_daily_hours: {
    type: Number,
    default: 0,
    min: 0
  },
  min_daily_hours: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Performance metrics
  utilization_metrics: {
    type: UtilizationMetricsSchema,
    default: () => ({})
  },
  punctuality_metrics: {
    type: PunctualityMetricsSchema,
    default: () => ({})
  },
  quality_metrics: {
    type: QualityMetricsSchema,
    default: () => ({})
  },
  performance_metrics: {
    type: PerformanceMetricsSchema,
    default: () => ({})
  },
  
  // Project breakdown
  project_breakdown: {
    type: [ProjectBreakdownSchema],
    default: []
  },
  
  // Submission tracking
  submitted_at: {
    type: Date,
    required: false
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'lead_approved', 'lead_rejected', 'manager_approved', 'manager_rejected', 'management_pending', 'management_rejected', 'frozen', 'billed'],
    default: 'draft'
  },
  
  // Aggregation metadata
  last_aggregated_at: {
    type: Date,
    default: Date.now
  },
  aggregation_version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes for efficient querying
UserWeekSummarySchema.index({ user_id: 1, week_start_date: -1 }); // User's weekly summaries
UserWeekSummarySchema.index({ timesheet_id: 1 }, { unique: true }); // One summary per timesheet
UserWeekSummarySchema.index({ week_start_date: -1 }); // Weekly reports across users
UserWeekSummarySchema.index({ user_id: 1, week_start_date: 1 }, { unique: true }); // User week uniqueness
UserWeekSummarySchema.index({ status: 1 }); // Status-based queries
UserWeekSummarySchema.index({ 'utilization_metrics.utilization_percentage': -1 }); // Utilization rankings
UserWeekSummarySchema.index({ 'punctuality_metrics.punctuality_score': -1 }); // Punctuality rankings
UserWeekSummarySchema.index({ 'quality_metrics.quality_score': -1 }); // Quality rankings

// Compound indexes for analytics
UserWeekSummarySchema.index({
  user_id: 1,
  week_start_date: -1,
  status: 1
});

// Virtual for ID as string
UserWeekSummarySchema.virtual('id').get(function() {
  return (this._id as mongoose.Types.ObjectId).toHexString();
});

UserWeekSummarySchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Static methods for analytics
UserWeekSummarySchema.statics.getUserUtilizationTrend = function(userId: mongoose.Types.ObjectId, weeks: number = 12) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));
  
  return this.find({
    user_id: userId,
    week_start_date: { $gte: startDate },
    status: { $nin: ['draft'] }
  })
  .sort({ week_start_date: 1 })
  .select('week_start_date utilization_metrics.utilization_percentage total_worked_hours billable_hours');
};

UserWeekSummarySchema.statics.getTeamPerformanceRanking = function(managerIds: mongoose.Types.ObjectId[], weeks: number = 4) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));
  
  return this.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $match: {
        'user.manager_id': { $in: managerIds },
        week_start_date: { $gte: startDate },
        status: { $nin: ['draft'] }
      }
    },
    {
      $group: {
        _id: '$user_id',
        user_name: { $first: '$user.full_name' },
        avg_utilization: { $avg: '$utilization_metrics.utilization_percentage' },
        avg_punctuality: { $avg: '$punctuality_metrics.punctuality_score' },
        avg_quality: { $avg: '$quality_metrics.quality_score' },
        total_weeks: { $sum: 1 },
        total_hours: { $sum: '$total_worked_hours' }
      }
    },
    {
      $addFields: {
        overall_score: {
          $multiply: [
            { $add: ['$avg_utilization', '$avg_punctuality', '$avg_quality'] },
            0.333
          ]
        }
      }
    },
    {
      $sort: { overall_score: -1 }
    }
  ]);
};

const UserWeekSummary = mongoose.models.UserWeekSummary || mongoose.model<IUserWeekSummary>('UserWeekSummary', UserWeekSummarySchema);

export { UserWeekSummary };
export default UserWeekSummary;