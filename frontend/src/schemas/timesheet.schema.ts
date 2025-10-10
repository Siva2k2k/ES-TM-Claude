import { z } from 'zod';

/**
 * Timesheet Management Validation Schemas
 * Schemas for timesheet entry and approval operations
 */

// Timesheet status enum
export const timesheetStatuses = ['draft', 'submitted', 'approved', 'rejected', 'pending_changes'] as const;
export type TimesheetStatus = typeof timesheetStatuses[number];

// ObjectId validation helper
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format');

// Single timesheet entry schema
export const timesheetEntrySchema = z.object({
  project_id: objectIdSchema,
  task_id: objectIdSchema.optional().nullable(),
  date: z.date({
    required_error: 'Date is required',
    invalid_type_error: 'Invalid date format'
  }),
  hours: z.number()
    .min(0.25, 'Minimum 0.25 hours (15 minutes)')
    .max(24, 'Cannot exceed 24 hours per day')
    .multipleOf(0.25, 'Hours must be in 15-minute increments (0.25)'),
  description: z.string()
    .min(5, 'Description must be at least 5 characters')
    .max(500, 'Description must be less than 500 characters')
    .trim(),
  is_billable: z.boolean().default(true),
  notes: z.string()
    .max(1000, 'Notes too long')
    .optional()
    .or(z.literal(''))
});

// Create single timesheet entry
export const createTimesheetEntrySchema = timesheetEntrySchema.extend({
  user_id: objectIdSchema.optional() // Optional, defaults to current user
});

// Update timesheet entry
export const updateTimesheetEntrySchema = timesheetEntrySchema.partial().extend({
  id: objectIdSchema
});

// Weekly timesheet schema (submitting multiple entries)
export const weeklyTimesheetSchema = z.object({
  week_start_date: z.date({
    required_error: 'Week start date is required (must be Monday)',
    invalid_type_error: 'Invalid date format'
  }),
  entries: z.array(timesheetEntrySchema)
    .min(1, 'At least one entry is required')
    .max(50, 'Maximum 50 entries per week'),
  notes: z.string()
    .max(1000, 'Notes too long')
    .optional()
    .or(z.literal(''))
}).refine((data) => {
  // Validate week start date is a Monday
  const dayOfWeek = data.week_start_date.getDay();
  return dayOfWeek === 1; // 1 = Monday
}, {
  message: 'Week start date must be a Monday',
  path: ['week_start_date']
}).refine((data) => {
  // Validate total hours per day doesn't exceed 24
  const hoursByDate: Record<string, number> = {};

  data.entries.forEach(entry => {
    const dateKey = entry.date.toISOString().split('T')[0];
    hoursByDate[dateKey] = (hoursByDate[dateKey] || 0) + entry.hours;
  });

  return Object.values(hoursByDate).every(hours => hours <= 24);
}, {
  message: 'Total hours per day cannot exceed 24 hours',
  path: ['entries']
}).refine((data) => {
  // Validate all entries are within the selected week
  const weekStart = new Date(data.week_start_date);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return data.entries.every(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= weekStart && entryDate <= weekEnd;
  });
}, {
  message: 'All entries must be within the selected week (Monday to Sunday)',
  path: ['entries']
});

// Timesheet approval schema
export const timesheetApprovalSchema = z.object({
  timesheet_id: objectIdSchema,
  action: z.enum(['approve', 'reject', 'request_changes']),
  comments: z.string()
    .min(5, 'Please provide comments (min 5 characters)')
    .max(1000, 'Comments too long')
    .when('action', {
      is: (val: string) => val === 'reject' || val === 'request_changes',
      then: (schema) => schema,
      otherwise: (schema) => schema.optional()
    })
});

// Timesheet filter schema
export const timesheetFilterSchema = z.object({
  user_id: objectIdSchema.optional(),
  project_id: objectIdSchema.optional(),
  status: z.enum(timesheetStatuses).optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  is_billable: z.boolean().optional(),
  search: z.string().max(200).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.enum(['date', 'hours', 'created_at', 'status']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return data.end_date >= data.start_date;
  }
  return true;
}, {
  message: 'End date must be after or equal to start date',
  path: ['end_date']
});

// Bulk timesheet operations
export const bulkTimesheetActionSchema = z.object({
  entry_ids: z.array(objectIdSchema)
    .min(1, 'At least one entry must be selected')
    .max(50, 'Maximum 50 entries per bulk operation'),
  action: z.enum(['delete', 'copy', 'mark_billable', 'mark_non_billable'])
});

// Copy timesheet entries to another week
export const copyTimesheetSchema = z.object({
  source_week_start: z.date(),
  target_week_start: z.date(),
  entry_ids: z.array(objectIdSchema).optional(), // If empty, copy all entries from source week
  copy_hours: z.boolean().default(true),
  copy_descriptions: z.boolean().default(true)
}).refine((data) => {
  // Ensure target week is different from source week
  const sourceKey = data.source_week_start.toISOString().split('T')[0];
  const targetKey = data.target_week_start.toISOString().split('T')[0];
  return sourceKey !== targetKey;
}, {
  message: 'Target week must be different from source week',
  path: ['target_week_start']
});

// Type exports
export type TimesheetEntryInput = z.infer<typeof timesheetEntrySchema>;
export type CreateTimesheetEntryInput = z.infer<typeof createTimesheetEntrySchema>;
export type UpdateTimesheetEntryInput = z.infer<typeof updateTimesheetEntrySchema>;
export type WeeklyTimesheetInput = z.infer<typeof weeklyTimesheetSchema>;
export type TimesheetApprovalInput = z.infer<typeof timesheetApprovalSchema>;
export type TimesheetFilterInput = z.infer<typeof timesheetFilterSchema>;
export type BulkTimesheetActionInput = z.infer<typeof bulkTimesheetActionSchema>;
export type CopyTimesheetInput = z.infer<typeof copyTimesheetSchema>;
