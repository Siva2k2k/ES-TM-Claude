// @ts-nocheck
import mongoose from 'mongoose';
import { ReportTemplate, IReportTemplate, ReportCategory } from '../models/ReportTemplate';
import { User, IUser, UserRole } from '../models/User';
import { Timesheet } from '../models/Timesheet';
import { TimeEntry } from '../models/TimeEntry';
import { Project } from '../models/Project';
import { BillingSnapshot } from '../models/BillingSnapshot';
import { AuditLog } from '../models/AuditLog';
import { AuditLogService } from './AuditLogService';
import { AuthUser } from '@/utils/auth';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError
} from '@/utils/errors';
import { logger } from '@/config/logger';

export interface ReportRequest {
  template_id: string;
  user_id: string;
  user_role: UserRole;
  date_range: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  format: 'pdf' | 'excel' | 'csv';
  custom_fields?: string[];
}

export interface ReportData {
  template: IReportTemplate;
  data: any[];
  metadata: {
    generated_at: Date;
    generated_by: string;
    report_name: string;
    date_range: { start: Date; end: Date };
    total_records: number;
    filters_applied: Record<string, any>;
  };
}

export interface ReportHistory {
  id: string;
  template_id: string;
  template_name: string;
  generated_at: Date;
  generated_by: string;
  format: string;
  status: 'completed' | 'failed' | 'processing';
  file_path?: string;
  error?: string;
}

/**
 * Main Report Service - Orchestrates report generation with role-based access
 */
export class ReportService {
  /**
   * Get all available report templates for a user based on their role
   */
  static async getAvailableTemplates(currentUser: AuthUser): Promise<{
    templates: IReportTemplate[];
    error?: string;
  }> {
    try {
      // Find templates where user's role is in allowed_roles
      const templates = await ReportTemplate.find({
        allowed_roles: currentUser.role,
        is_active: true
      })
        .sort({ category: 1, sort_order: 1 })
        .lean()
        .exec();

      logger.info(`Found ${templates.length} templates for role ${currentUser.role}`);
      return { templates };
    } catch (error) {
      logger.error('Error fetching templates:', error);
      return { templates: [], error: 'Failed to fetch report templates' };
    }
  }

  /**
   * Get templates by category with role filtering
   */
  static async getTemplatesByCategory(
    category: ReportCategory,
    currentUser: AuthUser
  ): Promise<{ templates: IReportTemplate[]; error?: string }> {
    try {
      const templates = await ReportTemplate.find({
        category,
        allowed_roles: currentUser.role,
        is_active: true
      })
        .sort({ sort_order: 1 })
        .lean()
        .exec();

      return { templates };
    } catch (error) {
      logger.error('Error fetching templates by category:', error);
      return { templates: [], error: 'Failed to fetch templates' };
    }
  }

  /**
   * Validate if user can access a specific report template
   */
  static async validateTemplateAccess(
    templateId: string,
    currentUser: AuthUser
  ): Promise<{ valid: boolean; template?: IReportTemplate; error?: string }> {
    try {
      const template = await ReportTemplate.findOne({
        template_id: templateId,
        is_active: true
      }).lean().exec();

      if (!template) {
        return { valid: false, error: 'Report template not found' };
      }

      // Check if user's role is allowed
      if (!template.allowed_roles.includes(currentUser.role)) {
        return { valid: false, error: 'You do not have permission to access this report' };
      }

      // Check required permissions
      if (template.required_permissions && template.required_permissions.length > 0) {
        // TODO: Implement permission checking
        // For now, assume role-based access is sufficient
      }

      return { valid: true, template };
    } catch (error) {
      logger.error('Error validating template access:', error);
      return { valid: false, error: 'Failed to validate access' };
    }
  }

  /**
   * Apply role-based data filters to query
   */
  static applyRoleBasedFilters(
    template: IReportTemplate,
    currentUser: AuthUser,
    baseFilter: any = {}
  ): any {
    const accessRules = template.data_access_rules[currentUser.role];

    if (!accessRules) {
      // Provide default access rules based on role
      logger.warn(`No access rules defined for role: ${currentUser.role}, using defaults`);
      return this.getDefaultAccessRulesForRole(currentUser, baseFilter);
    }

    let filter = { ...baseFilter };

    // Apply access level filters based on role
    switch (currentUser.role) {
      case 'employee':
        // Employee can only see their own data
        if (accessRules.can_access_own_data) {
          filter.user_id = new mongoose.Types.ObjectId(currentUser.id);
        }
        break;

      case 'lead':
        // Lead can see own data + team data
        if (template.category === 'personal') {
          filter.user_id = new mongoose.Types.ObjectId(currentUser.id);
        } else if (template.category === 'team' && accessRules.can_access_team_data) {
          // TODO: Get team member IDs and filter
          // For now, filter by manager_id in users collection
          filter.$or = [
            { user_id: new mongoose.Types.ObjectId(currentUser.id) },
            { manager_id: new mongoose.Types.ObjectId(currentUser.id) }
          ];
        }
        break;

      case 'manager':
        // Manager can see own + team + managed projects
        if (template.category === 'personal') {
          filter.user_id = new mongoose.Types.ObjectId(currentUser.id);
        } else if (template.category === 'team') {
          filter.$or = [
            { user_id: new mongoose.Types.ObjectId(currentUser.id) },
            { manager_id: new mongoose.Types.ObjectId(currentUser.id) }
          ];
        } else if (template.category === 'project' && accessRules.can_access_project_data) {
          // Filter projects managed by this user
          if (accessRules.additional_filters?.manager_only) {
            filter.manager_id = new mongoose.Types.ObjectId(currentUser.id);
          }
        }
        break;

      case 'management':
      case 'super_admin':
        // Management and Super Admin can see all data
        if (template.category === 'personal') {
          // Even management can generate personal reports for themselves
          filter.user_id = new mongoose.Types.ObjectId(currentUser.id);
        }
        // For other categories, no additional filters (can see all)
        break;
    }

    // Apply additional filters from access rules
    if (accessRules.additional_filters) {
      filter = { ...filter, ...accessRules.additional_filters };
    }

    return filter;
  }

  /**
   * Get default access rules for a role when none are defined in template
   */
  private static getDefaultAccessRulesForRole(
    currentUser: AuthUser,
    baseFilter: any = {}
  ): any {
    let filter = { ...baseFilter };

    // Apply default role-based filters
    switch (currentUser.role) {
      case 'employee':
        // Employee can only see their own data
        filter.user_id = new mongoose.Types.ObjectId(currentUser.id);
        break;

      case 'lead':
        // Lead can see own data + team data
        filter.$or = [
          { user_id: new mongoose.Types.ObjectId(currentUser.id) },
          { manager_id: new mongoose.Types.ObjectId(currentUser.id) }
        ];
        break;

      case 'manager':
        // Manager can see own + team + managed projects  
        filter.$or = [
          { user_id: new mongoose.Types.ObjectId(currentUser.id) },
          { manager_id: new mongoose.Types.ObjectId(currentUser.id) }
        ];
        break;

      case 'management':
      case 'super_admin':
        // Management and Super Admin can see all data
        // No additional filters needed
        break;

      default:
        // Unknown role - restrict to own data only
        logger.warn(`Unknown role: ${currentUser.role}, restricting to own data`);
        filter.user_id = new mongoose.Types.ObjectId(currentUser.id);
        break;
    }

    return filter;
  }

  /**
   * Generate report data based on template and user access
   */
  static async generateReportData(
    request: ReportRequest,
    currentUser: AuthUser
  ): Promise<{ reportData?: ReportData; error?: string }> {
    try {
      // Validate template access
      const validation = await this.validateTemplateAccess(request.template_id, currentUser);
      if (!validation.valid || !validation.template) {
        return { error: validation.error || 'Invalid template' };
      }

      const template = validation.template;

      // Build base filter
      let baseFilter: any = {
        deleted_at: { $exists: false }
      };

      // Add date range filter if provided
      if (request.date_range) {
        baseFilter.created_at = {
          $gte: request.date_range.start,
          $lte: request.date_range.end
        };
      }

      // Add custom filters from request
      if (request.filters) {
        baseFilter = { ...baseFilter, ...request.filters };
      }

      // Apply role-based filters
      const filter = this.applyRoleBasedFilters(template, currentUser, baseFilter);

      // Fetch data based on template data source
      let data: any[] = [];

      switch (template.data_source.collection) {
        case 'timesheets':
          data = await this.fetchTimesheetData(filter, template);
          break;
        case 'users':
          data = await this.fetchUserData(filter, template);
          break;
        case 'projects':
          data = await this.fetchProjectData(filter, template);
          break;
        case 'billing_snapshots':
          data = await this.fetchBillingData(filter, template);
          break;
        case 'audit_logs':
          data = await this.fetchAuditLogData(filter, template);
          break;
        default:
          return { error: 'Unsupported data source' };
      }

      // Create report data object
      const reportData: ReportData = {
        template,
        data,
        metadata: {
          generated_at: new Date(),
          generated_by: currentUser.full_name,
          report_name: template.name,
          date_range: request.date_range,
          total_records: data.length,
          filters_applied: filter
        }
      };

      // Log report generation
      await AuditLogService.logEvent(
        'reports',
        template._id.toString(),
        'REPORT_GENERATED',
        currentUser.id,
        currentUser.full_name,
        {
          template_id: template.template_id,
          template_name: template.name,
          format: request.format,
          records_count: data.length
        },
        { report_generation: true },
        null,
        { generated_at: new Date() }
      );

      logger.info(`Report generated: ${template.name} with ${data.length} records`);
      return { reportData };
    } catch (error) {
      logger.error('Error generating report data:', error);
      return { error: 'Failed to generate report data' };
    }
  }

  /**
   * Fetch timesheet data with relations
   */
  private static async fetchTimesheetData(filter: any, template: IReportTemplate): Promise<any[]> {
    const query = Timesheet.find(filter);

    // Always populate user information for display purposes
    query.populate('user_id', 'full_name email role hourly_rate');
    
    // Populate additional related data based on template configuration
    if (template.data_source.include_related?.includes('projects')) {
      // Additional project data will be populated via time entries
    }

    let timesheets = await query.lean().exec();

    // If template needs time entries, fetch them separately and add to timesheets
    if (template.data_source.include_related?.includes('time_entries') || 
        template.data_source.include_related?.includes('projects')) {
      
      for (const timesheet of timesheets) {
        // Fetch time entries for this timesheet
        const timeEntryQuery = TimeEntry.find({ timesheet_id: timesheet._id });
        
        // Populate projects if needed
        if (template.data_source.include_related?.includes('projects')) {
          timeEntryQuery.populate('project_id', 'name client_id');
          timeEntryQuery.populate('task_id', 'name description');
        }
        
        const timeEntries = await timeEntryQuery.lean().exec();
        
        // Add time entries to timesheet
        (timesheet as any).time_entries = timeEntries;
      }
    }

    return timesheets;
  }

  /**
   * Fetch user data with relations
   */
  private static async fetchUserData(filter: any, template: IReportTemplate): Promise<any[]> {
    const query = User.find(filter).select('-password_hash -temporary_password');

    if (template.data_source.include_related?.includes('timesheets')) {
      // Aggregate timesheet data
      // This would be done via aggregation pipeline
    }

    const data = await query.lean().exec();
    return data;
  }

  /**
   * Fetch project data with relations
   */
  private static async fetchProjectData(filter: any, template: IReportTemplate): Promise<any[]> {
    const query = Project.find(filter);

    if (template.data_source.include_related?.includes('clients')) {
      query.populate('client_id', 'name contact_email');
    }
    if (template.data_source.include_related?.includes('users')) {
      query.populate('manager_id', 'full_name email');
    }

    const data = await query.lean().exec();
    return data;
  }

  /**
   * Fetch billing data with relations
   */
  private static async fetchBillingData(filter: any, template: IReportTemplate): Promise<any[]> {
    const query = BillingSnapshot.find(filter);

    if (template.data_source.include_related?.includes('clients')) {
      query.populate({
        path: 'timesheet_id',
        populate: { path: 'project_id', populate: 'client_id' }
      });
    }
    if (template.data_source.include_related?.includes('projects')) {
      query.populate('timesheet_id', 'project_id');
    }
    if (template.data_source.include_related?.includes('users')) {
      query.populate('user_id', 'full_name email role');
    }

    const data = await query.lean().exec();
    return data;
  }

  /**
   * Fetch audit log data with relations
   */
  private static async fetchAuditLogData(filter: any, template: IReportTemplate): Promise<any[]> {
    const query = AuditLog.find(filter);

    // Include user information if requested
    if (template.data_source.include_related?.includes('users')) {
      query.populate('actor_id', 'full_name email role');
    }

    const data = await query.lean().exec();
    return data;
  }

  /**
   * Get report generation history for user
   */
  static async getReportHistory(
    currentUser: AuthUser,
    limit: number = 50
  ): Promise<{ history: ReportHistory[]; error?: string }> {
    try {
      // TODO: Implement report history collection
      // For now, return from audit logs
      // @ts-ignore - Mongoose query type compatibility
      const logsResult = await AuditLogService.getAuditLogs(currentUser as any, { actorId: currentUser.id, limit });
      const logs = logsResult.logs || [];

      const history: ReportHistory[] = logs.map((log: any) => ({
        id: log._id.toString(),
        template_id: log.metadata.template_id,
        template_name: log.metadata.template_name,
        generated_at: log.created_at,
        generated_by: log.actor_name,
        format: log.metadata.format,
        status: 'completed' as const,
        file_path: undefined
      }));

      return { history };
    } catch (error) {
      logger.error('Error fetching report history:', error);
      return { history: [], error: 'Failed to fetch report history' };
    }
  }

  /**
   * Create custom report template
   */
  static async createCustomReport(
    templateData: Partial<IReportTemplate>,
    currentUser: AuthUser
  ): Promise<{ template?: IReportTemplate; error?: string }> {
    try {
      // Only management and super admin can create custom templates
      if (!['management', 'super_admin'].includes(currentUser.role)) {
        throw new AuthorizationError('Only management and super admin can create custom reports');
      }

      // Generate unique template ID
      const templateId = `custom-${Date.now()}-${currentUser.id.substring(0, 8)}`;

      const template = new ReportTemplate({
        ...templateData,
        template_id: templateId,
        created_by: currentUser.id,
        is_active: true
      });

      await template.save();

      // Audit log
      await AuditLogService.logEvent(
        'report_templates',
        template._id.toString(),
        'CUSTOM_REPORT_CREATED',
        currentUser.id,
        currentUser.full_name,
        {
          template_id: template.template_id,
          name: template.name,
          category: template.category
        },
        { custom_report: true },
        null,
        template.toJSON()
      );

      logger.info(`Custom report created: ${template.name} by ${currentUser.full_name}`);
      return { template };
    } catch (error) {
      logger.error('Error creating custom report:', error);
      return { error: 'Failed to create custom report' };
    }
  }

  /**
   * Get live analytics data for dashboard
   */
  static async getLiveAnalytics(currentUser: AuthUser): Promise<{
    analytics?: any;
    error?: string;
  }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());

      // Build role-based filter
      let userFilter: any = {};
      if (currentUser.role === 'employee') {
        userFilter.user_id = new mongoose.Types.ObjectId(currentUser.id);
      } else if (currentUser.role === 'lead') {
        // Get team members
        const teamMembers = await User.find({
          manager_id: currentUser.id,
          is_active: true
        }).select('_id');
        const teamIds = teamMembers.map(u => u._id);
        userFilter.user_id = { $in: [new mongoose.Types.ObjectId(currentUser.id), ...teamIds] };
      } else if (currentUser.role === 'manager') {
        // Get all team members recursively
        // For simplicity, just get direct reports
        const teamMembers = await User.find({
          manager_id: currentUser.id,
          is_active: true
        }).select('_id');
        const teamIds = teamMembers.map(u => u._id);
        userFilter.user_id = { $in: [new mongoose.Types.ObjectId(currentUser.id), ...teamIds] };
      }
      // Management and Super Admin see all data (no filter)

      // Aggregate timesheet data
      const timesheetStats = await Timesheet.aggregate([
        {
          $match: {
            ...userFilter,
            created_at: { $gte: startOfMonth },
            deleted_at: { $exists: false }
          }
        },
        {
          $group: {
            _id: null,
            total_hours: { $sum: '$total_hours' },
            total_timesheets: { $sum: 1 },
            submitted: {
              $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
            },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'manager_approved'] }, 1, 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
            }
          }
        }
      ]);

      // Aggregate billing data (if user has access)
      let billingStats = null;
      if (['manager', 'management', 'super_admin'].includes(currentUser.role)) {
        billingStats = await BillingSnapshot.aggregate([
          {
            $match: {
              created_at: { $gte: startOfMonth },
              deleted_at: { $exists: false }
            }
          },
          {
            $group: {
              _id: null,
              total_revenue: { $sum: '$billable_amount' },
              total_hours_billed: { $sum: '$billable_hours' },
              total_snapshots: { $sum: 1 }
            }
          }
        ]);
      }

      // Get weekly trend
      const weeklyTrend = await Timesheet.aggregate([
        {
          $match: {
            ...userFilter,
            created_at: { $gte: startOfWeek },
            deleted_at: { $exists: false }
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: '$created_at' },
            hours: { $sum: '$total_hours' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      const analytics = {
        timesheet: timesheetStats[0] || {
          total_hours: 0,
          total_timesheets: 0,
          submitted: 0,
          approved: 0,
          pending: 0
        },
        billing: billingStats ? billingStats[0] : null,
        weekly_trend: weeklyTrend,
        generated_at: now,
        period: 'current_month',
        user_scope: currentUser.role
      };

      return { analytics };
    } catch (error) {
      logger.error('Error fetching live analytics:', error);
      return { error: 'Failed to fetch analytics' };
    }
  }
}

export default ReportService;
