/**
 * Search Feature Type Definitions
 * System-wide global search functionality
 */

export type SearchCategory =
  | 'navigation'
  | 'users'
  | 'projects'
  | 'tasks'
  | 'timesheets'
  | 'reports'
  | 'billing'
  | 'settings';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: SearchCategory;
  type: string;
  url: string;
  icon?: string;
  score?: number;
  metadata?: Record<string, any>;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  category: SearchCategory;
  url: string;
  icon?: string;
  shortcut?: string;
}

export interface SearchFilters {
  categories?: SearchCategory[];
  limit?: number;
}
