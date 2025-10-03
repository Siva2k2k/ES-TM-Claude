import { z } from 'zod';

/**
 * Timesheet Validation Schemas
 * Centralized Zod schemas for timesheet forms
 * Replaces inline validation logic
 */

// Entry type enum
export const entryTypeSchema = z.enum(['project_task', 'non_project', 'leave', 'holiday']);

// Time entry schema
export const timeEntrySchema = z.object({
  project_id: z.string().optional(),
  task_id: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  hours: z.number()
    .min(0.5, 'Minimum 0.5 hours')
    .max(24, 'Maximum 24 hours per day'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  is_billable: z.boolean().default(true),
  entry_type: entryTypeSchema.default('project_task'),
}).refine(
  (data) => {
    // Project tasks require project_id and task_id
    if (data.entry_type === 'project_task') {
      return !!data.project_id && !!data.task_id;
    }
    return true;
  },
  {
    message: 'Project and task are required for project tasks',
    path: ['project_id'],
  }
).refine(
  (data) => {
    // Don't allow future dates
    const entryDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate <= today;
  },
  {
    message: 'Future dates are not allowed',
    path: ['date'],
  }
);

// Timesheet form schema
export const timesheetFormSchema = z.object({
  week_start_date: z.string().min(1, 'Week start date is required'),
  entries: z.array(timeEntrySchema).min(1, 'At least one entry is required'),
}).refine(
  (data) => {
    // Validate daily totals (8-10 hours per day)
    const dailyTotals: Record<string, number> = {};

    data.entries.forEach((entry) => {
      dailyTotals[entry.date] = (dailyTotals[entry.date] || 0) + entry.hours;
    });

    const invalidDays = Object.entries(dailyTotals).filter(
      ([_, total]) => total < 8 || total > 10
    );

    return invalidDays.length === 0;
  },
  {
    message: 'Each day must have between 8-10 hours',
    path: ['entries'],
  }
).refine(
  (data) => {
    // Validate weekly total (max 56 hours)
    const weekTotal = data.entries.reduce((sum, entry) => sum + entry.hours, 0);
    return weekTotal <= 56;
  },
  {
    message: 'Weekly total cannot exceed 56 hours',
    path: ['entries'],
  }
).refine(
  (data) => {
    // Check for duplicate entries (same project/task/date)
    const seen = new Set<string>();

    for (const entry of data.entries) {
      const key = `${entry.project_id}-${entry.task_id}-${entry.date}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
    }

    return true;
  },
  {
    message: 'Duplicate entries for same project/task/date',
    path: ['entries'],
  }
).refine(
  (data) => {
    // Check that all weekdays (Mon-Fri) have entries
    const dates = data.entries.map((e) => e.date);
    const weekStart = new Date(data.week_start_date);
    const requiredDays = 5; // Monday through Friday

    const hasAllWeekdays = Array.from({ length: requiredDays }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dayString = day.toISOString().split('T')[0];
      return dates.includes(dayString);
    }).every(Boolean);

    return hasAllWeekdays;
  },
  {
    message: 'Missing entries for some weekdays (Mon-Fri)',
    path: ['entries'],
  }
);

// Type exports
export type TimeEntry = z.infer<typeof timeEntrySchema>;
export type TimesheetFormData = z.infer<typeof timesheetFormSchema>;
export type EntryType = z.infer<typeof entryTypeSchema>;

/**
 * Validation helper functions
 */

export function validateDailyHours(hours: number): boolean {
  return hours >= 8 && hours <= 10;
}

export function validateWeeklyHours(hours: number): boolean {
  return hours <= 56;
}

export function getDailyTotals(entries: TimeEntry[]): Record<string, number> {
  return entries.reduce((acc, entry) => {
    acc[entry.date] = (acc[entry.date] || 0) + entry.hours;
    return acc;
  }, {} as Record<string, number>);
}

export function getWeeklyTotal(entries: TimeEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.hours, 0);
}

export function hasDuplicateEntries(entries: TimeEntry[]): boolean {
  const seen = new Set<string>();

  for (const entry of entries) {
    const key = `${entry.project_id}-${entry.task_id}-${entry.date}`;
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
  }

  return false;
}
