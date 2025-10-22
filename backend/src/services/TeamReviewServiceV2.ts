/**
 * Team Review Service V2
 * Enhanced project-week based approval system with pagination
 * Supports Management, Manager, and Lead roles
 */

import mongoose from 'mongoose';
import { Timesheet } from '../models/Timesheet';
import { TimesheetProjectApproval } from '../models/TimesheetProjectApproval';
import { TimeEntry } from '../models/TimeEntry';
import { Project, ProjectMember } from '../models/Project';
import { User } from '../models/User';
import Task from '../models/Task';
import { logger } from '../config/logger';
import { parseLocalDate } from '../utils/dateUtils';
import type {
  ProjectWeekGroup,
  ProjectWeekFilters,
  ProjectWeekResponse,
  ProjectWeekUser,
  TimeEntryDetail
} from '../types/teamReview';

export class TeamReviewServiceV2 {
  /**
   * Get project-week groups with pagination and filters
   * Supports Management, Manager, and Lead roles
   */
  static async getProjectWeekGroups(
    approverId: string,
    approverRole: string,
    filters: ProjectWeekFilters = {}
  ): Promise<ProjectWeekResponse> {
    try {
      const {
        project_id,
        week_start,
        week_end,
        status = 'pending',
        sort_by = 'week_date',
        sort_order = 'desc',
        page = 1,
        limit = 10,
        search
      } = filters;

      // Default date range: last 2 months
      const defaultEndDate = new Date();
      defaultEndDate.setHours(23, 59, 59, 999);

      const defaultStartDate = new Date();
      defaultStartDate.setMonth(defaultStartDate.getMonth() - 2);
      defaultStartDate.setHours(0, 0, 0, 0);

      // Parse dates correctly to avoid timezone issues
      const dateStart = week_start ? parseLocalDate(week_start) : defaultStartDate;
      const dateEnd = week_end ? parseLocalDate(week_end) : defaultEndDate;

      // Get projects based on role
      const projectQuery = await this.buildProjectQuery(approverId, approverRole, project_id, search);
      const projects = await (Project as any).find(projectQuery)
        .populate('primary_manager_id', 'full_name email')
        .lean() as any[];

      if (projects.length === 0) {
        return {
          project_weeks: [],
          pagination: { total: 0, page, limit, total_pages: 0 },
          filters_applied: filters
        };
      }

      const projectIds = projects.map(p => p._id);

      // Get all timesheets in date range for these projects
      const timesheets = await (Timesheet as any).find({
        week_start_date: { $gte: dateStart, $lte: dateEnd },
        deleted_at: null
      })
        .populate('user_id', 'full_name email role')
        .lean() as any[];

      if (timesheets.length === 0) {
        return {
          project_weeks: [],
          pagination: { total: 0, page, limit, total_pages: 0 },
          filters_applied: filters
        };
      }

      const timesheetIds = timesheets.map(t => t._id);

      // Get all project approvals for these timesheets and projects
      const approvals = await (TimesheetProjectApproval as any).find({
        timesheet_id: { $in: timesheetIds },
        project_id: { $in: projectIds }
      }).lean() as any[];

      // Get all time entries for these timesheets and projects
      const entries = await (TimeEntry as any).find({
        timesheet_id: { $in: timesheetIds },
        project_id: { $in: projectIds },
        deleted_at: null
      })
        .populate('task_id', 'name')
        .lean() as any[];

      // Get project members
      const projectMembers = await (ProjectMember as any).find({
        project_id: { $in: projectIds },
        deleted_at: null,
        removed_at: null
      }).lean() as any[];

      // Build project-week groups
      const projectWeekMap = new Map<string, ProjectWeekGroup>();

      for (const project of projects) {
        const projectMembersForProject = projectMembers.filter(
          pm => pm.project_id.toString() === project._id.toString()
        );

        // Get lead for this project
        const leadMember = projectMembersForProject.find(pm => pm.project_role === 'lead');
        let leadInfo = null;
        if (leadMember) {
          const leadUser = await (User as any).findById(leadMember.user_id).select('full_name').lean() as any;
          leadInfo = { id: leadMember.user_id.toString(), name: leadUser?.full_name || 'Unknown' };
        }

        // Group timesheets by week for this project
        // Apply role-based filtering here
        const projectTimesheets = timesheets.filter(ts => {
          const approval = approvals.find(
            a => a.timesheet_id.toString() === ts._id.toString() &&
                 a.project_id.toString() === project._id.toString()
          );
          if (!approval) return false;

          // Role-based visibility filtering
          const isVisible = this.isTimesheetVisibleToRole(ts, approval, approverRole, approverId, leadInfo);

          // Debug logging for management role
          if (approverRole === 'management' && (ts.status === 'manager_approved' || ts.status === 'management_pending')) {
            logger.info(`Checking timesheet visibility for Management:`, {
              timesheet_id: ts._id.toString(),
              timesheet_status: ts.status,
              user: ts.user_id?.full_name,
              user_role: ts.user_id?.role,
              project: project.name,
              approval_lead: approval.lead_status,
              approval_manager: approval.manager_status,
              approval_management: approval.management_status,
              isVisible
            });
          }

          return isVisible;
        });

        // Group by week
        const weekGroups = new Map<string, any[]>();
        for (const ts of projectTimesheets) {
          const weekKey = `${ts.week_start_date.toISOString()}_${ts.week_end_date.toISOString()}`;
          if (!weekGroups.has(weekKey)) {
            weekGroups.set(weekKey, []);
          }
          weekGroups.get(weekKey)!.push(ts);
        }

        // Build project-week group for each week
        for (const [weekKey, weekTimesheets] of weekGroups.entries()) {
          const firstTimesheet = weekTimesheets[0];
          // Ensure week dates exist
          const weekStart = firstTimesheet.week_start_date ? new Date(firstTimesheet.week_start_date) : new Date();
          const weekEnd = firstTimesheet.week_end_date ? new Date(firstTimesheet.week_end_date) : new Date();

          const projectWeekKey = `${project._id}_${weekKey}`;

          // Collect visible timesheet IDs for this project-week
          const visibleTimesheetIds = new Set(weekTimesheets.map(ts => ts._id.toString()));

          // Determine approval status for this project-week
          const projectWeekApprovals = approvals.filter(a =>
            a.project_id.toString() === project._id.toString() &&
            weekTimesheets.some(ts => ts._id.toString() === a.timesheet_id.toString())
          );

          const statusResult = this.determineProjectWeekStatus(
            projectWeekApprovals,
            visibleTimesheetIds,
            status,
            approverRole
          );
          
          // Debug logging for management role
          if (approverRole === 'management') {
            logger.info(`Project-week status result:`, {
              project: project.name,
              week: weekStart.toISOString().split('T')[0],
              weekTimesheetsCount: weekTimesheets.length,
              users: weekTimesheets.map(ts => ({
                name: ts.user_id?.full_name,
                role: ts.user_id?.role,
                status: ts.status
              })),
              statusResult: statusResult,
              statusFilter: status
            });
          }
          
          if (statusResult.status === null) continue; // Skip if doesn't match filter

          // FOR MANAGER VIEW: Hide groups where Lead hasn't completed all employee reviews
          // BUT show the group if Lead has submitted their own timesheet (even if employees are pending)
          if (approverRole === 'manager' || approverRole === 'super_admin') {
            // Check if this project has a Lead
            const hasLead = leadInfo?.id ? true : false;

            if (hasLead) {
              // Check if lead has submitted their own timesheet for this week
              const leadTimesheet = weekTimesheets.find(
                t => t.user_id?.role === 'lead' || t.user_id?._id?.toString() === leadInfo.id
              );
              
              // Check if any employees have pending lead approvals
              const hasIncompleteLeadReviews = projectWeekApprovals.some(approval => {
                const ts = weekTimesheets.find(t => t._id.toString() === approval.timesheet_id.toString());
                const userRole = ts?.user_id?.role;

                // Employee timesheet with pending lead approval
                return (
                  userRole === 'employee' &&
                  approval.lead_status === 'pending' &&
                  (ts.status === 'submitted' || ts.status === 'lead_approved' || ts.status === 'manager_approved')
                );
              });

              // Skip this project-week group ONLY if:
              // 1. Lead has incomplete employee reviews AND
              // 2. Lead has NOT submitted their own timesheet
              // (If lead submitted their timesheet, manager should see it even if some employees are pending)
              if (hasIncompleteLeadReviews && !leadTimesheet) {
                continue; // Move to next iteration, don't add to projectWeekMap
              }
            }
          }

          // FOR LEAD VIEW: Hide groups where not all employees have submitted entries for THIS project
          if (approverRole === 'lead') {
            // Get all employee members for this project (excluding the Lead themselves)
            const employeeMembers = projectMembersForProject.filter(
              pm => pm.project_role === 'employee' && pm.user_id.toString() !== approverId
            );

            // If there are no OTHER employees (Lead might be the only team member), allow the group to show
            if (employeeMembers.length > 0) {
              // Check if all employees have submitted entries for THIS project
              const allEmployeesHaveProjectEntries = employeeMembers.every(empMember => {
                // Find employee's timesheet for this week - search in ALL timesheets, not just weekTimesheets
                const empTimesheet = timesheets.find(
                  ts => ts.user_id?._id?.toString() === empMember.user_id.toString() &&
                        ts.week_start_date?.getTime() === weekStart.getTime()
                );

                // Employee must have a submitted timesheet (not null and not draft)
                if (!empTimesheet || empTimesheet.status === 'draft') {
                  return false; // Employee hasn't submitted
                }

                // Check if employee has entries for THIS specific project
                const empProjectEntries = entries.filter(
                  e => e.timesheet_id.toString() === empTimesheet._id.toString() &&
                       e.project_id.toString() === project._id.toString()
                );

                // Employee must have at least one entry for this project
                return empProjectEntries.length > 0;
              });

              // Skip this project-week group if not all employees have submitted entries for this project
              if (!allEmployeesHaveProjectEntries) {
                continue; // Move to next iteration, don't add to projectWeekMap
              }
            }
          }

          // Build users for this project-week
          const users: ProjectWeekUser[] = [];
          let totalHours = 0;
          let totalEntries = 0;

          for (const ts of weekTimesheets) {
            const approval = projectWeekApprovals.find(
              a => a.timesheet_id.toString() === ts._id.toString()
            );
            if (!approval) continue;

            // Skip if user_id is null or not populated
            if (!ts.user_id || !ts.user_id._id) {
              continue;
            }

            // Check if user is a member of this project
            const memberInfo = projectMembersForProject.find(
              pm => pm.user_id.toString() === ts.user_id._id.toString()
            );
            if (!memberInfo) continue;

            // Get entries for this user-project-week
            const userEntries = entries.filter(
              e => e.timesheet_id.toString() === ts._id.toString() &&
                   e.project_id.toString() === project._id.toString()
            );

            const userHours = userEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

            const entryDetails: TimeEntryDetail[] = userEntries.map(e => ({
              entry_id: e._id.toString(),
              date: e.date.toISOString(),
              task_id: e.task_id?._id?.toString(),
              task_name: e.task_id?.name || e.custom_task_description || 'Unnamed Task',
              hours: e.hours || 0,
              description: e.description,
              is_billable: e.is_billable
            }));

            // Determine approval status based on viewer role
            let approvalStatusForUser = approval.manager_status; // default
            if (approverRole === 'lead') {
              approvalStatusForUser = approval.lead_status;
            } else if (approverRole === 'manager' || approverRole === 'super_admin') {
              approvalStatusForUser = approval.manager_status;
            } else if (approverRole === 'management') {
              approvalStatusForUser = approval.management_status;
            }

            users.push({
              user_id: ts.user_id._id.toString(),
              user_name: ts.user_id.full_name || 'Unknown',
              user_email: ts.user_id.email || undefined,
              user_role: ts.user_id.role || undefined,
              project_role: memberInfo.project_role,
              timesheet_id: ts._id.toString(),
              timesheet_status: ts.status,
              total_hours_for_project: userHours,
              entries: entryDetails,
              approval_status: approvalStatusForUser,
              worked_hours: approval.worked_hours || 0,
              billable_hours: approval.billable_hours || 0,
              billable_adjustment: approval.billable_adjustment || 0
            });

            totalHours += userHours;
            totalEntries += userEntries.length;
          }

          if (users.length === 0) continue;

          // Get rejection/approval details based on role
          let rejectedApproval, approvedApproval;
          if (approverRole === 'lead') {
            rejectedApproval = projectWeekApprovals.find(a => a.lead_status === 'rejected');
            approvedApproval = projectWeekApprovals.find(a => a.lead_status === 'approved');
          } else if (approverRole === 'manager' || approverRole === 'super_admin') {
            rejectedApproval = projectWeekApprovals.find(a => a.manager_status === 'rejected');
            approvedApproval = projectWeekApprovals.find(a => a.manager_status === 'approved');
          } else if (approverRole === 'management') {
            rejectedApproval = projectWeekApprovals.find(a => a.management_status === 'rejected');
            approvedApproval = projectWeekApprovals.find(a => a.management_status === 'approved');
          } else {
            rejectedApproval = projectWeekApprovals.find(a => a.manager_status === 'rejected');
            approvedApproval = projectWeekApprovals.find(a => a.manager_status === 'approved');
          }

          // Get role-specific rejection reason
          let rejectionReason;
          if (approverRole === 'lead') {
            rejectionReason = rejectedApproval?.lead_rejection_reason;
          } else if (approverRole === 'manager' || approverRole === 'super_admin') {
            rejectionReason = rejectedApproval?.manager_rejection_reason;
          } else if (approverRole === 'management') {
            rejectionReason = rejectedApproval?.management_rejection_reason;
          } else {
            rejectionReason = rejectedApproval?.manager_rejection_reason;
          }

          // Detect reopening - if new timesheets were submitted after bulk approval
          const reopeningInfo = await this.detectReopening(
            project._id.toString(),
            weekStart,
            weekEnd,
            projectWeekApprovals,
            approverRole
          );

          // If reopened, force status back to pending/partially_processed
          let finalStatus = statusResult.status;
          let finalSubStatus = statusResult.sub_status;
          if (reopeningInfo.is_reopened && statusResult.status === 'approved') {
            // Was fully approved, but now has late submissions
            // Check if all non-late submissions are still approved
            if (statusResult.pending_count > 0) {
              finalStatus = 'partially_processed';
              finalSubStatus = statusResult.sub_status || `${statusResult.approved_count} of ${statusResult.approved_count + statusResult.pending_count} approved`;
            } else {
              finalStatus = 'pending';
            }
          }

          projectWeekMap.set(projectWeekKey, {
            project_id: project._id.toString(),
            project_name: project.name,
            project_status: project.status,
            week_start: weekStart.toISOString(),
            week_end: weekEnd.toISOString(),
            week_label: this.formatWeekLabel(weekStart, weekEnd),
            manager_id: project.primary_manager_id?._id ? project.primary_manager_id._id.toString() : undefined,
            manager_name: project.primary_manager_id?.full_name || 'Unknown',
            lead_id: leadInfo?.id,
            lead_name: leadInfo?.name,
            approval_status: finalStatus,
            sub_status: finalSubStatus,
            pending_count: statusResult.pending_count,
            approved_count: statusResult.approved_count,
            rejected_count: statusResult.rejected_count,
            users,
            total_users: users.length,
            total_hours: totalHours,
            total_entries: totalEntries,
            rejected_reason: rejectionReason,
            rejected_by: rejectedApproval?.rejected_by?.toString(),
            rejected_at: rejectedApproval && rejectedApproval.updated_at ? new Date(rejectedApproval.updated_at).toISOString() : undefined,
            approved_by: approvedApproval?.approved_by?.toString(),
            approved_at: approvedApproval && approvedApproval.updated_at ? new Date(approvedApproval.updated_at).toISOString() : undefined,
            is_reopened: reopeningInfo.is_reopened,
            reopened_at: reopeningInfo.reopened_at,
            reopened_by_submission: reopeningInfo.reopened_by_submission,
            original_approval_count: reopeningInfo.original_approval_count
          });
        }
      }

      // Convert map to array and sort
      let projectWeeks = Array.from(projectWeekMap.values());

      // Apply sorting
      projectWeeks = this.sortProjectWeeks(projectWeeks, sort_by, sort_order);

      // Apply pagination
      const total = projectWeeks.length;
      const total_pages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const paginatedWeeks = projectWeeks.slice(startIndex, startIndex + limit);

      return {
        project_weeks: paginatedWeeks,
        pagination: { total, page, limit, total_pages },
        filters_applied: filters
      };

    } catch (error) {
      logger.error('Error fetching project-week groups:', {
        message: error.message,
        stack: error.stack,
        data: {
          filters,
          approverId,
          approverRole
        }
      });

      // Re-throw original error so controller sees the real reason
      throw error;
    }
  }

  /**
   * Build project query based on role and filters
   */
  private static async buildProjectQuery(
    approverId: string,
    approverRole: string,
    projectFilter?: string | string[],
    search?: string
  ): Promise<any> {
    const query: any = { deleted_at: null };

    // Role-based filtering
    if (approverRole === 'management' || approverRole === 'super_admin') {
      // Management sees all projects
    } else if (approverRole === 'manager') {
      // Managers see their managed projects
      query.primary_manager_id = new mongoose.Types.ObjectId(approverId);
    } else if (approverRole === 'lead') {
      // Leads see projects where they are assigned as lead
      const leadProjects = await (ProjectMember as any).find({
        user_id: new mongoose.Types.ObjectId(approverId),
        project_role: 'lead',
        deleted_at: null,
        removed_at: null
      }).distinct('project_id');

      query._id = { $in: leadProjects };
    }

    // Project filter
    if (projectFilter) {
      const projectIds = Array.isArray(projectFilter) ? projectFilter : [projectFilter];
      if (query._id) {
        query._id = { $in: projectIds.map(id => new mongoose.Types.ObjectId(id)) };
      } else {
        query._id = { $in: projectIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }

    // Search filter
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    return query;
  }

  /**
   * Check if timesheet is visible to the approver based on their role
   * TIER 1 (Lead): See only Employee timesheets with status 'submitted'
   * TIER 2 (Manager): See lead_approved + submitted employees (direct) + submitted leads/managers
   * TIER 3 (Management): See manager_approved + management_pending
   */
  private static isTimesheetVisibleToRole(
    timesheet: any,
    approval: any,
    approverRole: string,
    approverId: string,
    leadInfo: any
  ): boolean {
    const userRole = timesheet.user_id?.role;
    const timesheetStatus = timesheet.status;

    // TIER 1: LEAD
    if (approverRole === 'lead') {
      // Lead can see Employee timesheets with status 'submitted' OR 'lead_approved'
      return userRole === 'employee' && (timesheetStatus === 'submitted' || timesheetStatus === 'lead_approved');
    }

    // TIER 2: MANAGER
    if (approverRole === 'manager' || approverRole === 'super_admin') {
      // Manager can see:
      // 1. lead_approved (recommended path - needs manager approval)
      // 2. submitted employees (direct approval path)
      // 3. submitted leads/managers (their own timesheets)
      // 4. management_rejected (resubmitted after management rejection)
      // 5. manager_approved (timesheets they have already approved - for viewing in "Approved" tab)
      return (
        timesheetStatus === 'lead_approved' ||
        timesheetStatus === 'manager_approved' || // ADDED: Manager can see their approved timesheets
        (timesheetStatus === 'submitted' && ['employee', 'lead', 'manager'].includes(userRole)) ||
        timesheetStatus === 'management_rejected'
      );
    }

    // TIER 3: MANAGEMENT
    if (approverRole === 'management') {
      // Management can see:
      // 1. manager_approved (for verification/freezing) - shown in "Pending" tab
      // 2. management_pending (manager's own timesheets) - shown in "Pending" tab
      // 3. frozen (verified timesheets) - shown in "Approved" tab
      const visible = (
        timesheetStatus === 'manager_approved' ||
        timesheetStatus === 'management_pending' ||
        timesheetStatus === 'frozen'
      );

      // Debug logging
      if (visible) {
        logger.info(`Management can see timesheet ${timesheet._id}: status=${timesheetStatus}, user=${timesheet.user_id?.full_name}`);
      }

      return visible;
    }

    return false;
  }

  /**
   * Determine approval status for a project-week based on approver role
   * CRITICAL FIX: Only consider approvals for VISIBLE timesheets
   */
  private static determineProjectWeekStatus(
    approvals: any[],
    visibleTimesheetIds: Set<string>,
    statusFilter: string,
    approverRole?: string
  ): {
    status: 'pending' | 'approved' | 'rejected' | 'partially_processed' | null;
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    sub_status?: string;
  } {
    if (approvals.length === 0) {
      return { status: null, pending_count: 0, approved_count: 0, rejected_count: 0 };
    }

    // CRITICAL: Filter approvals to only include VISIBLE timesheets
    // This prevents late submissions from affecting the status of already-approved project-weeks
    const visibleApprovals = approvals.filter(a =>
      visibleTimesheetIds.has(a.timesheet_id.toString())
    );

    if (visibleApprovals.length === 0) {
      return { status: null, pending_count: 0, approved_count: 0, rejected_count: 0 };
    }

    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    // Count statuses based on approver role - using ONLY visible approvals
    if (approverRole === 'lead') {
      // For Lead: check lead_status
      pendingCount = visibleApprovals.filter(a => a.lead_status === 'pending').length;
      approvedCount = visibleApprovals.filter(a => a.lead_status === 'approved' || a.lead_status === 'not_required').length;
      rejectedCount = visibleApprovals.filter(a => a.lead_status === 'rejected').length;
    } else if (approverRole === 'manager' || approverRole === 'super_admin') {
      // For Manager: check manager_status
      pendingCount = visibleApprovals.filter(a => a.manager_status === 'pending').length;
      approvedCount = visibleApprovals.filter(a => a.manager_status === 'approved').length;
      rejectedCount = visibleApprovals.filter(a => a.manager_status === 'rejected').length;
    } else if (approverRole === 'management') {
      // For Management: check management_status
      pendingCount = visibleApprovals.filter(a => a.management_status === 'pending').length;
      approvedCount = visibleApprovals.filter(a => a.management_status === 'approved').length;
      rejectedCount = visibleApprovals.filter(a => a.management_status === 'rejected').length;
    } else {
      // Default to manager_status for backward compatibility
      pendingCount = visibleApprovals.filter(a => a.manager_status === 'pending').length;
      approvedCount = visibleApprovals.filter(a => a.manager_status === 'approved').length;
      rejectedCount = visibleApprovals.filter(a => a.manager_status === 'rejected').length;
    }

    const totalCount = visibleApprovals.length;
    let status: 'pending' | 'approved' | 'rejected' | 'partially_processed';
    let subStatus: string | undefined;

    // Determine overall status based on counts
    if (rejectedCount > 0) {
      // If ANY are rejected, overall status is rejected
      status = 'rejected';
      if (rejectedCount < totalCount) {
        subStatus = `${rejectedCount} of ${totalCount} rejected`;
      }
    } else if (approvedCount === totalCount) {
      // All approved
      status = 'approved';
    } else if (approvedCount > 0 && pendingCount > 0) {
      // Some approved, some pending - this is partially processed
      status = 'partially_processed';
      subStatus = `${approvedCount} of ${totalCount} approved`;
    } else if (pendingCount > 0) {
      // All pending (or mix of pending with not_required)
      status = 'pending';
    } else {
      // Fallback
      status = 'pending';
    }

    // Apply filter
    // For 'pending' filter, include both 'pending' and 'partially_processed'
    // For 'approved' filter, include both 'approved' and 'partially_processed' (some approved)
    let shouldInclude = false;
    if (statusFilter === 'all') {
      shouldInclude = true;
    } else if (statusFilter === 'pending') {
      shouldInclude = status === 'pending' || status === 'partially_processed';
    } else if (statusFilter === 'approved') {
      // Include fully approved OR partially approved (at least some approved)
      shouldInclude = status === 'approved' || (status === 'partially_processed' && approvedCount > 0);
    } else {
      shouldInclude = status === statusFilter;
    }

    return {
      status: shouldInclude ? status : null,
      pending_count: pendingCount,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
      sub_status: subStatus
    };
  }

  /**
   * Detect if a project-week has been reopened due to late submissions
   * Returns reopening metadata if detected
   */
  private static async detectReopening(
    projectId: string,
    weekStart: Date,
    weekEnd: Date,
    currentApprovals: any[],
    approverRole?: string
  ): Promise<{
    is_reopened: boolean;
    reopened_at?: string;
    reopened_by_submission?: string;
    original_approval_count?: number;
  }> {
    try {
      // Get all approval records for this project-week, ordered by creation time
      const allApprovals = await TimesheetProjectApproval.find({
        project_id: new mongoose.Types.ObjectId(projectId)
      })
        .populate({
          path: 'timesheet_id',
          select: 'week_start_date created_at user_id',
          match: {
            week_start_date: { $gte: weekStart, $lte: weekEnd }
          }
        })
        .sort({ created_at: 1 });

      // Filter out null timesheets (didn't match week range)
      const validApprovals = allApprovals.filter(a => a.timesheet_id);

      if (validApprovals.length === 0) {
        return { is_reopened: false };
      }

      // Determine which status field to check based on role
      let statusField: 'lead_status' | 'manager_status' | 'management_status' = 'manager_status';
      if (approverRole === 'lead') {
        statusField = 'lead_status';
      } else if (approverRole === 'management') {
        statusField = 'management_status';
      }

      // Find the last time ALL visible approvals were approved
      let lastBulkApprovalTime: Date | null = null;
      let countAtLastBulkApproval = 0;

      for (let i = 0; i < validApprovals.length; i++) {
        const approvalsUpToNow = validApprovals.slice(0, i + 1);
        const allApprovedAtThisPoint = approvalsUpToNow.every(
          a => a[statusField] === 'approved' || a[statusField] === 'not_required'
        );

        if (allApprovedAtThisPoint) {
          lastBulkApprovalTime = validApprovals[i].updated_at;
          countAtLastBulkApproval = approvalsUpToNow.length;
        }
      }

      // If we never had a bulk approval, not reopened
      if (!lastBulkApprovalTime) {
        return { is_reopened: false };
      }

      // Check if any timesheets were submitted AFTER the last bulk approval
      const lateSubmissions = validApprovals.filter(a => {
        const timesheetCreatedAt = (a.timesheet_id as any)?.created_at;
        return timesheetCreatedAt && new Date(timesheetCreatedAt) > lastBulkApprovalTime!;
      });

      if (lateSubmissions.length > 0) {
        // This project-week has been reopened by employee late submission
        const firstLateSubmission = lateSubmissions[0];
        const timesheetId = firstLateSubmission.timesheet_id as any;

        return {
          is_reopened: true,
          reopened_at: new Date(timesheetId.created_at).toISOString(),
          reopened_by_submission: timesheetId.user_id?.toString(),
          original_approval_count: countAtLastBulkApproval
        };
      }

      // ADDITIONAL CHECK: Lead submitted late (after employees were already approved)
      if (approverRole === 'manager' || approverRole === 'super_admin') {
        const leadTimesheet = validApprovals.find(a => {
          const ts = a.timesheet_id as any;
          return ts?.user_id?.role === 'lead';
        });

        if (leadTimesheet && lastBulkApprovalTime) {
          const leadCreatedAt = (leadTimesheet.timesheet_id as any)?.created_at;

          if (leadCreatedAt && new Date(leadCreatedAt) > lastBulkApprovalTime) {
            return {
              is_reopened: true,
              reopened_at: new Date(leadCreatedAt).toISOString(),
              reopened_by_submission: (leadTimesheet.timesheet_id as any).user_id?.toString(),
              original_approval_count: countAtLastBulkApproval
            };
          }
        }
      }

      return { is_reopened: false };
    } catch (error) {
      logger.error('Error detecting reopening:', error);
      return { is_reopened: false };
    }
  }

  /**
   * Sort project-week groups
   */
  private static sortProjectWeeks(
    weeks: ProjectWeekGroup[],
    sortBy: string,
    sortOrder: string
  ): ProjectWeekGroup[] {
    const order = sortOrder === 'asc' ? 1 : -1;

    return weeks.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'week_date':
          comparison = new Date(a.week_start).getTime() - new Date(b.week_start).getTime();
          break;
        case 'project_name':
          comparison = a.project_name.localeCompare(b.project_name);
          break;
        case 'pending_count':
          const aPending = a.users.filter(u => u.approval_status === 'pending').length;
          const bPending = b.users.filter(u => u.approval_status === 'pending').length;
          comparison = aPending - bPending;
          break;
        default:
          comparison = 0;
      }

      return comparison * order;
    });
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

export default TeamReviewServiceV2;
