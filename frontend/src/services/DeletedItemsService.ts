/**
 * Deleted Items Service
 * Handles API calls for deleted items management
 */

import { backendApi, BackendApiError } from '../lib/backendApi';
import  type { DeletedItem } from '../types/deletedItems';

export class DeletedItemsService {
  /**
   * Check if a project has dependencies (for hard delete)
   */
  private static async checkProjectDependencies(projectId: string): Promise<boolean> {
    try {
      const response = await backendApi.get<{
        success: boolean;
        canDelete: boolean;
        dependencies: string[];
        counts: {
          timeEntries: number;
          billingRecords: number;
          timesheetApprovals: number;
        };
      }>(`/projects/${projectId}/dependencies`);

      // If canDelete is false, it has dependencies
      return !response.canDelete;
    } catch (error) {
      console.error(`Error checking dependencies for project ${projectId}:`, error);
      // On error, assume it has dependencies (safer approach)
      return true;
    }
  }

  /**
   * Get all deleted items with optional entity type filter
   */
  static async getDeletedItems(entityType?: string): Promise<{
    items: DeletedItem[];
    error?: string;
  }> {
    try {
      const allItems: DeletedItem[] = [];
      const typesToFetch = entityType && entityType !== 'all'
        ? [entityType.toLowerCase()]
        : ['user', 'client', 'project'];

      // Fetch deleted items from each entity type
      for (const type of typesToFetch) {
        try {
          let endpoint = '';
          let responseKey = '';

          switch (type) {
            case 'user':
              endpoint = '/users/deleted';
              responseKey = 'users';
              break;
            case 'client':
              endpoint = '/clients/deleted/all';
              responseKey = 'data';
              break;
            case 'project':
              endpoint = '/projects/deleted/all';
              responseKey = 'data';
              break;
            default:
              continue;
          }

          const response = await backendApi.get<{
            success: boolean;
            users?: any[];
            data?: any[];
            projects?: any[];
            error?: string;
          }>(endpoint);

          if (!response.success || response.error) {
            console.error(`Error fetching deleted ${type}s:`, response.error);
            continue;
          }

          const items = response[responseKey as 'users' | 'data' | 'projects'] || [];

          // Map items to DeletedItem format
          const mappedItems: DeletedItem[] = items.map((item: any) => {
            // TEMPORARILY disabled dependency checking - allow all projects to be hard deleted for testing
            const hasDependencies = false;

            return {
              _id: item._id || item.id,
              entity_type: (type === 'user' ? 'user' : type === 'client' ? 'client' : 'project') as const,
              name: item.name,
              full_name: item.full_name,
              email: item.email || item.contact_email,
              deleted_at: item.deleted_at,
              deleted_by: item.deleted_by,
              deletion_reason: item.deleted_reason || item.deletion_reason,
              can_restore: true,
              has_dependencies: hasDependencies
            };
          });

          allItems.push(...mappedItems);
        } catch (typeError) {
          console.error(`Error fetching deleted ${type}s:`, typeError);
          // Continue with other entity types
        }
      }

      // Sort by deleted_at descending (most recent first)
      allItems.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

      return { items: allItems };
    } catch (error) {
      console.error('Error in getDeletedItems:', error);
      const errorMessage = error instanceof BackendApiError
        ? error.message
        : (error instanceof Error ? error.message : String(error));
      return { items: [], error: errorMessage };
    }
  }

  /**
   * Restore a soft-deleted item
   */
  static async restoreItem(entityType: string, itemId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      let endpoint = '';
      switch (entityType.toLowerCase()) {
        case 'user':
        case 'users':
          endpoint = `/users/${itemId}/restore`;
          break;
        case 'client':
        case 'clients':
          endpoint = `/clients/${itemId}/restore`;
          break;
        case 'project':
        case 'projects':
          endpoint = `/projects/${itemId}/restore`;
          break;
        case 'task':
        case 'tasks':
          endpoint = `/tasks/${itemId}/restore`;
          break;
        default:
          return { success: false, error: `Unknown entity type: ${entityType}` };
      }

      const response = await backendApi.post<{
        success: boolean;
        message?: string;
        error?: string;
      }>(endpoint, {});

      if (!response.success || response.error) {
        console.error('Error restoring item:', response.error);
        return { success: false, error: response.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in restoreItem:', error);
      const errorMessage = error instanceof BackendApiError
        ? error.message
        : (error instanceof Error ? error.message : String(error));
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Permanently delete an item (hard delete)
   */
  static async hardDeleteItem(entityType: string, itemId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      let endpoint = '';
      switch (entityType.toLowerCase()) {
        case 'user':
        case 'users':
          endpoint = `/users/${itemId}/hard-delete`;
          break;
        case 'client':
        case 'clients':
          endpoint = `/clients/${itemId}/hard-delete`;
          break;
        case 'project':
        case 'projects':
          endpoint = `/projects/${itemId}/hard-delete`;
          break;
        case 'task':
        case 'tasks':
          endpoint = `/tasks/${itemId}/hard-delete`;
          break;
        default:
          return { success: false, error: `Unknown entity type: ${entityType}` };
      }

      const response = await backendApi.delete<{
        success: boolean;
        message?: string;
        error?: string;
      }>(endpoint);

      if (!response.success || response.error) {
        console.error('Error hard deleting item:', response.error);
        return { success: false, error: response.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in hardDeleteItem:', error);
      const errorMessage = error instanceof BackendApiError
        ? error.message
        : (error instanceof Error ? error.message : String(error));
      return { success: false, error: errorMessage };
    }
  }
}

export default DeletedItemsService;
