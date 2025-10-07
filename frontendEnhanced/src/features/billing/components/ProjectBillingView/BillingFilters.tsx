/**
 * Billing Filters Component
 * Filter controls for billing data
 * Cognitive Complexity: 2
 */
import React from 'react';
import { Filter } from 'lucide-react';
import { Card, CardContent, Input } from '../../../../shared/components/ui';
import type { BillingFilters as BillingFiltersType } from '../../types/billing.types';

interface BillingFiltersProps {
  filters: BillingFiltersType;
  onFiltersChange: (filters: Partial<BillingFiltersType>) => void;
}

export const BillingFilters: React.FC<BillingFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Filter Billing Data
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFiltersChange({ startDate: e.target.value })}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFiltersChange({ endDate: e.target.value })}
            />
          </div>

          {/* View Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              View Mode
            </label>
            <select
              value={filters.view}
              onChange={(e) => onFiltersChange({ view: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
