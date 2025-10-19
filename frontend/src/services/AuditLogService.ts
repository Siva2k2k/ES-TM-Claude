import { backendApi, BackendApiError } from '../lib/backendApi';
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
   * Log an audit event (Note: In production, audit logging is typically done server-side)
   * This is kept for backward compatibility but will log a warning
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
    console.warn('Frontend audit logging detected. Audit logs should be created server-side for security.');
    console.log('Audit Event (Client-side log only):', { 
      tableName, 
      recordId, 
      action, 
      actor: actor.full_name,
      details,
      metadata 
    });
    
    // Return success but don't actually log to database from frontend
    return { success: true };
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
      // Build query parameters
      const params = new URLSearchParams();
      
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);
      if (options?.actions && options.actions.length > 0) {
        params.append('actions', options.actions.join(','));
      }
      if (options?.actorId) params.append('actorId', options.actorId);
      if (options?.tableName) params.append('tableName', options.tableName);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());

      const queryString = params.toString();
      const url = `/audit/logs${queryString ? `?${queryString}` : ''}`;

      const response = await backendApi.get<{
        success: boolean;
        logs?: ActivityAuditLog[];
        total?: number;
        hasMore?: boolean;
        error?: string;
      }>(url);

      if (!response.success || response.error) {
        console.error('Error fetching audit logs:', response.error);
        return { logs: [], total: 0, hasMore: false, error: response.error };
      }

      return {
        logs: response.logs || [],
        total: response.total || 0,
        hasMore: response.hasMore || false
      };
    } catch (error) {
      console.error('Error in getAuditLogs:', error);
      const errorMessage = error instanceof BackendApiError 
        ? error.message 
        : (error instanceof Error ? error.message : String(error));
      return { logs: [], total: 0, hasMore: false, error: errorMessage };
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
      const response = await backendApi.get<{
        success: boolean;
        summary?: {
          totalEvents: number;
          userLogins: number;
          timesheetActions: number;
          billingActions: number;
          systemChanges: number;
          securityEvents: number;
          topUsers: Array<{ userId: string; userName: string; eventCount: number }>;
        };
        error?: string;
      }>(`/audit/summary?days=${days}`);

      if (!response.success || response.error) {
        console.error('Error fetching activity summary:', response.error);
        return {
          totalEvents: 0,
          userLogins: 0,
          timesheetActions: 0,
          billingActions: 0,
          systemChanges: 0,
          securityEvents: 0,
          topUsers: [],
          error: response.error
        };
      }

      return {
        totalEvents: response.summary?.totalEvents || 0,
        userLogins: response.summary?.userLogins || 0,
        timesheetActions: response.summary?.timesheetActions || 0,
        billingActions: response.summary?.billingActions || 0,
        systemChanges: response.summary?.systemChanges || 0,
        securityEvents: response.summary?.securityEvents || 0,
        topUsers: response.summary?.topUsers || []
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

      // Backend limits to 1000 per request, so we'll fetch in batches
      const BATCH_SIZE = 1000;
      const MAX_EXPORT_LOGS = 5000; // Export up to 5k logs total
      let allLogs: ActivityAuditLog[] = [];
      let offset = 0;
      let hasMore = true;

      // Fetch logs in batches until we have all logs or reach the max
      while (hasMore && allLogs.length < MAX_EXPORT_LOGS) {
        const result = await this.getAuditLogs({
          startDate,
          endDate,
          limit: BATCH_SIZE,
          offset
        });

        if (result.error) {
          return { success: false, error: result.error };
        }

        allLogs = [...allLogs, ...result.logs];
        hasMore = result.hasMore || false;
        offset += BATCH_SIZE;

        // If we got fewer logs than requested, we've reached the end
        if (result.logs.length < BATCH_SIZE) {
          hasMore = false;
        }
      }

      if (allLogs.length === 0) {
        return { success: false, error: 'No audit logs found for the selected date range' };
      }

      // Generate and download file locally
      if (format === 'csv') {
        this.downloadCSV(allLogs, `audit_logs_${startDate}_to_${endDate}.csv`);
      } else if (format === 'json') {
        this.downloadJSON(allLogs, `audit_logs_${startDate}_to_${endDate}.json`);
      } else {
        return { success: false, error: 'PDF export not yet implemented' };
      }

      console.log(`Exported ${allLogs.length} audit logs successfully`);
      return {
        success: true,
        downloadUrl: `Exported ${allLogs.length} audit logs`
      };
    } catch (error) {
      console.error('Error in exportAuditLogs:', error);
      return { success: false, error: 'Failed to export audit logs' };
    }
  }

  /**
   * Download logs as CSV
   */
  private static downloadCSV(logs: ActivityAuditLog[], filename: string): void {
    const headers = ['Timestamp', 'Actor', 'Action', 'Table', 'Record ID', 'Details'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.actor_name,
      log.action,
      log.table_name,
      log.record_id,
      log.details ? JSON.stringify(log.details) : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * Download logs as JSON
   */
  private static downloadJSON(logs: ActivityAuditLog[], filename: string): void {
    const jsonContent = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * Search audit logs
   */
  static async searchAuditLogs(query: string, options?: {
    limit?: number;
    actions?: AuditAction[];
  }): Promise<{ logs: ActivityAuditLog[]; error?: string }> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (options?.limit) {
        params.append('limit', options.limit.toString());
      }
      
      if (options?.actions && options.actions.length > 0) {
        params.append('actions', options.actions.join(','));
      }

      const response = await backendApi.get<{
        success: boolean;
        logs?: ActivityAuditLog[];
        error?: string;
      }>(`/audit/search?${params.toString()}`);

      if (!response.success || response.error) {
        console.error('Error searching audit logs:', response.error);
        return { logs: [], error: response.error };
      }

      return { logs: response.logs || [] };
    } catch (error) {
      console.error('Error in searchAuditLogs:', error);
      const errorMessage = error instanceof BackendApiError 
        ? error.message 
        : (error instanceof Error ? error.message : String(error));
      return { logs: [], error: errorMessage };
    }
  }

  /**
   * Clear old audit logs (retention policy)
   */
  static async clearOldLogs(retentionDays: number): Promise<{ deletedCount: number; error?: string }> {
    try {
      const response = await backendApi.post<{
        success: boolean;
        deletedCount?: number;
        error?: string;
      }>(`/audit/clear-old`, { retentionDays });

      if (!response.success || response.error) {
        console.error('Error clearing old logs:', response.error);
        return { deletedCount: 0, error: response.error };
      }

      const deletedCount = response.deletedCount || 0;
      console.log(`Cleared ${deletedCount} old audit logs older than ${retentionDays} days`);
      
      return { deletedCount };
    } catch (error) {
      console.error('Error in clearOldLogs:', error);
      const errorMessage = error instanceof BackendApiError 
        ? error.message 
        : (error instanceof Error ? error.message : String(error));
      return { deletedCount: 0, error: errorMessage };
    }
  }
}

export default AuditLogService;