import React, { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import type { UserRole } from '../../../types';

interface UserFiltersProps {
  onFilterChange: (filters: UserFilterState) => void;
  showRoleFilter?: boolean;
  showStatusFilter?: boolean;
  showApprovalFilter?: boolean;
}

export interface UserFilterState {
  searchQuery: string;
  role: UserRole | 'all';
  status: 'all' | 'active' | 'inactive';
  approval: 'all' | 'approved' | 'pending';
}

/**
 * UserFilters Component
 * Provides filtering controls for user list
 *
 * Features:
 * - Search by name/email (debounced)
 * - Filter by role
 * - Filter by status (active/inactive)
 * - Filter by approval status
 * - Clear all filters button
 * - Filter count badge
 * - Dark mode support
 */
export const UserFilters: React.FC<UserFiltersProps> = ({
  onFilterChange,
  showRoleFilter = true,
  showStatusFilter = true,
  showApprovalFilter = true,
}) => {
  const [filters, setFilters] = useState<UserFilterState>({
    searchQuery: '',
    role: 'all',
    status: 'all',
    approval: 'all',
  });

  const [searchInput, setSearchInput] = useState('');

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
      role: 'all',
      status: 'all',
      approval: 'all',
    });
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.role !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.approval !== 'all') count++;
    return count;
  };

  const activeFilters = getActiveFilterCount();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-4 border border-transparent dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-4">
        {/* Header with Filter Icon */}
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
          {activeFilters > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {activeFilters}
            </span>
          )}
        </div>

        {/* Search Input */}
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        {/* Role Filter */}
        {showRoleFilter && (
          <div className="min-w-[150px]">
            <select
              value={filters.role}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  role: e.target.value as UserRole | 'all',
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="management">Management</option>
              <option value="manager">Manager</option>
              <option value="lead">Lead</option>
              <option value="employee">Employee</option>
            </select>
          </div>
        )}

        {/* Status Filter */}
        {showStatusFilter && (
          <div className="min-w-[130px]">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as 'all' | 'active' | 'inactive',
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}

        {/* Approval Filter */}
        {showApprovalFilter && (
          <div className="min-w-[140px]">
            <select
              value={filters.approval}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  approval: e.target.value as 'all' | 'approved' | 'pending',
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Approvals</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        )}

        {/* Clear Filters Button */}
        {activeFilters > 0 && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600
                     text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300
                     bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
