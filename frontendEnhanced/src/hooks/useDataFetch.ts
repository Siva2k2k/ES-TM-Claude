import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic Data Fetching Hook
 * Replaces repetitive fetch patterns across Enhanced components
 * Phase 4: Forms & Validation
 */

export interface UseDataFetchOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  autoLoad?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  requiresAuth?: boolean;
  cacheKey?: string;
  cacheDuration?: number; // milliseconds
}

export interface UseDataFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  refetch: () => Promise<void>;
  reset: () => void;
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();

/**
 * Generic hook for fetching data from API endpoints
 * Handles loading, error states, authentication, and caching
 */
export function useDataFetch<T = any>(
  options: UseDataFetchOptions<T>
): UseDataFetchReturn<T> {
  const {
    url,
    method = 'GET',
    body,
    headers = {},
    autoLoad = true,
    onSuccess,
    onError,
    requiresAuth = true,
    cacheKey,
    cacheDuration = 5 * 60 * 1000, // 5 minutes default
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check cache before fetching
  const getCachedData = useCallback((): T | null => {
    if (!cacheKey) return null;

    const cached = cache.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cacheDuration;
    if (isExpired) {
      cache.delete(cacheKey);
      return null;
    }

    return cached.data as T;
  }, [cacheKey, cacheDuration]);

  // Save data to cache
  const setCachedData = useCallback((data: T) => {
    if (cacheKey) {
      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
    }
  }, [cacheKey]);

  const fetchData = useCallback(async () => {
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      setData(cachedData);
      setError(null);
      onSuccess?.(cachedData);
      return;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      // Add authentication token if required
      if (requiresAuth) {
        const token = localStorage.getItem('accessToken');
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        }
      }

      const requestOptions: RequestInit = {
        method,
        headers: requestHeaders,
        signal: abortControllerRef.current.signal,
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        requestOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, requestOptions);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      let responseData;
      if (isJson) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        const errorMessage = typeof responseData === 'object'
          ? responseData.message || responseData.error || 'Request failed'
          : responseData || `HTTP ${response.status}: ${response.statusText}`;

        throw new Error(errorMessage);
      }

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setData(responseData);
        setError(null);
        setCachedData(responseData);
        onSuccess?.(responseData);
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';

      if (isMountedRef.current) {
        setError(errorMessage);
        setData(null);
        onError?.(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [url, method, body, headers, requiresAuth, onSuccess, onError, getCachedData, setCachedData]);

  const refetch = useCallback(async () => {
    // Clear cache before refetching
    if (cacheKey) {
      cache.delete(cacheKey);
    }
    await fetchData();
  }, [fetchData, cacheKey]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoLoad, fetchData]);

  return {
    data,
    loading,
    error,
    fetchData,
    refetch,
    reset,
  };
}

/**
 * Clear all cached data
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  cache.delete(key);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
