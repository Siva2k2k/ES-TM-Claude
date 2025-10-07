/**
 * Search Service
 * API communication for global search
 * Cognitive Complexity: 3
 */
import { apiClient } from '../../../core/api/client';
import type { SearchResult, QuickAction, SearchFilters } from '../types/search.types';

export const searchService = {
  async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    const params = new URLSearchParams({ q: query });

    if (filters?.limit) {
      params.append('limit', String(filters.limit));
    }

    if (filters?.categories && filters.categories.length > 0) {
      params.append('categories', filters.categories.join(','));
    }

    const response = await apiClient.get<{ results: SearchResult[] }>(
      `/search?${params}`
    );
    return response.results;
  },

  async getQuickActions(): Promise<QuickAction[]> {
    const response = await apiClient.get<{ quick_actions: QuickAction[] }>(
      '/search/quick-actions'
    );
    return response.quick_actions;
  },
};
