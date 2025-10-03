/**
 * Project Validation Schemas
 *
 * Zod schemas for project and task validation
 * Centralizes all project-related validation logic
 */

import { z } from 'zod';

// Project Status Enum
export const projectStatusSchema = z.enum(['active', 'completed', 'archived', 'on_hold']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

// Task Status Enum
export const taskStatusSchema = z.enum(['open', 'in_progress', 'completed', 'blocked', 'cancelled']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

// Project Role Enum
export const projectRoleSchema = z.enum(['employee', 'lead', 'manager', 'primary_manager']);
export type ProjectRole = z.infer<typeof projectRoleSchema>;

// Project Form Schema
export const projectFormSchema = z.object({
  name: z.string()
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must not exceed 100 characters')
    .trim(),

  client_id: z.string()
    .min(1, 'Client is required'),

  primary_manager_id: z.string()
    .min(1, 'Primary manager is required'),

  status: projectStatusSchema.default('active'),

  start_date: z.string()
    .min(1, 'Start date is required')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Invalid start date'),

  end_date: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Invalid end date'),

  budget: z.number()
    .min(0, 'Budget must be positive')
    .max(10000000, 'Budget exceeds maximum limit'),

  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),

  is_billable: z.boolean().default(true)
}).refine((data) => {
  // Validate end date is after start date
  if (!data.end_date) return true;
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return end >= start;
}, {
  message: 'End date must be after start date',
  path: ['end_date']
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;

// Task Form Schema
export const taskFormSchema = z.object({
  name: z.string()
    .min(3, 'Task name must be at least 3 characters')
    .max(200, 'Task name must not exceed 200 characters')
    .trim(),

  description: z.string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional(),

  project_id: z.string()
    .min(1, 'Project is required'),

  assigned_to_user_id: z.string()
    .optional(),

  status: taskStatusSchema.default('open'),

  estimated_hours: z.number()
    .min(0, 'Estimated hours must be positive')
    .max(1000, 'Estimated hours exceeds maximum')
    .optional(),

  actual_hours: z.number()
    .min(0, 'Actual hours must be positive')
    .optional(),

  due_date: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Invalid due date'),

  is_billable: z.boolean().default(true),

  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
}).refine((data) => {
  // Validate actual hours don't exceed estimated hours by more than 50%
  if (!data.estimated_hours || !data.actual_hours) return true;
  return data.actual_hours <= data.estimated_hours * 1.5;
}, {
  message: 'Actual hours significantly exceed estimated hours',
  path: ['actual_hours']
});

export type TaskFormData = z.infer<typeof taskFormSchema>;

// Project Member Schema
export const projectMemberSchema = z.object({
  user_id: z.string().min(1, 'User is required'),
  project_role: projectRoleSchema,
  is_primary_manager: z.boolean().default(false),
  is_secondary_manager: z.boolean().default(false),
  hourly_rate: z.number().min(0).optional()
});

export type ProjectMemberData = z.infer<typeof projectMemberSchema>;

// Project Filter Schema
export const projectFilterSchema = z.object({
  status: z.array(projectStatusSchema).optional(),
  client_id: z.string().optional(),
  manager_id: z.string().optional(),
  is_billable: z.boolean().optional(),
  start_date_from: z.string().optional(),
  start_date_to: z.string().optional(),
  search: z.string().optional()
});

export type ProjectFilterData = z.infer<typeof projectFilterSchema>;

// Task Filter Schema
export const taskFilterSchema = z.object({
  status: z.array(taskStatusSchema).optional(),
  project_id: z.string().optional(),
  assigned_to: z.string().optional(),
  priority: z.array(z.enum(['low', 'medium', 'high', 'urgent'])).optional(),
  is_billable: z.boolean().optional(),
  overdue_only: z.boolean().optional(),
  search: z.string().optional()
});

export type TaskFilterData = z.infer<typeof taskFilterSchema>;

// Helper Functions
export function calculateProjectProgress(project: any): number {
  if (!project.tasks || project.tasks.length === 0) return 0;
  const completedTasks = project.tasks.filter((t: any) => t.status === 'completed').length;
  return Math.round((completedTasks / project.tasks.length) * 100);
}

export function calculateBudgetUtilization(project: any): number {
  if (!project.budget || project.budget === 0) return 0;
  const spent = project.total_hours_logged * (project.avg_hourly_rate || 0);
  return Math.round((spent / project.budget) * 100);
}

export function isProjectOverBudget(project: any): boolean {
  return calculateBudgetUtilization(project) > 100;
}

export function isProjectOverdue(project: any): boolean {
  if (!project.end_date) return false;
  const endDate = new Date(project.end_date);
  const today = new Date();
  return today > endDate && project.status !== 'completed';
}

export function isTaskOverdue(task: any): boolean {
  if (!task.due_date || task.status === 'completed') return false;
  const dueDate = new Date(task.due_date);
  const today = new Date();
  return today > dueDate;
}

export function getProjectHealthStatus(project: any): 'healthy' | 'warning' | 'critical' {
  const progress = calculateProjectProgress(project);
  const budgetUtil = calculateBudgetUtilization(project);
  const overdue = isProjectOverdue(project);

  if (overdue || budgetUtil > 110 || (progress < 25 && budgetUtil > 75)) {
    return 'critical';
  }

  if (budgetUtil > 90 || (progress < 50 && budgetUtil > 60)) {
    return 'warning';
  }

  return 'healthy';
}

// Status color helpers
export function getProjectStatusColor(status: ProjectStatus): string {
  const colors: Record<ProjectStatus, string> = {
    active: 'bg-green-100 text-green-800 border-green-300',
    completed: 'bg-blue-100 text-blue-800 border-blue-300',
    archived: 'bg-gray-100 text-gray-800 border-gray-300',
    on_hold: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  };
  return colors[status] || colors.active;
}

export function getTaskStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    open: 'bg-gray-100 text-gray-800 border-gray-300',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    blocked: 'bg-red-100 text-red-800 border-red-300',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-300'
  };
  return colors[status] || colors.open;
}

export function getTaskPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700 border-gray-300',
    medium: 'bg-blue-100 text-blue-700 border-blue-300',
    high: 'bg-orange-100 text-orange-700 border-orange-300',
    urgent: 'bg-red-100 text-red-700 border-red-300'
  };
  return colors[priority] || colors.medium;
}
