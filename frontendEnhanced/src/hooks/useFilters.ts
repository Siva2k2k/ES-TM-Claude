import { useState, useCallback, useMemo } from 'react';
import { debounce, sanitizeSearchQuery, cleanFilters } from '../types/common.schemas';

/**
 * Filter and Search Management Hook
 * Provides reusable filtering and search functionality
 * Phase 4: Forms & Validation
 */

export interface UseFiltersOptions<T = Record<string, any>> {
  initialFilters?: T;
  initialSearchTerm?: string;
  debounceMs?: number;
  onFilterChange?: (filters: T) => void;
  onSearchChange?: (searchTerm: string) => void;
}

export interface UseFiltersReturn<T = Record<string, any>> {
  filters: T;
  searchTerm: string;
  debouncedSearchTerm: string;
  setFilter: (key: keyof T, value: any) => void;
  setFilters: (filters: Partial<T>) => void;
  setSearchTerm: (term: string) => void;
  clearFilters: () => void;
  clearSearch: () => void;
  clearAll: () => void;
  hasActiveFilters: boolean;
  hasActiveSearch: boolean;
  applyFilters: <D>(data: D[], filterFn?: (item: D, filters: T, search: string) => boolean) => D[];
  getActiveFilterCount: () => number;
}

/**
 * Hook for managing filters and search state
 * Includes debouncing, sanitization, and filtering logic
 */
export function useFilters<T = Record<string, any>>(
  options: UseFiltersOptions<T> = {}
): UseFiltersReturn<T> {
  const {
    initialFilters = {} as T,
    initialSearchTerm = '',
    debounceMs = 300,
    onFilterChange,
    onSearchChange,
  } = options;

  const [filters, setFiltersState] = useState<T>(initialFilters);
  const [searchTerm, setSearchTermState] = useState<string>(initialSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>(initialSearchTerm);

  // Debounced search term setter
  const debouncedSetSearch = useMemo(
    () => debounce((term: string) => {
      const sanitized = sanitizeSearchQuery(term);
      setDebouncedSearchTerm(sanitized);
      onSearchChange?.(sanitized);
    }, debounceMs),
    [debounceMs, onSearchChange]
  );

  // Set single filter value
  const setFilter = useCallback((key: keyof T, value: any) => {
    setFiltersState(prev => {
      const updated = { ...prev, [key]: value };
      onFilterChange?.(updated);
      return updated;
    });
  }, [onFilterChange]);

  // Set multiple filters at once
  const setFilters = useCallback((newFilters: Partial<T>) => {
    setFiltersState(prev => {
      const updated = { ...prev, ...newFilters };
      onFilterChange?.(updated);
      return updated;
    });
  }, [onFilterChange]);

  // Set search term with debouncing
  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
    debouncedSetSearch(term);
  }, [debouncedSetSearch]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const cleared = initialFilters;
    setFiltersState(cleared);
    onFilterChange?.(cleared);
  }, [initialFilters, onFilterChange]);

  // Clear search term
  const clearSearch = useCallback(() => {
    setSearchTermState('');
    setDebouncedSearchTerm('');
    onSearchChange?.('');
  }, [onSearchChange]);

  // Clear both filters and search
  const clearAll = useCallback(() => {
    clearFilters();
    clearSearch();
  }, [clearFilters, clearSearch]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    const cleaned = cleanFilters(filters as Record<string, any>);
    return Object.keys(cleaned).length > 0;
  }, [filters]);

  // Check if search is active
  const hasActiveSearch = useMemo(() => {
    return debouncedSearchTerm.length > 0;
  }, [debouncedSearchTerm]);

  // Get count of active filters
  const getActiveFilterCount = useCallback(() => {
    const cleaned = cleanFilters(filters as Record<string, any>);
    return Object.keys(cleaned).length;
  }, [filters]);

  // Apply filters and search to data array
  const applyFilters = useCallback(
    <D,>(
      data: D[],
      filterFn?: (item: D, filters: T, search: string) => boolean
    ): D[] => {
      if (!data || data.length === 0) return [];

      let filtered = [...data];

      // Apply custom filter function if provided
      if (filterFn) {
        filtered = filtered.filter(item => filterFn(item, filters, debouncedSearchTerm));
        return filtered;
      }

      // Default filtering logic
      // Filter by search term (searches all string fields)
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        filtered = filtered.filter(item => {
          if (typeof item === 'string') {
            return item.toLowerCase().includes(searchLower);
          }

          if (typeof item === 'object' && item !== null) {
            return Object.values(item).some(value => {
              if (typeof value === 'string') {
                return value.toLowerCase().includes(searchLower);
              }
              return false;
            });
          }

          return false;
        });
      }

      // Filter by active filters
      const activeFilters = cleanFilters(filters as Record<string, any>);
      if (Object.keys(activeFilters).length > 0) {
        filtered = filtered.filter(item => {
          if (typeof item !== 'object' || item === null) return false;

          return Object.entries(activeFilters).every(([key, value]) => {
            const itemValue = (item as any)[key];

            // Handle array values (multi-select filters)
            if (Array.isArray(value)) {
              return value.length === 0 || value.includes(itemValue);
            }

            // Handle boolean values
            if (typeof value === 'boolean') {
              return itemValue === value;
            }

            // Handle string values (case-insensitive)
            if (typeof value === 'string' && typeof itemValue === 'string') {
              return itemValue.toLowerCase() === value.toLowerCase();
            }

            // Direct equality for other types
            return itemValue === value;
          });
        });
      }

      return filtered;
    },
    [filters, debouncedSearchTerm]
  );

  return {
    filters,
    searchTerm,
    debouncedSearchTerm,
    setFilter,
    setFilters,
    setSearchTerm,
    clearFilters,
    clearSearch,
    clearAll,
    hasActiveFilters,
    hasActiveSearch,
    applyFilters,
    getActiveFilterCount,
  };
}

/**
 * Specialized hook for common filter patterns
 */
export function useStatusFilter(initialStatus?: string) {
  return useFilters({
    initialFilters: { status: initialStatus || 'all' },
  });
}

/**
 * Specialized hook for date range filtering
 */
export function useDateRangeFilter(initialStartDate?: string, initialEndDate?: string) {
  return useFilters({
    initialFilters: {
      startDate: initialStartDate || '',
      endDate: initialEndDate || '',
    },
  });
}
