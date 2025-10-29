import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Project } from '@/models/Project';
import { Timesheet } from '@/models/Timesheet';
import { User } from '@/models/User';
import { BillingAdjustment } from '@/models/BillingAdjustment';
import { TimesheetProjectApproval } from '@/models/TimesheetProjectApproval';
import type {
  ProjectBillingData,
  ResourceBillingData,
  WeeklyBreakdown,
  MonthlyBreakdown,
  ResourceTaskData,
  TaskBillingData,
  TaskResourceData,
  UserBillingProjectData
} from '@/types/projectBilling';
import { BILLING_ELIGIBLE_STATUSES } from '@/types/projectBilling';
import mongoose from 'mongoose';
import { IdUtils } from '@/utils/idUtils';
import { ProjectBillingService } from '@/services/ProjectBillingService';

export class ProjectBillingController {
  /**
   * Get project-based billing view with monthly/weekly breakdown
   */
  static async getProjectBillingView(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        startDate,
        endDate,
        projectIds: projectIdsRaw,
        clientIds: clientIdsRaw,
        view = 'monthly'
      } = req.query as {
        startDate: string;
        endDate: string;
        projectIds?: string;
        clientIds?: string;
        view?: 'weekly' | 'monthly' | 'custom';
      };

      // Use centralized ID parsing utility
      const projectIds = IdUtils.parseIds(projectIdsRaw).filter(id => IdUtils.isValidObjectId(id));
      const clientIds = IdUtils.parseIds(clientIdsRaw).filter(id => IdUtils.isValidObjectId(id));

      const projects = await ProjectBillingService.buildProjectBillingData({
        startDate,
        endDate,
        projectIds,
        clientIds,
        view
      });

      const summary = {
        total_projects: projects.length,
        total_hours: projects.reduce((sum, project) => sum + project.total_hours, 0),
        total_billable_hours: projects.reduce((sum, project) => sum + project.billable_hours, 0),
        total_amount: projects.reduce((sum, project) => sum + project.total_amount, 0)
      };

      res.json({
        success: true,
        data: {
          projects,
          summary,
          period: { startDate, endDate, view }
        }
      });

    } catch (error: any) {
      console.error('Error in getProjectBillingView:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get project billing view'
      });
    }
  }

  static async getUserBillingView(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        startDate,
        endDate,
        projectIds: projectIdsRaw,
        clientIds: clientIdsRaw,
        roles: rolesRaw,
        search,
        view = 'monthly'
      } = req.query as {
        startDate: string;
        endDate: string;
        projectIds?: string;
        clientIds?: string;
        roles?: string;
        search?: string;
        view?: 'weekly' | 'monthly' | 'custom';
      };

      const parseRoles = (value?: string): string[] =>
        value
          ? value
              .split(',')
              .map((role) => role.trim().toLowerCase())
              .filter((role) => role.length > 0)
          : [];

      // Use centralized ID parsing utility
      const projectIds = IdUtils.parseIds(projectIdsRaw).filter(id => IdUtils.isValidObjectId(id));
      const clientIds = IdUtils.parseIds(clientIdsRaw).filter(id => IdUtils.isValidObjectId(id));
      const roleFilters = parseRoles(rolesRaw);

      const projects = await ProjectBillingService.buildProjectBillingData({
        startDate,
        endDate,
        projectIds,
        clientIds,
        view
      });

      const searchTerm = search?.toLowerCase().trim();

      const userMap = new Map<
        string,
        {
          user_id: string;
          user_name: string;
          role: string;
          total_hours: number;
          billable_hours: number;
          non_billable_hours: number;
          total_amount: number;
          projects: UserBillingProjectData[];
          tasks: ResourceTaskData[];
        }
      >();

      for (const project of projects) {
        for (const resource of project.resources) {
          const resourceRole = (resource.role ?? '').toLowerCase();
          if (
            (roleFilters.length > 0 && !roleFilters.includes(resourceRole)) ||
            (searchTerm && !resource.user_name.toLowerCase().includes(searchTerm))
          ) {
            continue;
          }

          if (!userMap.has(resource.user_id)) {
            userMap.set(resource.user_id, {
              user_id: resource.user_id,
              user_name: resource.user_name,
              role: resource.role,
              total_hours: 0,
              billable_hours: 0,
              non_billable_hours: 0,
              total_amount: 0,
              projects: [],
              tasks: []
            });
          }

          const userEntry = userMap.get(resource.user_id)!;
          userEntry.total_hours += resource.total_hours;
          userEntry.billable_hours += resource.billable_hours;
          userEntry.non_billable_hours += resource.non_billable_hours;
          userEntry.total_amount += resource.total_amount;

          userEntry.projects.push({
            project_id: project.project_id,
            project_name: project.project_name,
            client_name: project.client_name,
            total_hours: resource.total_hours,
            billable_hours: resource.billable_hours,
            non_billable_hours: resource.non_billable_hours,
            amount: resource.total_amount
          });

          (resource.tasks ?? []).forEach((task) => {
            userEntry.tasks.push({
              task_id: task.task_id,
              task_name: task.task_name,
              project_id: task.project_id,
              project_name: task.project_name,
              total_hours: task.total_hours,
              billable_hours: task.billable_hours,
              non_billable_hours: task.non_billable_hours,
              amount: task.amount
            });
          });
        }
      }

      const users = Array.from(userMap.values()).map((user) => ({
        ...user,
        projects: user.projects.sort((a, b) => b.billable_hours - a.billable_hours),
        tasks: user.tasks.sort((a, b) => b.billable_hours - a.billable_hours)
      }));

      users.sort((a, b) => b.billable_hours - a.billable_hours);

      const summary = {
        total_users: users.length,
        total_hours: users.reduce((sum, user) => sum + user.total_hours, 0),
        total_billable_hours: users.reduce((sum, user) => sum + user.billable_hours, 0),
        total_non_billable_hours: users.reduce((sum, user) => sum + user.non_billable_hours, 0),
        total_amount: users.reduce((sum, user) => sum + user.total_amount, 0)
      };

      res.json({
        success: true,
        data: {
          users,
          summary,
          period: { startDate, endDate, view }
        }
      });
    } catch (error: any) {
      console.error('Error in getUserBillingView:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user billing view'
      });
    }
  }

  /**
   * Filter and collect time entries from timesheets within date range
   */
  static async getTaskBillingView(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        startDate,
        endDate,
        projectIds: projectIdsRaw,
        taskIds: taskIdsRaw
      } = req.query as {
        startDate?: string;
        endDate?: string;
        projectIds?: string;
        taskIds?: string;
      };

      // Parse IDs
      const projectIds = IdUtils.parseIds(projectIdsRaw).filter(id => IdUtils.isValidObjectId(id));
      const taskIds = IdUtils.parseIds(taskIdsRaw).filter(id => IdUtils.isValidObjectId(id));

      // Use default date range if not provided (last 3 months)
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Get time entries from timesheets for the period
      const timesheets = await (Timesheet as any).find({
        user_id: { $ne: null },
        status: { $in: BILLING_ELIGIBLE_STATUSES }
      }).populate('user_id', 'full_name email hourly_rate').exec();

      // Filter and collect time entries
      const timeEntries = ProjectBillingService.collectTimeEntriesFromTimesheets(
        timesheets,
        start,
        end,
        projectIds
      );

      // Get project details for reference
      const projectMap = await ProjectBillingService.buildProjectDetailsMap();

      // Group by task
      const taskMap = ProjectBillingService.groupEntriesByTask(timeEntries, projectMap);
      const taskData = Array.from(taskMap.values());

      // Process each task's billing data
      const billingData: TaskBillingData[] = [];

      for (const task of taskData) {
        const taskBilling: TaskBillingData = {
          task_id: task.task_id,
          task_name: task.task_name,
          project_id: task.project_id,
          project_name: task.project_name,
          total_hours: task.total_hours,
          billable_hours: task.billable_hours,
          resources: ProjectBillingService.processTaskResources(task)
        };

        billingData.push(taskBilling);
      }

      res.json({
        success: true,
        data: {
          tasks: billingData,
          summary: {
            total_tasks: billingData.length,
            total_hours: billingData.reduce((sum, t) => sum + t.total_hours, 0),
            total_billable_hours: billingData.reduce((sum, t) => sum + t.billable_hours, 0),
            total_amount: billingData.reduce((sum, t) => 
              sum + t.resources.reduce((rSum, r) => rSum + r.amount, 0), 0
            )
          },
          period: { startDate, endDate }
        }
      });

    } catch (error: any) {
      console.error('Error in getTaskBillingView:', error);
      console.error('Stack trace:', error.stack);
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve task billing data',
        message: error.message
      });
    }
  }

  /**
   * Update billable hours for a specific resource/project/period
   */
  static async updateBillableHours(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        user_id,
        project_id,
        start_date,
        end_date,
        billable_hours,
        total_hours,
        reason
      } = req.body;

      const result = await ProjectBillingService.applyBillingAdjustment({
        userId: user_id,
        projectId: project_id,
        startDate: start_date,
        endDate: end_date,
        billableHours: billable_hours,
        totalHours: total_hours,
        reason,
        adjustedBy: ProjectBillingService.resolveAdjustedBy(req)
      });

      res.json({
        success: true,
        message: 'Billing adjustment saved successfully',
        data: {
          adjustment_id: result.adjustment?._id,
          original_billable_hours: result.adjustment?.original_billable_hours,
          adjusted_billable_hours: result.adjustment?.adjusted_billable_hours,
          difference: (result.adjustment?.adjusted_billable_hours || 0) - (result.adjustment?.original_billable_hours || 0)
        }
      });

    } catch (error: any) {
      if (error?.status === 404) {
        res.status(404).json({
          success: false,
          error: error.message || 'Requested resource not found'
        });
        return;
      }
      console.error('Error in updateBillableHours:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update billable hours'
      });
    }
  }

  static async updateProjectBillableTotal(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { projectId } = req.params;
      const { start_date, end_date, billable_hours } = req.body as {
        start_date: string;
        end_date: string;
        billable_hours: number;
      };

      const projects = await ProjectBillingService.buildProjectBillingData({
        startDate: start_date,
        endDate: end_date,
        projectIds: [projectId],
        clientIds: [],
        view: 'custom'
      });

      const project = projects.find((item) => item.project_id === projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project billing data not found for the specified filters'
        });
        return;
      }

      const targets = ProjectBillingService.calculateProjectBillableTargets(
        project.resources,
        billable_hours
      );

      if (targets.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No eligible project members found for adjustment'
        });
        return;
      }

      const results = [];
      for (const target of targets) {
        const result = await ProjectBillingService.applyBillingAdjustment({
          userId: target.userId,
          projectId,
          startDate: start_date,
          endDate: end_date,
          billableHours: target.targetHours,
          totalHours: target.totalHours,
          reason: 'Project-level billable hours adjustment',
          adjustedBy: ProjectBillingService.resolveAdjustedBy(req)
        });
        results.push(result);
      }

      res.json({
        success: true,
        message: 'Project billable hours updated successfully',
        data: {
          project_id: projectId,
          target_billable_hours: billable_hours,
          members_updated: results.length
        }
      });
    } catch (error: any) {
      if (error?.status === 404) {
        res.status(404).json({
          success: false,
          error: error.message || 'Requested resource not found'
        });
        return;
      }

      console.error('Error in updateProjectBillableTotal:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update project billable hours'
      });
    }
  }

  static async createBillingAdjustment(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        user_id,
        project_id,
        start_date,
        end_date,
        adjusted_billable_hours,
        original_billable_hours,
        reason
      } = req.body;

      const start = new Date(start_date);
      const end = new Date(end_date);
      const userObjectId = mongoose.Types.ObjectId.createFromHexString(user_id);
      const projectObjectId = mongoose.Types.ObjectId.createFromHexString(project_id);

      // ✅ SAFEGUARD: Fetch base billable hours ONLY from approved TimesheetProjectApproval
      // This enforces management_status='approved' requirement
      const approvedApprovals = await (TimesheetProjectApproval as any).aggregate([
        {
          $lookup: {
            from: 'timesheets',
            localField: 'timesheet_id',
            foreignField: '_id',
            as: 'timesheet'
          }
        },
        { $unwind: '$timesheet' },
        {
          $match: {
            project_id: projectObjectId,
            'timesheet.user_id': userObjectId,
            management_status: 'approved',
            'timesheet.week_start_date': { $gte: start, $lte: end },
            'timesheet.status': { $in: ['frozen', 'billed'] },
            'timesheet.deleted_at': null
          }
        },
        {
          $group: {
            _id: null,
            worked_hours: { $sum: '$worked_hours' },
            base_billable_hours: { $sum: '$billable_hours' }
          }
        }
      ]);

      if (!approvedApprovals || approvedApprovals.length === 0) {
        res.status(404).json({
          success: false,
          error: '⚠️ SAFEGUARD VIOLATION: No management-approved billing data found. ' +
                 'Cannot create adjustment without approved TimesheetProjectApproval base. ' +
                 'Ensure project-week groups have management_status="approved" before adjusting.'
        });
        return;
      }

      const approvalData = approvedApprovals[0];
      const workedHours = approvalData.worked_hours || 0;
      const baseBillableHours = approvalData.base_billable_hours || 0;

      // ✅ CORRECT: Calculate adjustment as DELTA from base billable hours
      // Never use worked_hours as the base - always use billable_hours (which includes manager adjustments)
      const adjustmentHours = adjusted_billable_hours - baseBillableHours;

      // Get adjusted_by user
      let adjustedBy: mongoose.Types.ObjectId;
      
      try {
        if ((req.user as any)?._id) {
          const userId = (req.user as any)._id;
          adjustedBy = typeof userId === 'string' 
            ? mongoose.Types.ObjectId.createFromHexString(userId)
            : userId;
        } else {
          let systemUser = await (User as any).findOne({ 
            $or: [
              { email: 'system@billing.seed' },
              { email: 'system@billing.adjustment' }
            ]
          });
          
          if (systemUser) {
            adjustedBy = systemUser._id;
          } else {
            const systemUserData = {
              email: 'system@billing.adjustment',
              full_name: 'System Billing User',
              role: 'employee',
              is_active: true,
              hourly_rate: 0,
              is_approved_by_super_admin: true,
              is_temporary_password: false,
              failed_login_attempts: 0,
              force_password_change: false,
              is_hard_deleted: false
            };
            
            const tempSystemUser = new (User as any)(systemUserData);
            await tempSystemUser.save();
            adjustedBy = tempSystemUser._id;
          }
        }
      } catch (userError) {
        console.error('Error getting adjusted_by user:', userError);
        adjustedBy = new mongoose.Types.ObjectId();
      }

      // Find timesheets for reference
      const timesheets = await (Timesheet as any).find({
        user_id: userObjectId,
        week_start_date: { $lte: end },
        week_end_date: { $gte: start }
      });
      const timesheetIdToUse = timesheets.length > 0 ? timesheets[0]._id : undefined;

      // Check if adjustment already exists
      const existingAdjustment = await (BillingAdjustment as any).findOne({
        user_id: userObjectId,
        project_id: projectObjectId,
        billing_period_start: start,
        billing_period_end: end,
        deleted_at: null  // ✅ CRITICAL: Include soft-delete filter
      });

      if (existingAdjustment) {
        // Update existing adjustment
        existingAdjustment.total_worked_hours = workedHours;
        existingAdjustment.adjustment_hours = adjustmentHours;
        existingAdjustment.total_billable_hours = adjusted_billable_hours;
        existingAdjustment.original_billable_hours = baseBillableHours;
        existingAdjustment.adjusted_billable_hours = adjusted_billable_hours;
        existingAdjustment.reason = reason;
        if (timesheetIdToUse) {
          existingAdjustment.timesheet_id = timesheetIdToUse;
        }
        existingAdjustment.adjusted_by = adjustedBy;
        existingAdjustment.adjusted_at = new Date();
        existingAdjustment.updated_at = new Date();

        await existingAdjustment.save();

        res.json({
          success: true,
          message: 'Billing adjustment updated successfully',
          data: {
            adjustment_id: existingAdjustment._id,
            original_billable_hours: baseBillableHours,
            adjusted_billable_hours,
            difference: adjustmentHours
          }
        });
      } else {
        // Create new adjustment
        const newAdjustmentData: any = {
          user_id: userObjectId,
          project_id: projectObjectId,
          adjustment_scope: 'project',
          billing_period_start: start,
          billing_period_end: end,
          total_worked_hours: workedHours,
          adjustment_hours: adjustmentHours,
          total_billable_hours: adjusted_billable_hours,
          original_billable_hours: baseBillableHours,
          adjusted_billable_hours,
          reason,
          adjusted_by: adjustedBy,
          adjusted_at: new Date()
        };

        if (timesheetIdToUse) {
          newAdjustmentData.timesheet_id = timesheetIdToUse;
        }

        const newAdjustment = new (BillingAdjustment as any)(newAdjustmentData);
        await newAdjustment.save();

        res.json({
          success: true,
          message: 'Billing adjustment created successfully',
          data: {
            adjustment_id: newAdjustment._id,
            original_billable_hours: baseBillableHours,
            adjusted_billable_hours,
            difference: adjustmentHours
          }
        });
      }

    } catch (error: any) {
      console.error('Error in createBillingAdjustment:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create billing adjustment'
      });
    }
  }

  /**
   * GET /api/v1/project-billing/breakdown
   * Get user breakdown (weekly or monthly) for a project
   *
   * Query params:
   * - type: 'weekly' or 'monthly'
   * - projectId: Project ID
   * - userId: User ID
   * - startDate: ISO date string
   * - endDate: ISO date string
   *
   * Used in Monthly view (type=weekly) and Project Timeline view (type=monthly)
   */
  static async getUserBreakdown(req: Request, res: Response): Promise<void> {
    try {
      const { type, projectId, userId, startDate, endDate } = req.query;

      if (!mongoose.Types.ObjectId.isValid(projectId as string) || !mongoose.Types.ObjectId.isValid(userId as string)) {
        res.status(400).json({
          success: false,
          error: 'Invalid project ID or user ID'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const projectObjectId = new mongoose.Types.ObjectId(projectId as string);
      const userObjectId = new mongoose.Types.ObjectId(userId as string);

      // Fetch approved project approvals
      // Note: TimesheetProjectApproval doesn't have week_start_date or user_id
      // These fields are in the Timesheet model, so we lookup first, then filter
      const approvals = await (TimesheetProjectApproval as any).aggregate([
      {
        $match: {
          project_id: projectObjectId,
          management_status: 'approved',
          deleted_at: null
        }
      },
      {
        $lookup: {
          from: 'timesheets',
          localField: 'timesheet_id',
          foreignField: '_id',
          as: 'timesheet'
        }
      },
      { $unwind: '$timesheet' },
      {
        $match: {
          'timesheet.user_id': userObjectId,
          'timesheet.week_start_date': { $gte: start, $lte: end },
          'timesheet.deleted_at': null
        }
      },
      {
        $sort: { 'timesheet.week_start_date': 1 }
      }
    ]);

      // Get user and project details
      const user = await (User as any).findById(userObjectId).select('full_name email role hourly_rate').lean();
      const project = await (Project as any).findById(projectObjectId).select('name').lean();

      if (!user || !project) {
        res.status(404).json({
          success: false,
          error: 'User or project not found'
        });
        return;
      }

      // Get billing adjustments for this user-project
      const billingAdjustments = await (BillingAdjustment as any).find({
        project_id: projectObjectId,
        user_id: userObjectId,
        billing_period_start: { $lte: end },
        billing_period_end: { $gte: start },
        adjustment_scope: 'project',
        deleted_at: null
      }).lean();

      const hourlyRate = user.hourly_rate || 0;

      if (type === 'weekly') {
        // Build weekly breakdown
        const adjustmentMap = new Map<string, any>(
          billingAdjustments.map((adj: any) => [adj.billing_period_start.toISOString(), adj])
        );

        const weeklyBreakdown: WeeklyBreakdown[] = approvals.map((approval: any) => {
          const weekStart = approval.timesheet.week_start_date.toISOString().split('T')[0];
          const workedHours = approval.worked_hours || 0;
          const baseBillableHours = approval.billable_hours || 0; // This is worked_hours + billable_adjustment

          // Check for billing adjustment for this week
          const adjustment = adjustmentMap.get(approval.timesheet.week_start_date.toISOString());
          const managementAdjustment = adjustment?.adjustment_hours || 0;
          const finalBillableHours = baseBillableHours + managementAdjustment;
          const amount = finalBillableHours * hourlyRate;

          return {
            week_start: weekStart,
            total_hours: workedHours,
            billable_hours: finalBillableHours,
            amount
          };
        });

        // Calculate totals
        const totalWorkedHours = weeklyBreakdown.reduce((sum, week) => sum + week.total_hours, 0);
        const totalBillableHours = weeklyBreakdown.reduce((sum, week) => sum + week.billable_hours, 0);
        const totalAmount = weeklyBreakdown.reduce((sum, week) => sum + week.amount, 0);

        res.json({
          success: true,
          data: {
            user_id: userId,
            user_name: user.full_name || 'Unknown User',
            project_id: projectId,
            project_name: project.name,
            breakdown_type: 'weekly',
            breakdown: weeklyBreakdown,
            total_worked_hours: totalWorkedHours,
            total_billable_hours: totalBillableHours,
            total_amount: totalAmount
          }
        });
      } else {
        // Build monthly breakdown
        // Group approvals by month
        const monthlyMap = new Map<string, { worked_hours: number; base_billable_hours: number }>();

        for (const approval of approvals) {
          const weekStartDate = new Date(approval.timesheet.week_start_date);
          const monthKey = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, '0')}-01`;

          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { worked_hours: 0, base_billable_hours: 0 });
          }

          const monthData = monthlyMap.get(monthKey)!;
          monthData.worked_hours += approval.worked_hours || 0;
          monthData.base_billable_hours += approval.billable_hours || 0; // billable_hours from TimesheetProjectApproval
        }

        // Group adjustments by month
        const adjustmentByMonth = new Map<string, number>();
        for (const adj of billingAdjustments) {
          const adjStartDate = new Date(adj.billing_period_start);
          const monthKey = `${adjStartDate.getFullYear()}-${String(adjStartDate.getMonth() + 1).padStart(2, '0')}-01`;

          adjustmentByMonth.set(
            monthKey,
            (adjustmentByMonth.get(monthKey) || 0) + (adj.adjustment_hours || 0)
          );
        }

        // Build monthly breakdown
        const monthlyBreakdown: MonthlyBreakdown[] = Array.from(monthlyMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([monthKey, data]) => {
            const managementAdjustment = adjustmentByMonth.get(monthKey) || 0;
            const finalBillableHours = data.base_billable_hours + managementAdjustment;
            const amount = finalBillableHours * hourlyRate;

            return {
              month_start: monthKey,
              total_hours: data.worked_hours,
              billable_hours: finalBillableHours,
              amount
            };
          });

        // Calculate totals
        const totalWorkedHours = monthlyBreakdown.reduce((sum, month) => sum + month.total_hours, 0);
        const totalBillableHours = monthlyBreakdown.reduce((sum, month) => sum + month.billable_hours, 0);
        const totalAmount = monthlyBreakdown.reduce((sum, month) => sum + month.amount, 0);

        res.json({
          success: true,
          data: {
            user_id: userId,
            user_name: user.full_name || 'Unknown User',
            project_id: projectId,
            project_name: project.name,
            breakdown_type: 'monthly',
            breakdown: monthlyBreakdown,
            total_worked_hours: totalWorkedHours,
            total_billable_hours: totalBillableHours,
            total_amount: totalAmount
          }
        });
      }
    } catch (error: any) {
      console.error('Error in getUserBreakdown:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get breakdown'
      });
    }
  }
}
