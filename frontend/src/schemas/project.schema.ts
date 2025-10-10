import { z } from 'zod';

/**
 * Project & Task Management Validation Schemas
 * Schemas for project and task CRUD operations
 */

// Project status enum
export const projectStatuses = ['active', 'on_hold', 'completed', 'cancelled'] as const;
export type ProjectStatus = typeof projectStatuses[number];

// Task priority enum
export const taskPriorities = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = typeof taskPriorities[number];

// Task status enum
export const taskStatuses = ['todo', 'in_progress', 'in_review', 'completed', 'blocked'] as const;
export type TaskStatus = typeof taskStatuses[number];

// Project role enum (project-specific roles)
export const projectRoles = ['secondary_manager', 'lead', 'employee'] as const;
export type ProjectRole = typeof projectRoles[number];

// ObjectId validation helper
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format');

// Create project schema
export const createProjectSchema = z.object({
  name: z.string()
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name must be less than 100 characters')
    .trim(),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters')
    .trim(),
  client_id: objectIdSchema,
  start_date: z.date({
    required_error: 'Start date is required',
    invalid_type_error: 'Invalid date format'
  }),
  end_date: z.date({
    invalid_type_error: 'Invalid date format'
  }).optional().nullable(),
  budget: z.number()
    .min(0, 'Budget cannot be negative')
    .max(10000000, 'Budget exceeds maximum allowed (10M)')
    .optional()
    .nullable(),
  status: z.enum(projectStatuses).default('active'),
  is_billable: z.boolean().default(true)
}).refine((data) => {
  if (data.end_date && data.start_date) {
    return data.end_date >= data.start_date;
  }
  return true;
}, {
  message: 'End date must be after or equal to start date',
  path: ['end_date']
});

// Update project schema
export const updateProjectSchema = createProjectSchema.partial().extend({
  id: objectIdSchema
});

// Create task schema
export const createTaskSchema = z.object({
  project_id: objectIdSchema,
  title: z.string()
    .min(2, 'Task title must be at least 2 characters')
    .max(200, 'Task title must be less than 200 characters')
    .trim(),
  description: z.string()
    .max(2000, 'Description too long (max 2000 characters)')
    .optional()
    .or(z.literal('')),
  assigned_to: objectIdSchema.optional().nullable(),
  priority: z.enum(taskPriorities).default('medium'),
  status: z.enum(taskStatuses).default('todo'),
  estimated_hours: z.number()
    .min(0, 'Hours cannot be negative')
    .max(1000, 'Estimated hours seems unreasonably high')
    .optional()
    .nullable(),
  due_date: z.date({
    invalid_type_error: 'Invalid date format'
  }).optional().nullable(),
  tags: z.array(z.string().max(50)).max(10, 'Maximum 10 tags allowed').optional()
});

// Update task schema
export const updateTaskSchema = createTaskSchema.partial().extend({
  id: objectIdSchema
});

// Project member schema (adding/updating members)
export const projectMemberSchema = z.object({
  project_id: objectIdSchema,
  user_id: objectIdSchema,
  project_role: z.enum(projectRoles),
  is_secondary_manager: z.boolean().default(false),
  hourly_rate: z.number()
    .min(0, 'Hourly rate cannot be negative')
    .max(10000, 'Hourly rate seems unreasonably high')
    .optional()
    .nullable()
});

// Role elevation schema (elevating lead to secondary manager)
export const roleElevationSchema = z.object({
  project_id: objectIdSchema,
  user_id: objectIdSchema,
  target_role: z.literal('secondary_manager'),
  reason: z.string()
    .min(10, 'Please provide a reason for elevation (min 10 characters)')
    .max(500, 'Reason too long')
    .optional()
});

// Project filter schema
export const projectFilterSchema = z.object({
  status: z.enum(projectStatuses).optional(),
  client_id: objectIdSchema.optional(),
  search: z.string().max(200).optional(),
  is_billable: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.enum(['name', 'start_date', 'end_date', 'budget', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Task filter schema
export const taskFilterSchema = z.object({
  project_id: objectIdSchema.optional(),
  assigned_to: objectIdSchema.optional(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  search: z.string().max(200).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.enum(['title', 'priority', 'due_date', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Type exports
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ProjectMemberInput = z.infer<typeof projectMemberSchema>;
export type RoleElevationInput = z.infer<typeof roleElevationSchema>;
export type ProjectFilterInput = z.infer<typeof projectFilterSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
