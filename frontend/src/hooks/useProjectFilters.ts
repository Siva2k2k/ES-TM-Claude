import { useState, useMemo } from 'react';
import { filterProjectsBySearch, filterProjectsByStatus } from '../utils/projectUtils';
import type { Project } from '../types';
import type { ViewMode, ProjectStatus } from '../utils/projectConstants';

/**
 * useProjectFilters Hook
 * Manages project filtering and view mode state
 *
 * Features:
 * - Search by name and description
 * - Filter by status
 * - Toggle between grid and list view
 * - Memoized filtered results
 *
 * @param projects - Array of projects to filter
 * @returns Filtered projects and filter control functions
 */
export const useProjectFilters = (projects: Project[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  /**
   * Memoized filtered projects
   * Applies both search and status filters
   */
  const filteredProjects = useMemo(() => {
    // First filter by search term
    let filtered = filterProjectsBySearch(projects, searchTerm);

    // Then filter by status
    filtered = filterProjectsByStatus(filtered, statusFilter);

    return filtered;
  }, [projects, searchTerm, statusFilter]);

  /**
   * Reset all filters to default
   */
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all';

  return {
    // State
    searchTerm,
    statusFilter,
    viewMode,
    filteredProjects,
    hasActiveFilters,

    // Setters
    setSearchTerm,
    setStatusFilter,
    setViewMode,
    resetFilters,
  };
};
