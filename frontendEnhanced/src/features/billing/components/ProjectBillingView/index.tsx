/**
 * Project Billing View Component
 * Main view for project billing with summary and details
 * Cognitive Complexity: 4
 * File Size: ~110 LOC
 */
import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../../../shared/components/ui';
import { useProjectBilling } from '../../hooks';
import { BillingSummaryCards } from './BillingSummaryCards';
import { BillingFilters } from './BillingFilters';
import { ProjectBillingCard } from './ProjectBillingCard';

export const ProjectBillingView: React.FC = () => {
  const {
    data,
    isLoading,
    error,
    filters,
    setFilters,
    refreshData,
    exportData,
  } = useProjectBilling();

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      await exportData(format);
    } catch (err) {
      // Error handled by hook
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading billing data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button variant="primary" onClick={refreshData} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Billing</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw className="h-4 w-4" />}
                onClick={refreshData}
              >
                Refresh
              </Button>
              <div className="relative">
                <select
                  onChange={(e) => handleExport(e.target.value as any)}
                  value=""
                  className="appearance-none px-4 py-2 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Export
                  </option>
                  <option value="csv">Export as CSV</option>
                  <option value="pdf">Export as PDF</option>
                  <option value="excel">Export as Excel</option>
                </select>
                <Download className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <BillingFilters filters={filters} onFiltersChange={setFilters} />

      {/* Summary Cards */}
      {data && <BillingSummaryCards summary={data.summary} />}

      {/* Project List */}
      {data && (
        <div className="space-y-4">
          {data.projects.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No billing data found for the selected period
                </p>
              </CardContent>
            </Card>
          ) : (
            data.projects.map((project) => (
              <ProjectBillingCard key={project.project_id} project={project} />
            ))
          )}
        </div>
      )}
    </div>
  );
};
