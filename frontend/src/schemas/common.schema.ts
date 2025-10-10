import { z } from 'zod';

/**
 * Common Validation Schemas
 * Shared schemas and utilities used across the application
 */

// MongoDB ObjectId validation
export const objectIdSchema = z.string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID format')
  .describe('MongoDB ObjectId (24 hex characters)');

// Date range validation
export const dateRangeSchema = z.object({
  start: z.date({
    required_error: 'Start date is required',
    invalid_type_error: 'Invalid start date format'
  }),
  end: z.date({
    required_error: 'End date is required',
    invalid_type_error: 'Invalid end date format'
  })
}).refine((data) => data.end >= data.start, {
  message: 'End date must be after or equal to start date',
  path: ['end']
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  total: z.number().int().min(0).optional() // For response
});

// Sort schema
export const sortSchema = z.object({
  sort_by: z.string().min(1, 'Sort field is required'),
  sort_order: z.enum(['asc', 'desc'], {
    errorMap: () => ({ message: 'Sort order must be either "asc" or "desc"' })
  }).default('desc')
});

// Search schema
export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query cannot be empty')
    .max(200, 'Search query too long'),
  filters: z.record(z.any()).optional(),
  exact_match: z.boolean().default(false)
});

// File upload schema
export const fileUploadSchema = z.object({
  file_name: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name too long'),
  file_size: z.number()
    .int('File size must be an integer')
    .min(1, 'File cannot be empty')
    .max(10 * 1024 * 1024, 'File size cannot exceed 10MB'),
  file_type: z.string()
    .min(1, 'File type is required')
    .regex(/^[a-z]+\/[a-z0-9\-\+\.]+$/i, 'Invalid file type format'),
  file_data: z.string().optional() // Base64 encoded data
});

// Allowed file types for different purposes
export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const allowedDocumentTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Email notification schema
export const emailNotificationSchema = z.object({
  recipient_emails: z.array(z.string().email('Invalid email address'))
    .min(1, 'At least one recipient is required')
    .max(50, 'Maximum 50 recipients per email'),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject too long'),
  body: z.string()
    .min(1, 'Email body is required')
    .max(10000, 'Email body too long'),
  cc_emails: z.array(z.string().email()).max(20).optional(),
  bcc_emails: z.array(z.string().email()).max(20).optional()
});

// Bulk action schema (generic)
export const bulkActionSchema = z.object({
  item_ids: z.array(objectIdSchema)
    .min(1, 'At least one item must be selected')
    .max(100, 'Maximum 100 items per bulk operation'),
  action: z.string().min(1, 'Action is required'),
  reason: z.string()
    .max(500, 'Reason too long')
    .optional()
    .or(z.literal(''))
});

// Comment/note schema
export const commentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment too long (max 2000 characters)')
    .trim(),
  is_internal: z.boolean().default(false), // Internal notes vs public comments
  mentions: z.array(objectIdSchema).max(10).optional() // User IDs mentioned in comment
});

// Audit log filter schema
export const auditLogFilterSchema = z.object({
  user_id: objectIdSchema.optional(),
  table_name: z.string().max(100).optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ROLE_ELEVATED']).optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  search: z.string().max(200).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.enum(['timestamp', 'user', 'action', 'table_name']).default('timestamp'),
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

// Export/report generation schema
export const exportSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf', 'json'], {
    errorMap: () => ({ message: 'Invalid export format' })
  }),
  filters: z.record(z.any()).optional(),
  columns: z.array(z.string()).optional(), // Specific columns to include
  include_headers: z.boolean().default(true),
  date_range: dateRangeSchema.optional()
});

// Settings/configuration schema (generic)
export const settingsSchema = z.object({
  key: z.string()
    .min(1, 'Setting key is required')
    .max(100, 'Setting key too long')
    .regex(/^[a-z0-9_]+$/, 'Setting key can only contain lowercase letters, numbers, and underscores'),
  value: z.any(),
  category: z.string()
    .max(50, 'Category name too long')
    .optional(),
  is_public: z.boolean().default(false) // Whether setting is visible to users or admin-only
});

// Helper functions for common validations
export const validateObjectId = (id: string): boolean => {
  return /^[a-f\d]{24}$/i.test(id);
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Type exports
export type DateRange = z.infer<typeof dateRangeSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type Sort = z.infer<typeof sortSchema>;
export type Search = z.infer<typeof searchSchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;
export type EmailNotification = z.infer<typeof emailNotificationSchema>;
export type BulkAction = z.infer<typeof bulkActionSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type AuditLogFilter = z.infer<typeof auditLogFilterSchema>;
export type Export = z.infer<typeof exportSchema>;
export type Settings = z.infer<typeof settingsSchema>;
