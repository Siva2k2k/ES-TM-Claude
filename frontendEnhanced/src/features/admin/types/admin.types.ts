/**
 * Admin Types
 * Type definitions for admin feature
 */

import type { UserRole } from '../../../types/common.types';

/**
 * User interface (extended from auth)
 */
export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_approved_by_super_admin: boolean;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
}

/**
 * Client interface
 */
export interface Client {
  id: string;
  name: string;
  contact_person?: string;
  contact_email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_projects?: number;
  active_projects?: number;
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

/**
 * User form data for creation/update
 */
export interface UserFormData {
  full_name: string;
  email: string;
  role: UserRole;
  hourly_rate: number;
}

/**
 * Client form data for creation/update
 */
export interface ClientFormData {
  name: string;
  contact_person: string;
  contact_email: string;
  is_active: boolean;
}

/**
 * Client statistics
 */
export interface ClientStats {
  total_clients: number;
  active_clients: number;
  inactive_clients: number;
  clients_with_active_projects: number;
}

/**
 * User statistics
 */
export interface UserStats {
  total_users: number;
  active_users: number;
  pending_approvals: number;
  by_role: Record<UserRole, number>;
}

/**
 * Audit log filters
 */
export interface AuditLogFilters {
  user_id?: string;
  action?: string;
  entity_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}
