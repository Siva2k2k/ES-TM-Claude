import React from 'react';
import { CheckSquare, Plus, Edit, Trash2 } from 'lucide-react';
import type { Task } from '../../../types';

interface ProjectTasksSectionProps {
  projectId: string;
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

/**
 * ProjectTasksSection Component
 * Displays tasks in project expanded details
 *
 * Features:
 * - Task list with status and estimated hours
 * - Add task button
 * - Edit/delete task actions
 * - Empty state
 * - Hover-reveal actions
 */
export const ProjectTasksSection: React.FC<ProjectTasksSectionProps> = ({
  projectId,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
}) => {
  return (
    <div data-project-id={projectId}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-purple-600" />
          Tasks ({tasks.length})
        </h4>
        <button
          onClick={onAddTask}
          className="text-sm text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-400 font-medium flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{task.status}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{task.estimated_hours || 0}h</span>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEditTask(task)}
                className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                title="Edit task"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDeleteTask(task.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                title="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-3">No tasks created</p>
        )}
      </div>
    </div>
  );
};
