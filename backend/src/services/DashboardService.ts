// @ts-nocheck - Temporarily disable type checking for Mongoose compatibility issues
import { Timesheet } from '@/models/Timesheet';
import { User, UserRole } from '@/models/User';
import { Project, ProjectMember } from '@/models/Project';
import { BillingSnapshot } from '@/models/BillingSnapshot';
import { AuthorizationError } from '@/utils/errors';
import { ITask } from '@/models/Task';
import { TimeEntry } from '@/models/TimeEntry';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  hourly_rate: number;
  is_active: boolean;
  is_approved_by_super_admin: boolean;
}

interface SuperAdminDashboardData {
  system_overview: {
    total_users: number;
    active_users: number;
    pending_approvals: number;
    total_projects: number;
    active_projects: number;
  };
  timesheet_metrics: {
    total_timesheets: number;
    pending_approval: number;
    frozen_timesheets: number;
    average_hours_per_week: number;
  };
  financial_overview: {
    total_revenue: number;
    monthly_revenue: number;
    billable_hours: number;
    average_hourly_rate: number;
  };
  user_activity: Array<{
    user_id: string;
    user_name: string;
    role: string;
    last_timesheet: string;
    status: string;
  }>;
}

interface ManagementDashboardData {
  organization_overview: {
    total_projects: number;
    active_projects: number;
    total_employees: number;
    total_managers: number;
  };
  project_health: Array<{
    project_id: string;
    project_name: string;
    status: string;
    budget_utilization: number;
    team_size: number;
    completion_percentage: number;
  }>;
  billing_metrics: {
    monthly_revenue: number;
    pending_billing: number;
    total_billable_hours: number;
    revenue_growth: number;
  };
  team_performance: Array<{
    manager_id: string;
    manager_name: string;
    team_size: number;
    active_timesheets: number;
    pending_approvals: number;
  }>;
}

interface ManagerDashboardData {
  team_overview: {
    team_size: number;
    active_projects: number;
    pending_timesheets: number;
    team_utilization: number;
  };
  project_status: Array<{
    project_id: string;
    project_name: string;
    status: string;
    team_members: number;
    completion_percentage: number;
    budget_status: 'under' | 'on_track' | 'over';
  }>;
  team_members: Array<{
    user_id: string;
    user_name: string;
    current_projects: number;
    pending_timesheets: number;
    weekly_hours: number;
    status: 'active' | 'inactive' | 'overdue';
  }>;
  timesheet_approvals: Array<{
    timesheet_id: string;
    user_name: string;
    week_start: string;
    total_hours: number;
    status: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface LeadDashboardData {
  task_overview: {
    assigned_tasks: number;
    completed_tasks: number;
    overdue_tasks: number;
    team_tasks: number;
  };
  project_coordination: Array<{
    project_id: string;
    project_name: string;
    my_role: string;
    team_size: number;
    active_tasks: number;
    completion_percentage: number;
  }>;
  team_collaboration: Array<{
    user_id: string;
    user_name: string;
    shared_projects: number;
    pending_tasks: number;
    collaboration_score: number;
  }>;
}

interface EmployeeDashboardData {
  personal_overview: {
    current_projects: number;
    assigned_tasks: number;
    completed_tasks: number;
    weekly_hours: number;
  };
  timesheet_status: {
    current_week: string;
    status: string;
    total_hours: number;
    billable_hours: number;
    can_submit: boolean;
  };
  project_assignments: Array<{
    project_id: string;
    project_name: string;
    role: string;
    active_tasks: number;
    hours_logged: number;
    is_billable: boolean;
  }>;
  recent_activity: Array<{
    date: string;
    activity_type: string;
    description: string;
    project_name?: string;
  }>;
}

export class DashboardService {
  static async getSuperAdminDashboard(
    currentUser: AuthUser
  ): Promise<{ dashboard?: SuperAdminDashboardData; error?: string }> {
    try {
      if (currentUser.role !== 'super_admin') {
        throw new AuthorizationError('Super Admin role required');
      }

      const [
        totalUsers,
        activeUsers,
        pendingApprovals,
        totalProjects,
        activeProjects,
        timesheetMetrics,
        financialData,
        userActivity
      ] = await Promise.all([
        User.countDocuments({ deleted_at: null }),
        User.countDocuments({ is_active: true, deleted_at: null }),
        User.countDocuments({ is_approved_by_super_admin: false, deleted_at: null }),
        Project.countDocuments({ deleted_at: null }),
        Project.countDocuments({ status: 'active', deleted_at: null }),
        this.getTimesheetMetrics(),
        this.getFinancialOverview(),
        this.getUserActivity()
      ]);

      const dashboard: SuperAdminDashboardData = {
        system_overview: {
          total_users: totalUsers,
          active_users: activeUsers,
          pending_approvals: pendingApprovals,
          total_projects: totalProjects,
          active_projects: activeProjects
        },
        timesheet_metrics: timesheetMetrics,
        financial_overview: financialData,
        user_activity: userActivity
      };

      return { dashboard };
    } catch (error: any) {
      console.error('Error fetching super admin dashboard:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch dashboard data' };
    }
  }

  static async getManagementDashboard(
    currentUser: AuthUser
  ): Promise<{ dashboard?: ManagementDashboardData; error?: string }> {
    try {
      if (currentUser.role !== 'management') {
        throw new AuthorizationError('Management role required');
      }

      const [
        totalProjects,
        activeProjects,
        totalEmployees,
        totalManagers,
        projectHealth,
        billingMetrics,
        teamPerformance
      ] = await Promise.all([
        Project.countDocuments({ deleted_at: null }),
        Project.countDocuments({ status: 'active', deleted_at: null }),
        User.countDocuments({ role: { $in: ['employee', 'lead'] }, deleted_at: null }),
        User.countDocuments({ role: 'manager', deleted_at: null }),
        this.getProjectHealth(),
        this.getBillingMetrics(),
        this.getTeamPerformance()
      ]);

      const dashboard: ManagementDashboardData = {
        organization_overview: {
          total_projects: totalProjects,
          active_projects: activeProjects,
          total_employees: totalEmployees,
          total_managers: totalManagers
        },
        project_health: projectHealth,
        billing_metrics: billingMetrics,
        team_performance: teamPerformance
      };

      return { dashboard };
    } catch (error: any) {
      console.error('Error fetching management dashboard:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch dashboard data' };
    }
  }

  static async getManagerDashboard(
    currentUser: AuthUser
  ): Promise<{ dashboard?: ManagerDashboardData; error?: string }> {
    try {
      if (currentUser.role !== 'manager') {
        throw new AuthorizationError('Manager role required');
      }

      // Get projects managed by this manager
      const managedProjectIds = await ProjectMember.find({
        user_id: currentUser.id,
        $or: [{ is_primary_manager: true }, { is_secondary_manager: true }],
        deleted_at: null
      }).distinct('project_id');

      // Get direct reports
      const teamMembers = await User.find({
        manager_id: currentUser.id,
        deleted_at: null
      }).select('_id full_name');

      const teamMemberIds = teamMembers.map(member => member._id);

      const [
        teamOverview,
        projectStatus,
        teamMemberDetails,
        timesheetApprovals
      ] = await Promise.all([
        this.getTeamOverview(managedProjectIds, teamMemberIds),
        this.getProjectStatus(managedProjectIds),
        this.getTeamMemberDetails(teamMembers),
        this.getTimesheetApprovals(teamMemberIds)
      ]);

      const dashboard: ManagerDashboardData = {
        team_overview: teamOverview,
        project_status: projectStatus,
        team_members: teamMemberDetails,
        timesheet_approvals: timesheetApprovals
      };

      return { dashboard };
    } catch (error: any) {
      console.error('Error fetching manager dashboard:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch dashboard data' };
    }
  }

  static async getLeadDashboard(
    currentUser: AuthUser
  ): Promise<{ dashboard?: LeadDashboardData; error?: string }> {
    try {
      if (currentUser.role !== 'lead') {
        throw new AuthorizationError('Lead role required');
      }

      // Get projects where user is a lead
      const leadProjectIds = await ProjectMember.find({
        user_id: currentUser.id,
        project_role: 'lead',
        deleted_at: null
      }).distinct('project_id');

      const [
        taskOverview,
        projectCoordination,
        teamCollaboration
      ] = await Promise.all([
        this.getTaskOverview(currentUser.id, leadProjectIds),
        this.getProjectCoordination(currentUser.id, leadProjectIds),
        this.getTeamCollaboration(currentUser.id, leadProjectIds)
      ]);

      const dashboard: LeadDashboardData = {
        task_overview: taskOverview,
        project_coordination: projectCoordination,
        team_collaboration: teamCollaboration
      };

      return { dashboard };
    } catch (error: any) {
      console.error('Error fetching lead dashboard:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch dashboard data' };
    }
  }

  static async getEmployeeDashboard(
    currentUser: AuthUser
  ): Promise<{ dashboard?: EmployeeDashboardData; error?: string }> {
    try {
      if (currentUser.role !== 'employee') {
        throw new AuthorizationError('Employee role required');
      }

      const [
        personalOverview,
        timesheetStatus,
        projectAssignments,
        recentActivity
      ] = await Promise.all([
        this.getPersonalOverview(currentUser.id),
        this.getTimesheetStatus(currentUser.id),
        this.getProjectAssignments(currentUser.id),
        this.getRecentActivity(currentUser.id)
      ]);

      const dashboard: EmployeeDashboardData = {
        personal_overview: personalOverview,
        timesheet_status: timesheetStatus,
        project_assignments: projectAssignments,
        recent_activity: recentActivity
      };

      return { dashboard };
    } catch (error: any) {
      console.error('Error fetching employee dashboard:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch dashboard data' };
    }
  }

  // Helper methods for dashboard data aggregation
  private static async getTimesheetMetrics() {
    const [totalTimesheets, pendingApproval, frozenTimesheets] = await Promise.all([
      Timesheet.countDocuments({ deleted_at: null }),
      Timesheet.countDocuments({
        status: { $in: ['submitted', 'manager_approved', 'management_pending'] },
        deleted_at: null
      }),
      Timesheet.countDocuments({ status: 'frozen', deleted_at: null })
    ]);

    const avgHours = await Timesheet.aggregate([
      { $match: { deleted_at: null } },
      { $group: { _id: null, avgHours: { $avg: '$total_hours' } } }
    ]);

    return {
      total_timesheets: totalTimesheets,
      pending_approval: pendingApproval,
      frozen_timesheets: frozenTimesheets,
      average_hours_per_week: avgHours[0]?.avgHours || 0
    };
  }

  private static async getFinancialOverview() {
    const snapshots = await BillingSnapshot.find({ deleted_at: null }).select('billable_amount billable_hours');

    const totalRevenue = snapshots.reduce((sum, s) => sum + s.billable_amount, 0);
    const billableHours = snapshots.reduce((sum, s) => sum + s.billable_hours, 0);

    // Calculate monthly revenue (current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];

    const monthlySnapshots = await BillingSnapshot.find({
      week_start_date: { $gte: monthStart },
      deleted_at: null
    }).select('billable_amount');

    const monthlyRevenue = monthlySnapshots.reduce((sum, s) => sum + s.billable_amount, 0);

    return {
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
      billable_hours: billableHours,
      average_hourly_rate: billableHours > 0 ? totalRevenue / billableHours : 0
    };
  }

  private static async getUserActivity() {
    const users = await User.find({ deleted_at: null })
      .select('full_name role')
      .limit(10);

    const userActivity = await Promise.all(
      users.map(async (user) => {
        const lastTimesheet = await Timesheet.findOne({
          user_id: user._id,
          deleted_at: null
        })
          .sort({ created_at: -1 })
          .select('week_start_date status');

        return {
          user_id: user._id.toString(),
          user_name: user.full_name,
          role: user.role,
          last_timesheet: lastTimesheet?.week_start_date || 'No timesheets',
          status: lastTimesheet?.status || 'inactive'
        };
      })
    );

    return userActivity;
  }

  private static async getProjectHealth() {
    const projects = await Project.find({ deleted_at: null }).select('name status budget');

    return projects.slice(0, 10).map((project, index) => ({
      project_id: project._id.toString(),
      project_name: project.name,
      status: project.status,
      budget_utilization: Math.random() * 100, // Mock data - would calculate from actual hours
      team_size: Math.floor(Math.random() * 10) + 2, // Mock data
      completion_percentage: Math.random() * 100 // Mock data
    }));
  }

  private static async getBillingMetrics() {
    const financialData = await this.getFinancialOverview();

    return {
      monthly_revenue: financialData.monthly_revenue,
      pending_billing: Math.floor(Math.random() * 50000), // Mock data
      total_billable_hours: financialData.billable_hours,
      revenue_growth: 15.8 // Mock data
    };
  }

  private static async getTeamPerformance() {
    const managers = await User.find({ role: 'manager', deleted_at: null })
      .select('full_name')
      .limit(10);

    return Promise.all(
      managers.map(async (manager) => {
        const teamSize = await User.countDocuments({
          manager_id: manager._id,
          deleted_at: null
        });

        const activeTimesheets = Math.floor(Math.random() * 20); // Mock data
        const pendingApprovals = Math.floor(Math.random() * 10); // Mock data

        return {
          manager_id: manager._id.toString(),
          manager_name: manager.full_name,
          team_size: teamSize,
          active_timesheets: activeTimesheets,
          pending_approvals: pendingApprovals
        };
      })
    );
  }

  private static async getTeamOverview(managedProjectIds: any[], teamMemberIds: any[]) {
    const activeProjects = await Project.countDocuments({
      _id: { $in: managedProjectIds },
      status: 'active',
      deleted_at: null
    });

    const pendingTimesheets = await Timesheet.countDocuments({
      user_id: { $in: teamMemberIds },
      status: { $in: ['submitted', 'manager_approved'] },
      deleted_at: null
    });

    return {
      team_size: teamMemberIds.length,
      active_projects: activeProjects,
      pending_timesheets: pendingTimesheets,
      team_utilization: Math.random() * 100 // Mock data
    };
  }

  private static async getProjectStatus(managedProjectIds: any[]) {
    const projects = await Project.find({
      _id: { $in: managedProjectIds },
      deleted_at: null
    }).select('name status budget');

    return projects.map(project => ({
      project_id: project._id.toString(),
      project_name: project.name,
      status: project.status,
      team_members: Math.floor(Math.random() * 8) + 2, // Mock data
      completion_percentage: Math.random() * 100, // Mock data
      budget_status: ['under', 'on_track', 'over'][Math.floor(Math.random() * 3)] as 'under' | 'on_track' | 'over'
    }));
  }

  private static async getTeamMemberDetails(teamMembers: any[]) {
    return teamMembers.map(member => ({
      user_id: member._id.toString(),
      user_name: member.full_name,
      current_projects: Math.floor(Math.random() * 5) + 1, // Mock data
      pending_timesheets: Math.floor(Math.random() * 3), // Mock data
      weekly_hours: Math.random() * 40 + 20, // Mock data
      status: ['active', 'inactive', 'overdue'][Math.floor(Math.random() * 3)] as 'active' | 'inactive' | 'overdue'
    }));
  }

  private static async getTimesheetApprovals(teamMemberIds: any[]) {
    const timesheets = await Timesheet.find({
      user_id: { $in: teamMemberIds },
      status: { $in: ['submitted', 'manager_approved'] },
      deleted_at: null
    })
      .populate('user_id', 'full_name')
      .select('week_start_date total_hours status')
      .sort({ created_at: -1 })
      .limit(10);

    return timesheets.map((timesheet: any) => ({
      timesheet_id: timesheet._id.toString(),
      user_name: timesheet.user_id.full_name,
      week_start: timesheet.week_start_date,
      total_hours: timesheet.total_hours,
      status: timesheet.status,
      priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low'
    }));
  }

  private static async getTaskOverview(userId: string, projectIds: any[]) {
    // Mock implementation - would integrate with actual Task model
    return {
      assigned_tasks: Math.floor(Math.random() * 20) + 5,
      completed_tasks: Math.floor(Math.random() * 15) + 3,
      overdue_tasks: Math.floor(Math.random() * 5),
      team_tasks: Math.floor(Math.random() * 30) + 10
    };
  }

  private static async getProjectCoordination(userId: string, projectIds: any[]) {
    const projects = await Project.find({
      _id: { $in: projectIds },
      deleted_at: null
    }).select('name').limit(5);

    return projects.map(project => ({
      project_id: project._id.toString(),
      project_name: project.name,
      my_role: 'lead',
      team_size: Math.floor(Math.random() * 8) + 3,
      active_tasks: Math.floor(Math.random() * 15) + 2,
      completion_percentage: Math.random() * 100
    }));
  }

  private static async getTeamCollaboration(userId: string, projectIds: any[]) {
    // Mock implementation - would get actual team members from shared projects
    return [
      {
        user_id: 'user1',
        user_name: 'John Doe',
        shared_projects: 3,
        pending_tasks: 2,
        collaboration_score: 85
      },
      {
        user_id: 'user2',
        user_name: 'Jane Smith',
        shared_projects: 2,
        pending_tasks: 1,
        collaboration_score: 92
      }
    ];
  }

  private static async getPersonalOverview(userId: string) {
    const currentProjects = await ProjectMember.countDocuments({
      user_id: userId,
      deleted_at: null
    });

    return {
      current_projects: currentProjects,
      assigned_tasks: Math.floor(Math.random() * 15) + 3, // Mock data
      completed_tasks: Math.floor(Math.random() * 10) + 2, // Mock data
      weekly_hours: Math.random() * 40 + 20 // Mock data
    };
  }

  private static async getTimesheetStatus(userId: string) {
    const currentWeek = this.getCurrentWeekStart();
    const currentTimesheet = await Timesheet.findOne({
      user_id: userId,
      week_start_date: currentWeek,
      deleted_at: null
    });

    let billableHours = 0;

    if (currentTimesheet) {
      const entries = await TimeEntry.find({
        timesheet_id: currentTimesheet._id,
        is_billable: true,
        deleted_at: null
      });
      billableHours = entries.reduce((sum: number, entry: any) => sum + entry.hours, 0);
    }

    return {
      current_week: currentWeek,
      status: currentTimesheet?.status || 'draft',
      total_hours: currentTimesheet?.total_hours || 0,
      billable_hours: billableHours,
      can_submit: currentTimesheet?.status === 'draft' || !currentTimesheet
    };
  }

  private static async getProjectAssignments(userId: string) {
    const assignments = await ProjectMember.find({
      user_id: userId,
      deleted_at: null
    })
      .populate('project_id', 'name is_billable')
      .select('project_role');

    return assignments.map((assignment: any) => ({
      project_id: assignment.project_id._id.toString(),
      project_name: assignment.project_id.name,
      role: assignment.project_role,
      active_tasks: Math.floor(Math.random() * 8) + 1, // Mock data
      hours_logged: Math.random() * 20 + 5, // Mock data
      is_billable: assignment.project_id.is_billable
    }));
  }

  private static async getRecentActivity(userId: string) {
    // Mock implementation - would get from actual activity logs
    const activities = [];
    const now = new Date();

    for (let i = 0; i < 5; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      activities.push({
        date: date.toISOString().split('T')[0],
        activity_type: ['timesheet_submitted', 'task_completed', 'project_assigned'][Math.floor(Math.random() * 3)],
        description: `Sample activity ${i + 1}`,
        project_name: i % 2 === 0 ? 'Sample Project' : undefined
      });
    }

    return activities;
  }

  private static getCurrentWeekStart(): string {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    return weekStart.toISOString().split('T')[0];
  }
}