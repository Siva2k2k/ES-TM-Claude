/**
 * Deleted Items Service
 * Handles API calls for deleted items management
 */

import { backendApi, BackendApiError } from '../lib/backendApi';

export interface DeletedItem {
  _id: string;
  entity_type: 'user' | 'project' | 'client' | 'task' | 'timesheet';
  name?: string;
  email?: string;
  full_name?: string;
  deleted_at: string;
  deleted_by?: string;
  deletion_reason?: string;
  can_restore: boolean;
  has_dependencies?: boolean;
}

export class DeletedItemsService {
  /**
   * Get all deleted items with optional entity type filter
   */
  static async getDeletedItems(entityType?: string): Promise<{
    items: DeletedItem[];
    error?: string;
  }> {
    try {
      const params = new URLSearchParams();
      if (entityType && entityType !== 'all') {
        params.append('entityType', entityType);
      }

      const url = `/users/deleted${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await backendApi.get<{
        success: boolean;
        users?: any[];
        error?: string;
      }>(url);

      if (!response.success || response.error) {
        console.error('Error fetching deleted items:', response.error);
        return { items: [], error: response.error };
      }

      // Map users to DeletedItem format
      const items: DeletedItem[] = (response.users || []).map(user => ({
        _id: user._id || user.id,
        entity_type: 'user' as const,
        full_name: user.full_name,
        email: user.email,
        deleted_at: user.deleted_at,
        deleted_by: user.deleted_by,
        deletion_reason: user.deletion_reason,
        can_restore: true, // Will be determined by backend
        has_dependencies: false
      }));

      return { items };
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
      const response = await backendApi.post<{
        success: boolean;
        message?: string;
        error?: string;
      }>(`/users/${itemId}/restore`, {});

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
