/**
 * FilterBar Component
 * Filters and search for project-week approval view
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import type { ProjectWeekFilters } from '../../../types/timesheetApprovals';

interface FilterBarProps {
  filters: ProjectWeekFilters;
  onFiltersChange: (filters: ProjectWeekFilters) => void;
  projects?: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  projects = [],
  isLoading = false
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<ProjectWeekFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilters = { ...localFilters, search: e.target.value, page: 1 };
    setLocalFilters(newFilters);
    // Debounce search
    const timeout = setTimeout(() => {
      onFiltersChange(newFilters);
    }, 500);
    return () => clearTimeout(timeout);
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newFilters = {
      ...localFilters,
      project_id: value === 'all' ? undefined : value,
      page: 1
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ProjectWeekFilters['sort_by'];
    const newFilters = { ...localFilters, sort_by: value, page: 1 };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSortOrderChange = (order: 'asc' | 'desc') => {
    const newFilters = { ...localFilters, sort_order: order, page: 1 };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateRangeChange = (field: 'week_start' | 'week_end', value: string) => {
    const newFilters = { ...localFilters, [field]: value, page: 1 };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: ProjectWeekFilters = {
      status: filters.status, // Keep status tab
      sort_by: 'week_date',
      sort_order: 'desc',
      page: 1,
      limit: filters.limit || 10
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    setShowFilters(false);
  };

  const hasActiveFilters = Boolean(
    localFilters.project_id ||
    localFilters.week_start ||
    localFilters.week_end ||
    localFilters.search
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Search and Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by project or user name..."
            value={localFilters.search || ''}
            onChange={handleSearchChange}
            disabled={isLoading}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors min-h-[42px] ${
            showFilters || hasActiveFilters
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {[localFilters.project_id, localFilters.week_start, localFilters.week_end, localFilters.search].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                value={localFilters.project_id || 'all'}
                onChange={handleProjectChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              >
                <option value="all">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Week Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week Start
              </label>
              <input
                type="date"
                value={localFilters.week_start || ''}
                onChange={(e) => handleDateRangeChange('week_start', e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Week End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week End
              </label>
              <input
                type="date"
                value={localFilters.week_end || ''}
                onChange={(e) => handleDateRangeChange('week_end', e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  value={localFilters.sort_by || 'week_date'}
                  onChange={handleSortChange}
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="week_date">Week Date</option>
                  <option value="project_name">Project Name</option>
                  <option value="pending_count">Pending Count</option>
                </select>
                <button
                  onClick={() => handleSortOrderChange(localFilters.sort_order === 'asc' ? 'desc' : 'asc')}
                  disabled={isLoading}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  title={`Sort ${localFilters.sort_order === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {localFilters.sort_order === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
