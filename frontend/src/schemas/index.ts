/**
 * Centralized Validation Schemas
 * Export all Zod schemas for easy import across the application
 *
 * Usage:
 *   import { loginSchema, createProjectSchema } from '@/schemas';
 */

// Auth schemas
export * from './auth.schema';

// User management schemas
export * from './user.schema';

// Project & task schemas
export * from './project.schema';

// Timesheet schemas
export * from './timesheet.schema';

// Billing & invoice schemas
export * from './billing.schema';

// Common utility schemas
export * from './common.schema';
