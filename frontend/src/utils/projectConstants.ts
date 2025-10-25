/**
 * Project Constants
 * Centralized constants for project management
 */

export const PROJECT_STATUSES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled',
} as const;

export const PROJECT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
  { value: 'on_hold', label: 'On Hold' },
] as const;

export const PROJECT_ROLES = {
  MANAGER: 'manager',
  LEAD: 'lead',
  EMPLOYEE: 'employee',
} as const;

export const PROJECT_ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
] as const;

export const TASK_STATUSES = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export const TASK_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
] as const;

export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
} as const;

export type ViewMode = typeof VIEW_MODES[keyof typeof VIEW_MODES];
export type ProjectStatus = 'all' | 'active' | 'completed' | 'archived';
