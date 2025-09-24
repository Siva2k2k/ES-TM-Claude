import { supabase } from '../lib/supabase';
import type { User, AuditAction } from '../types';

export interface ActivityAuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  actor_id: string | null;
  actor_name: string;
  timestamp: string;
  details: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Audit Log Service - Supabase Integration
 * Handles security auditing and activity logging with real database operations
 */
export class AuditLogService {
  /**
   * Log an audit event
   */
  static async logEvent(
    tableName: string,
    recordId: string,
    action: AuditAction,
    actor: User,
    details?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    oldData?: Record<string, unknown>,
    newData?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          table_name: tableName,
          record_id: recordId,
          action,
          actor_id: actor.id,
          actor_name: actor.full_name,
          details: details || null,
          metadata: metadata || null,
          old_data: oldData || null,
          new_data: newData || null
        });

      if (error) {
        console.error('Error logging audit event:', error);
        return { success: false, error: error.message };
      }

      console.log('Audit Event Logged:', { tableName, recordId, action, actor: actor.full_name });
      return { success: true };
    } catch (error) {
      console.error('Error in logEvent:', error);
      return { success: false, error: 'Failed to log audit event' };
    }
  }

  /**
   * Get all audit logs with filtering and pagination
   */
  static async getAuditLogs(options?: {
    startDate?: string;
    endDate?: string;
    actions?: AuditAction[];
    actorId?: string;
    tableName?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: ActivityAuditLog[];
    total: number;
    hasMore: boolean;
    error?: string;
  }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      // Apply filters
      if (options?.startDate) {
        query = query.gte('timestamp', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('timestamp', options.endDate);
      }

      if (options?.actions && options.actions.length > 0) {
        query = query.in('action', options.actions);
      }

      if (options?.actorId) {
        query = query.eq('actor_id', options.actorId);
      }

      if (options?.tableName) {
        query = query.eq('table_name', options.tableName);
      }

      // Apply pagination
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      
      query = query
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        return { logs: [], total: 0, hasMore: false, error: error.message };
      }

      return {
        logs: data as ActivityAuditLog[],
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      };
    } catch (error) {
      console.error('Error in getAuditLogs:', error);
      return { logs: [], total: 0, hasMore: false, error: 'Failed to fetch audit logs' };
    }
  }

  /**
   * Get security events (login attempts, permission denials, etc.)
   */
  static async getSecurityEvents(options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{ events: ActivityAuditLog[]; error?: string }> {
    const securityActions: AuditAction[] = [
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_ROLE_CHANGED',
      'ROLE_SWITCHED',
      'PERMISSION_DENIED'
    ];

    const result = await this.getAuditLogs({
      ...options,
      actions: securityActions
    });

    if (result.error) {
      return { events: [], error: result.error };
    }

    return { events: result.logs };
  }

  /**
   * Get user activity timeline
   */
  static async getUserActivity(userId: string, days: number = 30): Promise<{ 
    activities: ActivityAuditLog[]; 
    error?: string 
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.getAuditLogs({
      actorId: userId,
      startDate: startDate.toISOString(),
      limit: 100
    });

    if (result.error) {
      return { activities: [], error: result.error };
    }

    return { activities: result.logs };
  }

  /**
   * Get system activity summary
   */
  static async getActivitySummary(days: number = 7): Promise<{
    totalEvents: number;
    userLogins: number;
    timesheetActions: number;
    billingActions: number;
    systemChanges: number;
    securityEvents: number;
    topUsers: Array<{ userId: string; userName: string; eventCount: number }>;
    error?: string;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, actor_id, actor_name')
        .gte('timestamp', startDate.toISOString())
        .is('deleted_at', null);

      if (error) {
        console.error('Error fetching activity summary:', error);
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

      const logs = data as ActivityAuditLog[];

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
          acc[log.actor_id] = acc[log.actor_id] || { 
            userId: log.actor_id, 
            userName: log.actor_name, 
            eventCount: 0 
          };
          acc[log.actor_id].eventCount++;
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
    } catch (error) {
      console.error('Error in getActivitySummary:', error);
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

  /**
   * Export audit logs
   */
  static async exportAuditLogs(
    startDate: string,
    endDate: string,
    format: 'csv' | 'json' | 'pdf'
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      console.log(`Exporting audit logs from ${startDate} to ${endDate} in ${format} format`);

      const result = await this.getAuditLogs({
        startDate,
        endDate,
        limit: 10000
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      // In real implementation, this would generate the actual file
      console.log(`Would export ${result.logs.length} audit log entries`);

      return {
        success: true,
        downloadUrl: `/api/audit/export/${Date.now()}.${format}`
      };
    } catch (error) {
      console.error('Error in exportAuditLogs:', error);
      return { success: false, error: 'Failed to export audit logs' };
    }
  }

  /**
   * Search audit logs
   */
  static async searchAuditLogs(query: string, options?: {
    limit?: number;
    actions?: AuditAction[];
  }): Promise<{ logs: ActivityAuditLog[]; error?: string }> {
    try {
      let supabaseQuery = supabase
        .from('audit_logs')
        .select('*')
        .is('deleted_at', null);

      if (options?.actions && options.actions.length > 0) {
        supabaseQuery = supabaseQuery.in('action', options.actions);
      }

      // Use text search on actor_name and action
      supabaseQuery = supabaseQuery.or(
        `actor_name.ilike.%${query}%,action.ilike.%${query}%`
      );

      supabaseQuery = supabaseQuery
        .order('timestamp', { ascending: false })
        .limit(options?.limit || 100);

      const { data, error } = await supabaseQuery;

      if (error) {
        console.error('Error searching audit logs:', error);
        return { logs: [], error: error.message };
      }

      return { logs: data as ActivityAuditLog[] };
    } catch (error) {
      console.error('Error in searchAuditLogs:', error);
      return { logs: [], error: 'Failed to search audit logs' };
    }
  }

  /**
   * Clear old audit logs (retention policy)
   */
  static async clearOldLogs(retentionDays: number): Promise<{ deletedCount: number; error?: string }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const { data, error } = await supabase
        .from('audit_logs')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .lt('timestamp', cutoffDate.toISOString())
        .is('deleted_at', null)
        .select('id');

      if (error) {
        console.error('Error clearing old logs:', error);
        return { deletedCount: 0, error: error.message };
      }

      const deletedCount = data.length;
      console.log(`Cleared ${deletedCount} old audit logs older than ${retentionDays} days`);
      
      return { deletedCount };
    } catch (error) {
      console.error('Error in clearOldLogs:', error);
      return { deletedCount: 0, error: 'Failed to clear old logs' };
    }
  }
}

export default AuditLogService;