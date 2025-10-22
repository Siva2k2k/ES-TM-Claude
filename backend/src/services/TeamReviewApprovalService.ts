/**
 * Phase 7: Team Review Approval Service
 * Handles approve/reject/verify/freeze/bill operations with multi-manager logic
 * SonarQube compliant - kept under 250 lines
 */

import mongoose from 'mongoose';
import { Timesheet, TimesheetStatus } from '../models/Timesheet';
import { TimesheetProjectApproval } from '../models/TimesheetProjectApproval';
import { ApprovalHistory } from '../models/ApprovalHistory';
import { Project, ProjectMember } from '../models/Project';
import { TimeEntry } from '../models/TimeEntry';
import { logger } from '../config/logger';
import type { BulkProjectWeekApprovalResponse } from '../types/teamReview';
import { parseLocalDate } from '../utils/dateUtils';

// Allowed timesheet statuses (must match Timesheet model)
const ALLOWED_STATUSES = new Set([
  'draft',
  'submitted',
  'lead_approved',
  'lead_rejected',
  'manager_approved',
  'manager_rejected',
  'management_pending',
  'management_rejected',
  'frozen',
  'billed'
]);

function normalizeTimesheetStatus(status: any): string {
  if (typeof status === 'string' && ALLOWED_STATUSES.has(status)) return status;
  // Map legacy or unexpected statuses to a safe default
  if (status === 'pending') return 'submitted';
  return 'draft';
}

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
    const USE_TRANSACTIONS = process.env.USE_TRANSACTIONS === 'true';
    const session = USE_TRANSACTIONS ? await mongoose.startSession() : null;
    if (session) session.startTransaction();

    try {
      const queryOpts = session ? { session } : {};
      // Get timesheet
      const timesheet = await Timesheet.findById(timesheetId, null, queryOpts);
      if (!timesheet) {
        throw new Error('Timesheet not found');
      }

      // Get project approval record
      const projectApproval = await TimesheetProjectApproval.findOne({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        project_id: new mongoose.Types.ObjectId(projectId)
      }, null, queryOpts);

      if (!projectApproval) {
        throw new Error('Project approval record not found');
      }

      const statusBefore = timesheet.status;

      // Get project approval settings and timesheet user
      const project = await (Project as any).findById(projectId, null, queryOpts);
      const autoEscalate = project?.approval_settings?.lead_approval_auto_escalates || false;
      const timesheetUser = await (timesheet as any).populate('user_id');
      const timesheetOwnerId = timesheet.user_id?.toString?.() || timesheetUser.user_id?._id?.toString?.();
      const timesheetUserRole = timesheetUser.user_id?.role || 'employee';

      if (
        timesheetOwnerId &&
        timesheetOwnerId === approverId &&
        (approverRole === 'lead' || approverRole === 'manager')
      ) {
        throw new Error('Leads and managers cannot approve their own timesheets');
      }

      let newStatus = timesheet.status;

      // TIER 1: LEAD APPROVAL (Can only approve Employee timesheets)
      if (approverRole === 'lead') {
        // Validate: Lead can only approve Employee timesheets
        if (timesheetUserRole !== 'employee') {
          throw new Error('Lead can only approve Employee timesheets');
        }

        // Mark lead approval
        projectApproval.lead_status = 'approved';
        projectApproval.lead_approved_at = new Date();
        projectApproval.lead_rejection_reason = undefined;

        // If auto-escalation enabled, also mark manager approval
        if (autoEscalate) {
          projectApproval.manager_status = 'approved';
          projectApproval.manager_approved_at = new Date();
          projectApproval.manager_rejection_reason = undefined;
        }

        await projectApproval.save(queryOpts);

        // Clear rejection flags on time entries for this project
        await (TimeEntry.updateMany as any)(
          {
            timesheet_id: new mongoose.Types.ObjectId(timesheetId),
            project_id: new mongoose.Types.ObjectId(projectId),
            is_rejected: true
          },
          {
            $set: {
              is_rejected: false,
              rejection_reason: undefined,
              rejected_at: undefined,
              rejected_by: undefined
            }
          },
          queryOpts
        );

        // Check if ANY project lead has rejected
        const anyLeadRejected = await this.checkAnyLeadRejected(timesheetId, session || undefined);

        if (anyLeadRejected) {
          // If any lead has rejected, mark timesheet as lead_rejected
          newStatus = 'lead_rejected';
          timesheet.status = newStatus;
          await timesheet.save(queryOpts);
          logger.info(`Timesheet ${timesheetId} marked as lead_rejected because at least one project was rejected`);
        } else {
          // Check if ALL project leads have approved
          const allLeadsApproved = await this.checkAllLeadsApproved(timesheetId, session || undefined);

          if (allLeadsApproved) {
            if (autoEscalate) {
              // Check if ALL managers auto-approved
              const allManagersApproved = await this.checkAllManagersApproved(timesheetId, session || undefined);
              if (allManagersApproved) {
                newStatus = 'manager_approved';
                timesheet.approved_by_manager_id = new mongoose.Types.ObjectId(approverId);
                timesheet.approved_by_manager_at = new Date();
              }
            } else {
              // Move to lead_approved status (waiting for manager)
              newStatus = 'lead_approved';
              timesheet.approved_by_lead_id = new mongoose.Types.ObjectId(approverId);
              timesheet.approved_by_lead_at = new Date();
            }
            timesheet.status = newStatus;
            await timesheet.save(queryOpts);
          }
        }
      }

      // TIER 2: MANAGER APPROVAL (Can approve lead-approved OR directly approve submitted employees)
      else if (approverRole === 'manager' || approverRole === 'super_admin') {
        // Validate: Manager can approve:
        //   - lead_approved (recommended path: Lead → Manager)
        //   - submitted employees (direct approval path: Employee → Manager, bypasses Lead)
        //   - submitted leads/managers (their own timesheets)
        //   - management_rejected (resubmitted after management rejection)
        const canApprove = (
          timesheet.status === 'lead_approved' ||
          (timesheet.status === 'submitted' && ['employee', 'lead', 'manager'].includes(timesheetUserRole)) ||
          timesheet.status === 'management_rejected'
        );

        if (!canApprove) {
          throw new Error(`Cannot approve timesheet with status ${timesheet.status} for user role ${timesheetUserRole}`);
        }

        // Mark manager approval
        projectApproval.manager_status = 'approved';
        projectApproval.manager_approved_at = new Date();
        projectApproval.manager_rejection_reason = undefined;

        // If approving submitted employee directly, mark that lead was bypassed
        if (timesheet.status === 'submitted' && timesheetUserRole === 'employee') {
          projectApproval.lead_status = 'not_required'; // Lead review was bypassed
          logger.info(`Manager ${approverId} directly approved employee timesheet ${timesheetId}, bypassing lead review`);
        }

        await projectApproval.save(queryOpts);

        // Clear rejection flags on time entries for this project
        await (TimeEntry.updateMany as any)(
          {
            timesheet_id: new mongoose.Types.ObjectId(timesheetId),
            project_id: new mongoose.Types.ObjectId(projectId),
            is_rejected: true
          },
          {
            $set: {
              is_rejected: false,
              rejection_reason: undefined,
              rejected_at: undefined,
              rejected_by: undefined
            }
          },
          queryOpts
        );

        // Check if ANY manager has rejected
        const anyManagerRejected = await this.checkAnyManagerRejected(timesheetId, session || undefined);

        if (anyManagerRejected) {
          // If any manager has rejected, mark timesheet as manager_rejected
          newStatus = 'manager_rejected';
          timesheet.status = newStatus;
          await timesheet.save(queryOpts);
          logger.info(`Timesheet ${timesheetId} marked as manager_rejected because at least one project was rejected`);
        } else {
          // Check if ALL managers have approved
          const allManagersApproved = await this.checkAllManagersApproved(timesheetId, session || undefined);

          if (allManagersApproved) {
            // Check if this is a Manager's own timesheet
            if (timesheetUserRole === 'manager') {
              // Manager's timesheet goes to management_pending
              newStatus = 'management_pending';
            } else {
              // Employee/Lead timesheets go to manager_approved
              newStatus = 'manager_approved';
            }

            timesheet.status = newStatus;
            timesheet.approved_by_manager_id = new mongoose.Types.ObjectId(approverId);
            timesheet.approved_by_manager_at = new Date();
            await timesheet.save(queryOpts);
          }
        }
      }

      // TIER 3: MANAGEMENT VERIFICATION (Verifies Manager-approved timesheets)
      else if (approverRole === 'management') {
        // Validate: Management can verify manager_approved or management_pending
        const canVerify = (
          timesheet.status === 'manager_approved' ||
          timesheet.status === 'management_pending'
        );

        if (!canVerify) {
          throw new Error(`Cannot verify timesheet with status ${timesheet.status}`);
        }

        // Mark management approval
        projectApproval.management_status = 'approved';
        projectApproval.management_approved_at = new Date();
        projectApproval.management_rejection_reason = undefined;

        await projectApproval.save(queryOpts);

        // Clear rejection flags on time entries for this project
        await (TimeEntry.updateMany as any)(
          {
            timesheet_id: new mongoose.Types.ObjectId(timesheetId),
            project_id: new mongoose.Types.ObjectId(projectId),
            is_rejected: true
          },
          {
            $set: {
              is_rejected: false,
              rejection_reason: undefined,
              rejected_at: undefined,
              rejected_by: undefined
            }
          },
          queryOpts
        );

        // Freeze timesheet
        newStatus = 'frozen';
        timesheet.status = newStatus;
        timesheet.is_frozen = true;
        timesheet.verified_by_id = new mongoose.Types.ObjectId(approverId);
        timesheet.verified_at = new Date();
        timesheet.approved_by_management_id = new mongoose.Types.ObjectId(approverId);
        timesheet.approved_by_management_at = new Date();
        await timesheet.save(queryOpts);
      }

      // Record approval history
      await ApprovalHistory.create([{
        timesheet_id: timesheet._id,
        project_id: new mongoose.Types.ObjectId(projectId),
        user_id: timesheet.user_id,
        approver_id: new mongoose.Types.ObjectId(approverId),
        approver_role: approverRole,
        action: 'approved',
        status_before: normalizeTimesheetStatus(statusBefore),
        status_after: normalizeTimesheetStatus(newStatus)
      }], queryOpts);

      if (session) await session.commitTransaction();

      const statusChanged = newStatus !== statusBefore;

      return {
        success: true,
        message: statusChanged
          ? 'Timesheet approved and status updated'
          : 'Project approved, waiting for other approvers',
        all_approved: statusChanged,
        new_status: newStatus
      };
    } catch (error) {
      if (session) await session.abortTransaction();
      logger.error('Error approving timesheet:', error);
      throw error;
    } finally {
       if (session) session.endSession();
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
    const USE_TRANSACTIONS = process.env.USE_TRANSACTIONS === 'true';
    const session = USE_TRANSACTIONS ? await mongoose.startSession() : null;
    if (session) session.startTransaction();

    try {
      const queryOpts = session ? { session } : {};
      const timesheet = await Timesheet.findById(timesheetId, null, queryOpts);
      if (!timesheet) {
        throw new Error('Timesheet not found');
      }

      const projectApproval = await TimesheetProjectApproval.findOne({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        project_id: new mongoose.Types.ObjectId(projectId)
      }, null, queryOpts);

      if (!projectApproval) {
        throw new Error('Project approval record not found');
      }

      const statusBefore = timesheet.status;

      let newStatus: TimesheetStatus;

      // TIER 1: LEAD REJECTION
      if (approverRole === 'lead') {
        projectApproval.lead_status = 'rejected';
        projectApproval.lead_rejection_reason = reason;
        await projectApproval.save(queryOpts);

        // Reset ALL approvals for this timesheet
        await this.resetAllApprovals(timesheetId, session || undefined, projectId);

        // Set timesheet to lead_rejected
        newStatus = 'lead_rejected';
        timesheet.status = newStatus;
        timesheet.lead_rejection_reason = reason;
        timesheet.lead_rejected_at = new Date();
        await timesheet.save(queryOpts);

        // Flag all time entries for this project as rejected
        await (TimeEntry.updateMany as any)(
          {
            timesheet_id: new mongoose.Types.ObjectId(timesheetId),
            project_id: new mongoose.Types.ObjectId(projectId)
          },
          {
            $set: {
              is_rejected: true,
              rejection_reason: reason,
              rejected_at: new Date(),
              rejected_by: new mongoose.Types.ObjectId(approverId)
            }
          },
          queryOpts
        );
      }

      // TIER 2: MANAGER REJECTION
      else if (approverRole === 'manager' || approverRole === 'super_admin') {
        projectApproval.manager_status = 'rejected';
        projectApproval.manager_rejection_reason = reason;
        await projectApproval.save(queryOpts);

        // Reset ALL approvals for this timesheet
        await this.resetAllApprovals(timesheetId, session || undefined, projectId);

        // Set timesheet to manager_rejected
        newStatus = 'manager_rejected';
        timesheet.status = newStatus;
        timesheet.manager_rejection_reason = reason;
        timesheet.manager_rejected_at = new Date();
        await timesheet.save(queryOpts);

        // Flag all time entries for this project as rejected
        await (TimeEntry.updateMany as any)(
          {
            timesheet_id: new mongoose.Types.ObjectId(timesheetId),
            project_id: new mongoose.Types.ObjectId(projectId)
          },
          {
            $set: {
              is_rejected: true,
              rejection_reason: reason,
              rejected_at: new Date(),
              rejected_by: new mongoose.Types.ObjectId(approverId)
            }
          },
          queryOpts
        );
      }

      // TIER 3: MANAGEMENT REJECTION
      else if (approverRole === 'management') {
        projectApproval.management_status = 'rejected';
        projectApproval.management_rejection_reason = reason;
        await projectApproval.save(queryOpts);

        // Reset ALL approvals for this timesheet
        await this.resetAllApprovals(timesheetId, session || undefined, projectId);

        // Set timesheet to management_rejected
        newStatus = 'management_rejected';
        timesheet.status = newStatus;
        timesheet.management_rejection_reason = reason;
        timesheet.management_rejected_at = new Date();
        await timesheet.save(queryOpts);

        // Flag all time entries for this project as rejected
        await (TimeEntry.updateMany as any)(
          {
            timesheet_id: new mongoose.Types.ObjectId(timesheetId),
            project_id: new mongoose.Types.ObjectId(projectId)
          },
          {
            $set: {
              is_rejected: true,
              rejection_reason: reason,
              rejected_at: new Date(),
              rejected_by: new mongoose.Types.ObjectId(approverId)
            }
          },
          queryOpts
        );
      }

      else {
        throw new Error(`Invalid approver role: ${approverRole}`);
      }

      // Record rejection history
      await ApprovalHistory.create([{
        timesheet_id: timesheet._id,
        project_id: new mongoose.Types.ObjectId(projectId),
        user_id: timesheet.user_id,
        approver_id: new mongoose.Types.ObjectId(approverId),
        approver_role: approverRole,
        action: 'rejected',
        status_before: normalizeTimesheetStatus(statusBefore),
        status_after: normalizeTimesheetStatus(newStatus),
        reason
      }], queryOpts);

      if(session) await session.commitTransaction();

      return {
        success: true,
        message: 'Timesheet rejected',
        all_approved: false,
        new_status: newStatus
      };
    } catch (error) {
      if(session) await session.abortTransaction();
      logger.error('Error rejecting timesheet:', error);
      throw error;
    } finally {
      if(session) session.endSession();
    }
  }

  /**
   * Check if all leads have approved (for employee timesheets)
   */
  private static async checkAllLeadsApproved(
    timesheetId: string,
    session: any
  ): Promise<boolean> {
    const approvals = await TimesheetProjectApproval.find({
      timesheet_id: new mongoose.Types.ObjectId(timesheetId)
    }).session(session);

    for (const approval of approvals) {
      // Check lead approval if lead exists
      if (approval.lead_id && approval.lead_status !== 'approved') {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if any lead has rejected (for employee timesheets)
   */
  private static async checkAnyLeadRejected(
    timesheetId: string,
    session: any
  ): Promise<boolean> {
    const approvals = await TimesheetProjectApproval.find({
      timesheet_id: new mongoose.Types.ObjectId(timesheetId)
    }).session(session);

    for (const approval of approvals) {
      // Check if any lead has rejected
      if (approval.lead_id && approval.lead_status === 'rejected') {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if any manager has rejected
   */
  private static async checkAnyManagerRejected(
    timesheetId: string,
    session: any
  ): Promise<boolean> {
    const approvals = await TimesheetProjectApproval.find({
      timesheet_id: new mongoose.Types.ObjectId(timesheetId)
    }).session(session);

    for (const approval of approvals) {
      // Check if any manager has rejected
      if (approval.manager_status === 'rejected') {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if all managers have approved
   */
  private static async checkAllManagersApproved(
    timesheetId: string,
    session: any
  ): Promise<boolean> {
    const approvals = await TimesheetProjectApproval.find({
      timesheet_id: new mongoose.Types.ObjectId(timesheetId)
    }).session(session);

    for (const approval of approvals) {
      // Check manager approval (always required)
      if (approval.manager_status !== 'approved') {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if all required approvals are complete (legacy method - kept for compatibility)
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
    session: any,
    // optional project id to exclude from reset (so a rejected approval isn't overwritten)
    excludeProjectId?: string
  ): Promise<void> {
    const filter: any = { timesheet_id: new mongoose.Types.ObjectId(timesheetId) };
    if (excludeProjectId) {
      try {
        filter.project_id = { $ne: new mongoose.Types.ObjectId(excludeProjectId) };
      } catch (err) {
        // if the provided id isn't a valid ObjectId, ignore the exclude
        // (this preserves previous behavior rather than throwing)
        logger.warn('Invalid excludeProjectId passed to resetAllApprovals:', excludeProjectId);
      }
    }

    await TimesheetProjectApproval.updateMany(
      filter,
      {
        $set: {
          lead_status: 'pending',
          lead_approved_at: null,
          manager_status: 'pending',
          manager_approved_at: null,
          management_status: 'pending',
          management_approved_at: null
        },
        $unset: {
          // keep rejection reasons on the excluded approval; for others clear any previous reasons
          lead_rejection_reason: '',
          manager_rejection_reason: '',
          management_rejection_reason: ''
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
    const USE_TRANSACTIONS = process.env.USE_TRANSACTIONS === 'true';
    const session = USE_TRANSACTIONS ? await mongoose.startSession() : null;

    if(session) session.startTransaction();

    try {
      const queryOpts = session ? { session } : {};
      // Get project details
      const project = await (Project as any).findById(projectId, null, queryOpts);
      if (!project) {
        throw new Error('Project not found');
      }

      // Find all timesheets for this week (parse dates correctly to avoid timezone issues)
      const weekStartDate = parseLocalDate(weekStart);
      const weekEndDate = parseLocalDate(weekEnd);

      const timesheets = await Timesheet.find({
        week_start_date: { $gte: weekStartDate, $lte: weekEndDate },
        deleted_at: null
      }, null, queryOpts);

      if (timesheets.length === 0) {
        throw new Error('No timesheets found for this week');
      }

      const timesheetIds = timesheets.map(t => t._id);

      // Find all project approvals for these timesheets and this project
      const projectApprovals = await TimesheetProjectApproval.find({
        timesheet_id: { $in: timesheetIds },
        project_id: new mongoose.Types.ObjectId(projectId)
      }, null, queryOpts);

      if (projectApprovals.length === 0) {
        throw new Error('No approval records found for this project-week');
      }

      // Get project approval settings for auto-escalation
      const autoEscalate = project.approval_settings?.lead_approval_auto_escalates || false;

      let affectedUsers = 0;
      let selfApprovalSkips = 0;
      const affectedTimesheetIds = new Set<string>();

      // Update all project approvals based on role
      for (const approval of projectApprovals) {
        // Find the timesheet this approval belongs to and capture its previous status
        const timesheet = timesheets.find(t => t._id.toString() === approval.timesheet_id.toString());
        if (!timesheet) continue;

        const statusBefore = timesheet.status;
        const timesheetUser = await timesheet.populate('user_id');
        const timesheetUserRole = (timesheetUser.user_id as any)?.role || 'employee';
        const timesheetOwnerId =
          timesheet.user_id?.toString?.() || (timesheetUser.user_id as any)?._id?.toString?.();

        if (
          timesheetOwnerId &&
          timesheetOwnerId === approverId &&
          (approverRole === 'lead' || approverRole === 'manager')
        ) {
          logger.warn(
            `Skipping self-approval attempt by ${approverRole} ${approverId} for timesheet ${timesheet._id}`
          );
          selfApprovalSkips++;
          continue;
        }

        // TIER 1: LEAD APPROVAL
        if (approverRole === 'lead') {
          // Skip non-employee timesheets
          if (timesheetUserRole !== 'employee') continue;

          approval.lead_status = 'approved';
          approval.lead_approved_at = new Date();
          approval.lead_rejection_reason = undefined;

          // If auto-escalation is enabled, also mark manager approval
          if (autoEscalate) {
            approval.manager_status = 'approved';
            approval.manager_approved_at = new Date();
            approval.manager_rejection_reason = undefined;
          }
        }

        // TIER 2: MANAGER APPROVAL
        else if (approverRole === 'manager' || approverRole === 'super_admin') {
          approval.manager_status = 'approved';
          approval.manager_approved_at = new Date();
          approval.manager_rejection_reason = undefined;
        }

        // TIER 3: MANAGEMENT VERIFICATION
        else if (approverRole === 'management') {
          approval.management_status = 'approved';
          approval.management_approved_at = new Date();
          approval.management_rejection_reason = undefined;
        }

        await approval.save(queryOpts);

        // Update timesheet status based on role
        let newStatus = timesheet.status;

        if (approverRole === 'lead') {
          // Check if ANY lead has rejected first
          const anyLeadRejected = await this.checkAnyLeadRejected(
            approval.timesheet_id.toString(),
            session || undefined
          );

          if (anyLeadRejected) {
            newStatus = 'lead_rejected';
          } else {
            const allLeadsApproved = await this.checkAllLeadsApproved(
              approval.timesheet_id.toString(),
              session || undefined
            );

            if (allLeadsApproved) {
              if (autoEscalate) {
                const allManagersApproved = await this.checkAllManagersApproved(
                  approval.timesheet_id.toString(),
                  session || undefined
                );
                if (allManagersApproved) {
                  newStatus = 'manager_approved';
                  timesheet.approved_by_manager_id = new mongoose.Types.ObjectId(approverId);
                  timesheet.approved_by_manager_at = new Date();
                }
              } else {
                newStatus = 'lead_approved';
                timesheet.approved_by_lead_id = new mongoose.Types.ObjectId(approverId);
                timesheet.approved_by_lead_at = new Date();
              }
            }
          }
        }

        else if (approverRole === 'manager' || approverRole === 'super_admin') {
          // Check if ANY manager has rejected first
          const anyManagerRejected = await this.checkAnyManagerRejected(
            approval.timesheet_id.toString(),
            session || undefined
          );

          if (anyManagerRejected) {
            newStatus = 'manager_rejected';
          } else {
            const allManagersApproved = await this.checkAllManagersApproved(
              approval.timesheet_id.toString(),
              session || undefined
            );

            if (allManagersApproved) {
              if (timesheetUserRole === 'manager') {
                newStatus = 'management_pending';
              } else {
                newStatus = 'manager_approved';
              }
              timesheet.approved_by_manager_id = new mongoose.Types.ObjectId(approverId);
              timesheet.approved_by_manager_at = new Date();
            }
          }
        }

        else if (approverRole === 'management') {
          newStatus = 'frozen';
          timesheet.is_frozen = true;
          timesheet.verified_by_id = new mongoose.Types.ObjectId(approverId);
          timesheet.verified_at = new Date();
          timesheet.approved_by_management_id = new mongoose.Types.ObjectId(approverId);
          timesheet.approved_by_management_at = new Date();
        }

        if (newStatus !== statusBefore) {
          timesheet.status = newStatus;
          await timesheet.save(queryOpts);
        }

        affectedTimesheetIds.add(timesheet._id.toString());
        affectedUsers++;

        // Record history - use the timesheet's status values so they match ApprovalHistory enum
        await ApprovalHistory.create([{
          timesheet_id: timesheet._id,
          project_id: new mongoose.Types.ObjectId(projectId),
          user_id: timesheet.user_id,
          approver_id: new mongoose.Types.ObjectId(approverId),
          approver_role: approverRole,
          action: 'approved',
          status_before: normalizeTimesheetStatus(statusBefore),
          status_after: normalizeTimesheetStatus(timesheet.status),
          notes: 'Bulk project-week approval'
        }], queryOpts);
      }

      if(session) await session.commitTransaction();

      const weekLabel = this.formatWeekLabel(weekStartDate, weekEndDate);

      const note =
        selfApprovalSkips > 0
          ? ` (skipped ${selfApprovalSkips} self-approval${selfApprovalSkips > 1 ? 's' : ''})`
          : '';

      return {
        success: true,
        message: `Successfully approved ${affectedUsers} user(s) for ${project.name} - ${weekLabel}${note}`,
        affected_users: affectedUsers,
        affected_timesheets: affectedTimesheetIds.size,
        skipped_self_approvals: selfApprovalSkips,
        project_week: {
          project_name: project.name,
          week_label: weekLabel
        }
      };

    } catch (error) {
      if(session) await session.abortTransaction();
      logger.error('Error bulk approving project-week:', error);
      throw error;
    } finally {
      if(session) session.endSession();
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
    const USE_TRANSACTIONS = process.env.USE_TRANSACTIONS === 'true';
    const session = USE_TRANSACTIONS ? await mongoose.startSession() : null;

    if(session) session.startTransaction();

    try {
      const queryOpts = session ? { session } : {};
      // Get project details
      const project = await (Project as any).findById(projectId).session(session);
      if (!project) {
        throw new Error('Project not found');
      }

      // Find all timesheets for this week (parse dates correctly to avoid timezone issues)
      const weekStartDate = parseLocalDate(weekStart);
      const weekEndDate = parseLocalDate(weekEnd);

      const timesheets = await Timesheet.find({
        week_start_date: { $gte: weekStartDate, $lte: weekEndDate },
        deleted_at: null
      }, null, queryOpts);

      if (timesheets.length === 0) {
        throw new Error('No timesheets found for this week');
      }

      const timesheetIds = timesheets.map(t => t._id);

      // Find all project approvals for these timesheets and this project
      const projectApprovals = await TimesheetProjectApproval.find({
        timesheet_id: { $in: timesheetIds },
        project_id: new mongoose.Types.ObjectId(projectId)
      }, null, queryOpts);

      if (projectApprovals.length === 0) {
        throw new Error('No approval records found for this project-week');
      }

      let affectedUsers = 0;
      const affectedTimesheetIds = new Set<string>();

      // Update all project approvals
      for (const approval of projectApprovals) {
        // Find the timesheet this approval belongs to and capture its previous status
        const timesheet = timesheets.find(t => t._id.toString() === approval.timesheet_id.toString());
        const statusBefore = timesheet ? timesheet.status : 'draft';

        if (approverRole === 'lead') {
          approval.lead_status = 'rejected';
          approval.lead_rejection_reason = reason;
        } else {
          approval.manager_status = 'rejected';
          approval.manager_rejection_reason = reason;
        }

        await approval.save(queryOpts);

  // Reset ALL approvals for this timesheet except the current project approval
  await this.resetAllApprovals(approval.timesheet_id.toString(), session || undefined, projectId);

        // Update timesheet status
        if (timesheet) {
          timesheet.status = 'manager_rejected';
          timesheet.manager_rejection_reason = reason;
          timesheet.manager_rejected_at = new Date();
          await timesheet.save(queryOpts);

          affectedTimesheetIds.add(timesheet._id.toString());
          affectedUsers++;

          // Record history - use the timesheet's status values so they match ApprovalHistory enum
          await ApprovalHistory.create([{
            timesheet_id: timesheet._id,
            project_id: new mongoose.Types.ObjectId(projectId),
            user_id: timesheet.user_id,
            approver_id: new mongoose.Types.ObjectId(approverId),
            approver_role: approverRole,
            action: 'rejected',
            status_before: normalizeTimesheetStatus(statusBefore),
            status_after: normalizeTimesheetStatus('manager_rejected'),
            reason,
            notes: 'Bulk project-week rejection'
          }], queryOpts);
        }
      }

      if(session) await session.commitTransaction();

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
      if(session) await session.abortTransaction();
      logger.error('Error bulk rejecting project-week:', error);
      throw error;
    } finally {
      if(session) session.endSession();
    }
  }

  /**
   * Bulk freeze all timesheets for a project-week (Management only)
   * Freezes ALL manager_approved timesheets, skips users without timesheets
   * Validation: Cannot freeze if ANY timesheet is still in submitted/pending state
   */
  static async bulkFreezeProjectWeek(
    projectId: string,
    weekStart: string,
    weekEnd: string,
    managementId: string
  ): Promise<{
    success: boolean;
    message: string;
    frozen_count: number;
    skipped_count: number;
    failed: Array<{ user_id: string; user_name: string; reason: string }>;
  }> {
    const USE_TRANSACTIONS = process.env.USE_TRANSACTIONS === 'true';
    const session = USE_TRANSACTIONS ? await mongoose.startSession() : null;

    if (session) session.startTransaction();

    try {
      const queryOpts = session ? { session } : {};

      // Get project details
      const project = await (Project as any).findById(projectId, null, queryOpts);
      if (!project) {
        throw new Error('Project not found');
      }

      // Find all timesheets for this week (parse dates correctly to avoid timezone issues)
      const weekStartDate = parseLocalDate(weekStart);
      const weekEndDate = parseLocalDate(weekEnd);

      const timesheets = await Timesheet.find({
        week_start_date: { $gte: weekStartDate, $lte: weekEndDate },
        deleted_at: null
      }, null, queryOpts).populate('user_id', 'full_name');

      if (timesheets.length === 0) {
        throw new Error('No timesheets found for this week');
      }

      const timesheetIds = timesheets.map(t => t._id);

      // Find all project approvals for these timesheets and this project
      const projectApprovals = await TimesheetProjectApproval.find({
        timesheet_id: { $in: timesheetIds },
        project_id: new mongoose.Types.ObjectId(projectId)
      }, null, queryOpts);

      // Validation: Check if ANY timesheet is still pending approval
      const pendingTimesheets = timesheets.filter(t =>
        ['submitted', 'manager_rejected', 'management_rejected'].includes(t.status)
      );

      if (pendingTimesheets.length > 0) {
        const pendingUsers = pendingTimesheets
          .map((t: any) => t.user_id?.full_name || 'Unknown')
          .join(', ');
        throw new Error(
          `Cannot freeze project-week: ${pendingTimesheets.length} timesheet(s) still pending approval (${pendingUsers})`
        );
      }

      let frozenCount = 0;
      let skippedCount = 0;
      const failed: Array<{ user_id: string; user_name: string; reason: string }> = [];

      // Process each timesheet
      for (const timesheet of timesheets) {
        try {
          // Skip if not manager_approved
          if (timesheet.status !== 'manager_approved') {
            skippedCount++;
            continue;
          }

          // Freeze the timesheet
          timesheet.status = 'frozen';
          timesheet.is_frozen = true;
          timesheet.verified_by_id = new mongoose.Types.ObjectId(managementId);
          timesheet.verified_at = new Date();
          timesheet.approved_by_management_id = new mongoose.Types.ObjectId(managementId);
          timesheet.approved_by_management_at = new Date();

          await timesheet.save(queryOpts);

          // Record approval history
          await ApprovalHistory.create([{
            timesheet_id: timesheet._id,
            project_id: new mongoose.Types.ObjectId(projectId),
            user_id: timesheet.user_id,
            approver_id: new mongoose.Types.ObjectId(managementId),
            approver_role: 'management',
            action: 'approved',
            status_before: 'manager_approved',
            status_after: 'frozen',
            notes: 'Bulk project-week freeze'
          }], queryOpts);

          frozenCount++;
        } catch (error) {
          logger.error(`Failed to freeze timesheet ${timesheet._id}:`, error);
          failed.push({
            user_id: timesheet.user_id.toString(),
            user_name: (timesheet as any).user_id?.full_name || 'Unknown',
            reason: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      if (session) await session.commitTransaction();

      const weekLabel = this.formatWeekLabel(weekStartDate, weekEndDate);

      return {
        success: true,
        message: `Successfully frozen ${frozenCount} timesheet(s) for ${project.name} - ${weekLabel}`,
        frozen_count: frozenCount,
        skipped_count: skippedCount,
        failed
      };
    } catch (error) {
      if (session) await session.abortTransaction();
      logger.error('Error bulk freezing project-week:', error);
      throw error;
    } finally {
      if (session) session.endSession();
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

  /**
   * Validate if lead can submit their timesheet
   * Lead can only submit after reviewing all employees on their projects for that week
   */
  static async validateLeadCanSubmit(
    leadId: string,
    weekStartDate: Date
  ): Promise<{ canSubmit: boolean; reason?: string; pendingEmployees?: string[] }> {
    try {
      // Find all projects where user is a lead
      const leadProjects = await (ProjectMember.find as any)({
        user_id: new mongoose.Types.ObjectId(leadId),
        role: 'lead',
        deleted_at: null
      }).populate('project_id');

      if (leadProjects.length === 0) {
        // Not a lead on any project, can submit
        return { canSubmit: true };
      }

      const pendingEmployees: string[] = [];

      // For each project, check if all employees have been reviewed
      for (const leadProject of leadProjects) {
        const project = leadProject.project_id as any;
        if (!project) continue;

        // Find all employees on this project
        const employees = await (ProjectMember.find as any)({
          project_id: project._id,
          role: 'employee',
          deleted_at: null
        }).populate('user_id');

        // Check each employee's timesheet for this week
        for (const employee of employees) {
          const user = employee.user_id as any;
          if (!user) continue;

          // Find employee's timesheet for this week
          const employeeTimesheet = await Timesheet.findOne({
            user_id: user._id,
            week_start_date: weekStartDate,
            status: { $in: ['submitted', 'lead_approved', 'lead_rejected'] },
            deleted_at: null
          });

          if (employeeTimesheet && employeeTimesheet.status === 'submitted') {
            // Check if this timesheet has been reviewed by lead
            const approval = await TimesheetProjectApproval.findOne({
              timesheet_id: employeeTimesheet._id,
              project_id: project._id,
              lead_id: new mongoose.Types.ObjectId(leadId),
              lead_status: 'pending'
            });

            if (approval) {
              pendingEmployees.push(`${user.full_name} (${project.name})`);
            }
          }
        }
      }

      if (pendingEmployees.length > 0) {
        return {
          canSubmit: false,
          reason: `You must review pending employee timesheets before submitting your own: ${pendingEmployees.join(', ')}`,
          pendingEmployees
        };
      }

      return { canSubmit: true };
    } catch (error) {
      logger.error('Error validating lead submission:', error);
      throw error;
    }
  }

  /**
   * Update billable adjustment for a project approval
   * Manager and Management can adjust billable hours (+/-)
   */
  static async updateBillableAdjustment(
    timesheetId: string,
    projectId: string,
    adjustment: number,
    userId: string,
    userRole?: string
  ): Promise<{ success: boolean; approval?: any; error?: string }> {
    try {
      const approval = await TimesheetProjectApproval.findOne({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        project_id: new mongoose.Types.ObjectId(projectId)
      });

      if (!approval) {
        return {
          success: false,
          error: 'Project approval record not found'
        };
      }

      // Verify permission
      // Management and Super Admin can adjust any timesheet
      // Managers can only adjust timesheets for their own projects
      const isManagement = userRole === 'management' || userRole === 'super_admin';
      const isProjectManager = approval.manager_id.toString() === userId;

      if (!isManagement && !isProjectManager) {
        return {
          success: false,
          error: 'You do not have permission to adjust this timesheet'
        };
      }

      // Update adjustment
      approval.billable_adjustment = adjustment;
      approval.billable_hours = approval.worked_hours + adjustment;
      await approval.save();

      logger.info(`User ${userId} (${userRole || 'manager'}) adjusted billable hours for timesheet ${timesheetId}, project ${projectId}: ${adjustment}h`);

      return {
        success: true,
        approval: {
          worked_hours: approval.worked_hours,
          billable_adjustment: approval.billable_adjustment,
          billable_hours: approval.billable_hours
        }
      };
    } catch (error) {
      logger.error('Error updating billable adjustment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update adjustment'
      };
    }
  }
}

export default TeamReviewApprovalService;
