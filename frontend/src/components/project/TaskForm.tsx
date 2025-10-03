/**
 * TaskForm Component
 *
 * Form for creating and editing tasks with validation.
 *
 * Features:
 * - Create/edit tasks
 * - Project and user assignment
 * - Priority and status management
 * - Time estimation
 * - Due date tracking
 *
 * Cognitive Complexity: 6 (Target: <15)
 */

import React from 'react';
import { Controller } from 'react-hook-form';
import { CheckSquare, User, Calendar, Clock, AlertCircle, Save } from 'lucide-react';
import { useTaskForm } from '../../hooks/useTaskForm';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { TaskFormData } from '../../types/project.schemas';

export interface TaskFormProps {
  /** Task ID for editing */
  taskId?: string;
  /** Project ID (required for new tasks) */
  projectId?: string;
  /** Initial form data */
  initialData?: Partial<TaskFormData>;
  /** Available projects */
  projects?: Array<{ id: string; name: string }>;
  /** Available users for assignment */
  users?: Array<{ id: string; name: string; email: string }>;
  /** Success callback */
  onSuccess?: (taskId: string) => void;
  /** Cancel callback */
  onCancel?: () => void;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'cancelled', label: 'Cancelled' }
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

export const TaskForm: React.FC<TaskFormProps> = ({
  taskId,
  projectId,
  initialData,
  projects = [],
  users = [],
  onSuccess,
  onCancel
}) => {
  const { form, isSubmitting, error, submitTask } = useTaskForm({
    taskId,
    projectId,
    defaultValues: initialData,
    onSuccess
  });

  const { control, watch, formState: { errors } } = form;
  const estimatedHours = watch('estimated_hours');
  const actualHours = watch('actual_hours');

  const projectOptions: SelectOption[] = projects.map(p => ({
    value: p.id,
    label: p.name
  }));

  const userOptions: SelectOption[] = [
    { value: '', label: 'Unassigned' },
    ...users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))
  ];

  const showHoursWarning = estimatedHours && actualHours && actualHours > estimatedHours * 1.5;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          {taskId ? 'Edit Task' : 'Create New Task'}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Hours Warning */}
        {showHoursWarning && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Hours Exceeded</AlertTitle>
            <AlertDescription>
              Actual hours significantly exceed estimated hours. Consider reviewing the estimate.
            </AlertDescription>
          </Alert>
        )}

        {/* Task Name */}
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="Task Name *"
              placeholder="Enter task name"
              error={errors.name?.message}
              icon={CheckSquare}
            />
          )}
        />

        {/* Project Selection (only for new tasks) */}
        {!projectId && (
          <Controller
            name="project_id"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                label="Project *"
                options={projectOptions}
                placeholder="Select a project"
                error={errors.project_id?.message}
              />
            )}
          />
        )}

        {/* Status and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                label="Status"
                options={STATUS_OPTIONS}
                error={errors.status?.message}
              />
            )}
          />
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                label="Priority"
                options={PRIORITY_OPTIONS}
                error={errors.priority?.message}
              />
            )}
          />
        </div>

        {/* Assigned To */}
        <Controller
          name="assigned_to_user_id"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              label="Assigned To"
              options={userOptions}
              placeholder="Select assignee"
              error={errors.assigned_to_user_id?.message}
              icon={User}
            />
          )}
        />

        {/* Time Estimates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="estimated_hours"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                label="Estimated Hours"
                placeholder="0"
                step="0.5"
                min="0"
                error={errors.estimated_hours?.message}
                icon={Clock}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              />
            )}
          />
          <Controller
            name="actual_hours"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                label="Actual Hours"
                placeholder="0"
                step="0.5"
                min="0"
                error={errors.actual_hours?.message}
                icon={Clock}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              />
            )}
          />
        </div>

        {/* Due Date */}
        <Controller
          name="due_date"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="date"
              label="Due Date"
              error={errors.due_date?.message}
              icon={Calendar}
            />
          )}
        />

        {/* Description */}
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              label="Description"
              placeholder="Enter task description..."
              rows={4}
              error={errors.description?.message}
            />
          )}
        />

        {/* Billable Checkbox */}
        <Controller
          name="is_billable"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              label="Billable Task"
            />
          )}
        />
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-6">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          icon={Save}
          onClick={submitTask}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          {taskId ? 'Update Task' : 'Create Task'}
        </Button>
      </CardFooter>
    </Card>
  );
};
