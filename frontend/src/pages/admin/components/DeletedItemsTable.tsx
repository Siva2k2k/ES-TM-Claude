/**
 * DeletedItemsTable Component
 * Displays soft-deleted items with restore/hard delete actions
 * SonarQube Compliant: Cognitive Complexity < 15
 */

import React from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import * as formatting from '../../../utils/formatting';
import {
  getEntityIcon,
  getEntityColor,
  getEntityDisplayName,
  getEntityTypeLabel,
  type DeletedItem
} from '../../../utils/entityHelpers';

interface DeletedItemsTableProps {
  items: DeletedItem[];
  loading?: boolean;
  onRestore: (item: DeletedItem) => void;
  onHardDelete: (item: DeletedItem) => void;
  canHardDelete?: boolean;
}

export const DeletedItemsTable: React.FC<DeletedItemsTableProps> = ({
  items,
  loading = false,
  onRestore,
  onHardDelete,
  canHardDelete = false
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Trash2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Deleted Items</h3>
        <p className="text-gray-600">There are no soft-deleted items to display.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Item
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Deleted At
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Deleted By
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reason
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                    {getEntityIcon(item.entity_type)}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {getEntityDisplayName(item)}
                    </div>
                    {item.email && item.entity_type === 'user' && (
                      <div className="text-sm text-gray-500">{item.email}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEntityColor(item.entity_type)}`}>
                  {getEntityTypeLabel(item.entity_type)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatting.formatDate(item.deleted_at, 'datetime')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.deleted_by || 'System'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                {item.deletion_reason || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button
                  onClick={() => onRestore(item)}
                  disabled={!item.can_restore}
                  className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md ${
                    item.can_restore
                      ? 'text-green-700 bg-green-100 hover:bg-green-200'
                      : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  }`}
                  title={item.can_restore ? 'Restore this item' : 'Cannot restore - has dependencies'}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore
                </button>

                {canHardDelete && (
                  <button
                    onClick={() => onHardDelete(item)}
                    disabled={item.has_dependencies}
                    className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md ${
                      item.has_dependencies
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-red-700 bg-red-100 hover:bg-red-200'
                    }`}
                    title={item.has_dependencies ? 'Cannot delete - has dependencies' : 'Permanently delete'}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Delete Forever
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
