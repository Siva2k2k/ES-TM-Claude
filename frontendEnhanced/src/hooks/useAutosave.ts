import { useEffect, useCallback, useRef } from 'react';

/**
 * Autosave Hook
 * Automatically saves form data to localStorage at intervals
 * Phase 4: Forms & Validation
 */

export interface UseAutosaveOptions<T> {
  key: string; // localStorage key
  data: T | null; // Data to save
  interval?: number; // Autosave interval in milliseconds (default: 5000)
  enabled?: boolean; // Enable/disable autosave (default: true)
  debounce?: number; // Debounce delay before saving (default: 1000)
  onSave?: (data: T) => void; // Callback when data is saved
  onRestore?: (data: T) => void; // Callback when data is restored
  onClear?: () => void; // Callback when data is cleared
}

export interface UseAutosaveReturn<T> {
  restore: () => T | null;
  clear: () => void;
  saveNow: () => void;
  hasAutoSaved: boolean;
  lastSaveTime: Date | null;
}

/**
 * Hook for automatically saving form data to localStorage
 * Useful for draft timesheets, unsaved projects, etc.
 */
export function useAutosave<T = any>(
  options: UseAutosaveOptions<T>
): UseAutosaveReturn<T> {
  const {
    key,
    data,
    interval = 5000,
    enabled = true,
    debounce: debounceMs = 1000,
    onSave,
    onRestore,
    onClear,
  } = options;

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<Date | null>(null);
  const lastSavedDataRef = useRef<string | null>(null);

  /**
   * Save data to localStorage
   */
  const save = useCallback((dataToSave: T) => {
    try {
      const serialized = JSON.stringify(dataToSave);

      // Only save if data has changed
      if (serialized === lastSavedDataRef.current) {
        return;
      }

      localStorage.setItem(key, serialized);
      lastSavedDataRef.current = serialized;
      lastSaveTimeRef.current = new Date();
      onSave?.(dataToSave);
    } catch (error) {
      console.error(`Failed to autosave data for key "${key}":`, error);
    }
  }, [key, onSave]);

  /**
   * Restore data from localStorage
   */
  const restore = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return null;

      const parsed = JSON.parse(saved) as T;
      onRestore?.(parsed);
      return parsed;
    } catch (error) {
      console.error(`Failed to restore data for key "${key}":`, error);
      return null;
    }
  }, [key, onRestore]);

  /**
   * Clear saved data from localStorage
   */
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
      lastSavedDataRef.current = null;
      lastSaveTimeRef.current = null;
      onClear?.();
    } catch (error) {
      console.error(`Failed to clear data for key "${key}":`, error);
    }
  }, [key, onClear]);

  /**
   * Save immediately without waiting for debounce/interval
   */
  const saveNow = useCallback(() => {
    if (data !== null && data !== undefined) {
      save(data);
    }
  }, [data, save]);

  /**
   * Check if data has been autosaved
   */
  const hasAutoSaved = !!lastSavedDataRef.current;

  /**
   * Debounced save when data changes
   */
  useEffect(() => {
    if (!enabled || data === null || data === undefined) {
      return;
    }

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      save(data);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, enabled, debounceMs, save]);

  /**
   * Periodic autosave interval
   */
  useEffect(() => {
    if (!enabled || interval <= 0) {
      return;
    }

    intervalTimerRef.current = setInterval(() => {
      if (data !== null && data !== undefined) {
        save(data);
      }
    }, interval);

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [data, enabled, interval, save]);

  return {
    restore,
    clear,
    saveNow,
    hasAutoSaved,
    lastSaveTime: lastSaveTimeRef.current,
  };
}

/**
 * Specialized autosave hook for draft timesheets
 */
export function useTimesheetAutosave(weekStartDate: string) {
  return useAutosave({
    key: `timesheet-draft-${weekStartDate}`,
    data: null, // Will be set by consuming component
    interval: 10000, // 10 seconds
    enabled: true,
  });
}

/**
 * Specialized autosave hook for project forms
 */
export function useProjectFormAutosave(projectId?: string) {
  return useAutosave({
    key: projectId ? `project-edit-${projectId}` : 'project-create',
    data: null,
    interval: 15000, // 15 seconds
    enabled: true,
  });
}

/**
 * Specialized autosave hook for task forms
 */
export function useTaskFormAutosave(taskId?: string) {
  return useAutosave({
    key: taskId ? `task-edit-${taskId}` : 'task-create',
    data: null,
    interval: 15000, // 15 seconds
    enabled: true,
  });
}

/**
 * Get all autosave keys from localStorage
 */
export function getAllAutosaveKeys(): string[] {
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('timesheet-draft-') ||
      key.startsWith('project-') ||
      key.startsWith('task-')
    )) {
      keys.push(key);
    }
  }

  return keys;
}

/**
 * Clear all autosaved data
 */
export function clearAllAutosaves(): void {
  const keys = getAllAutosaveKeys();
  keys.forEach(key => localStorage.removeItem(key));
}

/**
 * Get autosave metadata (last save time, size, etc.)
 */
export function getAutosaveMetadata(key: string): {
  exists: boolean;
  size: number;
  lastModified: Date | null;
} {
  try {
    const data = localStorage.getItem(key);

    if (!data) {
      return { exists: false, size: 0, lastModified: null };
    }

    // Get last modified time from browser (if available)
    // Note: localStorage doesn't store metadata, so we approximate
    const size = new Blob([data]).size;

    return {
      exists: true,
      size,
      lastModified: null, // Could be tracked separately if needed
    };
  } catch (error) {
    return { exists: false, size: 0, lastModified: null };
  }
}
