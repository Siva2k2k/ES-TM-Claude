import { AuditLog, IAuditLog, AuditAction } from '@/models/AuditLog';
import { User, UserRole } from '@/models/User';
import { ValidationError, AuthorizationError } from '@/utils/errors';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  hourly_rate: number;
  is_active: boolean;
  is_approved_by_super_admin: boolean;
}

interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  actions?: AuditAction[];
  actorId?: string;
  tableName?: string;
  limit?: number;
  offset?: number;
}

interface ActivitySummary {
  totalEvents: number;
  userLogins: number;
  timesheetActions: number;
  billingActions: number;
  systemChanges: number;
  securityEvents: number;
  topUsers: Array<{ userId: string; userName: string; eventCount: number }>;
}

export class AuditLogService {
  private static requireManagementRole(user: AuthUser): void {
    if (!['management', 'super_admin'].includes(user.role)) {
      throw new AuthorizationError('Management role required for audit log access');
    }
  }

  static async logEvent(
    tableName: string,
    recordId: string,
    action: AuditAction,
    actorId: string,
    actorName: string,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    oldData?: Record<string, unknown>,
    newData?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const auditLog = new AuditLog({
        table_name: tableName,
        record_id: recordId,
        action,
        actor_id: actorId,
        actor_name: actorName,
        timestamp: new Date(),
        details: details || null,
        metadata: metadata || null,
        old_data: oldData || null,
        new_data: newData || null
      });

      await auditLog.save();

      console.log('Audit Event Logged:', {
        tableName,
        recordId,
        action,
        actor: actorName
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error logging audit event:', error);
      return { success: false, error: 'Failed to log audit event' };
    }
  }

  static async getAuditLogs(
    filters: AuditLogFilters,
    currentUser: AuthUser
  ): Promise<{
    logs?: IAuditLog[];
    total?: number;
    hasMore?: boolean;
    error?: string;
  }> {
    try {
      this.requireManagementRole(currentUser);

      let query: any = { deleted_at: null };

      // Apply filters
      if (filters.startDate) {
        query.timestamp = { ...query.timestamp, $gte: new Date(filters.startDate) };
      }

      if (filters.endDate) {
        query.timestamp = { ...query.timestamp, $lte: new Date(filters.endDate) };
      }

      if (filters.actions && filters.actions.length > 0) {
        query.action = { $in: filters.actions };
      }

      if (filters.actorId) {
        query.actor_id = filters.actorId;
      }

      if (filters.tableName) {
        query.table_name = filters.tableName;
      }

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      // Get total count
      const total = await (AuditLog as any).countDocuments(query);

      // Get paginated results
      const logs = (await (AuditLog as any).find(query)
        .populate('actor_id', 'full_name email')
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)) as IAuditLog[];

      const hasMore = (offset + limit) < total;

      return {
        logs,
        total,
        hasMore
      };
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch audit logs' };
    }
  }

  static async getSecurityEvents(
    filters: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    },
    currentUser: AuthUser
  ): Promise<{ events?: IAuditLog[]; error?: string }> {
    try {
      this.requireManagementRole(currentUser);

      const securityActions: AuditAction[] = [
        'USER_LOGIN',
        'USER_LOGOUT',
        'USER_ROLE_CHANGED',
        'ROLE_SWITCHED',
        'PERMISSION_DENIED'
      ];

      const result = await this.getAuditLogs({
        ...filters,
        actions: securityActions
      }, currentUser);

      if (result.error) {
        return { error: result.error };
      }

      return { events: result.logs };
    } catch (error: any) {
      console.error('Error fetching security events:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch security events' };
    }
  }

  static async getUserActivity(
    userId: string,
    days: number = 30,
    currentUser: AuthUser
  ): Promise<{ activities?: IAuditLog[]; error?: string }> {
    try {
      // Allow users to see their own activity, Management+ can see all
      if (currentUser.id !== userId && !['management', 'super_admin'].includes(currentUser.role)) {
        throw new AuthorizationError('Insufficient permissions to view user activity');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.getAuditLogs({
        actorId: userId,
        startDate: startDate.toISOString(),
        limit: 100
      }, currentUser.role === 'management' || currentUser.role === 'super_admin' ? currentUser : {
        ...currentUser,
        role: 'management' as UserRole // Temporary elevation for this specific query
      });

      if (result.error) {
        return { error: result.error };
      }

      return { activities: result.logs };
    } catch (error: any) {
      console.error('Error fetching user activity:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch user activity' };
    }
  }

  static async getActivitySummary(
    days: number = 7,
    currentUser: AuthUser
  ): Promise<ActivitySummary & { error?: string }> {
    try {
      this.requireManagementRole(currentUser);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = (await (AuditLog as any).find({
        timestamp: { $gte: startDate },
        deleted_at: null
      }).select('action actor_id actor_name')) as IAuditLog[];

      // Count by action type
      const userLogins = logs.filter(log => log.action === 'USER_LOGIN').length;
      const timesheetActions = logs.filter(log =>
        log.action.includes('TIMESHEET')).length;
      const billingActions = logs.filter(log =>
        log.action.includes('BILLING')).length;
      const systemChanges = logs.filter(log =>
        log.action === 'SYSTEM_CONFIG_CHANGED').length;
      const securityEvents = logs.filter(log =>
        ['USER_LOGIN', 'USER_LOGOUT', 'PERMISSION_DENIED', 'ROLE_SWITCHED']
          .includes(log.action)).length;

      // Top users by activity
      const userActivity = logs.reduce((acc, log) => {
        if (log.actor_id) {
          const actorIdStr = log.actor_id.toString();
          acc[actorIdStr] = acc[actorIdStr] || {
            userId: actorIdStr,
            userName: log.actor_name,
            eventCount: 0
          };
          acc[actorIdStr].eventCount++;
        }
        return acc;
      }, {} as Record<string, { userId: string; userName: string; eventCount: number }>);

      const topUsers = Object.values(userActivity)
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      return {
        totalEvents: logs.length,
        userLogins,
        timesheetActions,
        billingActions,
        systemChanges,
        securityEvents,
        topUsers
      };
    } catch (error: any) {
      console.error('Error fetching activity summary:', error);
      if (error instanceof AuthorizationError) {
        return {
          totalEvents: 0,
          userLogins: 0,
          timesheetActions: 0,
          billingActions: 0,
          systemChanges: 0,
          securityEvents: 0,
          topUsers: [],
          error: error.message
        };
      }
      return {
        totalEvents: 0,
        userLogins: 0,
        timesheetActions: 0,
        billingActions: 0,
        systemChanges: 0,
        securityEvents: 0,
        topUsers: [],
        error: 'Failed to fetch activity summary'
      };
    }
  }

  static async exportAuditLogs(
    startDate: string,
    endDate: string,
    format: 'csv' | 'json' | 'pdf',
    currentUser: AuthUser
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      this.requireManagementRole(currentUser);

      const result = await this.getAuditLogs({
        startDate,
        endDate,
        limit: 10000
      }, currentUser);

      if (result.error) {
        return { success: false, error: result.error };
      }

      if (!result.logs || result.logs.length === 0) {
        return { success: false, error: 'No audit logs found for the specified date range' };
      }

      // In real implementation, this would generate the actual file
      const timestamp = Date.now();
      const downloadUrl = `/api/v1/audit/export/${timestamp}.${format}`;

      console.log(`Would export ${result.logs.length} audit log entries in ${format} format`);

      return {
        success: true,
        downloadUrl
      };
    } catch (error: any) {
      console.error('Error exporting audit logs:', error);
      if (error instanceof AuthorizationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to export audit logs' };
    }
  }

  static async searchAuditLogs(
    query: string,
    options: {
      limit?: number;
      actions?: AuditAction[];
    },
    currentUser: AuthUser
  ): Promise<{ logs?: IAuditLog[]; error?: string }> {
    try {
      this.requireManagementRole(currentUser);

      let mongoQuery: any = {
        deleted_at: null,
        $or: [
          { actor_name: { $regex: query, $options: 'i' } },
          { action: { $regex: query, $options: 'i' } }
        ]
      };

      if (options.actions && options.actions.length > 0) {
        mongoQuery.action = { $in: options.actions };
      }

      const logs = (await (AuditLog as any).find(mongoQuery)
        .populate('actor_id', 'full_name email')
        .sort({ timestamp: -1 })
        .limit(options.limit || 100)) as IAuditLog[];

      return { logs };
    } catch (error: any) {
      console.error('Error searching audit logs:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to search audit logs' };
    }
  }

  static async clearOldLogs(
    retentionDays: number,
    currentUser: AuthUser
  ): Promise<{ deletedCount: number; error?: string }> {
    try {
      if (currentUser.role !== 'super_admin') {
        throw new AuthorizationError('Super Admin role required for log retention management');
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await (AuditLog as any).updateMany(
        {
          timestamp: { $lt: cutoffDate },
          deleted_at: null
        },
        {
          deleted_at: new Date(),
          updated_at: new Date()
        }
      );

      const deletedCount = result.modifiedCount;
      console.log(`Cleared ${deletedCount} old audit logs older than ${retentionDays} days`);

      return { deletedCount };
    } catch (error: any) {
      console.error('Error clearing old logs:', error);
      if (error instanceof AuthorizationError) {
        return { deletedCount: 0, error: error.message };
      }
      return { deletedCount: 0, error: 'Failed to clear old logs' };
    }
  }

  static async getAuditLogById(
    logId: string,
    currentUser: AuthUser
  ): Promise<{ log?: IAuditLog; error?: string }> {
    try {
      this.requireManagementRole(currentUser);

      const log = (await (AuditLog as any).findById(logId)
        .populate('actor_id', 'full_name email')) as IAuditLog;

      if (!log) {
        return { error: 'Audit log not found' };
      }

      return { log };
    } catch (error: any) {
      console.error('Error fetching audit log:', error);
      if (error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch audit log' };
    }
  }
}