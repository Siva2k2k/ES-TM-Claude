/**
 * useProjectBilling Hook
 * Manages project billing data and operations
 * Cognitive Complexity: 6
 */
import { useState, useEffect, useCallback } from 'react';
import { billingService } from '../services/billingService';
import type { ProjectBillingResponse, BillingFilters } from '../types/billing.types';

interface UseProjectBillingReturn {
  data: ProjectBillingResponse | null;
  isLoading: boolean;
  error: string | null;
  filters: BillingFilters;
  setFilters: (filters: Partial<BillingFilters>) => void;
  refreshData: () => Promise<void>;
  exportData: (format: 'csv' | 'pdf' | 'excel') => Promise<void>;
}

const getDefaultFilters = (): BillingFilters => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: lastDay.toISOString().split('T')[0],
    view: 'monthly',
  };
};

export const useProjectBilling = (): UseProjectBillingReturn => {
  const [data, setData] = useState<ProjectBillingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<BillingFilters>(getDefaultFilters());

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await billingService.getProjectBilling(filters);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load billing data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFilters = useCallback((newFilters: Partial<BillingFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const exportData = useCallback(
    async (format: 'csv' | 'pdf' | 'excel') => {
      try {
        const blob = await billingService.exportBillingData(filters, format);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `billing-report-${filters.startDate}-${filters.endDate}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        throw new Error('Failed to export billing data');
      }
    },
    [filters]
  );

  return {
    data,
    isLoading,
    error,
    filters,
    setFilters,
    refreshData,
    exportData,
  };
};
