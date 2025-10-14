/**
 * Phase 7: Team Review Approval Service
 * Handles approve/reject/verify/bill operations with multi-manager logic
 * SonarQube compliant - kept under 250 lines
 */

import mongoose from 'mongoose';
import { Timesheet } from '../models/Timesheet';
import { TimesheetProjectApproval } from '../models/TimesheetProjectApproval';
import { ApprovalHistory } from '../models/ApprovalHistory';
import { Project } from '../models/Project';
import { logger } from '../config/logger';
import type { BulkProjectWeekApprovalResponse } from '../types/teamReview';

export interface ApprovalResponse {
  success: boolean;
  message: string;
  all_approved: boolean;
  new_status: string;
}

export class TeamReviewApprovalService {
  /**
   * Approve timesheet for a specific project
   * Multi-manager logic: Status updates only when ALL managers approve
   */
  static async approveTimesheetForProject(
    timesheetId: string,
    projectId: string,
    approverId: string,
    approverRole: string
  ): Promise<ApprovalResponse> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get timesheet
      const timesheet = await Timesheet.findById(timesheetId).session(session);
      if (!timesheet) {
        throw new Error('Timesheet not found');
      }

      // Get project approval record
      const projectApproval = await TimesheetProjectApproval.findOne({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        project_id: new mongoose.Types.ObjectId(projectId)
      }).session(session);

      if (!projectApproval) {
        throw new Error('Project approval record not found');
      }

      const statusBefore = timesheet.status;

      // Update approval based on role
      if (approverRole === 'lead') {
        projectApproval.lead_status = 'approved';
        projectApproval.lead_approved_at = new Date();
        projectApproval.lead_rejection_reason = undefined;
      } else if (approverRole === 'manager' || approverRole === 'management' || approverRole === 'super_admin') {
        projectApproval.manager_status = 'approved';
        projectApproval.manager_approved_at = new Date();
        projectApproval.manager_rejection_reason = undefined;
      }

      await projectApproval.save({ session });

      // Check if ALL required approvals are complete
      const allApprovals = await this.checkAllApprovalsComplete(timesheetId, session);

      let newStatus = timesheet.status;
      if (allApprovals) {
        newStatus = 'manager_approved';
        timesheet.status = newStatus;
        timesheet.approved_by_manager_id = new mongoose.Types.ObjectId(approverId);
        timesheet.approved_by_manager_at = new Date();
        await timesheet.save({ session });
      }

      // Record approval history
      await ApprovalHistory.create([{
        timesheet_id: timesheet._id,
        project_id: new mongoose.Types.ObjectId(projectId),
        user_id: timesheet.user_id,
        approver_id: new mongoose.Types.ObjectId(approverId),
        approver_role: approverRole,
        action: 'approved',
        status_before: statusBefore,
        status_after: newStatus
      }], { session });

      await session.commitTransaction();

      return {
        success: true,
        message: allApprovals
          ? 'Timesheet approved and status updated'
          : 'Project approved, waiting for other managers',
        all_approved: allApprovals,
        new_status: newStatus
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error approving timesheet:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Reject timesheet for a specific project
   * Rejection resets ALL approvals
   */
  static async rejectTimesheetForProject(
    timesheetId: string,
    projectId: string,
    approverId: string,
    approverRole: string,
    reason: string
  ): Promise<ApprovalResponse> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const timesheet = await Timesheet.findById(timesheetId).session(session);
      if (!timesheet) {
        throw new Error('Timesheet not found');
      }

      const projectApproval = await TimesheetProjectApproval.findOne({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        project_id: new mongoose.Types.ObjectId(projectId)
      }).session(session);

      if (!projectApproval) {
        throw new Error('Project approval record not found');
      }

      const statusBefore = timesheet.status;

      // Update rejection
      if (approverRole === 'lead') {
        projectApproval.lead_status = 'rejected';
        projectApproval.lead_rejection_reason = reason;
      } else {
        projectApproval.manager_status = 'rejected';
        projectApproval.manager_rejection_reason = reason;
      }

      await projectApproval.save({ session });

      // Reset ALL approvals for this timesheet
      await this.resetAllApprovals(timesheetId, session);

      // Update timesheet status
      const newStatus = 'manager_rejected';
      timesheet.status = newStatus;
      timesheet.manager_rejection_reason = reason;
      timesheet.manager_rejected_at = new Date();
      await timesheet.save({ session });

      // Record rejection history
      await ApprovalHistory.create([{
        timesheet_id: timesheet._id,
        project_id: new mongoose.Types.ObjectId(projectId),
        user_id: timesheet.user_id,
        approver_id: new mongoose.Types.ObjectId(approverId),
        approver_role: approverRole,
        action: 'rejected',
        status_before: statusBefore,
        status_after: newStatus,
        reason
      }], { session });

      await session.commitTransaction();

      return {
        success: true,
        message: 'Timesheet rejected',
        all_approved: false,
        new_status: newStatus
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error rejecting timesheet:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Check if all required approvals are complete
   */
  private static async checkAllApprovalsComplete(
    timesheetId: string,
    session: any
  ): Promise<boolean> {
    const approvals = await TimesheetProjectApproval.find({
      timesheet_id: new mongoose.Types.ObjectId(timesheetId)
    }).session(session);

    for (const approval of approvals) {
      // Check lead approval if required
      if (approval.lead_id && approval.lead_status !== 'approved') {
        return false;
      }

      // Check manager approval (always required)
      if (approval.manager_status !== 'approved') {
        return false;
      }
    }

    return true;
  }

  /**
   * Reset all approvals for a timesheet (used on rejection)
   */
  private static async resetAllApprovals(
    timesheetId: string,
    session: any
  ): Promise<void> {
    await TimesheetProjectApproval.updateMany(
      { timesheet_id: new mongoose.Types.ObjectId(timesheetId) },
      {
        $set: {
          lead_status: 'pending',
          lead_approved_at: null,
          manager_status: 'pending',
          manager_approved_at: null
        }
      },
      { session }
    );
  }

  /**
   * Bulk verify timesheets (Management only)
   */
  static async bulkVerifyTimesheets(
    timesheetIds: string[],
    verifierId: string
  ): Promise<{ processed_count: number; failed_count: number }> {
    let processedCount = 0;
    let failedCount = 0;

    for (const timesheetId of timesheetIds) {
      try {
        await Timesheet.findByIdAndUpdate(timesheetId, {
          status: 'frozen',
          is_frozen: true,
          verified_by_id: new mongoose.Types.ObjectId(verifierId),
          verified_at: new Date()
        });
        processedCount++;
      } catch (error) {
        logger.error(`Failed to verify timesheet ${timesheetId}:`, error);
        failedCount++;
      }
    }

    return { processed_count: processedCount, failed_count: failedCount };
  }

  /**
   * Bulk bill timesheets (Management only)
   */
  static async bulkBillTimesheets(
    timesheetIds: string[],
    billerId: string
  ): Promise<{ processed_count: number; failed_count: number }> {
    let processedCount = 0;
    let failedCount = 0;

    for (const timesheetId of timesheetIds) {
      try {
        await Timesheet.findByIdAndUpdate(timesheetId, {
          status: 'billed'
        });
        processedCount++;
      } catch (error) {
        logger.error(`Failed to bill timesheet ${timesheetId}:`, error);
        failedCount++;
      }
    }

    return { processed_count: processedCount, failed_count: failedCount };
  }

  /**
   * Bulk approve all timesheets for a project-week
   * Approves all users' timesheets for the specified project and week
   */
  static async approveProjectWeek(
    projectId: string,
    weekStart: string,
    weekEnd: string,
    approverId: string,
    approverRole: string
  ): Promise<BulkProjectWeekApprovalResponse> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get project details
      const project = await Project.findById(projectId).session(session);
      if (!project) {
        throw new Error('Project not found');
      }

      // Find all timesheets for this week
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekEnd);

      const timesheets = await Timesheet.find({
        week_start_date: { $gte: weekStartDate, $lte: weekEndDate },
        deleted_at: null
      }).session(session);

      if (timesheets.length === 0) {
        throw new Error('No timesheets found for this week');
      }

      const timesheetIds = timesheets.map(t => t._id);

      // Find all project approvals for these timesheets and this project
      const projectApprovals = await TimesheetProjectApproval.find({
        timesheet_id: { $in: timesheetIds },
        project_id: new mongoose.Types.ObjectId(projectId)
      }).session(session);

      if (projectApprovals.length === 0) {
        throw new Error('No approval records found for this project-week');
      }

      let affectedUsers = 0;
      const affectedTimesheetIds = new Set<string>();

      // Update all project approvals
      for (const approval of projectApprovals) {
        const statusBefore = approval.manager_status;

        if (approverRole === 'lead') {
          approval.lead_status = 'approved';
          approval.lead_approved_at = new Date();
          approval.lead_rejection_reason = undefined;
        } else {
          approval.manager_status = 'approved';
          approval.manager_approved_at = new Date();
          approval.manager_rejection_reason = undefined;
        }

        await approval.save({ session });

        // Check if this timesheet is now fully approved
        const timesheet = timesheets.find(t => t._id.toString() === approval.timesheet_id.toString());
        if (timesheet) {
          const allApproved = await this.checkAllApprovalsComplete(
            approval.timesheet_id.toString(),
            session
          );

          if (allApproved && timesheet.status !== 'manager_approved') {
            timesheet.status = 'manager_approved';
            timesheet.approved_by_manager_id = new mongoose.Types.ObjectId(approverId);
            timesheet.approved_by_manager_at = new Date();
            await timesheet.save({ session });
          }

          affectedTimesheetIds.add(timesheet._id.toString());
          affectedUsers++;

          // Record history
          await ApprovalHistory.create([{
            timesheet_id: timesheet._id,
            project_id: new mongoose.Types.ObjectId(projectId),
            user_id: timesheet.user_id,
            approver_id: new mongoose.Types.ObjectId(approverId),
            approver_role: approverRole,
            action: 'approved',
            status_before: statusBefore,
            status_after: timesheet.status,
            notes: 'Bulk project-week approval'
          }], { session });
        }
      }

      await session.commitTransaction();

      const weekLabel = this.formatWeekLabel(weekStartDate, weekEndDate);

      return {
        success: true,
        message: `Successfully approved ${affectedUsers} user(s) for ${project.name} - ${weekLabel}`,
        affected_users: affectedUsers,
        affected_timesheets: affectedTimesheetIds.size,
        project_week: {
          project_name: project.name,
          week_label: weekLabel
        }
      };

    } catch (error) {
      await session.abortTransaction();
      logger.error('Error bulk approving project-week:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Bulk reject all timesheets for a project-week
   * Rejects all users' timesheets for the specified project and week
   */
  static async rejectProjectWeek(
    projectId: string,
    weekStart: string,
    weekEnd: string,
    approverId: string,
    approverRole: string,
    reason: string
  ): Promise<BulkProjectWeekApprovalResponse> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get project details
      const project = await Project.findById(projectId).session(session);
      if (!project) {
        throw new Error('Project not found');
      }

      // Find all timesheets for this week
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekEnd);

      const timesheets = await Timesheet.find({
        week_start_date: { $gte: weekStartDate, $lte: weekEndDate },
        deleted_at: null
      }).session(session);

      if (timesheets.length === 0) {
        throw new Error('No timesheets found for this week');
      }

      const timesheetIds = timesheets.map(t => t._id);

      // Find all project approvals for these timesheets and this project
      const projectApprovals = await TimesheetProjectApproval.find({
        timesheet_id: { $in: timesheetIds },
        project_id: new mongoose.Types.ObjectId(projectId)
      }).session(session);

      if (projectApprovals.length === 0) {
        throw new Error('No approval records found for this project-week');
      }

      let affectedUsers = 0;
      const affectedTimesheetIds = new Set<string>();

      // Update all project approvals
      for (const approval of projectApprovals) {
        const statusBefore = approval.manager_status;

        if (approverRole === 'lead') {
          approval.lead_status = 'rejected';
          approval.lead_rejection_reason = reason;
        } else {
          approval.manager_status = 'rejected';
          approval.manager_rejection_reason = reason;
        }

        await approval.save({ session });

        // Reset ALL approvals for this timesheet
        await this.resetAllApprovals(approval.timesheet_id.toString(), session);

        // Update timesheet status
        const timesheet = timesheets.find(t => t._id.toString() === approval.timesheet_id.toString());
        if (timesheet) {
          timesheet.status = 'manager_rejected';
          timesheet.manager_rejection_reason = reason;
          timesheet.manager_rejected_at = new Date();
          await timesheet.save({ session });

          affectedTimesheetIds.add(timesheet._id.toString());
          affectedUsers++;

          // Record history
          await ApprovalHistory.create([{
            timesheet_id: timesheet._id,
            project_id: new mongoose.Types.ObjectId(projectId),
            user_id: timesheet.user_id,
            approver_id: new mongoose.Types.ObjectId(approverId),
            approver_role: approverRole,
            action: 'rejected',
            status_before: statusBefore,
            status_after: 'manager_rejected',
            reason,
            notes: 'Bulk project-week rejection'
          }], { session });
        }
      }

      await session.commitTransaction();

      const weekLabel = this.formatWeekLabel(weekStartDate, weekEndDate);

      return {
        success: true,
        message: `Successfully rejected ${affectedUsers} user(s) for ${project.name} - ${weekLabel}`,
        affected_users: affectedUsers,
        affected_timesheets: affectedTimesheetIds.size,
        project_week: {
          project_name: project.name,
          week_label: weekLabel
        }
      };

    } catch (error) {
      await session.abortTransaction();
      logger.error('Error bulk rejecting project-week:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Format week label for display
   */
  private static formatWeekLabel(start: Date, end: Date): string {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const startMonth = monthNames[start.getMonth()];
    const endMonth = monthNames[end.getMonth()];
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = start.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  }
}

export default TeamReviewApprovalService;
