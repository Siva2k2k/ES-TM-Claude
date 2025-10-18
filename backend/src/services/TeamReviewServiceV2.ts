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

      const dateStart = week_start ? new Date(week_start) : defaultStartDate;
      const dateEnd = week_end ? new Date(week_end) : defaultEndDate;

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
          return this.isTimesheetVisibleToRole(ts, approval, approverRole, approverId, leadInfo);
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

          // Determine approval status for this project-week
          const projectWeekApprovals = approvals.filter(a =>
            a.project_id.toString() === project._id.toString() &&
            weekTimesheets.some(ts => ts._id.toString() === a.timesheet_id.toString())
          );

          const approvalStatus = this.determineProjectWeekStatus(projectWeekApprovals, status, approverRole);
          if (approvalStatus === null) continue; // Skip if doesn't match filter

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
              console.warn(`Skipping timesheet ${ts._id} - user_id is null or not populated`);
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
              approval_status: approvalStatusForUser
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
            approval_status: approvalStatus,
            users,
            total_users: users.length,
            total_hours: totalHours,
            total_entries: totalEntries,
            rejected_reason: rejectionReason,
            rejected_by: rejectedApproval?.rejected_by?.toString(),
            rejected_at: rejectedApproval && rejectedApproval.updated_at ? new Date(rejectedApproval.updated_at).toISOString() : undefined,
            approved_by: approvedApproval?.approved_by?.toString(),
            approved_at: approvedApproval && approvedApproval.updated_at ? new Date(approvedApproval.updated_at).toISOString() : undefined
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
      // Lead can only see Employee timesheets with status 'submitted'
      return userRole === 'employee' && timesheetStatus === 'submitted';
    }

    // TIER 2: MANAGER
    if (approverRole === 'manager' || approverRole === 'super_admin') {
      // Manager can see:
      // 1. lead_approved (recommended path)
      // 2. submitted employees (direct approval path)
      // 3. submitted leads/managers (their own timesheets)
      // 4. management_rejected (resubmitted)
      return (
        timesheetStatus === 'lead_approved' ||
        (timesheetStatus === 'submitted' && ['employee', 'lead', 'manager'].includes(userRole)) ||
        timesheetStatus === 'management_rejected'
      );
    }

    // TIER 3: MANAGEMENT
    if (approverRole === 'management') {
      // Management can see:
      // 1. manager_approved (for verification/freezing)
      // 2. management_pending (manager's own timesheets)
      return (
        timesheetStatus === 'manager_approved' ||
        timesheetStatus === 'management_pending'
      );
    }

    return false;
  }

  /**
   * Determine approval status for a project-week based on approver role
   */
  private static determineProjectWeekStatus(
    approvals: any[],
    statusFilter: string,
    approverRole?: string
  ): 'pending' | 'approved' | 'rejected' | null {
    if (approvals.length === 0) return null;

    let hasRejected = false;
    let hasPending = false;
    let allApproved = false;

    // Check status based on approver role
    if (approverRole === 'lead') {
      // For Lead: check lead_status
      hasRejected = approvals.some(a => a.lead_status === 'rejected');
      hasPending = approvals.some(a => a.lead_status === 'pending');
      allApproved = approvals.every(a => a.lead_status === 'approved' || a.lead_status === 'not_required');
    } else if (approverRole === 'manager' || approverRole === 'super_admin') {
      // For Manager: check manager_status
      hasRejected = approvals.some(a => a.manager_status === 'rejected');
      hasPending = approvals.some(a => a.manager_status === 'pending');
      allApproved = approvals.every(a => a.manager_status === 'approved');
    } else if (approverRole === 'management') {
      // For Management: check management_status
      hasRejected = approvals.some(a => a.management_status === 'rejected');
      hasPending = approvals.some(a => a.management_status === 'pending');
      allApproved = approvals.every(a => a.management_status === 'approved');
    } else {
      // Default to manager_status for backward compatibility
      hasRejected = approvals.some(a => a.manager_status === 'rejected');
      hasPending = approvals.some(a => a.manager_status === 'pending');
      allApproved = approvals.every(a => a.manager_status === 'approved');
    }

    let status: 'pending' | 'approved' | 'rejected';

    if (hasRejected) {
      status = 'rejected';
    } else if (hasPending) {
      status = 'pending';
    } else if (allApproved) {
      status = 'approved';
    } else {
      status = 'pending';
    }

    // Apply filter
    if (statusFilter === 'all') return status;
    return status === statusFilter ? status : null;
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
