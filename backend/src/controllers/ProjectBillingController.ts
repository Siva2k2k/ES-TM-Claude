import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { Project } from '@/models/Project';
import { TimeEntry } from '@/models/TimeEntry';
import { Timesheet } from '@/models/Timesheet';
import { User } from '@/models/User';
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
}

interface WeeklyBreakdown {
  week_start: string;
  total_hours: number;
  billable_hours: number;
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
        projectIds, 
        view = 'monthly' 
      } = req.query as {
        startDate: string;
        endDate: string;
        projectIds?: string;
        view?: 'weekly' | 'monthly';
      };

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Build project filter
      const projectFilter: any = {};
      if (projectIds) {
        const ids = projectIds.split(',').map(id => new mongoose.Types.ObjectId(id));
        projectFilter._id = { $in: ids };
      }

      // Get projects with time entries from TimeEntry collection
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
                  ...(startDate && endDate ? {
                    date: { $gte: start, $lte: end }
                  } : {})
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
              {
                $unwind: '$timesheet'
              },
              {
                $match: {
                  'timesheet.user_id': { $ne: null },
                  'timesheet.status': { $in: ['frozen', 'approved', 'manager_approved', 'management_approved'] }
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
              {
                $unwind: '$user'
              },
              {
                $project: {
                  user_id: '$timesheet.user_id',
                  user_name: '$user.full_name',
                  user_email: '$user.email',
                  date: 1,
                  hours: 1,
                  is_billable: 1,
                  project_id: 1,
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

        // Group time entries by user
        const userTimeMap = new Map<string, {
          user: any;
          entries: any[];
          totalHours: number;
          billableHours: number;
        }>();

        for (const entry of project.timeEntries) {
          const userId = entry.user_id.toString();
          
          if (!userTimeMap.has(userId)) {
            userTimeMap.set(userId, {
              user: {
                _id: entry.user_id,
                full_name: entry.user_name,
                email: entry.user_email
              },
              entries: [],
              totalHours: 0,
              billableHours: 0
            });
          }

          const userTime = userTimeMap.get(userId)!;
          userTime.entries.push(entry);
          userTime.totalHours += entry.hours;
          if (entry.is_billable) {
            userTime.billableHours += entry.hours;
          }
        }

        // Process each resource (user)
        for (const [userId, userTime] of userTimeMap) {
          const user = userTime.user;
          if (!user) continue;

          // Check for billing adjustment first
          const adjustedBillableHours = await ProjectBillingController.getBillingAdjustment(
            userId, 
            project._id.toString(), 
            start, 
            end
          );

          // Use adjusted hours if available, otherwise use calculated hours from time entries
          const finalBillableHours = adjustedBillableHours !== null ? adjustedBillableHours : userTime.billableHours;

          // Get effective rate for this user/project
          const rateResult = await BillingRateService.getEffectiveRate({
            user_id: mongoose.Types.ObjectId.createFromHexString(userId),
            project_id: mongoose.Types.ObjectId.createFromHexString(project._id.toString()),
            client_id: project.client_id,
            date: new Date(),
            hours: finalBillableHours,
            day_of_week: 1
          });

          const resourceBilling: ResourceBillingData = {
            user_id: userId,
            user_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            role: user.role,
            total_hours: userTime.totalHours,
            billable_hours: finalBillableHours,
            non_billable_hours: userTime.totalHours - finalBillableHours,
            hourly_rate: rateResult.effective_rate,
            total_amount: finalBillableHours * rateResult.effective_rate,
            weekly_breakdown: view === 'weekly' ? await ProjectBillingController.getWeeklyBreakdown(
              userTime.entries, rateResult.effective_rate, start, end
            ) : undefined
          };

          projectBilling.resources.push(resourceBilling);
          projectBilling.total_hours += resourceBilling.total_hours;
          projectBilling.billable_hours += resourceBilling.billable_hours;
          projectBilling.total_amount += resourceBilling.total_amount;
        }

        projectBilling.non_billable_hours = projectBilling.total_hours - projectBilling.billable_hours;
        billingData.push(projectBilling);
      }

      res.json({
        success: true,
        data: {
          projects: billingData,
          summary: {
            total_projects: billingData.length,
            total_hours: billingData.reduce((sum, p) => sum + p.total_hours, 0),
            total_billable_hours: billingData.reduce((sum, p) => sum + p.billable_hours, 0),
            total_amount: billingData.reduce((sum, p) => sum + p.total_amount, 0)
          },
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

      // Calculate original billable hours from time entries
      const start = new Date(start_date);
      const end = new Date(end_date);

      // Find timesheets for this user in the date range
      const timesheets = await (Timesheet as any).find({
        user_id: mongoose.Types.ObjectId.createFromHexString(user_id),
        week_start_date: { $lte: end },
        week_end_date: { $gte: start }
      });

      if (timesheets.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No timesheets found for the specified user and date range'
        });
        return;
      }

      const timesheetIds = timesheets.map((ts: any) => ts._id);

      // Find time entries for this project in those timesheets
      const timeEntries = await (TimeEntry as any).find({
        timesheet_id: { $in: timesheetIds },
        project_id: mongoose.Types.ObjectId.createFromHexString(project_id),
        date: { $gte: start, $lte: end }
      });

      // Calculate original billable hours
      const originalBillableHours = timeEntries.reduce((sum: number, entry: any) => {
        return sum + (entry.is_billable ? entry.hours : 0);
      }, 0);

      // Create or update billing adjustment using the new method
      const adjustmentReq = {
        ...req,
        body: {
          user_id,
          project_id,
          start_date,
          end_date,
          adjusted_billable_hours: billable_hours,
          original_billable_hours: originalBillableHours,
          reason: reason || 'Manual adjustment from billing management'
        }
      };

      await ProjectBillingController.createBillingAdjustment(adjustmentReq, res);

    } catch (error: any) {
      console.error('Error in updateBillableHours:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update billable hours'
      });
    }
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
      if (entry.is_billable) {
        week.billableHours += entry.hours;
      }
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

      const adjustedBy = (req.user as any)?._id;

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
        const newAdjustment = new (BillingAdjustment as any)({
          user_id: mongoose.Types.ObjectId.createFromHexString(user_id),
          project_id: mongoose.Types.ObjectId.createFromHexString(project_id),
          billing_period_start: new Date(start_date),
          billing_period_end: new Date(end_date),
          original_billable_hours,
          adjusted_billable_hours,
          reason,
          adjusted_by: adjustedBy
        });

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
  query('view').optional().isIn(['weekly', 'monthly']).withMessage('View must be weekly or monthly'),
  query('projectIds').optional().isString().withMessage('Project IDs must be a comma-separated string')
];

export const getTaskBillingViewValidation = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  query('projectIds').optional().isString().withMessage('Project IDs must be a comma-separated string'),
  query('taskIds').optional().isString().withMessage('Task IDs must be a comma-separated string')
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

export const createBillingAdjustmentValidation = [
  body('user_id').isMongoId().withMessage('Valid user ID is required'),
  body('project_id').isMongoId().withMessage('Valid project ID is required'),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
  body('end_date').isISO8601().withMessage('Valid end date is required'),
  body('adjusted_billable_hours').isNumeric().withMessage('Adjusted billable hours must be a number'),
  body('original_billable_hours').isNumeric().withMessage('Original billable hours must be a number'),
  body('reason').optional().isString().withMessage('Reason must be a string')
];