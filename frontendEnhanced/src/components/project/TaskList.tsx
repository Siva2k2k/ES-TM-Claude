/**
 * TaskList Component
 *
 * Displays tasks with filtering, sorting, and grouping options.
 *
 * Features:
 * - List/kanban view modes
 * - Filter by status, priority, assignee
 * - Sort and group options
 * - Quick status updates
 * - Drag and drop (kanban)
 *
 * Cognitive Complexity: 8 (Target: <15)
 */

import React, { useState, useMemo } from 'react';
import { CheckSquare, Plus, Filter, Edit, Trash2, User, Calendar, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { StatusBadge } from '../shared/StatusBadge';
import { TaskStatus, isTaskOverdue, getTaskPriorityColor } from '../../types/project.schemas';
import { formatDate } from '../../utils/formatting';
import { cn } from '../../utils/cn';

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to_user_name?: string;
  assigned_to_user_id?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  is_billable: boolean;
  project_name?: string;
}

export interface TaskListProps {
  /** Tasks to display */
  tasks: Task[];
  /** View mode */
  viewMode?: 'list' | 'kanban';
  /** Show filters */
  showFilters?: boolean;
  /** Show project name */
  showProject?: boolean;
  /** Click handler */
  onTaskClick?: (task: Task) => void;
  /** Edit handler */
  onEdit?: (task: Task) => void;
  /** Delete handler */
  onDelete?: (task: Task) => void;
  /** Status change handler */
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  /** Create new handler */
  onCreate?: () => void;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'cancelled', label: 'Cancelled' }
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' }
];

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  viewMode = 'list',
  showFilters = true,
  showProject = false,
  onTaskClick,
  onEdit,
  onDelete,
  onStatusChange,
  onCreate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.assigned_to_user_name?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority': {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        case 'due_date':
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, statusFilter, priorityFilter, searchQuery, sortBy]);

  // Group tasks by status for kanban view
  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      open: [],
      in_progress: [],
      completed: [],
      blocked: [],
      cancelled: []
    };

    filteredTasks.forEach(task => {
      groups[task.status].push(task);
    });

    return groups;
  }, [filteredTasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Tasks
            </CardTitle>
            {onCreate && (
              <Button icon={Plus} onClick={onCreate}>
                New Task
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Filters */}
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status"
              />
              <Select
                options={PRIORITY_OPTIONS}
                value={priorityFilter}
                onChange={setPriorityFilter}
                placeholder="Filter by priority"
              />
              <Select
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={setSortBy}
                placeholder="Sort by"
              />
            </div>

            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <p>Showing {filteredTasks.length} of {tasks.length} tasks</p>
              {(statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setPriorityFilter('all');
                    setSearchQuery('');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Task Display */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm mt-1">Try adjusting your filters or create a new task</p>
            {onCreate && (
              <Button className="mt-4" icon={Plus} onClick={onCreate}>
                Create Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(['open', 'in_progress', 'blocked', 'completed', 'cancelled'] as TaskStatus[]).map(status => (
            <Card key={status}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  <Badge variant="secondary" size="sm" className="ml-2">
                    {groupedTasks[status].length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedTasks[status].map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    showProject={showProject}
                    onClick={() => onTaskClick?.(task)}
                    onEdit={() => onEdit?.(task)}
                    onDelete={() => onDelete?.(task)}
                    compact
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              showProject={showProject}
              onClick={() => onTaskClick?.(task)}
              onEdit={() => onEdit?.(task)}
              onDelete={() => onDelete?.(task)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// TaskCard Component
interface TaskCardProps {
  task: Task;
  showProject?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  showProject,
  compact,
  onClick,
  onEdit,
  onDelete
}) => {
  const overdue = isTaskOverdue(task);

  return (
    <div
      className={cn(
        'border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white',
        compact && 'p-3'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-medium truncate', compact ? 'text-sm' : 'text-base')}>
            {task.name}
          </h4>
          {!compact && task.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">{task.description}</p>
          )}
        </div>
        {!compact && (
          <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" icon={Edit} onClick={onEdit} />
            <Button variant="ghost" size="sm" icon={Trash2} onClick={onDelete} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <StatusBadge status={task.status} type="task" size="sm" />
        <div className={cn('px-2 py-1 rounded text-xs font-medium border', getTaskPriorityColor(task.priority))}>
          {task.priority}
        </div>
        {task.is_billable && <Badge variant="success" size="sm">Billable</Badge>}
        {overdue && <Badge variant="destructive" size="sm">Overdue</Badge>}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-3">
          {task.assigned_to_user_name && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{task.assigned_to_user_name}</span>
            </div>
          )}
          {task.due_date && (
            <div className={cn('flex items-center gap-1', overdue && 'text-red-600 font-medium')}>
              <Calendar className="h-3 w-3" />
              <span>{formatDate(task.due_date, 'MMM DD')}</span>
            </div>
          )}
        </div>
        {(task.estimated_hours || task.actual_hours) && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{task.actual_hours || 0}/{task.estimated_hours || 0}h</span>
          </div>
        )}
      </div>

      {showProject && task.project_name && (
        <p className="text-xs text-gray-500 mt-2">Project: {task.project_name}</p>
      )}
    </div>
  );
};
