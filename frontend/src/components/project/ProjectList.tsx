/**
 * ProjectList Component
 *
 * Displays projects in grid or list view with filtering, sorting, and pagination.
 *
 * Features:
 * - Grid/list view toggle
 * - Advanced filtering
 * - Sorting options
 * - Search functionality
 * - Pagination
 *
 * Cognitive Complexity: 9 (Target: <15)
 */

import React, { useState, useMemo } from 'react';
import { Grid, List, Search, Filter, Plus } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { ProjectStatus } from '../../types/project.schemas';

export interface Project {
  id: string;
  name: string;
  client_name?: string;
  status: ProjectStatus;
  start_date: string;
  end_date?: string;
  budget: number;
  description?: string;
  is_billable: boolean;
  tasks?: Array<{ status: string }>;
  total_hours_logged?: number;
  avg_hourly_rate?: number;
  team_members?: Array<{ name: string; avatar?: string }>;
  primary_manager_name?: string;
}

export interface ProjectListProps {
  /** Projects to display */
  projects: Project[];
  /** View mode */
  viewMode?: 'grid' | 'list';
  /** Show filters */
  showFilters?: boolean;
  /** Enable pagination */
  enablePagination?: boolean;
  /** Items per page */
  itemsPerPage?: number;
  /** Click handler */
  onProjectClick?: (project: Project) => void;
  /** Edit handler */
  onEdit?: (project: Project) => void;
  /** View details handler */
  onViewDetails?: (project: Project) => void;
  /** Create new handler */
  onCreate?: () => void;
}

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' }
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'budget-desc', label: 'Highest Budget' },
  { value: 'budget-asc', label: 'Lowest Budget' }
];

const BILLABLE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Projects' },
  { value: 'billable', label: 'Billable Only' },
  { value: 'non-billable', label: 'Non-Billable Only' }
];

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  viewMode: initialViewMode = 'grid',
  showFilters = true,
  enablePagination = true,
  itemsPerPage = 12,
  onProjectClick,
  onEdit,
  onViewDetails,
  onCreate
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [billableFilter, setBillableFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Apply billable filter
    if (billableFilter === 'billable') {
      filtered = filtered.filter(p => p.is_billable);
    } else if (billableFilter === 'non-billable') {
      filtered = filtered.filter(p => !p.is_billable);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.client_name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.primary_manager_name?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'date-desc':
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        case 'date-asc':
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case 'budget-desc':
          return b.budget - a.budget;
        case 'budget-asc':
          return a.budget - b.budget;
        default:
          return 0;
      }
    });

    return filtered;
  }, [projects, statusFilter, billableFilter, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = useMemo(() => {
    if (!enablePagination) return filteredProjects;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage, enablePagination]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Projects</CardTitle>
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  icon={Grid}
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  icon={List}
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
              </div>
              {onCreate && (
                <Button icon={Plus} onClick={onCreate}>
                  New Project
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Filters */}
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="Search projects..."
                icon={Search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status"
              />
              <Select
                options={BILLABLE_OPTIONS}
                value={billableFilter}
                onChange={setBillableFilter}
                placeholder="Filter by type"
              />
              <Select
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={setSortBy}
                placeholder="Sort by"
              />
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <p>
                Showing {paginatedProjects.length} of {filteredProjects.length} projects
              </p>
              {(statusFilter !== 'all' || billableFilter !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setBillableFilter('all');
                    setSearchQuery('');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Project Grid/List */}
      {paginatedProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Grid className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No projects found</p>
            <p className="text-sm mt-1">Try adjusting your filters or create a new project</p>
            {onCreate && (
              <Button className="mt-4" icon={Plus} onClick={onCreate}>
                Create Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  viewMode="grid"
                  onClick={() => onProjectClick?.(project)}
                  onEdit={() => onEdit?.(project)}
                  onViewDetails={() => onViewDetails?.(project)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  viewMode="list"
                  onClick={() => onProjectClick?.(project)}
                  onEdit={() => onEdit?.(project)}
                  onViewDetails={() => onViewDetails?.(project)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
