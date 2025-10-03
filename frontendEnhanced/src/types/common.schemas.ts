import { z } from 'zod';

/**
 * Common Validation Schemas
 * Reusable Zod schemas for filters, pagination, search, etc.
 * Phase 4: Forms & Validation
 */

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

export const searchSchema = z.object({
  query: z
    .string()
    .min(0)
    .max(200, 'Search query too long')
    .trim()
    .optional()
    .default(''),
});

export type SearchData = z.infer<typeof searchSchema>;

/**
 * Search with minimum length requirement
 */
export const strictSearchSchema = z.object({
  query: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(200, 'Search query too long')
    .trim(),
});

export type StrictSearchData = z.infer<typeof strictSearchSchema>;

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(10),
  offset: z
    .number()
    .int('Offset must be an integer')
    .min(0, 'Offset cannot be negative')
    .optional(),
});

export type PaginationData = z.infer<typeof paginationSchema>;

/**
 * Calculate offset from page and limit
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Calculate total pages from total count and limit
 */
export function calculateTotalPages(totalCount: number, limit: number): number {
  return Math.ceil(totalCount / limit);
}

// ============================================================================
// SORTING SCHEMAS
// ============================================================================

export const sortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof sortDirectionSchema>;

export const sortSchema = z.object({
  field: z.string().min(1, 'Sort field is required'),
  direction: sortDirectionSchema.default('asc'),
});

export type SortData = z.infer<typeof sortSchema>;

/**
 * Toggle sort direction
 */
export function toggleSortDirection(current: SortDirection): SortDirection {
  return current === 'asc' ? 'desc' : 'asc';
}

// ============================================================================
// DATE RANGE SCHEMAS
// ============================================================================

export const dateRangeSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return start <= end;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type DateRangeData = z.infer<typeof dateRangeSchema>;

/**
 * Date range with optional dates
 */
export const optionalDateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine((data) => {
  if (!data.startDate || !data.endDate) return true;
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return start <= end;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type OptionalDateRangeData = z.infer<typeof optionalDateRangeSchema>;

/**
 * Get current week date range (Monday to Sunday)
 */
export function getCurrentWeekRange(): DateRangeData {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0],
  };
}

/**
 * Get current month date range
 */
export function getCurrentMonthRange(): DateRangeData {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: lastDay.toISOString().split('T')[0],
  };
}

/**
 * Get last N days date range
 */
export function getLastNDaysRange(days: number): DateRangeData {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  };
}

// ============================================================================
// FILTER SCHEMAS
// ============================================================================

/**
 * Generic filter schema for status-based filtering
 */
export const statusFilterSchema = z.object({
  status: z.string().optional(),
});

export type StatusFilterData = z.infer<typeof statusFilterSchema>;

/**
 * Project status filter
 */
export const projectStatusSchema = z.enum(['active', 'completed', 'on_hold', 'cancelled']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectFilterSchema = z.object({
  status: projectStatusSchema.optional(),
  clientId: z.string().optional(),
  managerId: z.string().optional(),
  isBillable: z.boolean().optional(),
});

export type ProjectFilterData = z.infer<typeof projectFilterSchema>;

/**
 * Timesheet status filter
 */
export const timesheetStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected']);
export type TimesheetStatus = z.infer<typeof timesheetStatusSchema>;

export const timesheetFilterSchema = z.object({
  status: timesheetStatusSchema.optional(),
  employeeId: z.string().optional(),
  projectId: z.string().optional(),
  weekStartDate: z.string().optional(),
});

export type TimesheetFilterData = z.infer<typeof timesheetFilterSchema>;

/**
 * Task status filter
 */
export const taskStatusSchema = z.enum(['not_started', 'in_progress', 'completed', 'on_hold']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskFilterSchema = z.object({
  status: taskStatusSchema.optional(),
  assigneeId: z.string().optional(),
  projectId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

export type TaskFilterData = z.infer<typeof taskFilterSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if date string is valid
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Format date for display (YYYY-MM-DD to readable format)
 */
export function formatDate(dateString: string): string {
  if (!isValidDate(dateString)) return 'Invalid date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date range for display
 */
export function formatDateRange(range: DateRangeData): string {
  return `${formatDate(range.startDate)} - ${formatDate(range.endDate)}`;
}

/**
 * Check if date is in the past
 */
export function isPastDate(dateString: string): boolean {
  if (!isValidDate(dateString)) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Check if date is in the future
 */
export function isFutureDate(dateString: string): boolean {
  if (!isValidDate(dateString)) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/**
 * Get number of days between two dates
 */
export function getDaysBetween(startDate: string, endDate: string): number {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Debounce helper for search input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[<>]/g, ''); // Remove potential XSS characters
}

/**
 * Check if filter is empty
 */
export function isFilterEmpty(filter: Record<string, any>): boolean {
  return Object.values(filter).every(value =>
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Clear empty filter values
 */
export function cleanFilters(filter: Record<string, any>): Record<string, any> {
  return Object.entries(filter).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);
}
