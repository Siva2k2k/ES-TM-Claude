/**
 * useGlobalSearch Hook
 * Search with debouncing and keyboard shortcuts
 * Cognitive Complexity: 5
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { searchService } from '../services/searchService';
import type { SearchResult, QuickAction, SearchFilters } from '../types/search.types';

interface UseGlobalSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  quickActions: QuickAction[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  handleResultSelect: (result: SearchResult | QuickAction) => void;
}

export const useGlobalSearch = (
  onNavigate?: (url: string) => void,
  debounceMs: number = 300
): UseGlobalSearchReturn => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Load quick actions when search opens
  useEffect(() => {
    if (isOpen && quickActions.length === 0) {
      searchService.getQuickActions().then(setQuickActions).catch(console.error);
    }
  }, [isOpen, quickActions.length]);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.trim().length === 0) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResults = await searchService.search(query.trim(), { limit: 8 });
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, debounceMs]);

  const handleResultSelect = useCallback(
    (result: SearchResult | QuickAction) => {
      if (onNavigate) {
        onNavigate(result.url);
      } else {
        window.location.href = result.url;
      }
      setIsOpen(false);
      setQuery('');
      setResults([]);
    },
    [onNavigate]
  );

  return {
    query,
    setQuery,
    results,
    quickActions,
    isLoading,
    isOpen,
    setIsOpen,
    selectedIndex,
    setSelectedIndex,
    handleResultSelect,
  };
};
