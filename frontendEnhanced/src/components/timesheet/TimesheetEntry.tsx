/**
 * TimesheetEntry Component
 *
 * Individual timesheet entry component for display and editing.
 * Supports inline editing and quick actions.
 *
 * Features:
 * - Compact and expanded view modes
 * - Inline editing
 * - Quick duplicate and delete
 * - Project/task display
 * - Billable indicator
 *
 * Cognitive Complexity: 6 (Target: <15)
 */

import React, { useState } from 'react';
import { Clock, Edit2, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDate, formatDuration } from '../../utils/formatting';
import { cn } from '../../utils/cn';
import type { TimeEntry } from '../../types/timesheet.schemas';

export interface TimesheetEntryProps {
  /** The time entry data */
  entry: TimeEntry;
  /** Project name for display */
  projectName?: string;
  /** Task name for display */
  taskName?: string;
  /** Compact mode (less details) */
  compact?: boolean;
  /** Show actions */
  showActions?: boolean;
  /** Expandable mode */
  expandable?: boolean;
  /** Initially expanded */
  defaultExpanded?: boolean;
  /** Callback when entry is edited */
  onEdit?: (entry: TimeEntry) => void;
  /** Callback when entry is deleted */
  onDelete?: (entry: TimeEntry) => void;
  /** Callback when entry is duplicated */
  onDuplicate?: (entry: TimeEntry) => void;
  /** Custom className */
  className?: string;
}

export const TimesheetEntry: React.FC<TimesheetEntryProps> = ({
  entry,
  projectName = 'Unknown Project',
  taskName,
  compact = false,
  showActions = true,
  expandable = false,
  defaultExpanded = false,
  onEdit,
  onDelete,
  onDuplicate,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(entry);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(entry);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate?.(entry);
  };

  const toggleExpand = () => {
    if (expandable) setIsExpanded(!isExpanded);
  };

  // Compact view
  if (compact && !isExpanded) {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-shadow',
          expandable && 'cursor-pointer',
          className
        )}
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="font-semibold">{entry.hours}h</span>
          </div>
          <Badge variant="secondary" size="sm">{projectName}</Badge>
          {taskName && <span className="text-sm text-gray-600">{taskName}</span>}
          {entry.is_billable && <Badge variant="success" size="sm">Billable</Badge>}
        </div>
        {showActions && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" icon={Edit2} onClick={handleEdit} />
            <Button variant="ghost" size="sm" icon={Trash2} onClick={handleDelete} />
          </div>
        )}
        {expandable && (
          <ChevronDown className="h-4 w-4 text-gray-400 ml-2" />
        )}
      </div>
    );
  }

  // Expanded/Full view
  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden hover:shadow-md transition-shadow',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'p-4 bg-gray-50 border-b',
          expandable && 'cursor-pointer'
        )}
        onClick={toggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold text-gray-900">{projectName}</h4>
            <Badge variant="secondary">{formatDate(entry.date, 'MMM DD, YYYY')}</Badge>
            {entry.is_billable && <Badge variant="success">Billable</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-lg font-bold text-gray-900">
                {formatDuration(entry.hours)}
              </span>
            </div>
            {expandable && (
              <Button
                variant="ghost"
                size="sm"
                icon={isExpanded ? ChevronUp : ChevronDown}
              />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Task Info */}
        {taskName && (
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Task</p>
            <p className="text-sm text-gray-900">{taskName}</p>
          </div>
        )}

        {/* Entry Type */}
        {entry.entry_type && entry.entry_type !== 'project_task' && (
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Entry Type</p>
            <Badge variant="outline">
              {entry.entry_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </Badge>
          </div>
        )}

        {/* Description */}
        {entry.description && (
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.description}</p>
          </div>
        )}

        {/* Date and Hours Grid */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Date</p>
            <p className="text-sm font-medium">{formatDate(entry.date, 'MMMM DD, YYYY')}</p>
            <p className="text-xs text-gray-500">
              {formatDate(entry.date, 'dddd')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Hours</p>
            <p className="text-sm font-medium">{entry.hours} hours</p>
            {entry.is_billable && (
              <p className="text-xs text-green-600">Billable time</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              icon={Edit2}
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Copy}
              onClick={handleDuplicate}
            >
              Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Trash2}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Grouped Entries Component - displays multiple entries together
export interface GroupedTimesheetEntriesProps {
  /** Entries to display */
  entries: TimeEntry[];
  /** Group by field */
  groupBy?: 'date' | 'project' | 'task' | 'none';
  /** Projects lookup */
  projects?: Array<{ id: string; name: string }>;
  /** Tasks lookup */
  tasks?: Array<{ id: string; name: string }>;
  /** Callback handlers */
  onEdit?: (entry: TimeEntry) => void;
  onDelete?: (entry: TimeEntry) => void;
  onDuplicate?: (entry: TimeEntry) => void;
}

export const GroupedTimesheetEntries: React.FC<GroupedTimesheetEntriesProps> = ({
  entries,
  groupBy = 'date',
  projects = [],
  tasks = [],
  onEdit,
  onDelete,
  onDuplicate
}) => {
  const getProjectName = (projectId?: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const getTaskName = (taskId?: string) => {
    return tasks.find(t => t.id === taskId)?.name;
  };

  // Group entries
  const groupedEntries = React.useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Entries': entries };
    }

    const groups: Record<string, TimeEntry[]> = {};

    entries.forEach(entry => {
      let key: string;
      switch (groupBy) {
        case 'date':
          key = formatDate(entry.date, 'MMMM DD, YYYY');
          break;
        case 'project':
          key = getProjectName(entry.project_id);
          break;
        case 'task':
          key = getTaskName(entry.task_id) || 'No Task';
          break;
        default:
          key = 'All';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });

    return groups;
  }, [entries, groupBy, projects, tasks]);

  // Calculate group totals
  const getGroupTotal = (groupEntries: TimeEntry[]) => {
    return groupEntries.reduce((sum, entry) => sum + entry.hours, 0);
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedEntries).map(([groupName, groupEntries]) => (
        <div key={groupName}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">{groupName}</h3>
            <Badge variant="secondary">
              {formatDuration(getGroupTotal(groupEntries))} • {groupEntries.length} {groupEntries.length === 1 ? 'entry' : 'entries'}
            </Badge>
          </div>
          <div className="space-y-2">
            {groupEntries.map((entry, idx) => (
              <TimesheetEntry
                key={idx}
                entry={entry}
                projectName={getProjectName(entry.project_id)}
                taskName={getTaskName(entry.task_id)}
                compact={true}
                expandable={true}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
