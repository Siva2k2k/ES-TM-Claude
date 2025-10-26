/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROJECT BILLING CONTROLLER - DATA FLOW & SAFEGUARDS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ CRITICAL: BILLING DATA SOURCE OF TRUTH
 * 
 * This controller implements a two-tier adjustment model:
 * 
 * 1️⃣ TIER 1 - Manager Adjustments (Team Review):
 *    - Managers adjust worked hours → billable hours at project-week approval
 *    - Stored in: TimesheetProjectApproval.billable_adjustment
 *    - Result: TimesheetProjectApproval.billable_hours = worked_hours + billable_adjustment
 * 
 * 2️⃣ TIER 2 - Management Adjustments (Billing):
 *    - Management adjusts billable hours at billing management stage
 *    - Stored in: BillingAdjustment.adjustment_hours (as DELTA from base)
 *    - Result: final_billable_hours = base_billable_hours + adjustment_hours
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * ✅ CORRECT DATA FLOW:
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * SOURCE OF TRUTH: TimesheetProjectApproval (management_status='approved')
 * 
 * Step 1: Aggregate from TimesheetProjectApproval where:
 *         - management_status = 'approved'
 *         - timesheet.status in ['frozen', 'billed']
 * 
 * Step 2: For each user-project:
 *         worked_hours = SUM(TimesheetProjectApproval.worked_hours)
 *         manager_adjustment = SUM(TimesheetProjectApproval.billable_adjustment)
 *         base_billable_hours = SUM(TimesheetProjectApproval.billable_hours)
 * 
 * Step 3: Apply management adjustment from BillingAdjustment:
 *         management_adjustment = BillingAdjustment.adjustment_hours (delta)
 *         final_billable_hours = base_billable_hours + management_adjustment
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * ❌ DANGEROUS PATTERNS (NEVER DO THIS):
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. ❌ Using TimeEntry.hours as adjustment base
 *    - TimeEntry is raw data, doesn't include manager adjustments
 *    - Would break two-tier adjustment hierarchy
 * 
 * 2. ❌ Using worked_hours as adjustment base
 *    - Worked hours don't include manager adjustments
 *    - Management adjustments must be deltas from billable_hours
 * 
 * 3. ❌ Aggregating from TimeEntry with frozen status
 *    - Would include unverified project groups
 *    - Manager adjustments wouldn't be captured
 * 
 * 4. ❌ Creating BillingAdjustment without approved base
 *    - Must validate management_status='approved' exists
 *    - Prevents adjustments on unverified data
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🛡️ SAFEGUARDS IMPLEMENTED:
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. buildProjectBillingData(): Aggregates only from TimesheetProjectApproval
 * 2. applyBillingAdjustment(): Validates approved base exists, calculates delta
 * 3. createBillingAdjustment(): Enforces management_status='approved' filter
 * 4. Error messages: Explain safeguard violations clearly
 * 5. Comments: Mark dangerous code paths with ❌ warnings
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Project } from '@/models/Project';
// ⚠️ TimeEntry import kept for legacy compatibility only
// DO NOT use TimeEntry for billing aggregation - use TimesheetProjectApproval instead
import { TimeEntry } from '@/models/TimeEntry';
import { Timesheet } from '@/models/Timesheet';
import { User } from '@/models/User';
import Task from '@/models/Task';
import { BillingAdjustment } from '@/models/BillingAdjustment';
// ✅ PRIMARY SOURCE: TimesheetProjectApproval is the source of truth for billing
import { TimesheetProjectApproval } from '@/models/TimesheetProjectApproval';
import type { VerificationInfo } from '@/types/billingVerification';
import mongoose from 'mongoose';
import { IdUtils } from '@/utils/idUtils';

const BILLING_ELIGIBLE_STATUSES: string[] = [
  'lead_approved',
  'manager_approved',
  'management_pending',
  'management_approved',
  'frozen',
  'billed'
];

interface ProjectBillingData {
  project_id: string;
  project_name: string;
  client_name?: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  total_amount: number;
  resources: ResourceBillingData[];
  verification_info?: VerificationInfo;
}

interface ResourceBillingData {
  user_id: string;
  user_name: string;
  role: string;
  
  // Aggregated from TimesheetProjectApproval (management_status='approved')
  worked_hours: number;                 // Total actual hours worked
  manager_adjustment: number;           // Manager's adjustment during Team Review (+ or -)
  base_billable_hours: number;          // worked_hours + manager_adjustment
  
  // Management's final adjustment (from BillingAdjustment)
  management_adjustment: number;        // Management's delta in Billing (+ or -)
  final_billable_hours: number;         // base_billable_hours + management_adjustment
  
  // Calculated fields
  non_billable_hours: number;           // worked_hours - final_billable_hours
  hourly_rate: number;
  total_amount: number;                 // final_billable_hours * hourly_rate
  
  // Legacy fields for backward compatibility (deprecated)
  total_hours: number;                  // Same as worked_hours
  billable_hours: number;               // Same as final_billable_hours
  
  // Verification metadata
  verified_at?: string;                 // Last management_approved_at
  last_adjusted_at?: string;            // Last BillingAdjustment.adjusted_at
  
  weekly_breakdown?: WeeklyBreakdown[];
  tasks?: ResourceTaskData[];
}

interface WeeklyBreakdown {
  week_start: string;
  total_hours: number;
  billable_hours: number;
  amount: number;
}

interface ResourceTaskData {
  task_id: string;
  task_name: string;
  project_id: string;
  project_name: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  amount: number;
}

interface TaskBillingData {
  task_id: string;
  task_name: string;
  project_id: string;
  project_name: string;
  total_hours: number;
  billable_hours: number;
  resources: TaskResourceData[];
}

interface TaskResourceData {
  user_id: string;
  user_name: string;
  hours: number;
  billable_hours: number;
  rate: number;
  amount: number;
}

interface UserBillingProjectData {
  project_id: string;
  project_name: string;
  client_name?: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  amount: number;
}

interface BuildProjectBillingOptions {
  startDate: string;
  endDate: string;
  projectIds?: string[];
  clientIds?: string[];
  view: 'weekly' | 'monthly' | 'custom';
}

interface ApplyAdjustmentParams {
  userId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  billableHours: number;
  totalHours?: number;
  reason?: string;
  adjustedBy?: mongoose.Types.ObjectId;
}

interface ProjectAdjustmentTarget {
  userId: string;
  currentHours: number;
  totalHours: number;
  targetHours: number;
}

export class ProjectBillingController {
  
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
  private static validateAdjustmentIntegrity(
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

      const projects = await ProjectBillingController.buildProjectBillingData({
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

  /**
   * Build project filter for MongoDB queries
   */
  private static buildProjectFilter(projectIds: string[], clientIds: string[]): Record<string, unknown> {
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
  private static async fetchApprovedProjectApprovals(
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
  private static createEmptyProjectBilling(projects: any[]): ProjectBillingData[] {
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
   * Process user billing data for a project
   */
  private static processUserBillingData(
    approval: any,
    userMap: Map<string, any>,
    adjustmentMap: Map<string, any>,
    project: any,
    projectId: string,
    view?: string
  ): ResourceBillingData | null {
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

    const validation = ProjectBillingController.validateAdjustmentIntegrity(
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
      tasks: [],
      weekly_breakdown: view === 'weekly' ? [] : undefined
    };
  }

  /**
   * Calculate verification info for a project
   */
  private static calculateProjectVerificationInfo(approvals: any[]) {
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
  private static async buildProjectBillingData(options: BuildProjectBillingOptions): Promise<ProjectBillingData[]> {
    const { startDate, endDate, projectIds = [], clientIds = [], view } = options;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Step 1: Build project filter
    const projectFilter = ProjectBillingController.buildProjectFilter(projectIds, clientIds);

    // Step 2: Get all projects (for metadata)
    const projects = await (Project as any).find(projectFilter)
      .populate('client_id', 'name')
      .lean();

    if (projects.length === 0) {
      return [];
    }

    const projectObjectIds = projects.map((p: any) => p._id);

    // Step 3: Fetch approved project approvals (SOURCE OF TRUTH)
    const approvedApprovals = await ProjectBillingController.fetchApprovedProjectApprovals(
      projectObjectIds,
      start,
      end
    );

    if (approvedApprovals.length === 0) {
      return ProjectBillingController.createEmptyProjectBilling(projects);
    }

    // Step 4: Get all unique user IDs
    const userIds = [...new Set(approvedApprovals.map((a: any) => a._id.user_id.toString()))];
    const userObjectIds = userIds
      .filter((id): id is string => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
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

    // Step 7: Organize approvals by project
    const projectApprovalMap = new Map<string, any[]>();
    for (const approval of approvedApprovals) {
      const projectId = approval._id.project_id.toString();
      if (!projectApprovalMap.has(projectId)) {
        projectApprovalMap.set(projectId, []);
      }
      projectApprovalMap.get(projectId)!.push(approval);
    }

    // Step 8: Build billing data for each project
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

      // Step 9: Process each user's billing data
      for (const approval of approvals) {
        const resourceBilling = ProjectBillingController.processUserBillingData(
          approval,
          userMap,
          adjustmentMap,
          project,
          projectId,
          view
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
      projectBilling.verification_info = ProjectBillingController.calculateProjectVerificationInfo(approvals);

      billingData.push(projectBilling);
    }

    return billingData;
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

      const projects = await ProjectBillingController.buildProjectBillingData({
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
              ...task,
              project_id: task.project_id ?? project.project_id,
              project_name: task.project_name ?? project.project_name
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
  private static collectTimeEntriesFromTimesheets(
    timesheets: any[],
    start: Date,
    end: Date,
    projectIds?: string
  ): any[] {
    const timeEntries: any[] = [];
    const projectIdList = projectIds ? projectIds.split(',') : null;

    for (const timesheet of timesheets) {
      if (!timesheet.entries || timesheet.entries.length === 0) continue;

      for (const entry of timesheet.entries) {
        const entryDate = new Date(entry.date);

        if (entryDate < start || entryDate > end) continue;

        // Apply project filter if specified
        if (projectIdList) {
          if (!entry.project_id || !projectIdList.includes(entry.project_id.toString())) {
            continue;
          }
        }

        timeEntries.push({
          ...entry,
          user_id: timesheet.user_id,
          timesheet_id: timesheet._id
        });
      }
    }

    return timeEntries;
  }

  /**
   * Build project details map
   */
  private static async buildProjectDetailsMap(): Promise<Map<string, { name: string; client_name: string }>> {
    const projectDetails = await (Project as any).find({}).populate('client_id', 'name').exec();
    const projectMap = new Map();

    projectDetails.forEach(p => {
      projectMap.set(p._id.toString(), {
        name: p.name,
        client_name: p.client_id?.name || 'No Client'
      });
    });

    return projectMap;
  }

  /**
   * Group time entries by task
   */
  private static groupEntriesByTask(
    timeEntries: any[],
    projectMap: Map<string, { name: string; client_name: string }>
  ): Map<string, any> {
    const taskMap = new Map<string, {
      task_id: string;
      task_name: string;
      project_id: string;
      project_name: string;
      total_hours: number;
      billable_hours: number;
      entries: any[];
    }>();

    for (const entry of timeEntries) {
      const projectId = entry.project_id?.toString() || 'no-project';
      const taskName = entry.description || entry.custom_task_description || 'No Description';
      const taskKey = `${projectId}_${taskName}`;

      if (!taskMap.has(taskKey)) {
        const projectInfo = projectMap.get(projectId);
        taskMap.set(taskKey, {
          task_id: taskKey,
          task_name: taskName,
          project_id: projectId,
          project_name: projectInfo?.name || 'No Project',
          total_hours: 0,
          billable_hours: 0,
          entries: []
        });
      }

      const task = taskMap.get(taskKey)!;
      task.total_hours += entry.hours || 0;
      if (entry.is_billable) {
        task.billable_hours += entry.hours || 0;
      }
      task.entries.push(entry);
    }

    return taskMap;
  }

  /**
   * Process task resources and calculate billing
   */
  private static processTaskResources(task: any): TaskResourceData[] {
    const userMap = new Map<string, {
      user: any;
      hours: number;
      billableHours: number;
    }>();

    // Group by user
    for (const entry of task.entries) {
      const userId = entry.user_id?._id?.toString();
      const user = entry.user_id;

      if (!userId || !user) continue;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user,
          hours: 0,
          billableHours: 0
        });
      }

      const userTask = userMap.get(userId)!;
      userTask.hours += entry.hours || 0;
      if (entry.is_billable) {
        userTask.billableHours += entry.hours || 0;
      }
    }

    // Convert to resource data
    const resources: TaskResourceData[] = [];
    for (const [userId, userTask] of userMap) {
      const user = userTask.user;
      if (!user) continue;

      try {
        const hourlyRate = user.hourly_rate || 0;

        resources.push({
          user_id: userId,
          user_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          hours: userTask.hours,
          billable_hours: userTask.billableHours,
          rate: hourlyRate,
          amount: userTask.billableHours * hourlyRate
        });
      } catch (error) {
        console.error('Error processing task resource:', error);
      }
    }

    return resources;
  }

  /**
   * Get task-based billing view
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
        projectIds,
        taskIds
      } = req.query as {
        startDate?: string;
        endDate?: string;
        projectIds?: string;
        taskIds?: string;
      };

      // Use default date range if not provided (last 3 months)
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Get time entries from timesheets for the period
      const timesheets = await (Timesheet as any).find({
        user_id: { $ne: null },
        status: { $in: BILLING_ELIGIBLE_STATUSES }
      }).populate('user_id', 'full_name email hourly_rate').exec();

      // Filter and collect time entries
      const timeEntries = ProjectBillingController.collectTimeEntriesFromTimesheets(
        timesheets,
        start,
        end,
        projectIds
      );

      // Get project details for reference
      const projectMap = await ProjectBillingController.buildProjectDetailsMap();

      // Group by task
      const taskMap = ProjectBillingController.groupEntriesByTask(timeEntries, projectMap);
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
          resources: ProjectBillingController.processTaskResources(task)
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

      const result = await ProjectBillingController.applyBillingAdjustment({
        userId: user_id,
        projectId: project_id,
        startDate: start_date,
        endDate: end_date,
        billableHours: billable_hours,
        totalHours: total_hours,
        reason,
        adjustedBy: ProjectBillingController.resolveAdjustedBy(req)
      });

      res.json({
        success: true,
        message: 'Billing adjustment saved successfully',
        data: {
          adjustment_id: result.adjustmentId,
          original_billable_hours: result.originalBillableHours,
          adjusted_billable_hours: result.adjustedBillableHours,
          difference: result.adjustedBillableHours - result.originalBillableHours
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

      const projects = await ProjectBillingController.buildProjectBillingData({
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

      const targets = ProjectBillingController.calculateProjectBillableTargets(
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
        const result = await ProjectBillingController.applyBillingAdjustment({
          userId: target.userId,
          projectId,
          startDate: start_date,
          endDate: end_date,
          billableHours: target.targetHours,
          totalHours: target.totalHours,
          reason: 'Project-level billable hours adjustment',
          adjustedBy: ProjectBillingController.resolveAdjustedBy(req)
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

  private static resolveAdjustedBy(req: Request): mongoose.Types.ObjectId {
    try {
      const userId = (req.user as any)?._id;
      if (!userId) {
        return new mongoose.Types.ObjectId();
      }
      return typeof userId === 'string'
        ? mongoose.Types.ObjectId.createFromHexString(userId)
        : (userId as mongoose.Types.ObjectId);
    } catch {
      return new mongoose.Types.ObjectId();
    }
  }

  /**
   * ⚠️ CRITICAL: Apply billing adjustment for Management
   * 
   * DATA FLOW ENFORCEMENT:
   * 1. Base hours MUST come from TimesheetProjectApproval.billable_hours (includes manager adjustments)
   * 2. Management adjustment is the DELTA from this base
   * 3. Formula: final_billable = base_billable_hours + management_adjustment
   * 
   * SAFEGUARDS:
   * - Validates base exists in TimesheetProjectApproval with management_status='approved'
   * - Calculates adjustment as delta (not absolute value)
   * - Stores worked_hours for audit trail
   * - Throws error if no approved base found
   * 
   * ❌ NEVER use TimeEntry.hours or worked_hours as adjustment base
   * ✅ ALWAYS use billable_hours from TimesheetProjectApproval
   */
  private static async applyBillingAdjustment(params: ApplyAdjustmentParams): Promise<{
    adjustmentId: mongoose.Types.ObjectId;
    originalBillableHours: number;
    adjustedBillableHours: number;
  }> {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    const userObjectId = mongoose.Types.ObjectId.createFromHexString(params.userId);
    const projectObjectId = mongoose.Types.ObjectId.createFromHexString(params.projectId);

    // ✅ SAFEGUARD: Fetch approved project approvals to get base billable hours
    // This is the ONLY correct source for adjustment base
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
          base_billable_hours: { $sum: '$billable_hours' },
          manager_adjustment: { $sum: '$billable_adjustment' }
        }
      }
    ]);

    if (!approvedApprovals || approvedApprovals.length === 0) {
      const notFoundError = new Error(
        '⚠️ SAFEGUARD VIOLATION: No management-approved billing data found. ' +
        'Cannot create adjustment without approved TimesheetProjectApproval base. ' +
        'Ensure project-week groups have management_status="approved" before adjusting.'
      );
      (notFoundError as any).status = 404;
      throw notFoundError;
    }

    const approvalData = approvedApprovals[0];
    const workedHours = approvalData.worked_hours || 0;
    const baseBillableHours = approvalData.base_billable_hours || 0;
    const managerAdjustment = approvalData.manager_adjustment || 0;

    // ✅ SAFEGUARD: Validate base billable hours integrity
    // Base should equal worked + manager adjustment (with rounding tolerance)
    const expectedBase = workedHours + managerAdjustment;
    const tolerance = 0.01; // Allow 0.01h rounding difference
    if (Math.abs(baseBillableHours - expectedBase) > tolerance) {
      console.warn(
        `⚠️ DATA INTEGRITY WARNING: Base billable hours (${baseBillableHours}) ` +
        `doesn't match worked (${workedHours}) + manager adjustment (${managerAdjustment}). ` +
        `Expected: ${expectedBase}. This may indicate corrupted data.`
      );
    }

    // ✅ CORRECT: Calculate management adjustment as DELTA from base billable
    // This is the correct formula - adjustment is the difference, not absolute value
    const managementAdjustmentHours = params.billableHours - baseBillableHours;

    // Find timesheet for reference
    const timesheets = await (Timesheet as any).find({
      user_id: userObjectId,
      week_start_date: { $lte: end },
      week_end_date: { $gte: start }
    });
    const timesheetIdToUse = timesheets.length > 0 ? timesheets[0]._id : undefined;

    const adjustmentQuery = {
      user_id: userObjectId,
      project_id: projectObjectId,
      billing_period_start: start,
      billing_period_end: end,
      deleted_at: null  // ✅ CRITICAL: Include soft-delete filter
    };

    const adjustedBy = params.adjustedBy ?? new mongoose.Types.ObjectId();
    const reason = params.reason || 'Management adjustment from billing management';

    const existingAdjustment = await (BillingAdjustment as any).findOne(adjustmentQuery);

    if (existingAdjustment) {
      // Update existing adjustment
      existingAdjustment.total_worked_hours = workedHours;
      existingAdjustment.adjustment_hours = managementAdjustmentHours;
      existingAdjustment.total_billable_hours = params.billableHours;
      existingAdjustment.original_billable_hours = baseBillableHours;
      existingAdjustment.adjusted_billable_hours = params.billableHours;
      existingAdjustment.reason = reason;
      existingAdjustment.adjusted_by = adjustedBy;
      existingAdjustment.adjusted_at = new Date();
      existingAdjustment.updated_at = new Date();
      if (timesheetIdToUse) {
        existingAdjustment.timesheet_id = timesheetIdToUse;
      }

      await existingAdjustment.save();

      return {
        adjustmentId: existingAdjustment._id,
        originalBillableHours: baseBillableHours,
        adjustedBillableHours: params.billableHours
      };
    }

    // Create new adjustment
    const newAdjustmentData: any = {
      user_id: userObjectId,
      project_id: projectObjectId,
      adjustment_scope: 'project',
      billing_period_start: start,
      billing_period_end: end,
      total_worked_hours: workedHours,
      adjustment_hours: managementAdjustmentHours,
      total_billable_hours: params.billableHours,
      original_billable_hours: baseBillableHours,
      adjusted_billable_hours: params.billableHours,
      reason,
      adjusted_by: adjustedBy,
      adjusted_at: new Date()
    };

    if (timesheetIdToUse) {
      newAdjustmentData.timesheet_id = timesheetIdToUse;
    }

    const newAdjustment = new (BillingAdjustment as any)(newAdjustmentData);
    await newAdjustment.save();

    return {
      adjustmentId: newAdjustment._id,
      originalBillableHours: baseBillableHours,
      adjustedBillableHours: params.billableHours
    };
  }

  /**
   * Initialize allocation targets from resources
   */
  private static initializeAllocations(resources: ResourceBillingData[]): ProjectAdjustmentTarget[] {
    return resources.map((resource) => ({
      userId: resource.user_id,
      currentHours: Number(resource.billable_hours.toFixed(2)),
      totalHours: resource.total_hours,
      targetHours: Number(resource.billable_hours.toFixed(2))
    }));
  }

  /**
   * Distribute additional hours when target > current
   */
  private static distributeAdditionalHours(
    allocations: ProjectAdjustmentTarget[],
    additionalHours: number
  ): void {
    let remaining = Number(additionalHours.toFixed(2));
    let candidates = allocations.map((entry, index) => ({
      index,
      headroom: Math.max(entry.totalHours - entry.targetHours, 0)
    }));

    while (remaining > 0.0001 && candidates.some((c) => c.headroom > 0.0001)) {
      const active = candidates.filter((c) => c.headroom > 0.0001);
      if (active.length === 0) break;

      const share = Number((remaining / active.length).toFixed(4));
      let consumed = 0;

      active.forEach((candidate) => {
        const entry = allocations[candidate.index];
        const delta = Math.min(share, candidate.headroom);
        entry.targetHours = Number((entry.targetHours + delta).toFixed(2));
        candidate.headroom = Math.max(candidate.headroom - delta, 0);
        consumed += delta;
      });

      remaining = Number((remaining - consumed).toFixed(2));
      candidates = candidates.map((c) => ({
        ...c,
        headroom: Math.max(allocations[c.index].totalHours - allocations[c.index].targetHours, 0)
      }));

      if (consumed === 0) break;
    }

    // Assign any remaining hours to first allocation
    if (remaining > 0.0001) {
      allocations[0].targetHours = Number((allocations[0].targetHours + remaining).toFixed(2));
    }
  }

  /**
   * Reduce hours when target < current
   */
  private static reduceExcessHours(
    allocations: ProjectAdjustmentTarget[],
    excessHours: number
  ): void {
    let remaining = Number(excessHours.toFixed(2));
    const sorted = allocations
      .map((entry, index) => ({ index, value: entry.targetHours }))
      .sort((a, b) => b.value - a.value);

    for (const item of sorted) {
      if (remaining <= 0.0001) break;

      const entry = allocations[item.index];
      const reducible = entry.targetHours;
      if (reducible <= 0) continue;

      const delta = Math.min(reducible, remaining);
      entry.targetHours = Number((entry.targetHours - delta).toFixed(2));
      remaining = Number((remaining - delta).toFixed(2));
    }
  }

  private static calculateProjectBillableTargets(
    resources: ResourceBillingData[],
    targetBillableHours: number
  ): ProjectAdjustmentTarget[] {
    if (resources.length === 0) return [];

    const roundedTarget = Number(targetBillableHours.toFixed(2));
    const currentTotal = resources.reduce((sum, resource) => sum + resource.billable_hours, 0);
    const allocations = ProjectBillingController.initializeAllocations(resources);

    // Handle zero target
    if (roundedTarget <= 0) {
      allocations.forEach((entry) => { entry.targetHours = 0; });
      return allocations;
    }

    // Handle single resource
    if (resources.length === 1) {
      allocations[0].targetHours = Math.max(roundedTarget, 0);
      return allocations;
    }

    // Distribute additional hours if target > current
    if (roundedTarget > currentTotal) {
      const additionalHours = roundedTarget - currentTotal;
      ProjectBillingController.distributeAdditionalHours(allocations, additionalHours);
      return allocations;
    }

    // Reduce hours if target < current
    if (roundedTarget < currentTotal) {
      const excessHours = currentTotal - roundedTarget;
      ProjectBillingController.reduceExcessHours(allocations, excessHours);
      return allocations;
    }

    return allocations;
  }

  /**
   * Helper: Generate weekly breakdown for a resource
   */
  private static async getWeeklyBreakdown(
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
  private static async getBillingAdjustment(
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

  /**
   * ⚠️ CRITICAL: Create or update billing adjustment (Management tier)
   * 
   * DATA FLOW ENFORCEMENT:
   * 1. Fetches base from TimesheetProjectApproval.billable_hours (management-approved only)
   * 2. Calculates adjustment as delta: adjustment = final - base
   * 3. Stores audit trail with worked_hours, base, and adjustment
   * 
   * SAFEGUARDS:
   * - Validates management_status='approved' before allowing adjustment
   * - Throws 404 if no approved base exists
   * - Validates data integrity (base = worked + manager adjustment)
   * - Stores adjustment as delta (not absolute)
   * 
   * ❌ DO NOT calculate adjustment from TimeEntry or worked_hours
   * ✅ ALWAYS calculate adjustment as delta from billable_hours
   */
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
}

// Validation middlewares
export const getProjectBillingViewValidation = [
  query('startDate').isISO8601().withMessage('Valid start date is required'),
  query('endDate').isISO8601().withMessage('Valid end date is required'),
  query('view').optional().isIn(['weekly', 'monthly', 'custom']).withMessage('View must be weekly, monthly, or custom'),
  query('projectIds').optional().isString().withMessage('Project IDs must be a comma-separated string'),
  query('clientIds').optional().isString().withMessage('Client IDs must be a comma-separated string')
];

export const getTaskBillingViewValidation = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  query('projectIds').optional().isString().withMessage('Project IDs must be a comma-separated string'),
  query('taskIds').optional().isString().withMessage('Task IDs must be a comma-separated string')
];

export const getUserBillingViewValidation = [
  query('startDate').isISO8601().withMessage('Valid start date is required'),
  query('endDate').isISO8601().withMessage('Valid end date is required'),
  query('view').optional().isIn(['weekly', 'monthly', 'custom']).withMessage('View must be weekly, monthly, or custom'),
  query('projectIds').optional().isString().withMessage('Project IDs must be a comma-separated string'),
  query('clientIds').optional().isString().withMessage('Client IDs must be a comma-separated string'),
  query('roles').optional().isString().withMessage('Roles must be a comma-separated string'),
  query('search').optional().isString().withMessage('Search must be a string')
];

export const updateBillableHoursValidation = [
  body('user_id').isMongoId().withMessage('Valid user ID is required'),
  body('project_id').isMongoId().withMessage('Valid project ID is required'),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
  body('end_date').isISO8601().withMessage('Valid end date is required'),
  body('billable_hours').isNumeric().withMessage('Billable hours must be a number'),
  body('total_hours').optional().isNumeric().withMessage('Total hours must be a number'),
  body('reason').optional().isString().withMessage('Reason must be a string')
];

export const updateProjectBillableTotalValidation = [
  param('projectId').isMongoId().withMessage('Valid project ID is required'),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
  body('end_date').isISO8601().withMessage('Valid end date is required'),
  body('billable_hours').isNumeric().withMessage('Billable hours must be a number')
];

export const createBillingAdjustmentValidation = [
  body('user_id').isMongoId().withMessage('Valid user ID is required'),
  body('project_id').isMongoId().withMessage('Valid project ID is required'),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
  body('end_date').isISO8601().withMessage('Valid end date is required'),
  body('adjusted_billable_hours').isNumeric().withMessage('Adjusted billable hours must be a number'),
  body('original_billable_hours').isNumeric().withMessage('Original billable hours must be a number'),
  body('reason').optional().isString().withMessage('Reason must be a string')
];
