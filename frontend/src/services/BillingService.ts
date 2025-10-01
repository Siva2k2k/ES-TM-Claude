import { backendApi } from '../lib/backendApi';
import type { BillingSnapshot } from '../types';

/**
 * Billing Management Service - Backend API Integration
 * Handles all billing-related operations with MongoDB backend
 */
interface BillingSummary {
  total_revenue: number;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  average_rate: number;
  entries: Array<{
    id: string;
    name: string;
    hours: number;
    billable_hours: number;
    revenue: number;
    week_start: string;
    is_editable: boolean;
  }>;
}

export class BillingService {
  /**
   * Generate weekly billing snapshot (Management)
   */
  static async generateWeeklySnapshot(weekStartDate: string): Promise<{
    snapshots: BillingSnapshot[];
    error?: string
  }> {
    try {
      console.log(`Management generating weekly billing snapshot for week of ${weekStartDate}`);

      const response = await backendApi.post('/billing/snapshots/generate', {
        weekStartDate
      });

      if (response.success && response.data) {
        console.log(`Generated ${response.data.length} billing snapshots`);
        return { snapshots: response.data as BillingSnapshot[] };
      } else {
        return { snapshots: [], error: response.message || 'Failed to generate weekly snapshot' };
      }
    } catch (error: any) {
      console.error('Error in generateWeeklySnapshot:', error);
      return { snapshots: [], error: error.message || 'Failed to generate weekly snapshot' };
    }
  }

  /**
   * Get all billing snapshots
   */
  static async getAllBillingSnapshots(): Promise<{ snapshots: BillingSnapshot[]; error?: string }> {
    try {
      const response = await backendApi.get('/billing/snapshots');

      if (response.success && response.data) {
        return { snapshots: response.data as BillingSnapshot[] };
      } else {
        return { snapshots: [], error: response.message || 'Failed to fetch billing snapshots' };
      }
    } catch (error: any) {
      console.error('Error in getAllBillingSnapshots:', error);
      return { snapshots: [], error: error.message || 'Failed to fetch billing snapshots' };
    }
  }

  /**
   * Get billing dashboard data
   */
  static async getBillingDashboard(): Promise<{
    totalRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
    pendingApprovals: number;
    totalBillableHours: number;
    averageHourlyRate: number;
    revenueGrowth: number;
    error?: string;
  }> {
    try {
      const response = await backendApi.get('/billing/dashboard');

      if (response.success && response.dashboard) {
        return {
          totalRevenue: response.dashboard.totalRevenue || 0,
          weeklyRevenue: response.dashboard.weeklyRevenue || 0,
          monthlyRevenue: response.dashboard.monthlyRevenue || 0,
          pendingApprovals: response.dashboard.pendingApprovals || 0,
          totalBillableHours: response.dashboard.totalBillableHours || 0,
          averageHourlyRate: response.dashboard.averageHourlyRate || 0,
          revenueGrowth: response.dashboard.revenueGrowth || 0
        };
      } else {
        return {
          totalRevenue: 0,
          weeklyRevenue: 0,
          monthlyRevenue: 0,
          pendingApprovals: 0,
          totalBillableHours: 0,
          averageHourlyRate: 0,
          revenueGrowth: 0,
          error: response.message || 'Failed to fetch billing dashboard data'
        };
      }
    } catch (error: any) {
      console.error('Error in getBillingDashboard:', error);
      return {
        totalRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        pendingApprovals: 0,
        totalBillableHours: 0,
        averageHourlyRate: 0,
        revenueGrowth: 0,
        error: error.message || 'Failed to fetch billing dashboard data'
      };
    }
  }

  /**
   * Approve monthly billing (Management)
   */
  static async approveMonthlyBilling(year: number, month: number): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Management approving monthly billing for ${year}-${month}`);

      const response = await backendApi.post('/billing/approve-monthly', {
        year,
        month
      });

      return {
        success: response.success || false,
        error: response.success ? undefined : (response.message || 'Failed to approve monthly billing')
      };
    } catch (error: any) {
      console.error('Error in approveMonthlyBilling:', error);
      return { success: false, error: error.message || 'Failed to approve monthly billing' };
    }
  }

  /**
   * Get revenue by project
   */
  static async getRevenueByProject(): Promise<{
    projects: Array<{
      projectId: string;
      projectName: string;
      revenue: number;
      hours: number;
      rate: number;
    }>;
    error?: string;
  }> {
    try {
      const response = await backendApi.get('/billing/revenue-by-project');

      if (response.success && response.data) {
        return { projects: response.data };
      } else {
        return { projects: [], error: response.message || 'Failed to fetch revenue by project' };
      }
    } catch (error: any) {
      console.error('Error in getRevenueByProject:', error);
      return { projects: [], error: error.message || 'Failed to fetch revenue by project' };
    }
  }

  /**
   * Export billing report
   */
  static async exportBillingReport(
    startDate: string,
    endDate: string,
    format: 'csv' | 'pdf' | 'excel'
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      console.log(`Exporting billing report from ${startDate} to ${endDate} in ${format} format`);

      const response = await backendApi.post('/billing/export', {
        startDate,
        endDate,
        format
      });

      if (response.success) {
        return {
          success: true,
          downloadUrl: response.downloadUrl
        };
      } else {
        return { success: false, error: response.message || 'Failed to export billing report' };
      }
    } catch (error: any) {
      console.error('Error in exportBillingReport:', error);
      return { success: false, error: error.message || 'Failed to export billing report' };
    }
  }

  /**
   * Validate billing snapshot
   */
  static validateBillingSnapshot(snapshot: Partial<BillingSnapshot>): { 
    isValid: boolean; 
    errors: string[] 
  } {
    const errors: string[] = [];

    if (!snapshot.timesheet_id) {
      errors.push('Timesheet ID is required');
    }

    if (!snapshot.user_id) {
      errors.push('User ID is required');
    }

    if (snapshot.total_hours !== undefined && snapshot.total_hours < 0) {
      errors.push('Total hours cannot be negative');
    }

    if (snapshot.billable_hours !== undefined && snapshot.billable_hours < 0) {
      errors.push('Billable hours cannot be negative');
    }

    if (snapshot.hourly_rate !== undefined && snapshot.hourly_rate <= 0) {
      errors.push('Hourly rate must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get billing summary with filters
   */
  static async getBillingSummary(
    period: 'weekly' | 'monthly',
    filterType: 'project' | 'employee',
    filterId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ summary?: BillingSummary; error?: string }> {
    try {
      const params = new URLSearchParams({
        period,
        filterType,
        ...(filterId && { filterId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      });

      const response = await backendApi.get(`/billing/summary?${params}`);

      if (response.success && response.data) {
        return { summary: response.data as BillingSummary };
      } else {
        return { error: response.message || 'Failed to fetch billing summary' };
      }
    } catch (error: any) {
      console.error('Error in getBillingSummary:', error);
      return { error: error.message || 'Failed to fetch billing summary' };
    }
  }

  /**
   * Update billable hours
   */
  static async updateBillableHours(
    entryId: string,
    newHours: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.patch(`/billing/hours/${entryId}`, {
        hours: newHours
      });

      if (response.success) {
        return { success: true };
      } else {
        return { success: false, error: response.message || 'Failed to update billable hours' };
      }
    } catch (error: any) {
      console.error('Error in updateBillableHours:', error);
      return { success: false, error: error.message || 'Failed to update billable hours' };
    }
  }

  /**
   * Export report for Enhanced Reports component
   */
  static async exportReport(options: {
    startDate: string;
    endDate: string;
    format: 'csv' | 'pdf' | 'excel';
    reportType: string;
  }): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      console.log(`Generating ${options.reportType} report from ${options.startDate} to ${options.endDate} in ${options.format} format`);

      // For now, use the billing export endpoint with additional metadata
      const response = await backendApi.post('/billing/export', {
        startDate: options.startDate,
        endDate: options.endDate,
        format: options.format,
        reportType: options.reportType
      });

      if (response.success) {
        return {
          success: true,
          downloadUrl: response.downloadUrl
        };
      } else {
        return { success: false, error: response.message || 'Failed to generate report' };
      }
    } catch (error: any) {
      console.error('Error in exportReport:', error);
      return { success: false, error: error.message || 'Failed to generate report' };
    }
  }

}

export default BillingService;