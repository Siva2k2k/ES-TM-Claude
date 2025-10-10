import { z } from 'zod';
import { emailSchema } from './auth.schema';

/**
 * User Management Validation Schemas
 * Schemas for user CRUD operations
 */

// System role enum
export const userRoles = ['super_admin', 'management', 'manager', 'lead', 'employee'] as const;
export type UserRole = typeof userRoles[number];

// Phone number schema (optional, basic validation)
export const phoneSchema = z.string()
  .regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

// Base user schema for creation
export const createUserSchema = z.object({
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: emailSchema,
  role: z.enum(userRoles, {
    errorMap: () => ({ message: 'Please select a valid role' })
  }),
  phone: phoneSchema,
  department: z.string()
    .max(100, 'Department name too long')
    .optional()
    .or(z.literal('')),
  is_active: z.boolean().default(true),
  send_welcome_email: z.boolean().default(true)
});

// Update user schema (all fields optional except ID)
export const updateUserSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID'),
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  email: emailSchema.optional(),
  role: z.enum(userRoles).optional(),
  phone: phoneSchema,
  department: z.string()
    .max(100, 'Department name too long')
    .optional()
    .or(z.literal('')),
  is_active: z.boolean().optional()
});

// Bulk user operations schema
export const bulkUserActionSchema = z.object({
  user_ids: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID'))
    .min(1, 'At least one user must be selected'),
  action: z.enum(['activate', 'deactivate', 'delete', 'export']),
  reason: z.string()
    .max(500, 'Reason must be less than 500 characters')
    .optional()
});

// User filter schema
export const userFilterSchema = z.object({
  role: z.enum(userRoles).optional(),
  is_active: z.boolean().optional(),
  department: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.enum(['full_name', 'email', 'role', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// User profile update schema (for users updating their own profile)
export const updateProfileSchema = z.object({
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  phone: phoneSchema,
  department: z.string()
    .max(100, 'Department name too long')
    .optional()
    .or(z.literal(''))
});

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type BulkUserActionInput = z.infer<typeof bulkUserActionSchema>;
export type UserFilterInput = z.infer<typeof userFilterSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
