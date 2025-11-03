import mongoose from 'mongoose';
import { UserWeekSummary, IUserWeekSummary } from '../models/UserWeekSummary';
import { Timesheet, ITimesheet } from '../models/Timesheet';
import { TimeEntry, ITimeEntry } from '../models/TimeEntry';
import { Project, IProject } from '../models/Project';
import { User, IUser } from '../models/User';
import { TimesheetProjectApproval, ITimesheetProjectApproval } from '../models/TimesheetProjectApproval';
import logger from '../config/logger';

export interface IAggregationOptions {
  recalculateExisting?: boolean;
  weekStartDate?: Date;
  userIds?: mongoose.Types.ObjectId[];
}

export class UserWeekAggregationService {
  
  /**
   * Aggregate a single timesheet into a UserWeekSummary
   * Uses project-week approval status to determine which hours to include
   */
  async aggregateTimesheet(timesheetId: mongoose.Types.ObjectId): Promise<IUserWeekSummary | null> {
    try {
      const timesheet = await Timesheet.findById(timesheetId).populate('user_id');
      if (!timesheet) {
        throw new Error(`Timesheet ${timesheetId} not found`);
      }

      // Get project approvals for this timesheet to determine approval status
      const projectApprovals = await TimesheetProjectApproval.find({ 
        timesheet_id: timesheetId 
      }).populate('project_id');

      // Only process projects that are management approved or don't require management approval
      const approvedProjects = projectApprovals.filter(approval => 
        approval.management_status === 'approved' || 
        approval.management_status === 'not_required'
      );

      // Get approved project IDs
      const approvedProjectIds = approvedProjects.map(approval => approval.project_id);

      // Get all time entries for this timesheet, but only for approved projects
      const timeEntries = await TimeEntry.find({ 
        timesheet_id: timesheetId,
        deleted_at: null,
        $or: [
          { project_id: { $in: approvedProjectIds } }, // Project entries for approved projects
          { entry_category: { $in: ['leave', 'holiday', 'miscellaneous'] } } // Non-project entries always included
        ]
      }).populate('project_id');

      // Get projects for project breakdown
      const projectIds = timeEntries
        .filter(entry => entry.project_id)
        .map(entry => entry.project_id);
      
      const projects = await Project.find({ 
        _id: { $in: projectIds },
        deleted_at: null 
      });

      // Check if summary already exists
      let summary = await UserWeekSummary.findOne({ timesheet_id: timesheetId });
      
      if (!summary) {
        summary = new UserWeekSummary({
          user_id: timesheet.user_id,
          timesheet_id: timesheetId,
          week_start_date: timesheet.week_start_date,
          week_end_date: timesheet.week_end_date,
          status: timesheet.status,
          submitted_at: timesheet.submitted_at
        });
      }

      // Aggregate core hours using project-week approval data
      const coreHours = this.calculateCoreHoursFromApprovals(timeEntries, approvedProjects);
      Object.assign(summary, coreHours);

      // Calculate daily metrics
      const dailyMetrics = this.calculateDailyMetrics(timeEntries);
      Object.assign(summary, dailyMetrics);

      // Calculate utilization metrics
      summary.utilization_metrics = this.calculateUtilizationMetrics(
        summary.total_worked_hours,
        summary.billable_hours,
        summary.working_days_count
      );

      // Calculate punctuality metrics
      summary.punctuality_metrics = await this.calculatePunctualityMetrics(
        timesheet.user_id as mongoose.Types.ObjectId,
        timesheet.week_end_date,
        timesheet.submitted_at
      );

      // Calculate quality metrics
      summary.quality_metrics = await this.calculateQualityMetrics(
        timesheet.user_id as mongoose.Types.ObjectId,
        timesheet
      );

      // Calculate performance metrics
      summary.performance_metrics = this.calculatePerformanceMetrics(timeEntries, projects);

      // Calculate project breakdown using approval data
      summary.project_breakdown = this.calculateProjectBreakdownFromApprovals(approvedProjects, projects);

      // Update aggregation metadata
      summary.last_aggregated_at = new Date();
      summary.status = timesheet.status;
      summary.submitted_at = timesheet.submitted_at;

      await summary.save();
      
      logger.info(`Aggregated timesheet ${timesheetId} for user ${timesheet.user_id} using project-week approvals`);
      return summary;

    } catch (error) {
      logger.error(`Error aggregating timesheet ${timesheetId}:`, error);
      throw error;
    }
  }

  /**
   * Aggregate multiple timesheets based on options
   * Only processes timesheets with management-approved project status
   */
  async aggregateTimesheets(options: IAggregationOptions = {}): Promise<number> {
    try {
      const query: any = { deleted_at: null };
      
      if (options.weekStartDate) {
        query.week_start_date = options.weekStartDate;
      }
      
      if (options.userIds && options.userIds.length > 0) {
        query.user_id = { $in: options.userIds };
      }

      // Additional filter: only process timesheets that have management-approved projects
      // or timesheets that don't require management approval
      const approvedTimesheetIds = await TimesheetProjectApproval.distinct('timesheet_id', {
        $or: [
          { management_status: 'approved' },
          { management_status: 'not_required' }
        ]
      });

      query._id = { $in: approvedTimesheetIds };

      // If not recalculating existing, only process timesheets without summaries
      if (!options.recalculateExisting) {
        const existingSummaries = await UserWeekSummary.find({}, 'timesheet_id');
        const existingTimesheetIds = existingSummaries.map(s => s.timesheet_id);
        query._id = { $in: approvedTimesheetIds, $nin: existingTimesheetIds };
      }

      const timesheets = await Timesheet.find(query);
      let processedCount = 0;

      for (const timesheet of timesheets) {
        try {
          await this.aggregateTimesheet(timesheet._id);
          processedCount++;
        } catch (error) {
          logger.error(`Failed to aggregate timesheet ${timesheet._id}:`, error);
        }
      }

      logger.info(`Processed ${processedCount} management-approved timesheets for aggregation`);
      return processedCount;

    } catch (error) {
      logger.error('Error in bulk timesheet aggregation:', error);
      throw error;
    }
  }

  /**
   * Calculate core hour aggregations using project-week approval data
   * This method prioritizes worked_hours and billable_hours from project approvals
   */
  private calculateCoreHoursFromApprovals(
    timeEntries: ITimeEntry[], 
    approvedProjects: ITimesheetProjectApproval[]
  ) {
    const hours = {
      total_worked_hours: 0,
      billable_hours: 0,
      non_billable_hours: 0,
      training_hours: 0,
      leave_hours: 0,
      holiday_hours: 0,
      miscellaneous_hours: 0
    };

    // First, add hours from approved project approvals (these have management-approved billable adjustments)
    for (const approval of approvedProjects) {
      hours.total_worked_hours += approval.worked_hours || 0;
      hours.billable_hours += approval.billable_hours || 0;
      
      // Check if this is a training project
      const project = approval.project_id as any;
      if (project && project.project_type === 'training') {
        hours.training_hours += approval.worked_hours || 0;
      }
    }

    // Then add non-project entries (leave, holiday, miscellaneous)
    const nonProjectEntries = timeEntries.filter(entry => 
      entry.entry_category !== 'project' && entry.entry_category !== 'training'
    );

    for (const entry of nonProjectEntries) {
      hours.total_worked_hours += entry.hours;
      hours.non_billable_hours += entry.hours; // Non-project entries are typically non-billable

      switch (entry.entry_category) {
        case 'leave':
          hours.leave_hours += entry.hours;
          break;
        case 'holiday':
          hours.holiday_hours += entry.hours;
          break;
        case 'miscellaneous':
          hours.miscellaneous_hours += entry.hours;
          break;
      }
    }

    // Calculate non-billable hours as total - billable
    hours.non_billable_hours = hours.total_worked_hours - hours.billable_hours;

    return hours;
  }

  /**
   * Calculate core hour aggregations (legacy method for backward compatibility)
   */
  private calculateCoreHours(timeEntries: ITimeEntry[]) {
    const hours = {
      total_worked_hours: 0,
      billable_hours: 0,
      non_billable_hours: 0,
      training_hours: 0,
      leave_hours: 0,
      holiday_hours: 0,
      miscellaneous_hours: 0
    };

    for (const entry of timeEntries) {
      hours.total_worked_hours += entry.hours;

      if (entry.is_billable) {
        hours.billable_hours += entry.billable_hours || entry.hours;
      } else {
        hours.non_billable_hours += entry.hours;
      }

      switch (entry.entry_category) {
        case 'training':
          hours.training_hours += entry.hours;
          break;
        case 'leave':
          hours.leave_hours += entry.hours;
          break;
        case 'holiday':
          hours.holiday_hours += entry.hours;
          break;
        case 'miscellaneous':
          hours.miscellaneous_hours += entry.hours;
          break;
      }
    }

    return hours;
  }

  /**
   * Calculate daily metrics
   */
  private calculateDailyMetrics(timeEntries: ITimeEntry[]) {
    const dailyHours = new Map<string, number>();
    
    for (const entry of timeEntries) {
      const dateKey = entry.date.toISOString().split('T')[0];
      const currentHours = dailyHours.get(dateKey) || 0;
      dailyHours.set(dateKey, currentHours + entry.hours);
    }

    const hoursArray = Array.from(dailyHours.values()).filter(hours => hours > 0);
    
    return {
      working_days_count: hoursArray.length,
      avg_daily_hours: hoursArray.length > 0 ? hoursArray.reduce((a, b) => a + b, 0) / hoursArray.length : 0,
      max_daily_hours: hoursArray.length > 0 ? Math.max(...hoursArray) : 0,
      min_daily_hours: hoursArray.length > 0 ? Math.min(...hoursArray) : 0
    };
  }

  /**
   * Calculate utilization metrics
   */
  private calculateUtilizationMetrics(totalHours: number, billableHours: number, workingDays: number) {
    const expectedWorkHours = workingDays * 8; // Assuming 8 hours per working day
    
    return {
      utilization_percentage: totalHours > 0 ? (billableHours / totalHours) * 100 : 0,
      billable_efficiency: expectedWorkHours > 0 ? (billableHours / expectedWorkHours) * 100 : 0,
      productivity_score: this.calculateProductivityScore(totalHours, billableHours, expectedWorkHours)
    };
  }

  /**
   * Calculate punctuality metrics
   */
  private async calculatePunctualityMetrics(
    userId: mongoose.Types.ObjectId, 
    weekEndDate: Date, 
    submittedAt?: Date
  ) {
    // Calculate submission timeliness (expected submission by Monday after week end)
    const expectedSubmissionDate = new Date(weekEndDate);
    expectedSubmissionDate.setDate(expectedSubmissionDate.getDate() + 3); // Monday after week end

    let submission_timeliness = 0;
    let is_on_time = false;

    if (submittedAt) {
      submission_timeliness = Math.ceil((submittedAt.getTime() - expectedSubmissionDate.getTime()) / (1000 * 60 * 60 * 24));
      is_on_time = submission_timeliness <= 0;
    }

    // Calculate submission streak (last 8 weeks)
    const pastWeeksStart = new Date(weekEndDate);
    pastWeeksStart.setDate(pastWeeksStart.getDate() - (8 * 7));

    const recentSummaries = await UserWeekSummary.find({
      user_id: userId,
      week_start_date: { $gte: pastWeeksStart, $lt: weekEndDate },
      status: { $nin: ['draft'] }
    }).sort({ week_start_date: -1 });

    let submission_streak = is_on_time ? 1 : 0;
    for (const summary of recentSummaries) {
      if (summary.punctuality_metrics.is_on_time) {
        submission_streak++;
      } else {
        break;
      }
    }

    // Calculate punctuality score (0-100)
    const punctuality_score = this.calculatePunctualityScore(submission_timeliness, submission_streak);

    return {
      submission_timeliness,
      is_on_time,
      submission_streak,
      punctuality_score
    };
  }

  /**
   * Calculate quality metrics
   */
  private async calculateQualityMetrics(userId: mongoose.Types.ObjectId, timesheet: ITimesheet) {
    // Count rejections for this timesheet
    const rejection_count = [
      timesheet.lead_rejected_at,
      timesheet.manager_rejected_at,
      timesheet.management_rejected_at
    ].filter(Boolean).length;

    // Determine approval level reached
    let approval_level_reached = timesheet.status;

    // Calculate consecutive approvals (last 8 weeks)
    const pastWeeksStart = new Date(timesheet.week_start_date);
    pastWeeksStart.setDate(pastWeeksStart.getDate() - (8 * 7));

    const recentSummaries = await UserWeekSummary.find({
      user_id: userId,
      week_start_date: { $gte: pastWeeksStart, $lt: timesheet.week_start_date },
      status: { $nin: ['draft'] }
    }).sort({ week_start_date: -1 });

    let consecutive_approvals = rejection_count === 0 ? 1 : 0;
    for (const summary of recentSummaries) {
      if (summary.quality_metrics.rejection_count === 0) {
        consecutive_approvals++;
      } else {
        break;
      }
    }

    // Calculate quality score (0-100)
    const quality_score = this.calculateQualityScore(rejection_count, consecutive_approvals);

    return {
      rejection_count,
      approval_level_reached,
      quality_score,
      consecutive_approvals
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(timeEntries: ITimeEntry[], projects: IProject[]) {
    const projectHours = new Map<string, number>();
    
    for (const entry of timeEntries) {
      if (entry.project_id && entry.entry_category === 'project') {
        const projectId = entry.project_id.toString();
        const currentHours = projectHours.get(projectId) || 0;
        projectHours.set(projectId, currentHours + entry.hours);
      }
    }

    const project_count = projectHours.size;
    const totalProjectHours = Array.from(projectHours.values()).reduce((a, b) => a + b, 0);
    const avg_hours_per_project = project_count > 0 ? totalProjectHours / project_count : 0;

    // Calculate project diversity score (spread across multiple projects is better)
    const project_diversity_score = this.calculateProjectDiversityScore(projectHours);
    
    // Calculate consistency score (consistent daily hours is better)
    const consistency_score = this.calculateConsistencyScore(timeEntries);

    return {
      project_count,
      avg_hours_per_project,
      project_diversity_score,
      consistency_score
    };
  }

  /**
   * Calculate project breakdown using project-week approval data
   * This provides more accurate billable hours with management adjustments
   */
  private calculateProjectBreakdownFromApprovals(
    approvedProjects: ITimesheetProjectApproval[], 
    projects: IProject[]
  ) {
    const totalHours = approvedProjects.reduce((sum, approval) => sum + (approval.worked_hours || 0), 0);

    return approvedProjects.map(approval => {
      const project = projects.find(p => p._id.toString() === approval.project_id.toString());
      const workedHours = approval.worked_hours || 0;
      const billableHours = approval.billable_hours || 0;

      return {
        project_id: approval.project_id,
        project_name: project?.name || 'Unknown Project',
        total_hours: workedHours,
        billable_hours: billableHours,
        percentage_of_week: totalHours > 0 ? (workedHours / totalHours) * 100 : 0,
        is_training: project?.project_type === 'training' || false
      };
    });
  }

  /**
   * Calculate project breakdown (legacy method for backward compatibility)
   */
  private calculateProjectBreakdown(timeEntries: ITimeEntry[], projects: IProject[]) {
    const projectData = new Map<string, {
      project_id: mongoose.Types.ObjectId;
      project_name: string;
      total_hours: number;
      billable_hours: number;
      is_training: boolean;
    }>();

    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);

    for (const entry of timeEntries) {
      if (entry.project_id && entry.entry_category === 'project') {
        const projectId = entry.project_id.toString();
        const project = projects.find(p => p._id.toString() === projectId);
        
        if (project) {
          const existing = projectData.get(projectId) || {
            project_id: entry.project_id,
            project_name: project.name,
            total_hours: 0,
            billable_hours: 0,
            is_training: project.project_type === 'training'
          };

          existing.total_hours += entry.hours;
          if (entry.is_billable) {
            existing.billable_hours += entry.billable_hours || entry.hours;
          }

          projectData.set(projectId, existing);
        }
      }
    }

    return Array.from(projectData.values()).map(project => ({
      ...project,
      percentage_of_week: totalHours > 0 ? (project.total_hours / totalHours) * 100 : 0
    }));
  }

  /**
   * Helper methods for score calculations
   */
  private calculateProductivityScore(totalHours: number, billableHours: number, expectedHours: number): number {
    if (expectedHours === 0) return 0;
    
    const hoursScore = Math.min((totalHours / expectedHours) * 50, 50);
    const utilizationScore = totalHours > 0 ? (billableHours / totalHours) * 50 : 0;
    
    return Math.round(hoursScore + utilizationScore);
  }

  private calculatePunctualityScore(timeliness: number, streak: number): number {
    let score = 100;
    
    // Penalty for late submission
    if (timeliness > 0) {
      score -= Math.min(timeliness * 10, 60); // Max 60 point penalty
    }
    
    // Bonus for streak
    score += Math.min(streak * 2, 20); // Max 20 point bonus
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateQualityScore(rejections: number, consecutiveApprovals: number): number {
    let score = 100;
    
    // Penalty for rejections
    score -= rejections * 25; // 25 points per rejection
    
    // Bonus for consecutive approvals
    score += Math.min(consecutiveApprovals * 2, 20); // Max 20 point bonus
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateProjectDiversityScore(projectHours: Map<string, number>): number {
    if (projectHours.size === 0) return 0;
    if (projectHours.size === 1) return 50; // Single project gets 50
    
    const totalHours = Array.from(projectHours.values()).reduce((a, b) => a + b, 0);
    const hoursArray = Array.from(projectHours.values());
    
    // Calculate distribution evenness (Shannon entropy approach)
    let entropy = 0;
    for (const hours of hoursArray) {
      const proportion = hours / totalHours;
      if (proportion > 0) {
        entropy -= proportion * Math.log2(proportion);
      }
    }
    
    const maxEntropy = Math.log2(projectHours.size);
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
    
    return Math.round(normalizedEntropy * 100);
  }

  private calculateConsistencyScore(timeEntries: ITimeEntry[]): number {
    const dailyHours = new Map<string, number>();
    
    for (const entry of timeEntries) {
      const dateKey = entry.date.toISOString().split('T')[0];
      const currentHours = dailyHours.get(dateKey) || 0;
      dailyHours.set(dateKey, currentHours + entry.hours);
    }

    const hoursArray = Array.from(dailyHours.values()).filter(hours => hours > 0);
    
    if (hoursArray.length <= 1) return 100;
    
    const mean = hoursArray.reduce((a, b) => a + b, 0) / hoursArray.length;
    const variance = hoursArray.reduce((sum, hours) => sum + Math.pow(hours - mean, 2), 0) / hoursArray.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
    const consistencyScore = Math.max(0, 100 - (coefficientOfVariation * 100));
    
    return Math.round(consistencyScore);
  }

  /**
   * Recalculate all user summaries for a specific week
   */
  async recalculateWeek(weekStartDate: Date): Promise<number> {
    return this.aggregateTimesheets({
      recalculateExisting: true,
      weekStartDate
    });
  }

  /**
   * Recalculate user summaries when project approval status changes
   * This method should be called when a project gets management approval
   */
  async recalculateTimesheetsForProject(projectId: mongoose.Types.ObjectId): Promise<number> {
    try {
      // Find all timesheet project approvals for this project that are now management approved
      const approvedProjectTimesheets = await TimesheetProjectApproval.find({
        project_id: projectId,
        management_status: 'approved'
      }).select('timesheet_id');

      const timesheetIds = approvedProjectTimesheets.map(approval => approval.timesheet_id);

      if (timesheetIds.length === 0) {
        logger.info(`No management-approved timesheets found for project ${projectId}`);
        return 0;
      }

      let processedCount = 0;
      for (const timesheetId of timesheetIds) {
        try {
          await this.aggregateTimesheet(timesheetId);
          processedCount++;
        } catch (error) {
          logger.error(`Failed to recalculate timesheet ${timesheetId} for project ${projectId}:`, error);
        }
      }

      logger.info(`Recalculated ${processedCount} timesheets for project ${projectId} after management approval`);
      return processedCount;

    } catch (error) {
      logger.error(`Error recalculating timesheets for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Recalculate user summaries for a specific user when their project approvals change
   */
  async recalculateTimesheetsForUser(userId: mongoose.Types.ObjectId, weeks?: number): Promise<number> {
    try {
      let dateFilter = {};
      if (weeks) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (weeks * 7));
        dateFilter = { week_start_date: { $gte: startDate } };
      }

      // Find all timesheets for this user
      const userTimesheets = await Timesheet.find({
        user_id: userId,
        deleted_at: null,
        ...dateFilter
      }).select('_id');

      // Filter to only those with management-approved projects
      const approvedTimesheetIds = await TimesheetProjectApproval.distinct('timesheet_id', {
        timesheet_id: { $in: userTimesheets.map(t => t._id) },
        $or: [
          { management_status: 'approved' },
          { management_status: 'not_required' }
        ]
      });

      let processedCount = 0;
      for (const timesheetId of approvedTimesheetIds) {
        try {
          await this.aggregateTimesheet(timesheetId);
          processedCount++;
        } catch (error) {
          logger.error(`Failed to recalculate timesheet ${timesheetId} for user ${userId}:`, error);
        }
      }

      logger.info(`Recalculated ${processedCount} timesheets for user ${userId}`);
      return processedCount;

    } catch (error) {
      logger.error(`Error recalculating timesheets for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user performance trends
   */
  async getUserPerformanceTrends(userId: mongoose.Types.ObjectId, weeks: number = 12) {
    return UserWeekSummary.getUserUtilizationTrend(userId, weeks);
  }

  /**
   * Get team performance ranking
   */
  async getTeamPerformanceRanking(managerIds: mongoose.Types.ObjectId[], weeks: number = 4) {
    return UserWeekSummary.getTeamPerformanceRanking(managerIds, weeks);
  }

  /**
   * Get aggregation statistics for monitoring
   */
  async getAggregationStats(weeks: number = 4) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeks * 7));

      // Get total timesheets in period
      const totalTimesheets = await Timesheet.countDocuments({
        week_start_date: { $gte: startDate },
        deleted_at: null
      });

      // Get timesheets with management-approved projects
      const approvedTimesheetIds = await TimesheetProjectApproval.distinct('timesheet_id', {
        $or: [
          { management_status: 'approved' },
          { management_status: 'not_required' }
        ]
      });

      const approvedTimesheets = await Timesheet.countDocuments({
        _id: { $in: approvedTimesheetIds },
        week_start_date: { $gte: startDate },
        deleted_at: null
      });

      // Get aggregated summaries
      const aggregatedSummaries = await UserWeekSummary.countDocuments({
        week_start_date: { $gte: startDate }
      });

      // Get pending project approvals
      const pendingApprovals = await TimesheetProjectApproval.countDocuments({
        management_status: 'pending'
      });

      return {
        total_timesheets: totalTimesheets,
        approved_timesheets: approvedTimesheets,
        aggregated_summaries: aggregatedSummaries,
        pending_approvals: pendingApprovals,
        aggregation_coverage: approvedTimesheets > 0 ? (aggregatedSummaries / approvedTimesheets) * 100 : 0,
        approval_rate: totalTimesheets > 0 ? (approvedTimesheets / totalTimesheets) * 100 : 0
      };

    } catch (error) {
      logger.error('Error getting aggregation stats:', error);
      throw error;
    }
  }
}

export default new UserWeekAggregationService();