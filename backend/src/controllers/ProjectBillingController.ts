import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Project } from '@/models/Project';
import { TimeEntry } from '@/models/TimeEntry';
import { Timesheet } from '@/models/Timesheet';
import { User } from '@/models/User';
import Task from '@/models/Task';
import { BillingAdjustment } from '@/models/BillingAdjustment';
import { BillingRateService } from '@/services/BillingRateService';
import mongoose from 'mongoose';

interface ProjectBillingData {
  project_id: string;
  project_name: string;
  client_name?: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  total_amount: number;
  resources: ResourceBillingData[];
}

interface ResourceBillingData {
  user_id: string;
  user_name: string;
  role: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  hourly_rate: number;
  total_amount: number;
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

      const parseIds = (value?: string): string[] =>
        value
          ? value
              .split(',')
              .map((id) => id.trim())
              .filter((id) => mongoose.Types.ObjectId.isValid(id))
          : [];

      const projectIds = parseIds(projectIdsRaw);
      const clientIds = parseIds(clientIdsRaw);

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

  private static async buildProjectBillingData(options: BuildProjectBillingOptions): Promise<ProjectBillingData[]> {
    const { startDate, endDate, projectIds = [], clientIds = [], view } = options;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const projectFilter: Record<string, unknown> = {};

    if (projectIds.length > 0) {
      const ids = projectIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      if (ids.length > 0) {
        projectFilter._id = { $in: ids };
      }
    }

    if (clientIds.length > 0) {
      const ids = clientIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      if (ids.length > 0) {
        projectFilter.client_id = { $in: ids };
      }
    }

    const projects = await Project.aggregate([
      { $match: projectFilter },
      {
        $lookup: {
          from: 'timeentries',
          let: { projectId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$project_id', '$$projectId'] },
                deleted_at: null,
                date: { $gte: start, $lte: end }
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
                'timesheet.user_id': { $ne: null },
                'timesheet.status': {
                  $in: ['frozen', 'approved', 'manager_approved', 'management_approved']
                }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'timesheet.user_id',
                foreignField: '_id',
                as: 'user'
              }
            },
            { $unwind: '$user' },
            {
              $project: {
                user_id: '$timesheet.user_id',
                user_name: '$user.full_name',
                user_email: '$user.email',
                user_role: '$user.role',
                date: 1,
                hours: 1,
                is_billable: 1,
                billable_hours: {
                  $ifNull: [
                    '$billable_hours',
                    { $cond: [{ $eq: ['$is_billable', true] }, '$hours', 0] }
                  ]
                },
                project_id: 1,
                task_id: 1,
                description: 1
              }
            }
          ],
          as: 'timeEntries'
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'client_id',
          foreignField: '_id',
          as: 'client'
        }
      }
    ]);

    const taskIdSet = new Set<string>();
    for (const project of projects) {
      for (const entry of project.timeEntries ?? []) {
        if (entry.task_id) {
          taskIdSet.add(entry.task_id.toString());
        }
      }
    }

    const taskNameMap = new Map<string, string>();
    if (taskIdSet.size > 0) {
      const taskIds = Array.from(taskIdSet)
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      if (taskIds.length > 0) {
        const tasks = await (Task as any)
          .find({ _id: { $in: taskIds } }, { name: 1 })
          .lean();
        for (const task of tasks) {
          taskNameMap.set(task._id.toString(), task.name);
        }
      }
    }

    const billingData: ProjectBillingData[] = [];

    for (const project of projects) {
      const projectBilling: ProjectBillingData = {
        project_id: project._id.toString(),
        project_name: project.name,
        client_name: project.client?.[0]?.name,
        total_hours: 0,
        billable_hours: 0,
        non_billable_hours: 0,
        total_amount: 0,
        resources: []
      };

      const userTimeMap = new Map<
        string,
        {
          user: any;
          entries: any[];
          totalHours: number;
          billableHours: number;
        }
      >();

      for (const entry of project.timeEntries ?? []) {
        const userId = entry.user_id.toString();
        if (!userTimeMap.has(userId)) {
          userTimeMap.set(userId, {
            user: {
              _id: entry.user_id,
              full_name: entry.user_name,
              email: entry.user_email,
              role: entry.user_role
            },
            entries: [],
            totalHours: 0,
            billableHours: 0
          });
        }

        const userTime = userTimeMap.get(userId)!;
        userTime.entries.push(entry);
        userTime.totalHours += entry.hours;
        const entryBillable =
          typeof entry.billable_hours === 'number'
            ? entry.billable_hours
            : entry.is_billable
              ? entry.hours
              : 0;
        userTime.billableHours += entryBillable;
      }

      for (const [userId, userTime] of userTimeMap) {
        const user = userTime.user;
        if (!user) continue;

        const adjustedBillableHours = await ProjectBillingController.getBillingAdjustment(
          userId,
          project._id.toString(),
          start,
          end
        );

        const finalBillableHours =
          adjustedBillableHours !== null ? adjustedBillableHours : userTime.billableHours;

        let rateResult = { effective_rate: 75 };
        try {
          rateResult = await BillingRateService.getEffectiveRate({
            user_id: mongoose.Types.ObjectId.createFromHexString(userId),
            project_id: mongoose.Types.ObjectId.createFromHexString(project._id.toString()),
            client_id: project.client_id,
            date: new Date(),
            hours: finalBillableHours,
            day_of_week: 1
          });
        } catch (rateError) {
          console.warn(
            `No billing rate found for user ${userId} on project ${project._id}. Using default rate:`,
            rateError
          );
        }

        const taskBuckets = new Map<
          string,
          {
            totalHours: number;
            billableHours: number;
          }
        >();

        for (const entry of userTime.entries) {
          const entryBillable =
            typeof entry.billable_hours === 'number'
              ? entry.billable_hours
              : entry.is_billable
                ? entry.hours
                : 0;
          const key = entry.task_id ? entry.task_id.toString() : 'unassigned';
          if (!taskBuckets.has(key)) {
            taskBuckets.set(key, { totalHours: 0, billableHours: 0 });
          }
          const bucket = taskBuckets.get(key)!;
          bucket.totalHours += entry.hours;
          bucket.billableHours += entryBillable;
        }

        const tasks: ResourceTaskData[] = Array.from(taskBuckets.entries()).map(
          ([taskId, bucket]) => {
            const taskName =
              taskId === 'unassigned'
                ? 'Unassigned Task'
                : taskNameMap.get(taskId) ?? 'Task';
            return {
              task_id: taskId,
              task_name: taskName,
              project_id: projectBilling.project_id,
              project_name: projectBilling.project_name,
              total_hours: bucket.totalHours,
              billable_hours: bucket.billableHours,
              non_billable_hours: Math.max(bucket.totalHours - bucket.billableHours, 0),
              amount: bucket.billableHours * rateResult.effective_rate
            };
          }
        );

        tasks.sort((a, b) => b.total_hours - a.total_hours);

        const resourceBilling: ResourceBillingData = {
          user_id: userId,
          user_name:
            user.full_name ||
            `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
            'Unknown User',
          role: user.role || 'employee',
          total_hours: userTime.totalHours,
          billable_hours: finalBillableHours,
          non_billable_hours: Math.max(userTime.totalHours - finalBillableHours, 0),
          hourly_rate: rateResult.effective_rate,
          total_amount: finalBillableHours * rateResult.effective_rate,
          weekly_breakdown:
            view === 'weekly'
              ? await ProjectBillingController.getWeeklyBreakdown(
                userTime.entries,
                rateResult.effective_rate,
                start,
                end
              )
              : undefined,
          tasks
        };

        projectBilling.resources.push(resourceBilling);
        projectBilling.total_hours += resourceBilling.total_hours;
        projectBilling.billable_hours += resourceBilling.billable_hours;
        projectBilling.total_amount += resourceBilling.total_amount;
      }

      projectBilling.non_billable_hours = Math.max(
        projectBilling.total_hours - projectBilling.billable_hours,
        0
      );

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

      const parseIds = (value?: string): string[] =>
        value
          ? value
              .split(',')
              .map((id) => id.trim())
              .filter((id) => mongoose.Types.ObjectId.isValid(id))
          : [];

      const parseRoles = (value?: string): string[] =>
        value
          ? value
              .split(',')
              .map((role) => role.trim().toLowerCase())
              .filter((role) => role.length > 0)
          : [];

      const projectIds = parseIds(projectIdsRaw);
      const clientIds = parseIds(clientIdsRaw);
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
   * Get task-based billing view
   */
  static async getTaskBillingView(req: Request, res: Response): Promise<void> {
    try {
      console.log('Task billing view called with query:', req.query);
      
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

      // Build filters
      const matchFilter: any = {
        date: { $gte: start, $lte: end }
      };

      if (projectIds) {
        const ids = projectIds.split(',').map(id => mongoose.Types.ObjectId.createFromHexString(id));
        matchFilter.project_id = { $in: ids };
      }

      if (taskIds) {
        const ids = taskIds.split(',').map(id => mongoose.Types.ObjectId.createFromHexString(id));
        matchFilter.task_id = { $in: ids };
      }

      // Get time entries from timesheets for the period
      const timesheets = await (Timesheet as any).find({
        user_id: { $ne: null },
        $or: [
          { status: 'frozen' },
          { status: 'approved' }, 
          { status: 'manager_approved' },
          { status: 'management_approved' }
        ]
      }).populate('user_id', 'full_name email').exec();

      const timeEntries: any[] = [];
      
      for (const timesheet of timesheets) {
        if (timesheet.entries && timesheet.entries.length > 0) {
          for (const entry of timesheet.entries) {
            const entryDate = new Date(entry.date);
            if (entryDate >= start && entryDate <= end) {
              // Apply project and task filters if specified
              if (projectIds) {
                const ids = projectIds.split(',');
                if (!entry.project_id || !ids.includes(entry.project_id.toString())) {
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
        }
      }

      // Get project details for reference
      const projectDetails = await (Project as any).find({}).populate('client_id', 'name').exec();
      const projectMap = new Map();
      projectDetails.forEach(p => {
        projectMap.set(p._id.toString(), {
          name: p.name,
          client_name: p.client_id?.name || 'No Client'
        });
      });

      // Group by task (using description as task name since we don't have task_id)
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

      const taskData = Array.from(taskMap.values());

      const billingData: TaskBillingData[] = [];

      for (const task of taskData) {
        const taskBilling: TaskBillingData = {
          task_id: task.task_id,
          task_name: task.task_name,
          project_id: task.project_id,
          project_name: task.project_name,
          total_hours: task.total_hours,
          billable_hours: task.billable_hours,
          resources: []
        };

        // Group by user
        const userMap = new Map<string, {
          user: any;
          hours: number;
          billableHours: number;
        }>();

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

        // Process resources for this task
        for (const [userId, userTask] of userMap) {
          const user = userTask.user;
          if (!user) continue;

          try {
            // Get effective rate with fallback
            let rate = 75; // Default rate
            try {
              const rateResult = await BillingRateService.getEffectiveRate({
                user_id: mongoose.Types.ObjectId.createFromHexString(userId),
                project_id: mongoose.Types.ObjectId.createFromHexString(task.project_id),
                date: new Date(),
                hours: userTask.billableHours,
                day_of_week: 1
              });
              rate = rateResult.effective_rate;
            } catch (rateError) {
              console.warn('Rate calculation failed, using default:', rateError);
            }

            const taskResource: TaskResourceData = {
              user_id: userId,
              user_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
              hours: userTask.hours,
              billable_hours: userTask.billableHours,
              rate: rate,
              amount: userTask.billableHours * rate
            };

            taskBilling.resources.push(taskResource);
          } catch (error) {
            console.error('Error processing task resource:', error);
          }
        }

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

  private static async applyBillingAdjustment(params: ApplyAdjustmentParams): Promise<{
    adjustmentId: mongoose.Types.ObjectId;
    originalBillableHours: number;
    adjustedBillableHours: number;
  }> {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    const userObjectId = mongoose.Types.ObjectId.createFromHexString(params.userId);
    const projectObjectId = mongoose.Types.ObjectId.createFromHexString(params.projectId);

    const timesheets = await (Timesheet as any).find({
      user_id: userObjectId,
      week_start_date: { $lte: end },
      week_end_date: { $gte: start }
    });

    if (!timesheets || timesheets.length === 0) {
      const notFoundError = new Error('No timesheets found for the specified user and date range');
      (notFoundError as any).status = 404;
      throw notFoundError;
    }

    const timesheetIds = timesheets.map((ts: any) => ts._id);
    const timeEntries = await (TimeEntry as any).find({
      timesheet_id: { $in: timesheetIds },
      project_id: projectObjectId,
      date: { $gte: start, $lte: end }
    });

    const originalBillableHours = timeEntries.reduce((sum: number, entry: any) => {
      const entryBillable =
        typeof entry.billable_hours === 'number'
          ? entry.billable_hours
          : entry.is_billable
            ? entry.hours
            : 0;
      return sum + entryBillable;
    }, 0);

    const timesheetIdToUse = timesheetIds.length > 0 ? timesheetIds[0] : undefined;
    const totalWorkedHours =
      typeof params.totalHours === 'number' ? params.totalHours : originalBillableHours;
    const adjustmentHours = params.billableHours - totalWorkedHours;
    const adjustmentQuery = {
      user_id: userObjectId,
      project_id: projectObjectId,
      billing_period_start: start,
      billing_period_end: end
    };

    const adjustedBy = params.adjustedBy ?? new mongoose.Types.ObjectId();
    const reason = params.reason || 'Manual adjustment from billing management';

    const existingAdjustment = await (BillingAdjustment as any).findOne(adjustmentQuery);

    if (existingAdjustment) {
      existingAdjustment.original_billable_hours = originalBillableHours;
      existingAdjustment.adjusted_billable_hours = params.billableHours;
      existingAdjustment.total_worked_hours = totalWorkedHours;
      existingAdjustment.total_billable_hours = params.billableHours;
      existingAdjustment.adjustment_hours = adjustmentHours;
      existingAdjustment.reason = reason;
      existingAdjustment.adjusted_by = adjustedBy;
      existingAdjustment.updated_at = new Date();
      if (timesheetIdToUse) {
        existingAdjustment.timesheet_id = timesheetIdToUse;
      }

      await existingAdjustment.save();

      return {
        adjustmentId: existingAdjustment._id,
        originalBillableHours,
        adjustedBillableHours: params.billableHours
      };
    }

    const newAdjustmentData: any = {
      user_id: userObjectId,
      project_id: projectObjectId,
      billing_period_start: start,
      billing_period_end: end,
      original_billable_hours: originalBillableHours,
      adjusted_billable_hours: params.billableHours,
      total_worked_hours: totalWorkedHours,
      total_billable_hours: params.billableHours,
      adjustment_hours: adjustmentHours,
      reason,
      adjusted_by: adjustedBy
    };

    if (timesheetIdToUse) {
      newAdjustmentData.timesheet_id = timesheetIdToUse;
    }

    const newAdjustment = new (BillingAdjustment as any)(newAdjustmentData);
    await newAdjustment.save();

    return {
      adjustmentId: newAdjustment._id,
      originalBillableHours,
      adjustedBillableHours: params.billableHours
    };
  }

  private static calculateProjectBillableTargets(
    resources: ResourceBillingData[],
    targetBillableHours: number
  ): ProjectAdjustmentTarget[] {
    if (resources.length === 0) {
      return [];
    }

    const roundedTarget = Number(targetBillableHours.toFixed(2));
    const currentTotal = resources.reduce((sum, resource) => sum + resource.billable_hours, 0);
    const allocations: ProjectAdjustmentTarget[] = resources.map((resource) => ({
      userId: resource.user_id,
      currentHours: Number(resource.billable_hours.toFixed(2)),
      totalHours: resource.total_hours,
      targetHours: Number(resource.billable_hours.toFixed(2))
    }));

    if (roundedTarget <= 0) {
      allocations.forEach((entry) => {
        entry.targetHours = 0;
      });
      return allocations;
    }

    if (resources.length === 1) {
      allocations[0].targetHours = Math.max(roundedTarget, 0);
      return allocations;
    }

    if (roundedTarget > currentTotal) {
      let remaining = Number((roundedTarget - currentTotal).toFixed(2));
      let candidates = allocations.map((entry, index) => ({
        index,
        headroom: Math.max(entry.totalHours - entry.targetHours, 0)
      }));

      while (remaining > 0.0001 && candidates.some((candidate) => candidate.headroom > 0.0001)) {
        const active = candidates.filter((candidate) => candidate.headroom > 0.0001);
        if (active.length === 0) {
          break;
        }

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
        candidates = candidates.map((candidate) => ({
          ...candidate,
          headroom: Math.max(
            allocations[candidate.index].totalHours - allocations[candidate.index].targetHours,
            0
          )
        }));
        if (consumed === 0) {
          break;
        }
      }

      if (remaining > 0.0001) {
        allocations[0].targetHours = Number((allocations[0].targetHours + remaining).toFixed(2));
      }

      return allocations;
    }

    if (roundedTarget < currentTotal) {
      let remaining = Number((currentTotal - roundedTarget).toFixed(2));
      const sorted = allocations
        .map((entry, index) => ({ index, value: entry.targetHours }))
        .sort((a, b) => b.value - a.value);

      for (const item of sorted) {
        if (remaining <= 0.0001) {
          break;
        }
        const entry = allocations[item.index];
        const reducible = entry.targetHours;
        if (reducible <= 0) {
          continue;
        }
        const delta = Math.min(reducible, remaining);
        entry.targetHours = Number((entry.targetHours - delta).toFixed(2));
        remaining = Number((remaining - delta).toFixed(2));
      }

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
   */
  private static async getBillingAdjustment(
    userId: string,
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number | null> {
    try {
      const adjustment = await (BillingAdjustment as any).findOne({
        user_id: mongoose.Types.ObjectId.createFromHexString(userId),
        project_id: mongoose.Types.ObjectId.createFromHexString(projectId),
        billing_period_start: { $lte: startDate },
        billing_period_end: { $gte: endDate }
      });

      return adjustment ? adjustment.adjusted_billable_hours : null;
    } catch (error) {
      console.error('Error fetching billing adjustment:', error);
      return null;
    }
  }

  /**
   * Create or update billing adjustment
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

      // Get adjusted_by user - use req.user or fallback to system user
      let adjustedBy: mongoose.Types.ObjectId;
      
      try {
        if ((req.user as any)?._id) {
          // User is authenticated, use their ID
          const userId = (req.user as any)._id;
          adjustedBy = typeof userId === 'string' 
            ? mongoose.Types.ObjectId.createFromHexString(userId)
            : userId;
        } else {
          // Find existing system user first
          let systemUser = await (User as any).findOne({ 
            $or: [
              { email: 'system@billing.seed' },
              { email: 'system@billing.adjustment' }
            ]
          });
          
          if (systemUser) {
            adjustedBy = systemUser._id;
          } else {
            // Create a system user if none exists
            const systemUserData = {
              email: 'system@billing.adjustment',
              full_name: 'System Billing User',
              role: 'employee', // Use valid role from enum
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
            console.log('Created new system user with ID:', adjustedBy);
          }
        }
      } catch (userError) {
        console.error('Error getting adjusted_by user:', userError);
        // As a last resort, create a valid ObjectId
        adjustedBy = new mongoose.Types.ObjectId();
        console.warn('Using fallback ObjectId for adjusted_by:', adjustedBy);
      }

      console.log('Final adjusted_by user ID:', adjustedBy);
      console.log('Is valid ObjectId?', mongoose.Types.ObjectId.isValid(adjustedBy));
      
      // Check if adjustment already exists
      const existingAdjustment = await (BillingAdjustment as any).findOne({
        user_id: mongoose.Types.ObjectId.createFromHexString(user_id),
        project_id: mongoose.Types.ObjectId.createFromHexString(project_id),
        billing_period_start: new Date(start_date),
        billing_period_end: new Date(end_date)
      });

      if (existingAdjustment) {
        // Update existing adjustment
        existingAdjustment.original_billable_hours = original_billable_hours;
        existingAdjustment.adjusted_billable_hours = adjusted_billable_hours;
        existingAdjustment.reason = reason;
        if (req.body.timesheet_id) {
          existingAdjustment.timesheet_id = mongoose.Types.ObjectId.createFromHexString(req.body.timesheet_id);
        }
        existingAdjustment.adjusted_by = adjustedBy;
        existingAdjustment.updated_at = new Date();

        await existingAdjustment.save();

        res.json({
          success: true,
          message: 'Billing adjustment updated successfully',
          data: {
            adjustment_id: existingAdjustment._id,
            original_billable_hours,
            adjusted_billable_hours,
            difference: adjusted_billable_hours - original_billable_hours
          }
        });
      } else {
        // Create new adjustment
        const newAdjustmentData: any = {
          user_id: mongoose.Types.ObjectId.createFromHexString(user_id),
          project_id: mongoose.Types.ObjectId.createFromHexString(project_id),
          billing_period_start: new Date(start_date),
          billing_period_end: new Date(end_date),
          original_billable_hours,
          adjusted_billable_hours,
          reason,
          adjusted_by: adjustedBy
        };

        if (req.body.timesheet_id) {
          newAdjustmentData.timesheet_id = mongoose.Types.ObjectId.createFromHexString(req.body.timesheet_id);
        }

        const newAdjustment = new (BillingAdjustment as any)(newAdjustmentData);

        await newAdjustment.save();

        res.json({
          success: true,
          message: 'Billing adjustment created successfully',
          data: {
            adjustment_id: newAdjustment._id,
            original_billable_hours,
            adjusted_billable_hours,
            difference: adjusted_billable_hours - original_billable_hours
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
