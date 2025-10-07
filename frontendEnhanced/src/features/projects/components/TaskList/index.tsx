/**
 * Task List Component
 * Display and manage tasks with filtering
 * Cognitive Complexity: 6
 * File Size: ~180 LOC
 */
import React, { useState, useMemo } from 'react';
import { CheckSquare, Plus, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '../../../../shared/components/ui';
import { TaskCard } from './TaskCard';
import type { Task, TaskStatus } from '../../types/project.types';

interface TaskListProps {
  tasks: Task[];
  viewMode?: 'list' | 'kanban';
  showFilters?: boolean;
  showProject?: boolean;
  onTaskClick?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onCreate?: () => void;
}

const TASK_STATUSES: TaskStatus[] = ['open', 'in_progress', 'blocked', 'completed'];

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  viewMode = 'list',
  showFilters = true,
  showProject = false,
  onTaskClick,
  onEdit,
  onDelete,
  onCreate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | string>('all');

  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => (t.priority || 'medium') === priorityFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.assigned_to_user_name?.toLowerCase().includes(query)
      );
    }

    // Sort by priority then due date
    filtered.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[(a.priority || 'medium') as keyof typeof priorityOrder];
      const bPriority = priorityOrder[(b.priority || 'medium') as keyof typeof priorityOrder];
      if (aPriority !== bPriority) return aPriority - bPriority;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    return filtered;
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      open: [],
      in_progress: [],
      completed: [],
      blocked: [],
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
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Tasks
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Showing {filteredTasks.length} of {tasks.length} tasks
              </p>
            </div>
            {onCreate && (
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={onCreate}>
                New Task
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Filters */}
        {showFilters && (
          <CardContent className="border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter Badges */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    statusFilter === 'all'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  All ({tasks.length})
                </button>
                {TASK_STATUSES.map(status => {
                  const count = tasks.filter(t => t.status === status).length;
                  return (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        statusFilter === status
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Task Display */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchQuery || statusFilter !== 'all' ? 'No tasks match your filters' : 'No tasks yet'}
            </p>
            {onCreate && (
              <Button variant="primary" onClick={onCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TASK_STATUSES.map(status => (
            <Card key={status}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  <Badge variant="secondary" size="sm">
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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
