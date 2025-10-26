// Export all services from a central location
export { TimesheetService } from './TimesheetService';
export { UserService } from './UserService';
export { ProjectService } from './ProjectService';
export { BillingService } from './BillingService';
export { AuditLogService } from './AuditLogService';
export { NotificationService } from './NotificationService';

// Service-specific types (tightly coupled to service implementation)
export type { TimesheetWithDetails, TimeEntryForm, CalendarData } from './TimesheetService';
export type { UserWithProjectRoles } from './UserService';

// Re-export centralized types for convenience
export type {
  ApiResponse,
  ValidationResult,
  PaginationParams,
  PaginationMeta,
  SearchResult,
  SearchOptions,
  DeleteResult,
  DeletePermission,
  AuditLogFilters,
  DateRangeFilter,
  SortOptions
} from '../types/common';

export type {
  EmailOptions,
  EmailAttachment,
  WelcomeEmailData,
  PasswordResetData,
  ProjectInvitationData,
  TimesheetReminderData,
  EmailSendResult
} from '../types/email';

export type {
  CreateNotificationParams,
  NotificationFilters,
  NotificationUpdateData,
  BulkNotificationResult
} from '../types/notifications';

export type {
  ReportRequest,
  ReportFilters,
  ReportData,
  ReportSummary,
  ReportHistory,
  ReportGenerationResult
} from '../types/reports';

export type {
  RateCalculation,
  RateAdjustment,
  RateSearchCriteria,
  InvoiceDraft,
  InvoiceLineItem,
  InvoiceLineItemSummary,
  InvoiceApprovalThresholds,
  BillingVerificationStatus,
  BillingPeriodSummary
} from '../types/billing';