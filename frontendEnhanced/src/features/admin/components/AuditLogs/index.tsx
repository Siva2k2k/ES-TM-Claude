/**
 * AuditLogs Component
 * Admin interface for viewing audit logs
 * Simplified version focusing on core functionality
 */

import React, { useEffect, useState } from 'react';
import { FileText, AlertCircle, Loader2, Filter } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { AdminService } from '../../services/adminService';
import { useAuthContext } from '../../../auth';
import type { AuditLog, AuditLogFilters } from '../../types/admin.types';

export interface AuditLogsProps {
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Audit logs component
 * Complexity: 6
 * LOC: ~180
 */
export const AuditLogs: React.FC<AuditLogsProps> = ({ className = '' }) => {
  const { user: currentUser } = useAuthContext();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 50,
    offset: 0,
  });

  const loadLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await AdminService.getAuditLogs(filters);

      if (result.error) {
        setError(result.error);
      } else {
        setLogs(result.logs || []);
      }
    } catch (err) {
      console.error('[AuditLogs] Error loading logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadLogs();
    }
  }, [filters, currentUser]);

  // Permission check
  const canViewAuditLogs = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  if (!canViewAuditLogs) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-error-500 dark:text-error-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">
            Access Denied
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary">
            You don't have permission to view audit logs.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && logs.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400 mx-auto mb-4" />
          <p className="text-text-secondary dark:text-dark-text-secondary">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-error-500 dark:text-error-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary mb-2">
            Error Loading Logs
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary mb-4">{error}</p>
          <Button onClick={loadLogs} variant="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary flex items-center">
            <FileText className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" />
            Audit Logs
          </h2>
          <p className="text-text-secondary dark:text-dark-text-secondary mt-1">
            View system activity and changes
          </p>
        </div>
        <Button onClick={loadLogs} variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Logs List */}
      {logs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-dark-700 rounded-lg">
          <FileText className="h-12 w-12 text-text-tertiary dark:text-dark-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary dark:text-dark-text-primary mb-2">
            No Audit Logs
          </h3>
          <p className="text-text-secondary dark:text-dark-text-secondary">
            No activity has been logged yet.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-800 shadow-sm rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
              <thead className="bg-gray-50 dark:bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                {logs.map((log: AuditLog) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-dark-text-primary">
                      {log.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">
                      {log.entity_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-tertiary dark:text-dark-text-tertiary">
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Info */}
      <div className="text-sm text-text-secondary dark:text-dark-text-secondary text-center">
        Showing {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
      </div>
    </div>
  );
};
