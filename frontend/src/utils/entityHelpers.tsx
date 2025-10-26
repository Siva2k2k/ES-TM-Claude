/**
 * Entity Helper Utilities
 * Centralized functions for displaying different entity types
 * Used across admin pages for consistent entity representation
 */

import React from 'react';
import {
  User,
  Briefcase,
  Building,
  CheckSquare,
  Calendar,
  FileText,
  HelpCircle
} from 'lucide-react';

export type EntityType = 'user' | 'project' | 'client' | 'task' | 'timesheet';

export interface DeletedItem {
  _id: string;
  entity_type: EntityType;
  name?: string;
  email?: string;
  full_name?: string;
  deleted_at: string;
  deleted_by?: string;
  deletion_reason?: string;
  can_restore: boolean;
  has_dependencies?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Get icon component for entity type
 * @param entityType - Type of entity
 * @returns Lucide React icon component
 */
export function getEntityIcon(entityType: string): JSX.Element {
  switch (entityType) {
    case 'user':
      return <User className="h-5 w-5" />;
    case 'project':
      return <Briefcase className="h-5 w-5" />;
    case 'client':
      return <Building className="h-5 w-5" />;
    case 'task':
      return <CheckSquare className="h-5 w-5" />;
    case 'timesheet':
      return <Calendar className="h-5 w-5" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
}

/**
 * Get small icon (h-4 w-4) for entity type
 * @param entityType - Type of entity
 * @returns Lucide React icon component with smaller size
 */
export function getEntityIconSmall(entityType: string): JSX.Element {
  switch (entityType) {
    case 'user':
      return <User className="h-4 w-4" />;
    case 'project':
      return <Briefcase className="h-4 w-4" />;
    case 'client':
      return <Building className="h-4 w-4" />;
    case 'task':
      return <CheckSquare className="h-4 w-4" />;
    case 'timesheet':
      return <Calendar className="h-4 w-4" />;
    default:
      return <HelpCircle className="h-4 w-4" />;
  }
}

/**
 * Get Tailwind CSS color classes for entity type
 * @param entityType - Type of entity
 * @returns Tailwind CSS classes for background and text
 */
export function getEntityColor(entityType: string): string {
  switch (entityType) {
    case 'user':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'project':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'client':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'task':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'timesheet':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Get display name for deleted item based on entity type
 * @param item - Deleted item object
 * @returns Display-friendly name
 */
export function getEntityDisplayName(item: DeletedItem): string {
  switch (item.entity_type) {
    case 'user':
      return item.full_name || item.metadata?.full_name as string || item.email || item.metadata?.email as string || 'Unknown User';
    case 'project':
      return item.name || item.metadata?.name as string || 'Unknown Project';
    case 'client':
      return item.name || item.metadata?.name as string || 'Unknown Client';
    case 'timesheet':
      return `Timesheet for ${item.metadata?.user_name as string || 'Unknown'}`;
    case 'task':
      return item.name || item.metadata?.title as string || 'Unknown Task';
    default:
      return item.full_name || item.name || item.email || 'Unknown';
  }
}

/**
 * Get formatted entity type label
 * @param entityType - Type of entity
 * @returns Capitalized, space-separated label
 */
export function getEntityTypeLabel(entityType: string): string {
  return entityType.replace(/_/g, ' ').toUpperCase();
}
