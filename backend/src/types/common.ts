/**
 * Common Types
 * Shared types used across multiple services
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_more?: boolean;
}

/**
 * Search result from SearchService
 */
export interface SearchResult {
  entity_type: 'user' | 'project' | 'client' | 'timesheet' | 'task';
  entity_id: string;
  title: string;
  description?: string;
  url?: string;
  metadata?: Record<string, any>;
  score?: number;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Search options for SearchService
 */
export interface SearchOptions {
  query: string;
  entity_types?: ('user' | 'project' | 'client' | 'timesheet' | 'task')[];
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Delete operation result from DeleteService
 */
export interface DeleteResult {
  success: boolean;
  entity_type: string;
  entity_id: string;
  deleted_count: number;
  related_deletions?: Array<{
    entity_type: string;
    count: number;
  }>;
  message?: string;
  error?: string;
}

/**
 * Delete permission check from DeleteService
 */
export interface DeletePermission {
  can_delete: boolean;
  reason?: string;
  blocked_by?: string[];
  warnings?: string[];
}

/**
 * Audit log filter parameters
 */
export interface AuditLogFilters {
  entity_type?: string;
  entity_id?: string;
  action?: string;
  user_id?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  start_date: string | Date;
  end_date: string | Date;
}

/**
 * Sort options
 */
export interface SortOptions {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
