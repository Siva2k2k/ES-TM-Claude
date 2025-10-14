/**
 * PaginationControls Component
 * Pagination UI for project-week list
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationInfo } from '../../../types/timesheetApprovals';

interface PaginationControlsProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  isLoading?: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  pagination,
  onPageChange,
  onLimitChange,
  isLoading = false
}) => {
  const { page, limit, total, total_pages } = pagination;

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (total_pages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= total_pages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (page > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, page - 1);
      const end = Math.min(total_pages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < total_pages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(total_pages);
    }

    return pages;
  };

  if (total === 0) {
    return null;
  }

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 sm:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Results Info */}
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{total}</span> results
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2">
          {/* Items per page */}
          <div className="flex items-center gap-2">
            <label htmlFor="limit" className="text-sm text-gray-700">
              Per page:
            </label>
            <select
              id="limit"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              disabled={isLoading}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="border-l border-gray-300 h-6 mx-2" />

          {/* Page Navigation */}
          <nav className="flex items-center gap-1" aria-label="Pagination">
            {/* Previous Button */}
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1 || isLoading}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {getPageNumbers().map((pageNum, index) => (
                <React.Fragment key={index}>
                  {pageNum === '...' ? (
                    <span className="px-3 py-1 text-gray-500">...</span>
                  ) : (
                    <button
                      onClick={() => onPageChange(pageNum as number)}
                      disabled={isLoading}
                      className={`px-3 py-1 rounded-lg border transition-colors min-w-[40px] ${
                        pageNum === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50 disabled:opacity-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Mobile Page Indicator */}
            <div className="sm:hidden px-3 py-1 text-sm text-gray-700">
              {page} / {total_pages}
            </div>

            {/* Next Button */}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === total_pages || isLoading}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};
