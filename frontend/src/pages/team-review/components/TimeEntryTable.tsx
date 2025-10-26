/**
 * Phase 7: Time Entry Table Component
 * Displays project-filtered time entries in a mobile-responsive table
 */

import React from 'react';
import { Calendar, Clock, FileText, Tag } from 'lucide-react';
import type { TimeEntry } from '../../../types';
import * as formatting from '../../../utils/formatting';  

interface TimeEntryTableProps {
  entries: TimeEntry[];
  projectId?: string;
  showProjectColumn?: boolean;
}

/**
 * Format time to HH:MM
 */
const formatTime = (time: string): string => {
  if (!time) return '--:--';
  return time.substring(0, 5); // Extract HH:MM from HH:MM:SS
};

export const TimeEntryTable: React.FC<TimeEntryTableProps> = ({
  entries,
  projectId,
  showProjectColumn = false
}) => {
  // Calculate total hours
  const totalHours = entries.reduce((sum, entry) => sum + entry.hours_worked, 0);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No time entries found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-3">
        {entries.map((entry, index) => (
          <div key={entry.id || index} className="bg-white border border-gray-200 rounded-lg p-4">
            {/* Date and Hours */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center text-sm text-gray-900">
                <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                <span className="font-medium">{formatting.formatDate(entry.date, 'long')}</span>
              </div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                <Clock className="w-3 h-3 mr-1" />
                {entry.hours_worked}h
              </div>
            </div>

            {/* Time Range */}
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <Clock className="w-4 h-4 mr-2 text-gray-400" />
              <span>
                {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
              </span>
            </div>

            {/* Task */}
            {entry.task_name && (
              <div className="flex items-start text-sm text-gray-600 mb-2">
                <Tag className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{entry.task_name}</span>
              </div>
            )}

            {/* Description */}
            {entry.description && (
              <div className="flex items-start text-sm text-gray-600">
                <FileText className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{entry.description}</span>
              </div>
            )}

            {/* Project (if showing) */}
            {showProjectColumn && entry.project_name && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  {entry.project_name}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hours
              </th>
              {showProjectColumn && (
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
              )}
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry, index) => (
              <tr key={entry.id || index} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatting.formatDate(entry.date, 'long')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {entry.hours_worked}h
                  </span>
                </td>
                {showProjectColumn && (
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {entry.project_name || '--'}
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-gray-900">
                  {entry.task_name || '--'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                  {entry.description || '--'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={showProjectColumn ? 2 : 1} className="px-4 py-3 text-sm font-medium text-gray-900">
                Total Hours:
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                  {totalHours.toFixed(1)}h
                </span>
              </td>
              <td colSpan={showProjectColumn ? 3 : 2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary Footer (Mobile) */}
      <div className="block sm:hidden bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Total Hours:</span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
            <Clock className="w-4 h-4 mr-1" />
            {totalHours.toFixed(1)}h
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </p>
      </div>
    </div>
  );
};
