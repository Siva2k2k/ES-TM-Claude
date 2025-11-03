/**
 * DefaulterService
 *
 * Identifies and manages team members who haven't submitted timesheets
 * Provides blocking validation to prevent approvals when defaulters exist
 */

import { ProjectMember, Project } from '@/models/Project';
import { Timesheet } from '@/models/Timesheet';
import { NotificationService } from '@/services/NotificationService';
import { NotificationType, NotificationPriority } from '@/models/Notification';
import { ValidationError } from '@/utils/errors';
import mongoose from 'mongoose';

export interface Defaulter {
  user_id: string;
  user_name: string;
  user_email?: string;
  role: string;
  days_overdue: number;
  last_submission_date?: Date;
  project_id?: string;
  project_name?: string;
}

export interface MissingSubmission {
  user_id: string;
  user_name: string;
  user_email?: string;
  role: string;
  project_id: string;
  project_name: string;
  week_start_date: Date;
  week_end_date: Date;
  message: string; // Formatted message for display
}

export class DefaulterService {

  /**
   * Get defaulters for a specific project and week
   * Returns team members who haven't submitted timesheets
   *
   * @param projectId Project ID
   * @param weekStartDate Week start date (Monday)
   * @param excludeRole Optional role to exclude (e.g., 'lead' or 'manager')
   * @returns Array of defaulters
   */
  async getProjectDefaulters(
    projectId: string,
    weekStartDate: Date,
    excludeRole?: string
  ): Promise<Defaulter[]> {
    try {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ValidationError('Invalid project ID format');
      }

      // Get all active project members
      const members = await (ProjectMember.find as any)({
        project_id: new mongoose.Types.ObjectId(projectId),
        removed_at: null,
        deleted_at: null
      }).populate('user_id', 'full_name email role')
        .populate('project_id', 'name')
        .lean();

      const defaulters: Defaulter[] = [];

      for (const member of members) {
        const user = member.user_id as any;
        const project = member.project_id as any;

        if (!user) continue;

        // Exclude users with the specified role (e.g., lead accessing excludes leads, manager accessing excludes managers)
        if (excludeRole && user.role === excludeRole) {
          continue;
        }

        // Check if user has submitted timesheet for this week
        const timesheet = await (Timesheet.findOne as any)({
          user_id: user._id,
          week_start_date: weekStartDate,
          status: { $in: ['submitted', 'lead_approved', 'manager_approved', 'management_pending', 'frozen', 'billed'] },
          deleted_at: null
        });

        if (!timesheet) {
          // User hasn't submitted - they're a defaulter
          const daysOverdue = this.calculateDaysOverdue(weekStartDate);

          // Get their last submission date
          const lastSubmission = await (Timesheet.findOne as any)({
            user_id: user._id,
            status: { $in: ['submitted', 'lead_approved', 'manager_approved', 'management_pending', 'frozen', 'billed'] },
            deleted_at: null
          }).sort({ week_start_date: -1 }).lean();

          defaulters.push({
            user_id: user._id.toString(),
            user_name: user.full_name || 'Unknown',
            user_email: user.email,
            role: user.role || 'employee',
            days_overdue: daysOverdue,
            last_submission_date: lastSubmission?.week_start_date,
            project_id: project?._id?.toString(),
            project_name: project?.name
          });
        }
      }

      return defaulters;
    } catch (error) {
      console.error('Error getting project defaulters:', error);
      return [];
    }
  }

  /**
   * Get all defaulters for a manager across all their projects
   * Returns aggregated statistics instead of project-grouped data
   *
   * @param managerId Manager user ID
   * @param weekStartDate Week start date (Monday)
   * @returns Overall statistics with total defaulters, by-project counts, and critical count
   */
  async getManagerDefaulters(
    managerId: string,
    weekStartDate: Date
  ): Promise<{
    total_defaulters: number;
    by_project: Record<string, { count: number; project_name: string }>;
    critical_defaulters: number;
    all_defaulters: Defaulter[];
  }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(managerId)) {
        throw new ValidationError('Invalid manager ID format');
      }

      // Get all projects where user is a manager
      const { Project } = await import('@/models/Project');

      const projects = await (Project.find as any)({
        $or: [
          { primary_manager_id: new mongoose.Types.ObjectId(managerId) }
        ],
        status: 'active',
        deleted_at: null
      }).select('_id name');

      const allDefaulters: Defaulter[] = [];
      const byProject: Record<string, { count: number; project_name: string }> = {};
      let criticalDefaulters = 0;

      // Collect defaulters from all projects (exclude 'manager' role)
      for (const project of projects) {
        const defaulters = await this.getProjectDefaulters(
          project._id.toString(),
          weekStartDate,
          'manager' // Exclude managers from defaulter list
        );

        // Add to overall list
        allDefaulters.push(...defaulters);

        // Count by project
        if (defaulters.length > 0) {
          byProject[project._id.toString()] = {
            count: defaulters.length,
            project_name: project.name
          };
        }

        // Count critical defaulters (5+ days overdue)
        criticalDefaulters += defaulters.filter(d => d.days_overdue >= 5).length;
      }

      return {
        total_defaulters: allDefaulters.length,
        by_project: byProject,
        critical_defaulters: criticalDefaulters,
        all_defaulters: allDefaulters
      };
    } catch (error) {
      console.error('Error getting manager defaulters:', error);
      return {
        total_defaulters: 0,
        by_project: {},
        critical_defaulters: 0,
        all_defaulters: []
      };
    }
  }

  /**
   * Validate that there are no defaulters before allowing approval
   * Throws ValidationError if defaulters exist
   *
   * @param projectId Project ID
   * @param weekStartDate Week start date
   */
  async validateNoDefaulters(
    projectId: string,
    weekStartDate: Date
  ): Promise<void> {
    const defaulters = await this.getProjectDefaulters(projectId, weekStartDate);

    if (defaulters.length > 0) {
      const names = defaulters.map(d => d.user_name).join(', ');
      throw new ValidationError(
        `Cannot approve/reject. ${defaulters.length} team member${defaulters.length > 1 ? 's' : ''} haven't submitted timesheets: ${names}`
      );
    }
  }

  /**
   * Calculate days overdue based on week start date
   * Assumes timesheets should be submitted within 3 days after week ends
   *
   * @param weekStartDate Week start date (Monday)
   * @returns Number of days overdue
   */
  private calculateDaysOverdue(weekStartDate: Date): number {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const weekStart = new Date(weekStartDate);
    weekStart.setUTCHours(0, 0, 0, 0);

    // Week ends on Sunday (6 days after Monday)
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

    // Expected submission deadline: 3 days after week ends (Wednesday)
    const deadline = new Date(weekEnd);
    deadline.setUTCDate(deadline.getUTCDate() + 3);

    if (today <= deadline) {
      return 0; // Not overdue yet
    }

    const timeDiff = today.getTime() - deadline.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    return daysDiff;
  }

  /**
   * Get defaulter statistics for dashboard
   *
   * @param managerId Manager user ID (optional)
   * @param weekStartDate Week start date (optional, defaults to current week)
   * @returns Defaulter statistics
   */
  async getDefaulterStats(
    managerId?: string,
    weekStartDate?: Date
  ): Promise<{
    total_defaulters: number;
    by_project: Record<string, { count: number; project_name: string }>;
    critical_defaulters: number; // Overdue by 5+ days
  }> {
    try {
      const weekStart = weekStartDate || this.getCurrentWeekStart();

      if (managerId) {
        // Use the updated getManagerDefaulters which already returns aggregated statistics
        const stats = await this.getManagerDefaulters(managerId, weekStart);
        return {
          total_defaulters: stats.total_defaulters,
          by_project: stats.by_project,
          critical_defaulters: stats.critical_defaulters
        };
      }

      // If no managerId, return empty stats
      return {
        total_defaulters: 0,
        by_project: {},
        critical_defaulters: 0
      };
    } catch (error) {
      console.error('Error getting defaulter stats:', error);
      return {
        total_defaulters: 0,
        by_project: {},
        critical_defaulters: 0
      };
    }
  }

  /**
   * Get current week's Monday
   *
   * @returns Monday of current week
   */
  private getCurrentWeekStart(): Date {
    const { getMondayOfWeek } = require('@/utils/dateUtils');
    return getMondayOfWeek(new Date());
  }

  /**
   * Send reminder notifications to defaulters
   * (This would be integrated with NotificationService)
   *
   * @param projectId Project ID
   * @param weekStartDate Week start date
   * @returns Number of notifications sent
   */
  async notifyDefaulters(
    projectId: string,
    weekStartDate: Date
  ): Promise<number> {
    const defaulters = await this.getProjectDefaulters(projectId, weekStartDate);

    if (!defaulters || defaulters.length === 0) return 0;

    const weekLabel = weekStartDate ? new Date(weekStartDate).toISOString().split('T')[0] : undefined;

    // Send notifications in parallel and return count of successful sends
    const sendPromises = defaulters.map(async (d) => {
      try {
        const days = d.days_overdue || 0;
        const priority = days >= 5 ? NotificationPriority.URGENT : (days > 0 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM);

        const messageParts = [];
        if (d.project_name) messageParts.push(`on project "${d.project_name}"`);
        if (weekLabel) messageParts.push(`for week of ${weekLabel}`);
        const overduePart = days > 0 ? ` You are ${days} day${days > 1 ? 's' : ''} overdue.` : '';

        const message = `Please submit your timesheet ${messageParts.join(' ')}.${overduePart}`;

        await NotificationService.create({
          recipient_id: d.user_id,
          type: NotificationType.TIMESHEET_REMAINDER,
          title: 'Timesheet Reminder',
          message,
          data: {
            project_id: d.project_id,
            project_name: d.project_name,
            week_start_date: weekLabel
          },
          priority
        } as any);

        return 1;
      } catch (err) {
        console.error('Error sending defaulter notification for user', d.user_id, err);
        return 0;
      }
    });

    const results = await Promise.all(sendPromises);
    const sent = results.reduce((sum, v) => sum + (v || 0), 0);

    return sent;
  }

  /**
   * Get users who haven't submitted timesheets for any project in the past 2 weeks
   * Returns missing submissions with project and week details
   *
   * @param userId User ID (lead or manager)
   * @param userRole User's role (lead or manager)
   * @returns Array of missing submissions
   */
  async getMissingSubmissionsForPastWeeks(
    userId: string,
    userRole: string
  ): Promise<MissingSubmission[]> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Invalid user ID format');
      }

      // Calculate past 2 weeks from current week
      const currentWeekStart = this.getCurrentWeekStart();
      const pastWeeks: Date[] = [];

      // Get current week and previous week
      pastWeeks.push(currentWeekStart);

      const previousWeek = new Date(currentWeekStart);
      previousWeek.setUTCDate(previousWeek.getUTCDate() - 7);
      pastWeeks.push(previousWeek);

      // Get projects based on user role
      let projects: any[] = [];

      if (userRole === 'manager') {
        // Manager sees all projects where they are primary manager
        projects = await (Project.find as any)({
          primary_manager_id: new mongoose.Types.ObjectId(userId),
          status: 'active',
          deleted_at: null
        }).select('_id name');
      } else if (userRole === 'lead') {
        // Lead sees projects where they are assigned as lead
        projects = await (Project.find as any)({
          'leads.user_id': new mongoose.Types.ObjectId(userId),
          status: 'active',
          deleted_at: null
        }).select('_id name');
      }

      const missingSubmissions: MissingSubmission[] = [];

      for (const project of projects) {
        // Get project members based on role hierarchy
        const members = await (ProjectMember.find as any)({
          project_id: project._id,
          removed_at: null,
          deleted_at: null
        }).populate('user_id', 'full_name email role')
          .lean();

        for (const member of members) {
          const user = member.user_id as any;

          if (!user) continue;

          // Filter users based on role hierarchy
          let shouldInclude = false;

          if (userRole === 'manager') {
            // Manager sees employees and leads (but not other managers)
            shouldInclude = ['employee', 'lead'].includes(user.role);
          } else if (userRole === 'lead') {
            // Lead sees only employees (not other leads or managers)
            shouldInclude = user.role === 'employee';
          }

          if (!shouldInclude) continue;

          // Check each past week for missing submissions
          for (const weekStart of pastWeeks) {
            const timesheet = await (Timesheet.findOne as any)({
              user_id: user._id,
              week_start_date: weekStart,
              status: { $in: ['submitted', 'lead_approved', 'manager_approved', 'management_pending', 'frozen', 'billed'] },
              deleted_at: null
            });

            if (!timesheet) {
              // User hasn't submitted for this week - add to missing submissions
              const weekEnd = new Date(weekStart);
              weekEnd.setUTCDate(weekEnd.getUTCDate() + 6); // Sunday

              const message = `${user.full_name || 'Unknown'} did not submit entries on ${project.name} for week ${weekStart.toISOString().split('T')[0]} - ${weekEnd.toISOString().split('T')[0]}`;

              missingSubmissions.push({
                user_id: user._id.toString(),
                user_name: user.full_name || 'Unknown',
                user_email: user.email,
                role: user.role || 'employee',
                project_id: project._id.toString(),
                project_name: project.name,
                week_start_date: weekStart,
                week_end_date: weekEnd,
                message
              });
            }
          }
        }
      }

      return missingSubmissions;
    } catch (error) {
      console.error('Error getting missing submissions for past weeks:', error);
      return [];
    }
  }
}

// Export singleton instance
export default new DefaulterService();
