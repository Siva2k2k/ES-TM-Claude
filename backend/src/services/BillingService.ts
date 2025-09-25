import { BillingSnapshot, IBillingSnapshot } from '@/models/BillingSnapshot';
import { Timesheet } from '@/models/Timesheet';
import { User, UserRole } from '@/models/User';
import { TimeEntry } from '@/models/TimeEntry';
import { Project } from '@/models/Project';
import { ValidationError, NotFoundError, AuthorizationError } from '@/utils/errors';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  hourly_rate: number;
  is_active: boolean;
  is_approved_by_super_admin: boolean;
}

interface BillingDashboardData {
  totalRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  pendingApprovals: number;
  totalBillableHours: number;
  averageHourlyRate: number;
  revenueGrowth: number;
}

interface ProjectRevenue {
  projectId: string;
  projectName: string;
  revenue: number;
  hours: number;
  rate: number;
}

export class BillingService {
  private static requireManagementRole(user: AuthUser): void {
    if (!['management', 'super_admin'].includes(user.role)) {
      throw new AuthorizationError('Management role required for this operation');
    }
  }

  private static validateBillingSnapshotData(data: Partial<IBillingSnapshot>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.timesheet_id) {
      errors.push('Timesheet ID is required');
    }

    if (!data.user_id) {
      errors.push('User ID is required');
    }

    if (data.total_hours !== undefined && data.total_hours < 0) {
      errors.push('Total hours cannot be negative');
    }

    if (data.billable_hours !== undefined && data.billable_hours < 0) {
      errors.push('Billable hours cannot be negative');
    }

    if (data.hourly_rate !== undefined && data.hourly_rate <= 0) {
      errors.push('Hourly rate must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async generateWeeklySnapshot(
    weekStartDate: string,
    currentUser: AuthUser
  ): Promise<{ snapshots?: IBillingSnapshot[]; error?: string }> {
    try {
      this.requireManagementRole(currentUser);

      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const weekEndDateStr = weekEndDate.toISOString().split('T')[0];

      // Find frozen timesheets for this week that don't have snapshots yet
      const timesheets = (await (Timesheet as any).find({
        status: 'frozen',
        week_start_date: weekStartDate,
        billing_snapshot_id: null,
        deleted_at: null
      }).populate('user_id', 'full_name hourly_rate').populate({
        path: 'time_entries',
        select: 'hours is_billable'
      })) as any[];

      if (!timesheets || timesheets.length === 0) {
        return { error: 'No frozen timesheets found for this week' };
      }

      const snapshotsToCreate = [];

      for (const timesheet of timesheets) {
        const billableHours = timesheet.time_entries
          .filter((entry: any) => entry.is_billable)
          .reduce((sum: number, entry: any) => sum + entry.hours, 0);

        const snapshotData = {
          timesheet_id: timesheet._id,
          user_id: timesheet.user_id._id,
          week_start_date: weekStartDate,
          week_end_date: weekEndDateStr,
          total_hours: timesheet.total_hours,
          billable_hours: billableHours,
          hourly_rate: timesheet.user_id.hourly_rate,
          total_amount: timesheet.total_hours * timesheet.user_id.hourly_rate,
          billable_amount: billableHours * timesheet.user_id.hourly_rate,
          snapshot_data: {
            generated_at: new Date().toISOString(),
            timesheet_status: timesheet.status,
            user_name: timesheet.user_id.full_name,
            generated_by: currentUser.id
          }
        };

        const validation = this.validateBillingSnapshotData(snapshotData);
        if (!validation.isValid) {
          throw new ValidationError(validation.errors.join(', '));
        }

        snapshotsToCreate.push(snapshotData);
      }

      // Create billing snapshots
      const snapshots = await BillingSnapshot.insertMany(snapshotsToCreate);

      // Update timesheets with billing snapshot IDs
      for (let i = 0; i < timesheets.length; i++) {
        await (Timesheet as any).updateOne(
          { _id: timesheets[i]._id },
          {
            billing_snapshot_id: snapshots[i]._id,
            updated_at: new Date()
          }
        );
      }

      return { snapshots };
    } catch (error: any) {
      console.error('Error generating weekly snapshot:', error);
      if (error instanceof AuthorizationError || error instanceof ValidationError) {
        return { error: error.message };
      }
      return { error: 'Failed to generate weekly snapshot' };
    }
  }

  static async getAllBillingSnapshots(
    currentUser: AuthUser
  ): Promise<{ snapshots?: IBillingSnapshot[]; error?: string }> {
    try {
      this.requireManagementRole(currentUser);

      const snapshots = (await (BillingSnapshot as any).find({ deleted_at: null })
        .populate('user_id', 'full_name')
        .populate('timesheet_id', 'status')
        .sort({ week_start_date: -1 })) as IBillingSnapshot[];

      return { snapshots };
    } catch (error: any) {
      console.error('Error fetching billing snapshots:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch billing snapshots' };
    }
  }

  static async getBillingDashboard(
    currentUser: AuthUser
  ): Promise<BillingDashboardData & { error?: string }> {
    try {
      this.requireManagementRole(currentUser);

      // Get all billing snapshots
      const snapshots = (await (BillingSnapshot as any).find({
        deleted_at: null
      }).select('billable_amount billable_hours week_start_date')) as IBillingSnapshot[];

      // Get pending timesheets count
      const pendingCount = await (Timesheet as any).countDocuments({
        status: { $in: ['submitted', 'manager_approved', 'management_pending'] },
        deleted_at: null
      });

      const totalRevenue = snapshots.reduce((sum, s) => sum + s.billable_amount, 0);
      const totalBillableHours = snapshots.reduce((sum, s) => sum + s.billable_hours, 0);

      // Calculate weekly revenue (current week)
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const weeklyRevenue = snapshots
        .filter(s => s.week_start_date === weekStartStr)
        .reduce((sum, s) => sum + s.billable_amount, 0);

      // Calculate monthly revenue (approximate)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

      const monthlyRevenue = snapshots
        .filter(s => s.week_start_date >= monthStart && s.week_start_date <= monthEnd)
        .reduce((sum, s) => sum + s.billable_amount, 0);

      const averageHourlyRate = totalBillableHours > 0 ? totalRevenue / totalBillableHours : 0;

      return {
        totalRevenue,
        weeklyRevenue,
        monthlyRevenue,
        pendingApprovals: pendingCount,
        totalBillableHours,
        averageHourlyRate,
        revenueGrowth: 18 // Mock growth percentage for now
      };
    } catch (error: any) {
      console.error('Error fetching billing dashboard:', error);
      if (error instanceof AuthorizationError) {
        return {
          totalRevenue: 0,
          weeklyRevenue: 0,
          monthlyRevenue: 0,
          pendingApprovals: 0,
          totalBillableHours: 0,
          averageHourlyRate: 0,
          revenueGrowth: 0,
          error: error.message
        };
      }
      return {
        totalRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        pendingApprovals: 0,
        totalBillableHours: 0,
        averageHourlyRate: 0,
        revenueGrowth: 0,
        error: 'Failed to fetch billing dashboard data'
      };
    }
  }

  static async approveMonthlyBilling(
    year: number,
    month: number,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.requireManagementRole(currentUser);

      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      // Update all frozen timesheets for the month to billed status
      const result = await (Timesheet as any).updateMany(
        {
          status: 'frozen',
          week_start_date: { $gte: monthStartStr },
          week_end_date: { $lte: monthEndStr },
          deleted_at: null
        },
        {
          status: 'billed',
          updated_at: new Date()
        }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'No frozen timesheets found for this month' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error approving monthly billing:', error);
      if (error instanceof AuthorizationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to approve monthly billing' };
    }
  }

  static async getRevenueByProject(
    currentUser: AuthUser
  ): Promise<{ projects?: ProjectRevenue[]; error?: string }> {
    try {
      this.requireManagementRole(currentUser);

      // Aggregate revenue by project
      const aggregationResult = await (BillingSnapshot as any).aggregate([
        {
          $match: { deleted_at: null }
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
          $lookup: {
            from: 'timeentries',
            localField: 'timesheet._id',
            foreignField: 'timesheet_id',
            as: 'time_entries'
          }
        },
        {
          $unwind: '$time_entries'
        },
        {
          $match: { 'time_entries.project_id': { $ne: null } }
        },
        {
          $lookup: {
            from: 'projects',
            localField: 'time_entries.project_id',
            foreignField: '_id',
            as: 'project'
          }
        },
        {
          $unwind: '$project'
        },
        {
          $group: {
            _id: '$time_entries.project_id',
            projectName: { $first: '$project.name' },
            revenue: { $sum: '$billable_amount' },
            hours: { $sum: '$billable_hours' }
          }
        },
        {
          $project: {
            projectId: { $toString: '$_id' },
            projectName: 1,
            revenue: 1,
            hours: 1,
            rate: {
              $cond: {
                if: { $gt: ['$hours', 0] },
                then: { $divide: ['$revenue', '$hours'] },
                else: 0
              }
            }
          }
        },
        {
          $sort: { revenue: -1 }
        }
      ]);

      const projects = aggregationResult.map((item: any) => ({
        projectId: item.projectId,
        projectName: item.projectName,
        revenue: item.revenue,
        hours: item.hours,
        rate: item.rate
      }));

      return { projects };
    } catch (error: any) {
      console.error('Error fetching revenue by project:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch revenue by project' };
    }
  }

  static async exportBillingReport(
    startDate: string,
    endDate: string,
    format: 'csv' | 'pdf' | 'excel',
    currentUser: AuthUser
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      this.requireManagementRole(currentUser);

      const snapshots = (await (BillingSnapshot as any).find({
        week_start_date: { $gte: startDate },
        week_end_date: { $lte: endDate },
        deleted_at: null
      })
      .populate('user_id', 'full_name email')
      .populate('timesheet_id', 'week_start_date week_end_date')
      .sort({ week_start_date: 1 })) as IBillingSnapshot[];

      if (snapshots.length === 0) {
        return { success: false, error: 'No billing data found for the specified date range' };
      }

      // In real implementation, this would generate the actual file
      // For now, return a mock download URL
      const timestamp = Date.now();
      const downloadUrl = `/api/v1/billing/export/${timestamp}.${format}`;

      console.log(`Would export ${snapshots.length} billing records in ${format} format`);

      return {
        success: true,
        downloadUrl
      };
    } catch (error: any) {
      console.error('Error exporting billing report:', error);
      if (error instanceof AuthorizationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to export billing report' };
    }
  }

  static async getBillingSnapshotById(
    snapshotId: string,
    currentUser: AuthUser
  ): Promise<{ snapshot?: IBillingSnapshot; error?: string }> {
    try {
      this.requireManagementRole(currentUser);

      const snapshot = (await (BillingSnapshot as any).findById(snapshotId)
        .populate('user_id', 'full_name email')
        .populate('timesheet_id', 'week_start_date week_end_date status')) as IBillingSnapshot;

      if (!snapshot) {
        return { error: 'Billing snapshot not found' };
      }

      return { snapshot };
    } catch (error: any) {
      console.error('Error fetching billing snapshot:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch billing snapshot' };
    }
  }

  static validateBillingSnapshot(snapshot: Partial<IBillingSnapshot>): {
    isValid: boolean;
    errors: string[]
  } {
    return this.validateBillingSnapshotData(snapshot);
  }
}