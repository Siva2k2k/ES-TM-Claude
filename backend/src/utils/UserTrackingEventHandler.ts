import mongoose from 'mongoose';
import UserWeekAggregationService from '../services/UserWeekAggregationService';
import { TimesheetProjectApproval } from '../models/TimesheetProjectApproval';
import logger from '../config/logger';

/**
 * Event handlers for user tracking aggregation
 * These should be called when approval statuses change
 */

export class UserTrackingEventHandler {

  /**
   * Handle project approval status change
   * Call this when a project gets management approval
   */
  static async handleProjectApprovalChange(
    projectId: mongoose.Types.ObjectId,
    newStatus: 'approved' | 'rejected' | 'pending'
  ): Promise<void> {
    try {
      if (newStatus === 'approved') {
        logger.info(`Project ${projectId} got management approval, triggering aggregation recalculation`);
        
        // Recalculate all timesheets for this project
        const processedCount = await UserWeekAggregationService.recalculateTimesheetsForProject(projectId);
        
        logger.info(`Recalculated ${processedCount} timesheets after project ${projectId} approval`);
      } else if (newStatus === 'rejected') {
        // When a project is rejected, we need to recalculate to remove its contribution
        logger.info(`Project ${projectId} was rejected, triggering aggregation recalculation`);
        
        const processedCount = await UserWeekAggregationService.recalculateTimesheetsForProject(projectId);
        
        logger.info(`Recalculated ${processedCount} timesheets after project ${projectId} rejection`);
      }
    } catch (error) {
      logger.error(`Error handling project approval change for ${projectId}:`, error);
    }
  }

  /**
   * Handle timesheet project approval change
   * Call this when individual timesheet-project combinations get approved/rejected
   */
  static async handleTimesheetProjectApprovalChange(
    timesheetId: mongoose.Types.ObjectId,
    projectId: mongoose.Types.ObjectId,
    newStatus: 'approved' | 'rejected' | 'pending'
  ): Promise<void> {
    try {
      if (newStatus === 'approved' || newStatus === 'rejected') {
        logger.info(`Timesheet ${timesheetId} project ${projectId} status changed to ${newStatus}, triggering aggregation`);
        
        // Recalculate this specific timesheet
        await UserWeekAggregationService.aggregateTimesheet(timesheetId);
        
        logger.info(`Recalculated timesheet ${timesheetId} after project approval status change`);
      }
    } catch (error) {
      logger.error(`Error handling timesheet project approval change for ${timesheetId}/${projectId}:`, error);
    }
  }

  /**
   * Handle billable hours adjustment
   * Call this when managers adjust billable hours for a project
   */
  static async handleBillableHoursAdjustment(
    timesheetId: mongoose.Types.ObjectId,
    projectId: mongoose.Types.ObjectId,
    oldBillableHours: number,
    newBillableHours: number
  ): Promise<void> {
    try {
      logger.info(`Billable hours adjusted for timesheet ${timesheetId} project ${projectId}: ${oldBillableHours} -> ${newBillableHours}`);
      
      // Recalculate this specific timesheet to reflect the adjustment
      await UserWeekAggregationService.aggregateTimesheet(timesheetId);
      
      logger.info(`Recalculated timesheet ${timesheetId} after billable hours adjustment`);
    } catch (error) {
      logger.error(`Error handling billable hours adjustment for ${timesheetId}/${projectId}:`, error);
    }
  }

  /**
   * Handle bulk approval events
   * Call this when multiple projects or timesheets are approved at once
   */
  static async handleBulkApprovalChange(
    approvalUpdates: Array<{
      timesheetId: mongoose.Types.ObjectId;
      projectId: mongoose.Types.ObjectId;
      newStatus: 'approved' | 'rejected' | 'pending';
    }>
  ): Promise<void> {
    try {
      const approvedUpdates = approvalUpdates.filter(update => update.newStatus === 'approved');
      
      if (approvedUpdates.length === 0) {
        return;
      }

      logger.info(`Processing bulk approval for ${approvedUpdates.length} timesheet-project combinations`);
      
      // Group by timesheet to avoid duplicate recalculations
      const uniqueTimesheetIds = [...new Set(approvedUpdates.map(update => update.timesheetId.toString()))];
      
      let processedCount = 0;
      for (const timesheetIdStr of uniqueTimesheetIds) {
        try {
          const timesheetId = new mongoose.Types.ObjectId(timesheetIdStr);
          await UserWeekAggregationService.aggregateTimesheet(timesheetId);
          processedCount++;
        } catch (error) {
          logger.error(`Error recalculating timesheet ${timesheetIdStr} in bulk approval:`, error);
        }
      }
      
      logger.info(`Recalculated ${processedCount} timesheets after bulk approval`);
    } catch (error) {
      logger.error('Error handling bulk approval change:', error);
    }
  }

  /**
   * Validate aggregation data integrity
   * Call this periodically to ensure aggregation data is accurate
   */
  static async validateAggregationIntegrity(weeks: number = 4): Promise<{
    inconsistencies: number;
    fixed: number;
    errors: string[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeks * 7));

      // Find all timesheet summaries in the period
      const summaries = await mongoose.model('UserWeekSummary').find({
        week_start_date: { $gte: startDate }
      });

      let inconsistencies = 0;
      let fixed = 0;
      const errors: string[] = [];

      for (const summary of summaries) {
        try {
          // Check if the timesheet still has approved projects
          const approvedProjects = await TimesheetProjectApproval.find({
            timesheet_id: summary.timesheet_id,
            $or: [
              { management_status: 'approved' },
              { management_status: 'not_required' }
            ]
          });

          if (approvedProjects.length === 0) {
            // This summary should not exist or should be recalculated
            inconsistencies++;
            
            // Try to fix by recalculating
            await UserWeekAggregationService.aggregateTimesheet(summary.timesheet_id);
            fixed++;
          }
        } catch (error) {
          errors.push(`Error validating summary ${summary._id}: ${error}`);
        }
      }

      logger.info(`Aggregation integrity check completed: ${inconsistencies} inconsistencies found, ${fixed} fixed`);
      
      return {
        inconsistencies,
        fixed,
        errors
      };

    } catch (error) {
      logger.error('Error validating aggregation integrity:', error);
      throw error;
    }
  }
}

export default UserTrackingEventHandler;