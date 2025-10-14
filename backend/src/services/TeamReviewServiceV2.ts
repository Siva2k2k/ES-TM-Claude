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
import { Task } from '../models/Task';
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
      const projects = await Project.find(projectQuery)
        .populate('primary_manager_id', 'name email')
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
      const timesheets = await Timesheet.find({
        week_start_date: { $gte: dateStart, $lte: dateEnd },
        deleted_at: null
      })
        .populate('user_id', 'name email role')
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
      const approvals = await TimesheetProjectApproval.find({
        timesheet_id: { $in: timesheetIds },
        project_id: { $in: projectIds }
      }).lean() as any[];

      // Get all time entries for these timesheets and projects
      const entries = await TimeEntry.find({
        timesheet_id: { $in: timesheetIds },
        project_id: { $in: projectIds },
        deleted_at: null
      })
        .populate('task_id', 'name')
        .lean() as any[];

      // Get project members
      const projectMembers = await ProjectMember.find({
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
          const leadUser = await User.findById(leadMember.user_id).select('name').lean();
          leadInfo = { id: leadMember.user_id.toString(), name: leadUser?.name || 'Unknown' };
        }

        // Group timesheets by week for this project
        const projectTimesheets = timesheets.filter(ts => {
          const approval = approvals.find(
            a => a.timesheet_id.toString() === ts._id.toString() &&
                 a.project_id.toString() === project._id.toString()
          );
          return approval !== undefined;
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
          const weekStart = firstTimesheet.week_start_date;
          const weekEnd = firstTimesheet.week_end_date;

          const projectWeekKey = `${project._id}_${weekKey}`;

          // Determine approval status for this project-week
          const projectWeekApprovals = approvals.filter(a =>
            a.project_id.toString() === project._id.toString() &&
            weekTimesheets.some(ts => ts._id.toString() === a.timesheet_id.toString())
          );

          const approvalStatus = this.determineProjectWeekStatus(projectWeekApprovals, status);
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

            const userHours = userEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

            const entryDetails: TimeEntryDetail[] = userEntries.map(e => ({
              entry_id: e._id.toString(),
              date: e.date.toISOString(),
              task_id: e.task_id?._id?.toString(),
              task_name: e.task_id?.name || e.custom_task_description || 'Unnamed Task',
              hours: e.hours_worked || 0,
              description: e.description,
              is_billable: e.is_billable
            }));

            users.push({
              user_id: ts.user_id._id.toString(),
              user_name: ts.user_id.name,
              user_email: ts.user_id.email,
              user_role: ts.user_id.role,
              project_role: memberInfo.project_role,
              timesheet_id: ts._id.toString(),
              timesheet_status: ts.status,
              total_hours_for_project: userHours,
              entries: entryDetails,
              approval_status: approval.manager_status
            });

            totalHours += userHours;
            totalEntries += userEntries.length;
          }

          if (users.length === 0) continue;

          // Get rejection/approval details
          const rejectedApproval = projectWeekApprovals.find(a => a.manager_status === 'rejected');
          const approvedApproval = projectWeekApprovals.find(a => a.manager_status === 'approved');

          projectWeekMap.set(projectWeekKey, {
            project_id: project._id.toString(),
            project_name: project.name,
            project_status: project.status,
            week_start: weekStart.toISOString(),
            week_end: weekEnd.toISOString(),
            week_label: this.formatWeekLabel(weekStart, weekEnd),
            manager_id: project.primary_manager_id._id.toString(),
            manager_name: project.primary_manager_id.name,
            lead_id: leadInfo?.id,
            lead_name: leadInfo?.name,
            approval_status: approvalStatus,
            users,
            total_users: users.length,
            total_hours: totalHours,
            total_entries: totalEntries,
            rejected_reason: rejectedApproval?.manager_rejection_reason,
            rejected_by: rejectedApproval?.rejected_by?.toString(),
            rejected_at: rejectedApproval?.updated_at?.toISOString(),
            approved_by: approvedApproval?.approved_by?.toString(),
            approved_at: approvedApproval?.updated_at?.toISOString()
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
      logger.error('Error fetching project-week groups:', error);
      throw new Error('Failed to fetch project-week groups');
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
      const leadProjects = await ProjectMember.find({
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
   * Determine approval status for a project-week
   */
  private static determineProjectWeekStatus(
    approvals: any[],
    statusFilter: string
  ): 'pending' | 'approved' | 'rejected' | null {
    if (approvals.length === 0) return null;

    const hasRejected = approvals.some(a => a.manager_status === 'rejected');
    const hasPending = approvals.some(a => a.manager_status === 'pending');
    const allApproved = approvals.every(a => a.manager_status === 'approved');

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
