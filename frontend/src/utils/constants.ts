/**
 * Application constants
 * Centralized configuration values
 */

/**
 * User roles
 */
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGEMENT: 'management',
  MANAGER: 'manager',
  LEAD: 'lead',
  EMPLOYEE: 'employee'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Timesheet statuses
export const TIMESHEET_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export type TimesheetStatus = typeof TIMESHEET_STATUS[keyof typeof TIMESHEET_STATUS];
 */

/**
 * Billing statuses
 */
export const BILLING_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
} as const;

export type BillingStatus = typeof BILLING_STATUS[keyof typeof BILLING_STATUS];

/**
 * Priority levels
 */
export const PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;

export type Priority = typeof PRIORITY[keyof typeof PRIORITY];

/**
 * Date formats
 */
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  US: 'MM/DD/YYYY',
  DISPLAY: 'MMM DD, YYYY',
  DATETIME: 'MMM DD, YYYY HH:mm'
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
} as const;

/**
 * Validation constraints
 */
export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_PHONE_LENGTH: 10,
  MAX_PHONE_LENGTH: 15,
  MAX_HOURS_PER_DAY: 24,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
} as const;

/**
 * API configuration
 */
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second
} as const;

/**
 * Toast notification durations
 */
export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  TABLE_PREFERENCES: 'table_preferences'
} as const;

/**
 * Role hierarchy for permissions
 * Higher index = higher privilege
 */
export const ROLE_HIERARCHY: UserRole[] = [
  USER_ROLES.EMPLOYEE,
  USER_ROLES.LEAD,
  USER_ROLES.MANAGER,
  USER_ROLES.MANAGEMENT,
  USER_ROLES.SUPER_ADMIN
];

/**
 * Default avatar colors based on first letter
 */
export const AVATAR_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500'
];

/**
 * Report categories
 */
export const REPORT_CATEGORIES = {
  PERSONAL: 'personal',
  TEAM: 'team',
  PROJECT: 'project',
  FINANCIAL: 'financial',
  EXECUTIVE: 'executive',
  SYSTEM: 'system'
} as const;

export type ReportCategory = typeof REPORT_CATEGORIES[keyof typeof REPORT_CATEGORIES];

/**
 * Report formats
 */
export const REPORT_FORMATS = {
  PDF: 'pdf',
  EXCEL: 'excel',
  CSV: 'csv'
} as const;

export type ReportFormat = typeof REPORT_FORMATS[keyof typeof REPORT_FORMATS];

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

