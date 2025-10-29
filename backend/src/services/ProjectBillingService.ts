/**
 * Project Billing Service
 * Business logic for project billing aggregation and calculations
 */

import mongoose from 'mongoose';
import { Project } from '@/models/Project';
import { Timesheet } from '@/models/Timesheet';
import { User } from '@/models/User';
import { BillingAdjustment } from '@/models/BillingAdjustment';
import { TimesheetProjectApproval } from '@/models/TimesheetProjectApproval';
import { TimeEntry } from '@/models/TimeEntry';
import type {
  ProjectBillingData,
  ResourceBillingData,
  WeeklyBreakdown,
  MonthlyBreakdown,
  ResourceTaskData,
  TaskResourceData,
  BuildProjectBillingOptions,
  ApplyAdjustmentParams,
  ProjectAdjustmentTarget,
  BILLING_ELIGIBLE_STATUSES
} from '@/types/projectBilling';

export class ProjectBillingService {
  /**
   * ✅ SAFEGUARD: Validate billing adjustment data integrity
   *
   * This helper validates that adjustment calculations follow correct data flow:
   * - Base comes from TimesheetProjectApproval.billable_hours
   * - Base = worked_hours + manager_adjustment (with small rounding tolerance)
   * - Management adjustment is delta from base
   *
   * Use this during development/debugging to catch incorrect calculations early.
   *
   * @returns {valid: boolean, errors: string[]}
   */
  static validateAdjustmentIntegrity(
    worked_hours: number,
    manager_adjustment: number,
    base_billable_hours: number,
    management_adjustment: number,
    final_billable_hours: number
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const tolerance = 0.01; // Allow 0.01h rounding difference

    // Check 1: Base should equal worked + manager adjustment
    const expectedBase = worked_hours + manager_adjustment;
    if (Math.abs(base_billable_hours - expectedBase) > tolerance) {
      errors.push(
        `Base billable hours (${base_billable_hours}) doesn't match ` +
        `worked (${worked_hours}) + manager adjustment (${manager_adjustment}). ` +
        `Expected: ${expectedBase}`
      );
    }

    // Check 2: Final should equal base + management adjustment
    const expectedFinal = base_billable_hours + management_adjustment;
    if (Math.abs(final_billable_hours - expectedFinal) > tolerance) {
      errors.push(
        `Final billable hours (${final_billable_hours}) doesn't match ` +
        `base (${base_billable_hours}) + management adjustment (${management_adjustment}). ` +
        `Expected: ${expectedFinal}`
      );
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Build project filter for MongoDB queries
   */
  static buildProjectFilter(projectIds: string[], clientIds: string[]): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (projectIds.length > 0) {
      const ids = projectIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      if (ids.length > 0) {
        filter._id = { $in: ids };
      }
    }

    if (clientIds.length > 0) {
      const ids = clientIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      if (ids.length > 0) {
        filter.client_id = { $in: ids };
      }
    }

    return filter;
  }

  /**
   * Fetch approved project approvals from TimesheetProjectApproval
   */
  static async fetchApprovedProjectApprovals(
    projectObjectIds: mongoose.Types.ObjectId[],
    start: Date,
    end: Date
  ) {
    return await (TimesheetProjectApproval as any).aggregate([
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
          project_id: { $in: projectObjectIds },
          management_status: 'approved', // CRITICAL: Only management-approved records
          'timesheet.week_start_date': { $gte: start, $lte: end },
          'timesheet.status': { $in: ['frozen', 'billed'] },
          'timesheet.deleted_at': null
        }
      },
      {
        $group: {
          _id: {
            project_id: '$project_id',
            user_id: '$timesheet.user_id'
          },
          worked_hours: { $sum: '$worked_hours' },
          base_billable_hours: { $sum: '$billable_hours' },
          manager_adjustment: { $sum: '$billable_adjustment' },
          verified_at: { $max: '$management_approved_at' },
          entries_count: { $sum: '$entries_count' }
        }
      }
    ]);
  }

  /**
   * Create empty project billing structure
   */
  static createEmptyProjectBilling(projects: any[]): ProjectBillingData[] {
    return projects.map((project: any) => ({
      project_id: project._id.toString(),
      project_name: project.name,
      client_name: project.client_id?.name,
      total_hours: 0,
      billable_hours: 0,
      non_billable_hours: 0,
      total_amount: 0,
      resources: []
    }));
  }

  /**
   * Fetch task-level data for user billing
   */
  static async fetchTaskDataForUser(
    projectObjectIds: mongoose.Types.ObjectId[],
    userObjectId: mongoose.Types.ObjectId,
    start: Date,
    end: Date,
    approvedTimesheetIds: mongoose.Types.ObjectId[]
  ) {
    // Fetch task-level data for a specific user by joining with timesheets to filter by user_id
    const pipeline = [
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
          timesheet_id: { $in: approvedTimesheetIds },
          project_id: { $in: projectObjectIds },
          deleted_at: null,
          // Include entries with category 'project', 'training', or undefined/null (legacy entries)
          $or: [
            { entry_category: { $in: ['project', 'training'] } },
            { entry_category: { $exists: false } },
            { entry_category: null }
          ]
        }
      },
      {
        $lookup: {
          from: 'tasks',
          localField: 'task_id',
          foreignField: '_id',
          as: 'task'
        }
      },
      {
        $addFields: {
          task_name: {
            $cond: {
              if: { $eq: ['$task_type', 'custom_task'] },
              then: '$custom_task_description',
              else: { $arrayElemAt: ['$task.name', 0] }
            }
          }
        }
      },
      {
        $group: {
          _id: {
            project_id: '$project_id',
            task_id: '$task_id',
            task_name: '$task_name'
          },
          total_hours: { $sum: '$hours' },
          billable_hours: { $sum: { $cond: ['$is_billable', '$hours', 0] } },
          non_billable_hours: { $sum: { $cond: ['$is_billable', 0, '$hours'] } }
        }
      }
    ];

    return await (TimeEntry as any).aggregate(pipeline);
  }

  /**
   * Process user billing data for a project with task breakdown
   */
  static async processUserBillingData(
    approval: any,
    userMap: Map<string, any>,
    adjustmentMap: Map<string, any>,
    project: any,
    projectId: string,
    view?: string,
    taskDataMap?: Map<string, any[]>
  ): Promise<ResourceBillingData | null> {
    const userId = approval._id.user_id.toString();
    const user = userMap.get(userId);

    if (!user) return null;

    const workedHours = approval.worked_hours || 0;
    const baseBillableHours = approval.base_billable_hours || 0;
    const managerAdjustment = approval.manager_adjustment || 0;
    const verifiedAt = approval.verified_at;

    const adjustmentKey = `${projectId}_${userId}`;
    const billingAdj = adjustmentMap.get(adjustmentKey) as any;
    const managementAdjustment = (billingAdj?.adjustment_hours as number) ?? 0;
    const lastAdjustedAt = billingAdj?.adjusted_at as Date | undefined;

    const finalBillableHours = baseBillableHours + managementAdjustment;
    const nonBillableHours = Math.max(workedHours - finalBillableHours, 0);

    const validation = ProjectBillingService.validateAdjustmentIntegrity(
      workedHours,
      managerAdjustment,
      baseBillableHours,
      managementAdjustment,
      finalBillableHours
    );

    if (!validation.valid) {
      console.error(
        `⚠️ DATA INTEGRITY ERROR for ${user.full_name} in ${project.name}:`,
        validation.errors
      );
    }

    const hourlyRate = user.hourly_rate || 0;
    const totalAmount = finalBillableHours * hourlyRate;

    // Get task breakdown for this user-project combination
    const userTaskKey = `${userId}_${projectId}`;
    const taskData = taskDataMap?.get(userTaskKey) || [];

    // Process task data with proper billing calculation
    const tasks = taskData.map((task: any) => ({
      task_id: task._id.task_id?.toString() || 'custom',
      task_name: task._id.task_name || 'Custom Task',
      project_id: projectId,
      project_name: project.name,
      total_hours: task.total_hours || 0,
      billable_hours: task.billable_hours || 0,
      non_billable_hours: task.non_billable_hours || 0,
      amount: (task.billable_hours || 0) * hourlyRate
    }));

    return {
      user_id: userId,
      user_name: (user.full_name as string) || 'Unknown User',
      role: (user.role as string) || 'employee',
      worked_hours: workedHours,
      manager_adjustment: managerAdjustment,
      base_billable_hours: baseBillableHours,
      management_adjustment: managementAdjustment,
      final_billable_hours: finalBillableHours,
      non_billable_hours: nonBillableHours,
      total_hours: workedHours,
      billable_hours: finalBillableHours,
      hourly_rate: hourlyRate,
      total_amount: totalAmount,
      verified_at: verifiedAt?.toISOString(),
      last_adjusted_at: lastAdjustedAt?.toISOString(),
      tasks,
      weekly_breakdown: view === 'weekly' ? [] : undefined
    };
  }

  /**
   * Calculate verification info for a project
   */
  static calculateProjectVerificationInfo(approvals: any[]) {
    if (approvals.length === 0) return undefined;

    const totalWorked = approvals.reduce((sum: number, a: any) => sum + (a.worked_hours || 0), 0);
    const totalBillable = approvals.reduce((sum: number, a: any) => sum + (a.base_billable_hours || 0), 0);
    const totalAdjustment = approvals.reduce((sum: number, a: any) => sum + (a.manager_adjustment || 0), 0);
    const latestVerifiedAt = approvals.reduce((latest: Date | undefined, a: any) => {
      if (!a.verified_at) return latest;
      if (!latest || a.verified_at > latest) return a.verified_at;
      return latest;
    }, undefined);

    return {
      is_verified: true,
      worked_hours: totalWorked,
      billable_hours: totalBillable,
      manager_adjustment: totalAdjustment,
      user_count: approvals.length,
      verified_at: latestVerifiedAt
    };
  }

  /**
   * NEW IMPLEMENTATION: Aggregate billing data from TimesheetProjectApproval
   *
   * Data Flow:
   * 1. Fetch approved project approvals (management_status='approved')
   * 2. Get billing adjustments (Management's final changes)
   * 3. Calculate: final_billable = base_billable + management_adjustment
   *
   * Benefits:
   * - Only includes Management-verified data
   * - Clear adjustment hierarchy: Manager → Management
   * - No unverified project groups
   */
  static async buildProjectBillingData(options: BuildProjectBillingOptions): Promise<ProjectBillingData[]> {
    const { startDate, endDate, projectIds = [], clientIds = [], view } = options;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Step 1: Build project filter
    const projectFilter = ProjectBillingService.buildProjectFilter(projectIds, clientIds);

    // Step 2: Get all projects (for metadata)
    const projects = await (Project as any).find(projectFilter)
      .populate('client_id', 'name')
      .lean();

    if (projects.length === 0) {
      return [];
    }

    const projectObjectIds = projects.map((p: any) => p._id);

    // Step 3: Fetch approved project approvals (SOURCE OF TRUTH)
    const approvedApprovals = await ProjectBillingService.fetchApprovedProjectApprovals(
      projectObjectIds,
      start,
      end
    );

    if (approvedApprovals.length === 0) {
      return ProjectBillingService.createEmptyProjectBilling(projects);
    }

    // Step 4: Get all unique user IDs and timesheet IDs from approved approvals
    const userIds = [...new Set(approvedApprovals.map((a: any) => a._id.user_id.toString()))];
    const userObjectIds = userIds
      .filter((id): id is string => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Extract timesheet IDs with their project associations
    // We need project-specific timesheet IDs for accurate task breakdown
    const approvalDocs = await (TimesheetProjectApproval as any).find({
      project_id: { $in: projectObjectIds },
      management_status: 'approved'
    }).select('timesheet_id project_id').lean();

    // Build a map of project_id -> Set of approved timesheet IDs for that project
    const projectTimesheetMap = new Map<string, Set<string>>();
    for (const approval of approvalDocs) {
      const projId = approval.project_id.toString();
      if (!projectTimesheetMap.has(projId)) {
        projectTimesheetMap.set(projId, new Set());
      }
      projectTimesheetMap.get(projId)!.add(approval.timesheet_id.toString());
    }

    // Get all unique timesheet IDs across all projects (for the aggregation)
    const allTimesheetIds = new Set<string>();
    for (const timesheets of projectTimesheetMap.values()) {
      for (const tsId of timesheets) {
        allTimesheetIds.add(tsId);
      }
    }

    const approvedTimesheetIds = Array.from(allTimesheetIds)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Step 5: Fetch user details including hourly_rate for cost calculation
    const users = await (User as any).find({ _id: { $in: userObjectIds } })
      .select('_id full_name email role hourly_rate')
      .lean();
    const userMap = new Map<string, any>(users.map((u: any) => [u._id.toString(), u]));

    // Step 6: Fetch billing adjustments (Management's final changes)
    const billingAdjustments = await (BillingAdjustment as any).find({
      project_id: { $in: projectObjectIds },
      user_id: { $in: userObjectIds },
      billing_period_start: { $lte: end },
      billing_period_end: { $gte: start },
      adjustment_scope: 'project',
      deleted_at: null
    }).lean();

    const adjustmentMap = new Map<string, any>(
      billingAdjustments.map((adj: any) => [
        `${adj.project_id.toString()}_${adj.user_id.toString()}`,
        adj
      ])
    );

    // Step 7: Fetch task data for all users and projects
    const taskDataMap = new Map<string, any[]>();
    if (userObjectIds.length > 0 && approvedTimesheetIds.length > 0) {
      const allTaskData = await Promise.all(
        userObjectIds.map(async (userObjectId) => {
          const taskData = await ProjectBillingService.fetchTaskDataForUser(
            projectObjectIds,
            userObjectId,
            start,
            end,
            approvedTimesheetIds
          );
          return { userId: userObjectId.toString(), taskData };
        })
      );

      // Organize task data by user-project key
      for (const { userId, taskData } of allTaskData) {
        for (const task of taskData) {
          const projectId = task._id.project_id.toString();
          const userTaskKey = `${userId}_${projectId}`;

          if (!taskDataMap.has(userTaskKey)) {
            taskDataMap.set(userTaskKey, []);
          }
          taskDataMap.get(userTaskKey)!.push(task);
        }
      }
    }

    // Step 8: Organize approvals by project
    const projectApprovalMap = new Map<string, any[]>();
    for (const approval of approvedApprovals) {
      const projectId = approval._id.project_id.toString();
      if (!projectApprovalMap.has(projectId)) {
        projectApprovalMap.set(projectId, []);
      }
      projectApprovalMap.get(projectId)!.push(approval);
    }

    // Step 9: Build billing data for each project
    const billingData: ProjectBillingData[] = [];

    for (const project of projects) {
      const projectId = project._id.toString();
      const approvals = projectApprovalMap.get(projectId) || [];

      const projectBilling: ProjectBillingData = {
        project_id: projectId,
        project_name: project.name,
        client_name: project.client_id?.name,
        total_hours: 0,
        billable_hours: 0,
        non_billable_hours: 0,
        total_amount: 0,
        resources: []
      };

      // Step 10: Process each user's billing data
      for (const approval of approvals) {
        const resourceBilling = await ProjectBillingService.processUserBillingData(
          approval,
          userMap,
          adjustmentMap,
          project,
          projectId,
          view,
          taskDataMap
        );

        if (resourceBilling) {
          projectBilling.resources.push(resourceBilling);
          projectBilling.total_hours += resourceBilling.worked_hours;
          projectBilling.billable_hours += resourceBilling.final_billable_hours;
          projectBilling.total_amount += resourceBilling.total_amount;
        }
      }

      projectBilling.non_billable_hours = Math.max(
        projectBilling.total_hours - projectBilling.billable_hours,
        0
      );

      // Add project-level verification info
      projectBilling.verification_info = ProjectBillingService.calculateProjectVerificationInfo(approvals);

      billingData.push(projectBilling);
    }

    return billingData;
  }

  /**
   * Filter and collect time entries from timesheets within date range
   */
  static collectTimeEntriesFromTimesheets(
    timesheets: any[],
    start: Date,
    end: Date,
    projectIds?: string[]
  ): any[] {
    const entries: any[] = [];

    for (const timesheet of timesheets) {
      if (!timesheet.time_entries || !Array.isArray(timesheet.time_entries)) continue;

      for (const entry of timesheet.time_entries) {
        const entryDate = new Date(entry.date);
        if (entryDate < start || entryDate > end) continue;

        if (projectIds && projectIds.length > 0) {
          const entryProjectId = entry.project_id?.toString();
          if (!entryProjectId || !projectIds.includes(entryProjectId)) continue;
        }

        entries.push({
          ...entry,
          user_id: timesheet.user_id,
          timesheet_id: timesheet._id
        });
      }
    }

    return entries;
  }

  /**
   * Build project details map for lookups
   */
  static async buildProjectDetailsMap(): Promise<Map<string, { name: string; client_name: string }>> {
    const projects = await (Project as any).find().populate('client_id', 'name').lean();
    const projectMap = new Map<string, { name: string; client_name: string }>();

    for (const project of projects) {
      projectMap.set(project._id.toString(), {
        name: project.name,
        client_name: project.client_id?.name || 'Unknown Client'
      });
    }

    return projectMap;
  }

  /**
   * Group time entries by task
   */
  static groupEntriesByTask(entries: any[], projectMap: Map<string, { name: string; client_name: string }>): any[] {
    const taskMap = new Map<string, any>();

    for (const entry of entries) {
      const taskId = entry.task_id?.toString() || 'no-task';
      const projectId = entry.project_id?.toString() || 'unknown';
      const projectDetails = projectMap.get(projectId);

      if (!taskMap.has(taskId)) {
        taskMap.set(taskId, {
          task_id: taskId,
          task_name: entry.task_name || 'No Task',
          project_id: projectId,
          project_name: projectDetails?.name || 'Unknown Project',
          total_hours: 0,
          billable_hours: 0,
          resources: new Map<string, any>()
        });
      }

      const task = taskMap.get(taskId)!;
      const userId = entry.user_id?.toString() || 'unknown';

      task.total_hours += entry.hours || 0;
      task.billable_hours += entry.is_billable ? (entry.hours || 0) : 0;

      if (!task.resources.has(userId)) {
        task.resources.set(userId, {
          user_id: userId,
          user_name: entry.user_name || 'Unknown User',
          hours: 0,
          billable_hours: 0,
          rate: entry.hourly_rate || 0,
          amount: 0
        });
      }

      const resource = task.resources.get(userId)!;
      resource.hours += entry.hours || 0;
      resource.billable_hours += entry.is_billable ? (entry.hours || 0) : 0;
      resource.amount = resource.billable_hours * resource.rate;
    }

    return Array.from(taskMap.values()).map(task => ({
      ...task,
      resources: Array.from(task.resources.values())
    }));
  }

  /**
   * Process task resources
   */
  static processTaskResources(task: any): TaskResourceData[] {
    const resourceMap = new Map<string, TaskResourceData>();

    for (const entry of task.entries || []) {
      const userId = entry.user_id?.toString();
      if (!userId) continue;

      if (!resourceMap.has(userId)) {
        resourceMap.set(userId, {
          user_id: userId,
          user_name: entry.user_name || 'Unknown',
          hours: 0,
          billable_hours: 0,
          rate: entry.hourly_rate || 0,
          amount: 0
        });
      }

      const resource = resourceMap.get(userId)!;
      resource.hours += entry.hours || 0;
      resource.billable_hours += entry.is_billable ? (entry.hours || 0) : 0;
      resource.amount = resource.billable_hours * resource.rate;
    }

    return Array.from(resourceMap.values());
  }

  /**
   * Resolve adjusted_by user ID from request
   */
  static resolveAdjustedBy(req: any): mongoose.Types.ObjectId {
    return req.user?.id
      ? new mongoose.Types.ObjectId(req.user.id)
      : new mongoose.Types.ObjectId('000000000000000000000000');
  }

  /**
   * Apply billing adjustment
   */
  static async applyBillingAdjustment(params: ApplyAdjustmentParams): Promise<{
    success: boolean;
    adjustment?: any;
    error?: string;
  }> {
    try {
      const { userId, projectId, startDate, endDate, billableHours, totalHours, reason, adjustedBy } = params;

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const projectObjectId = new mongoose.Types.ObjectId(projectId);
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Fetch approved base billable hours from TimesheetProjectApproval
      const approvals = await (TimesheetProjectApproval as any).aggregate([
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
            'timesheet.week_start_date': { $gte: start, $lte: end },
            management_status: 'approved',
            deleted_at: null
          }
        },
        {
          $group: {
            _id: null,
            worked_hours: { $sum: '$worked_hours' },
            base_billable_hours: { $sum: '$billable_hours' },
            manager_adjustment: { $sum: '$billable_adjustment' }
          }
        }
      ]);

      if (approvals.length === 0) {
        return {
          success: false,
          error: 'No approved timesheet data found for this user-project-period combination'
        };
      }

      const approval = approvals[0];
      const workedHours = approval.worked_hours || 0;
      const baseBillableHours = approval.base_billable_hours || 0;
      const managerAdjustment = approval.manager_adjustment || 0;

      // Calculate adjustment as delta from base
      const adjustmentHours = billableHours - baseBillableHours;

      // Find existing adjustment or create new one
      const existingAdjustment = await (BillingAdjustment as any).findOne({
        user_id: userObjectId,
        project_id: projectObjectId,
        billing_period_start: start,
        billing_period_end: end,
        adjustment_scope: 'project',
        deleted_at: null
      });

      let adjustment;
      if (existingAdjustment) {
        existingAdjustment.adjustment_hours = adjustmentHours;
        existingAdjustment.original_billable_hours = baseBillableHours;
        existingAdjustment.adjusted_billable_hours = billableHours;
        existingAdjustment.reason = reason || existingAdjustment.reason;
        existingAdjustment.adjusted_by = adjustedBy || existingAdjustment.adjusted_by;
        existingAdjustment.adjusted_at = new Date();
        adjustment = await existingAdjustment.save();
      } else {
        adjustment = await (BillingAdjustment as any).create({
          user_id: userObjectId,
          project_id: projectObjectId,
          billing_period_start: start,
          billing_period_end: end,
          adjustment_scope: 'project',
          adjustment_hours: adjustmentHours,
          original_billable_hours: baseBillableHours,
          adjusted_billable_hours: billableHours,
          reason: reason || 'Management adjustment',
          adjusted_by: adjustedBy,
          adjusted_at: new Date()
        });
      }

      return { success: true, adjustment };
    } catch (error: any) {
      console.error('Error applying billing adjustment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize allocations for project billable distribution
   */
  static initializeAllocations(resources: ResourceBillingData[]): ProjectAdjustmentTarget[] {
    return resources.map(resource => ({
      userId: resource.user_id,
      currentHours: resource.final_billable_hours,
      totalHours: resource.worked_hours,
      targetHours: resource.final_billable_hours
    }));
  }

  /**
   * Distribute additional hours proportionally
   */
  static distributeAdditionalHours(
    allocations: ProjectAdjustmentTarget[],
    additionalHours: number
  ): void {
    const totalCurrent = allocations.reduce((sum, a) => sum + a.currentHours, 0);

    if (totalCurrent === 0) {
      const perUser = additionalHours / allocations.length;
      allocations.forEach(a => {
        a.targetHours = Math.min(a.currentHours + perUser, a.totalHours);
      });
    } else {
      allocations.forEach(a => {
        const proportion = a.currentHours / totalCurrent;
        const additionalForUser = additionalHours * proportion;
        a.targetHours = Math.min(a.currentHours + additionalForUser, a.totalHours);
      });
    }
  }

  /**
   * Reduce excess hours proportionally
   */
  static reduceExcessHours(
    allocations: ProjectAdjustmentTarget[],
    excessHours: number
  ): void {
    const totalCurrent = allocations.reduce((sum, a) => sum + a.currentHours, 0);

    if (totalCurrent === 0) return;

    allocations.forEach(a => {
      const proportion = a.currentHours / totalCurrent;
      const reductionForUser = excessHours * proportion;
      a.targetHours = Math.max(a.currentHours - reductionForUser, 0);
    });
  }

  /**
   * Calculate project billable targets for distribution
   */
  static calculateProjectBillableTargets(
    resources: ResourceBillingData[],
    targetTotalBillable: number
  ): ProjectAdjustmentTarget[] {
    const allocations = ProjectBillingService.initializeAllocations(resources);
    const currentTotal = allocations.reduce((sum, a) => sum + a.currentHours, 0);
    const difference = targetTotalBillable - currentTotal;

    if (difference > 0) {
      ProjectBillingService.distributeAdditionalHours(allocations, difference);
    } else if (difference < 0) {
      ProjectBillingService.reduceExcessHours(allocations, Math.abs(difference));
    }

    return allocations;
  }

  /**
   * Get weekly breakdown of hours and billing
   */
  static async getWeeklyBreakdown(
    entries: any[],
    hourlyRate: number,
    startDate: Date,
    endDate: Date
  ): Promise<WeeklyBreakdown[]> {
    const weeks = new Map<string, { hours: number; billableHours: number }>();

    entries.forEach(entry => {
      const entryDate = new Date(entry.date);
      const weekStart = new Date(entryDate);
      weekStart.setDate(entryDate.getDate() - entryDate.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, { hours: 0, billableHours: 0 });
      }

      const week = weeks.get(weekKey)!;
      week.hours += entry.hours;
      const entryBillable =
        typeof entry.billable_hours === 'number'
          ? entry.billable_hours
          : entry.is_billable
            ? entry.hours
            : 0;
      week.billableHours += entryBillable;
    });

    return Array.from(weeks.entries()).map(([weekStart, data]) => ({
      week_start: weekStart,
      total_hours: data.hours,
      billable_hours: data.billableHours,
      amount: data.billableHours * hourlyRate
    }));
  }

  /**
   * Helper: Get billing adjustment for user-project-period combination
   * Returns the full adjustment delta, not the final hours
   */
  static async getBillingAdjustment(
    userId: string,
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ adjustment_hours: number; adjusted_at?: Date } | null> {
    try {
      const adjustment = await (BillingAdjustment as any).findOne({
        user_id: mongoose.Types.ObjectId.createFromHexString(userId),
        project_id: mongoose.Types.ObjectId.createFromHexString(projectId),
        billing_period_start: { $lte: startDate },
        billing_period_end: { $gte: endDate },
        adjustment_scope: 'project',
        deleted_at: null
      });

      return adjustment
        ? { adjustment_hours: adjustment.adjustment_hours || 0, adjusted_at: adjustment.adjusted_at }
        : null;
    } catch (error) {
      console.error('Error fetching billing adjustment:', error);
      return null;
    }
  }
}
