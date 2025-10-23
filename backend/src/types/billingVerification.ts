/**
 * Billing Verification Types
 * Types for integrating Team Review verification data with Billing Management
 */

export interface VerificationInfo {
  is_verified: boolean;
  verified_at?: Date;
  verified_by?: string;
  verified_by_name?: string;
  worked_hours: number;
  billable_hours: number;
  manager_adjustment: number;
  user_count: number;
}

export interface VerifiedUserBilling {
  user_id: string;
  user_name: string;
  worked_hours: number;
  manager_adjustment: number;
  billable_hours: number;
  verified_at?: Date;
}

export interface VerifiedBillingData {
  project_id: string;
  project_name: string;
  week_start: Date;
  week_end: Date;
  users: VerifiedUserBilling[];
  verification_info: VerificationInfo;
}
