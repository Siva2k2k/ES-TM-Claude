/**
 * Email Types
 * Types for email service operations
 */

/**
 * Email send options
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  replyTo?: string;
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  encoding?: string;
}

/**
 * Welcome email data
 */
export interface WelcomeEmailData {
  user_name: string;
  user_email: string;
  temporary_password?: string;
  login_url?: string;
}

/**
 * Password reset email data
 */
export interface PasswordResetData {
  user_name: string;
  user_email: string;
  reset_token: string;
  reset_url: string;
  expires_in_hours?: number;
}

/**
 * Project invitation email data
 */
export interface ProjectInvitationData {
  user_name: string;
  user_email: string;
  project_name: string;
  project_role: string;
  invited_by: string;
  project_url?: string;
}

/**
 * Timesheet reminder email data
 */
export interface TimesheetReminderData {
  user_name: string;
  user_email: string;
  week_start: string;
  week_end: string;
  timesheet_url?: string;
}

/**
 * Email send result
 */
export interface EmailSendResult {
  success: boolean;
  message_id?: string;
  error?: string;
  rejected?: string[];
}
