/**
 * Phase 7: Team Review Service
 * Handles project-wise timesheet approval workflows with multi-manager support
 * SonarQube compliant - kept under 250 lines
 */

import mongoose from 'mongoose';
import { Timesheet, type ITimesheet } from '../models/Timesheet';
import { TimesheetProjectApproval, type ITimesheetProjectApproval } from '../models/TimesheetProjectApproval';
import { ApprovalHistory } from '../models/ApprovalHistory';
import { TimeEntry } from '../models/TimeEntry';
import { Project, ProjectMember } from '../models/Project';
import { User } from '../models/User';
import { logger } from '../config/logger';

export interface ProjectTimesheetGroup {
  project_id: string;
  project_name: string;
  project_status: string;
  manager_id: string;
  manager_name: string;
  lead_id?: string;
  lead_name?: string;
  members: ProjectMemberTimesheet[];
  total_members: number;
  pending_approvals_count: number;
  approved_this_week: number;
  rejected_this_week: number;
}

export interface ProjectMemberTimesheet {
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  project_role: string;
  current_week_timesheet?: {
    timesheet_id: string;
    week_start: string;
    week_end: string;
    status: string;
    total_hours_for_project: number;
    entries_count: number;
    lead_status: string;
    manager_status: string;
    rejection_reason?: string;
  };
  pending_timesheets_count: number;
  approved_timesheets_count: number;
  rejected_timesheets_count: number;
}

export class TeamReviewService {
  /**
   * Get project-wise timesheet groups for Manager/Management
   * Returns hierarchical structure: Projects → Members → Timesheets
   */
  static async getProjectTimesheetGroups(
    approverId: string,
    approverRole: string
  ): Promise<ProjectTimesheetGroup[]> {
    try {
      // Get projects where user is manager or all projects for management
      // Updated to use primary_manager_id instead of manager_id
      const projectQuery = approverRole === 'management' || approverRole === 'super_admin'
        ? { deleted_at: null }
        : { primary_manager_id: new mongoose.Types.ObjectId(approverId), deleted_at: null };

      const projects = await Project.find(projectQuery)
        .populate('primary_manager_id', 'name email')
        .lean() as any[];

      const groups: ProjectTimesheetGroup[] = [];

      for (const project of projects) {
        const group = await this.buildProjectTimesheetGroup(project, approverRole);
        if (group) {
          groups.push(group);
        }
      }

      return groups;
    } catch (error) {
      logger.error('Error fetching project timesheet groups:', error);
      throw new Error('Failed to fetch project timesheet groups');
    }
  }

  /**
   * Build a single project timesheet group
   */
  private static async buildProjectTimesheetGroup(
    project: any,
    approverRole: string
  ): Promise<ProjectTimesheetGroup | null> {
    try {
      // Get all project members from ProjectMember collection
      const members = await ProjectMember.aggregate([
        {
          $match: {
            project_id: project._id,
            deleted_at: null,
            removed_at: null
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            user_id: '$user_id',
            project_role: '$project_role',
            user_name: '$user.name',
            user_email: '$user.email',
            user_role: '$user.role'
          }
        }
      ]);

      const memberTimesheets: ProjectMemberTimesheet[] = [];
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      for (const member of members) {
        const memberData = await this.buildMemberTimesheetData(
          member.user_id.toString(),
          project._id.toString(),
          member
        );

        if (memberData.current_week_timesheet) {
          if (memberData.current_week_timesheet.manager_status === 'pending') {
            pendingCount++;
          } else if (memberData.current_week_timesheet.manager_status === 'approved') {
            approvedCount++;
          } else if (memberData.current_week_timesheet.manager_status === 'rejected') {
            rejectedCount++;
          }
        }

        memberTimesheets.push(memberData);
      }

      return {
        project_id: project._id.toString(),
        project_name: project.name,
        project_status: project.status,
        manager_id: project.primary_manager_id._id.toString(),
        manager_name: project.primary_manager_id.name,
        lead_id: project.lead_id?.toString(),
        lead_name: project.lead_name,
        members: memberTimesheets,
        total_members: members.length,
        pending_approvals_count: pendingCount,
        approved_this_week: approvedCount,
        rejected_this_week: rejectedCount
      };
    } catch (error) {
      logger.error(`Error building project group for ${project.name}:`, error);
      return null;
    }
  }

  /**
   * Build member timesheet data for current week
   */
  private static async buildMemberTimesheetData(
    userId: string,
    projectId: string,
    memberInfo: any
  ): Promise<ProjectMemberTimesheet> {
    const currentDate = new Date();
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Find timesheet for current week
    const timesheet = await Timesheet.findOne({
      user_id: new mongoose.Types.ObjectId(userId),
      week_start_date: { $gte: weekStart, $lte: weekEnd },
      deleted_at: null
    }).lean() as any;

    let currentWeekData;
    if (timesheet) {
      // Get project approval status
      const projectApproval = await TimesheetProjectApproval.findOne({
        timesheet_id: timesheet._id,
        project_id: new mongoose.Types.ObjectId(projectId)
      }).lean();

      if (projectApproval) {
        // Count entries for this project
        const entries = await TimeEntry.find({
          timesheet_id: timesheet._id,
          project_id: new mongoose.Types.ObjectId(projectId),
          deleted_at: null
        }).lean();

        const totalHours = entries.reduce((sum, entry) => sum + entry.hours_worked, 0);

        currentWeekData = {
          timesheet_id: timesheet._id.toString(),
          week_start: timesheet.week_start_date.toISOString(),
          week_end: timesheet.week_end_date.toISOString(),
          status: timesheet.status,
          total_hours_for_project: totalHours,
          entries_count: entries.length,
          lead_status: projectApproval.lead_status,
          manager_status: projectApproval.manager_status,
          rejection_reason: projectApproval.manager_rejection_reason || projectApproval.lead_rejection_reason
        };
      }
    }

    return {
      user_id: userId,
      user_name: memberInfo.user_name,
      user_email: memberInfo.user_email,
      user_role: memberInfo.user_role,
      project_role: memberInfo.project_role,
      current_week_timesheet: currentWeekData,
      pending_timesheets_count: 0,
      approved_timesheets_count: 0,
      rejected_timesheets_count: 0
    };
  }
}

export default TeamReviewService;
