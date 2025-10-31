import React from 'react';
import { Plus, FolderKanban } from 'lucide-react';

interface EmptyProjectStateProps {
  hasFilters: boolean;
  onCreateClick: () => void;
}

/**
 * EmptyProjectState Component
 * Displays when no projects are found
 *
 * Features:
 * - Different messages for filtered vs. empty state
 * - Conditional CTA button
 * - Centered layout with icon
 */
export const EmptyProjectState: React.FC<EmptyProjectStateProps> = ({
  hasFilters,
  onCreateClick,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <FolderKanban className="h-10 w-10 text-gray-400 dark:text-gray-300" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Projects Found</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {hasFilters
          ? 'No projects match your filters.'
          : 'Get started by creating your first project.'}
      </p>
      {!hasFilters && (
        <button
          onClick={onCreateClick}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Create First Project
        </button>
      )}
    </div>
  );
};
