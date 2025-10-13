import React, { useState, useEffect } from 'react';
import { Search, X, Filter, SlidersHorizontal } from 'lucide-react';

type ProjectStatus = 'all' | 'active' | 'completed' | 'on_hold' | 'archived';

export interface ProjectFilterState {
  searchQuery: string;
  status: ProjectStatus;
  clientId: string;
  managerId: string;
  billable: 'all' | 'billable' | 'non-billable';
}

interface ProjectFiltersProps {
  onFilterChange: (filters: ProjectFilterState) => void;
  clients?: Array<{ id: string; name: string }>;
  managers?: Array<{ id: string; full_name: string }>;
  showAdvanced?: boolean;
}

/**
 * ProjectFilters Component
 * Mobile-first filtering controls
 *
 * Features:
 * - Debounced search (300ms)
 * - Status filter dropdown
 * - Client & Manager filters (optional)
 * - Billable toggle
 * - Active filter count badge
 * - Clear filters button
 * - Collapsible on mobile
 * - Dark mode support
 * - Backend filtering (not frontend)
 */
export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  onFilterChange,
  clients = [],
  managers = [],
  showAdvanced = true,
}) => {
  const [filters, setFilters] = useState<ProjectFilterState>({
    searchQuery: '',
    status: 'all',
    clientId: '',
    managerId: '',
    billable: 'all',
  });

  const [searchInput, setSearchInput] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, searchQuery: searchInput }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleClearFilters = () => {
    setSearchInput('');
    setFilters({
      searchQuery: '',
      status: 'all',
      clientId: '',
      managerId: '',
      billable: 'all',
    });
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.status !== 'all') count++;
    if (filters.clientId) count++;
    if (filters.managerId) count++;
    if (filters.billable !== 'all') count++;
    return count;
  };

  const activeFilters = getActiveFilterCount();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 border border-transparent dark:border-gray-700">
      {/* Mobile Filter Toggle */}
      <div className="p-4 sm:hidden">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="h-5 w-5" />
            <span className="font-medium">Filters</span>
            {activeFilters > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {activeFilters}
              </span>
            )}
          </div>
          <span className="text-sm">{showMobileFilters ? 'Hide' : 'Show'}</span>
        </button>
      </div>

      {/* Filter Content */}
      <div className={`p-4 space-y-4 ${showMobileFilters ? 'block' : 'hidden'} sm:block`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Header with Filter Icon (Desktop) */}
          <div className="hidden sm:flex items-center space-x-2 shrink-0">
            <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filters
            </span>
            {activeFilters > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {activeFilters}
              </span>
            )}
          </div>

          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         text-sm"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-auto sm:min-w-[150px]">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value as ProjectStatus }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Advanced Filters (Collapsible on Mobile) */}
          {showAdvanced && (
            <>
              {/* Client Filter */}
              {clients.length > 0 && (
                <div className="w-full sm:w-auto sm:min-w-[150px]">
                  <select
                    value={filters.clientId}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, clientId: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             text-sm"
                  >
                    <option value="">All Clients</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Billable Filter */}
              <div className="w-full sm:w-auto sm:min-w-[150px]">
                <select
                  value={filters.billable}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      billable: e.target.value as 'all' | 'billable' | 'non-billable',
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           text-sm"
                >
                  <option value="all">All Projects</option>
                  <option value="billable">Billable Only</option>
                  <option value="non-billable">Non-Billable Only</option>
                </select>
              </div>
            </>
          )}

          {/* Clear Filters Button */}
          {activeFilters > 0 && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600
                       text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300
                       bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                       whitespace-nowrap"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
