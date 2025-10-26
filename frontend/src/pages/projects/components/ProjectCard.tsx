import React, { useState } from 'react';
import {
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Users,
  BarChart3,
  Building2
} from 'lucide-react';
import type { Project } from '../../../types';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import * as formatting from '../../../utils/formatting';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onViewDetails?: (project: Project) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

/**
 * ProjectCard Component
 * Mobile-first card design for project display
 *
 * Features:
 * - Touch-friendly (44px minimum touch targets)
 * - Collapsible details section
 * - Status badge
 * - Progress indicators
 * - Quick action buttons
 * - Dark mode support
 * - Responsive design (optimized for mobile)
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEdit,
  onDelete,
  onViewDetails,
  canEdit = false,
  canDelete = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get client name (handle both string and object)
  const getClientName = () => {
    if (!project.client_id) return 'No Client';
    if (typeof project.client_id === 'string') return 'Client';
    return (project.client_id as any).name || 'Client';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md dark:hover:shadow-gray-900/70">
      {/* Card Header */}
      <div className="p-4 space-y-3">
        {/* Top Row: Title & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {project.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{getClientName()}</span>
            </div>
          </div>
          <StatusBadge type="project" status={project.status} size="sm" />
        </div>

        {/* Key Metrics Row (Mobile-optimized) */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Budget */}
          {project.budget !== undefined && project.budget !== null && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <DollarSign className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
              <span className="font-medium">{formatting.formatCurrency(project.budget, 'USD')}</span>
            </div>
          )}

          {/* Start Date */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>{formatting.formatDate(project.start_date, 'short')}</span>
          </div>
        </div>

        {/* Billable Badge */}
        {project.is_billable && (
          <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
            Billable Project
          </div>
        )}

        {/* Description Preview */}
        {project.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {project.description}
          </p>
        )}
      </div>

      {/* Collapsible Details Section */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* End Date */}
          {project.end_date && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">End Date:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatting.formatDate(project.end_date, 'short')}
              </span>
            </div>
          )}

          {/* Full Description */}
          {project.description && (
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400 block mb-1">Description:</span>
              <p className="text-gray-900 dark:text-gray-100">{project.description}</p>
            </div>
          )}

          {/* Additional Stats (if available) */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span>Team members</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <BarChart3 className="h-4 w-4" />
              <span>View tasks</span>
            </div>
          </div>
        </div>
      )}

      {/* Card Footer - Actions */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors min-h-[44px]"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              <span className="hidden sm:inline">Less</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              <span className="hidden sm:inline">More</span>
            </>
          )}
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* View Details */}
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(project)}
              className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors min-h-[44px]"
            >
              View Details
            </button>
          )}

          {/* Edit */}
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(project)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Edit project"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}

          {/* Delete */}
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(project)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Delete project"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
