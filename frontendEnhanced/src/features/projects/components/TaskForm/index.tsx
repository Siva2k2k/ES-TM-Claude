/**
 * Task Form Component
 * Form for creating/editing tasks
 * Cognitive Complexity: 5
 * File Size: ~170 LOC
 */
import React, { useState, useEffect } from 'react';
import { CheckSquare, Save, X, User, Calendar, Clock } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
} from '../../../../shared/components/ui';
import type { Task, TaskFormData, TaskStatus } from '../../types/project.types';

interface TaskFormProps {
  taskId?: string;
  projectId?: string;
  task?: Task;
  projects?: Array<{ id: string; name: string }>;
  users?: Array<{ id: string; full_name: string }>;
  onSuccess?: (task: Task) => void;
  onCancel?: () => void;
}

const initialFormData: TaskFormData = {
  name: '',
  description: '',
  assigned_to_user_id: '',
  status: 'open',
  estimated_hours: 0,
  is_billable: true,
};

export const TaskForm: React.FC<TaskFormProps> = ({
  taskId,
  projectId,
  task,
  projects = [],
  users = [],
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState<TaskFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        description: task.description || '',
        assigned_to_user_id: task.assigned_to_user_id,
        status: task.status,
        estimated_hours: task.estimated_hours || 0,
        is_billable: task.is_billable,
        due_date: task.due_date,
      });
    }
  }, [task]);

  const updateField = (field: keyof TaskFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Task name is required');
      return false;
    }
    if (!formData.assigned_to_user_id) {
      setError('Please assign the task to a user');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit logic would go here
      // For now, just call onSuccess
      onSuccess?.(formData as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showHoursWarning = formData.estimated_hours && formData.estimated_hours > 40;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          {taskId ? 'Edit Task' : 'Create New Task'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Hours Warning */}
          {showHoursWarning && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200">
                Estimated hours are unusually high. Please verify.
              </p>
            </div>
          )}

          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Task Name *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Enter task name"
              required
            />
          </div>

          {/* Status and Priority Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => updateField('status', e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Estimated Hours
              </label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={formData.estimated_hours}
                onChange={(e) => updateField('estimated_hours', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assigned To *
            </label>
            <select
              value={formData.assigned_to_user_id}
              onChange={(e) => updateField('assigned_to_user_id', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select User</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Due Date
            </label>
            <Input
              type="date"
              value={formData.due_date || ''}
              onChange={(e) => updateField('due_date', e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Task description..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Billable Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_billable}
              onChange={(e) => updateField('is_billable', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Billable Task
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={isSubmitting}>
              <Save className="h-4 w-4 mr-1" />
              {taskId ? 'Update' : 'Create'} Task
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
