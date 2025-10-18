import { useCallback, useEffect, useMemo, useState } from 'react';
import { BillingService } from '../services/BillingService';
import type { BillingPeriodView, UserBillingResponse } from '../types/billing';
import { showError, showSuccess } from '../utils/toast';

const getDefaultRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (date: Date) => date.toISOString().split('T')[0];

  return {
    startDate: format(start),
    endDate: format(end)
  };
};

interface UpdateHoursArgs {
  userId: string;
  projectId: string;
  billableHours: number;
  totalHours?: number;
  reason?: string;
}

interface UseUserBillingOptions {
  initialProjectIds?: string[];
  initialClientIds?: string[];
}

type ViewOption = BillingPeriodView | 'custom';

export function useUserBilling(options: UseUserBillingOptions = {}) {
  const defaultRange = useMemo(getDefaultRange, []);

  const [params, setParams] = useState<{
    startDate: string;
    endDate: string;
    view: ViewOption;
    projectIds: string[];
    clientIds: string[];
    search: string;
    roles: string[];
  }>(() => ({
    ...defaultRange,
    view: 'monthly',
    projectIds: options.initialProjectIds ?? [],
    clientIds: options.initialClientIds ?? [],
    search: '',
    roles: []
  }));

  const [data, setData] = useState<UserBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await BillingService.getUserBilling({
      startDate: params.startDate,
      endDate: params.endDate,
      view: params.view,
      projectIds: params.projectIds,
      clientIds: params.clientIds,
      search: params.search,
      roles: params.roles
    });

    if (result.error) {
      setError(result.error);
      showError(result.error);
    } else {
      setData(result.data ?? null);
    }

    setLoading(false);
  }, [params]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateProjectHours = useCallback(async (args: UpdateHoursArgs) => {
    const { success, error: updateError } = await BillingService.updateProjectBillingHours({
      userId: args.userId,
      projectId: args.projectId,
      startDate: params.startDate,
      endDate: params.endDate,
      billableHours: args.billableHours,
      totalHours: args.totalHours,
      reason: args.reason ?? 'Manual adjustment from user billing view'
    });

    if (!success) {
      showError(updateError ?? 'Failed to update billable hours');
      return false;
    }

    showSuccess('Billable hours updated');
    await loadData();
    return true;
  }, [params.startDate, params.endDate, loadData]);

  const setDateRange = useCallback((start: string, end: string) => {
    setParams((prev) => ({
      ...prev,
      startDate: start,
      endDate: end
    }));
  }, []);

  const setView = useCallback((view: ViewOption) => {
    setParams((prev) => ({
      ...prev,
      view
    }));
  }, []);

  const setProjectIds = useCallback((projectIds: string[]) => {
    setParams((prev) => ({
      ...prev,
      projectIds
    }));
  }, []);

  const setClientIds = useCallback((clientIds: string[]) => {
    setParams((prev) => ({
      ...prev,
      clientIds
    }));
  }, []);

  const setSearch = useCallback((value: string) => {
    setParams((prev) => ({
      ...prev,
      search: value
    }));
  }, []);

  const setRoles = useCallback((roles: string[]) => {
    setParams((prev) => ({
      ...prev,
      roles
    }));
  }, []);

  return {
    data,
    loading,
    error,
    params,
    setDateRange,
    setView,
    setProjectIds,
    setClientIds,
    setSearch,
    setRoles,
    refresh: loadData,
    updateProjectHours
  };
}
