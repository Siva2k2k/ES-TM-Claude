/**
 * AuditLogTable Component
 * Displays audit logs with filtering and pagination
 * SonarQube Compliant: Cognitive Complexity < 15
 */

import React from 'react';
import {
  Activity,
  User,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface AuditLog {
  _id: string;
  table_name: string;
  record_id: string;
  action: string;
  actor_name: string;
  actor_id?: string;
  timestamp: string;
  details?: Record<string, unknown>;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface AuditLogTableProps {
  logs: AuditLog[];
  loading?: boolean;
  onViewDetails: (log: AuditLog) => void;
}

const getActionColor = (action: string): string => {
  if (action.includes('DELETE') || action.includes('REJECT')) return 'text-red-600 bg-red-50';
  if (action.includes('CREATE') || action.includes('APPROVE')) return 'text-green-600 bg-green-50';
  if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-blue-600 bg-blue-50';
  if (action.includes('LOGIN')) return 'text-purple-600 bg-purple-50';
  return 'text-gray-600 bg-gray-50';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  logs,
  loading = false,
  onViewDetails
}) => {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const toggleRow = (logId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Audit Logs Found</h3>
        <p className="text-gray-600">No activity has been logged for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Timestamp
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actor
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Action
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Table / Record
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Details
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.map((log) => {
            const isExpanded = expandedRows.has(log._id);
            const hasDetails = log.details || log.old_data || log.new_data;

            return (
              <React.Fragment key={log._id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      {formatDate(log.timestamp)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{log.actor_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="font-medium text-gray-900">{log.table_name}</div>
                        <div className="text-xs text-gray-500">{log.record_id.substring(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {hasDetails && (
                      <button
                        onClick={(e) => toggleRow(log._id, e)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                      >
                        {isExpanded ? (
                          <>
                            <span className="mr-1">Hide</span>
                            <ChevronUp className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            <span className="mr-1">View</span>
                            <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>

                {/* Expanded Details Row */}
                {isExpanded && hasDetails && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-3">
                        {log.old_data && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-1">Previous Data:</h4>
                            <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                              {JSON.stringify(log.old_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.new_data && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-1">New Data:</h4>
                            <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                              {JSON.stringify(log.new_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.details && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-1">Details:</h4>
                            <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
