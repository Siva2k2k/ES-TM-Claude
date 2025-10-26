import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Lock, Search } from 'lucide-react';
import type { Project } from '../../types';
import type { UserBillingRecord } from '../../types/billing';
import { useBillingContext } from '../../store/contexts/BillingContext';
import { useUserBilling } from '../../hooks/useUserBilling';
import { BillingHeader } from './components/BillingHeader';
import { BillingEditHoursDialog } from './components/BillingEditHoursDialog';
import { UserBillingTable } from './components/UserBillingTable';
import { FilterMultiSelect, type MultiSelectOption } from './components/FilterMultiSelect';
import {
  buildMonthlyRange,
  buildTimelineRange,
  buildWeeklyRange,
  formatRangeLabel,
  type ViewMode
} from '../../utils/dateRanges';
import { BillingService } from '../../services/BillingService';
import { showError, showSuccess } from '../../utils/toast';

interface EditingState {
  user: UserBillingRecord;
  projectId: string;
  projectName: string;
  currentBillable: number;
  totalHours: number;
}

const ROLE_OPTIONS: MultiSelectOption[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'management', label: 'Management' }
];

function normalizeProjectId(project: Project): string {
  return project._id ?? project.id ?? '';
}

export function UserBillingPage() {
  const { projects, clients } = useBillingContext();
  const {
    data,
    loading,
    params,
    setDateRange,
    setView,
    setProjectIds,
    setClientIds,
    setRoles,
    setSearch,
    refresh,
    updateProjectHours
  } = useUserBilling();

  const [viewMode, setViewMode] = useState<ViewMode>(
    params.view === 'weekly' ? 'weekly' :
    params.view === 'custom' ? 'timeline' :
    'monthly'
  );
  const [monthlyOffset, setMonthlyOffset] = useState(0);
  const [weeklyOffset, setWeeklyOffset] = useState(0);
  const [editing, setEditing] = useState<EditingState | null>(null);

  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  useEffect(() => {
    const expected: ViewMode =
      params.view === 'weekly' ? 'weekly' :
      params.view === 'custom' ? 'timeline' :
      'monthly';
    if (expected !== viewMode) {
      setViewMode(expected);
    }
  }, [params.view, viewMode]);

  const projectOptions = useMemo<MultiSelectOption[]>(() => (
    projects.map((project) => ({
      value: normalizeProjectId(project),
      label: project.name
    }))
  ), [projects]);

  const clientOptions = useMemo<MultiSelectOption[]>(() => (
    clients.map((client) => ({
      value: client._id ?? client.id ?? '',
      label: client.name ?? 'Unnamed client'
    }))
  ), [clients]);

  const currentRangeLabel = useMemo(
    () => formatRangeLabel(params.startDate, params.endDate, viewMode),
    [params.endDate, params.startDate, viewMode]
  );

  const rangeLocked = useMemo(
    () => viewMode !== 'timeline' && new Date(params.endDate) < todayStart,
    [params.endDate, todayStart, viewMode]
  );

  const setMonthlyRange = useCallback((offset: number) => {
    const range = buildMonthlyRange(offset);
    setMonthlyOffset(offset);
    setWeeklyOffset(0);
    setView('monthly');
    setDateRange(range.startDate, range.endDate);
  }, [setDateRange, setView]);

  const setWeeklyRange = useCallback((offset: number) => {
    const range = buildWeeklyRange(offset);
    setWeeklyOffset(offset);
    setMonthlyOffset(0);
    setView('weekly');
    setDateRange(range.startDate, range.endDate);
  }, [setDateRange, setView]);

  const setProjectTimelineRange = useCallback(() => {
    const fallback = buildMonthlyRange(0);
    const range = buildTimelineRange(params.projectIds, projects, {
      ...fallback
    });
    setWeeklyOffset(0);
    setMonthlyOffset(0);
    setView('custom');
    setDateRange(range.startDate, range.endDate);
  }, [params.projectIds, projects, setDateRange, setView]);

  useEffect(() => {
    if (viewMode === 'timeline') {
      setProjectTimelineRange();
    }
  }, [params.projectIds, setProjectTimelineRange, viewMode]);

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'monthly') {
      setMonthlyRange(0);
    } else if (mode === 'weekly') {
      setWeeklyRange(0);
    } else {
      setProjectTimelineRange();
    }
  }, [setMonthlyRange, setProjectTimelineRange, setWeeklyRange]);

  const handlePrevious = useCallback(() => {
    if (viewMode === 'monthly') {
      setMonthlyRange(monthlyOffset - 1);
    } else if (viewMode === 'weekly') {
      setWeeklyRange(weeklyOffset - 1);
    }
  }, [monthlyOffset, setMonthlyRange, setWeeklyRange, viewMode, weeklyOffset]);

  const handleNext = useCallback(() => {
    if (viewMode === 'monthly') {
      setMonthlyRange(monthlyOffset + 1);
    } else if (viewMode === 'weekly') {
      setWeeklyRange(weeklyOffset + 1);
    }
  }, [monthlyOffset, setMonthlyRange, setWeeklyRange, viewMode, weeklyOffset]);

  const handleClearFilters = useCallback(() => {
    setProjectIds([]);
    setClientIds([]);
    setRoles([]);
    setSearch('');
    setMonthlyRange(0);
    setViewMode('monthly');
  }, [setClientIds, setMonthlyRange, setProjectIds, setRoles, setSearch]);

  const handleProjectAdjust = useCallback((payload: {
    user: UserBillingRecord;
    projectId: string;
    projectName: string;
    billableHours: number;
    totalHours: number;
  }) => {
    if (rangeLocked) {
      showError('This billing period is locked. Adjustments are disabled.');
      return;
    }
    setEditing({
      user: payload.user,
      projectId: payload.projectId,
      projectName: payload.projectName,
      currentBillable: payload.billableHours,
      totalHours: payload.totalHours
    });
  }, [rangeLocked]);

  const handleDialogSave = useCallback(async (hours: number) => {
    if (!editing) return;
    const success = await updateProjectHours({
      userId: editing.user.user_id,
      projectId: editing.projectId,
      billableHours: hours,
      totalHours: editing.totalHours,
      reason: `Manual adjustment for ${editing.projectName}`
    });
    if (success) {
      setEditing(null);
    }
  }, [editing, updateProjectHours]);

  const handleExport = useCallback(async (format: 'csv' | 'pdf' | 'excel') => {
    const { success, error, filename, deliveredFormat } = await BillingService.exportBillingReport(
      params.startDate,
      params.endDate,
      format,
      {
        view: params.view,
        projectIds: params.projectIds,
        clientIds: params.clientIds,
        roles: params.roles,
        search: params.search
      }
    );

    if (!success) {
      showError(error ?? 'Failed to export billing data');
      return;
    }

    const finalFormat = deliveredFormat ?? format;
    const formatLabel = finalFormat.toUpperCase();
    const suffix = filename ? ` (${filename})` : ` as ${formatLabel}`;
    showSuccess(`Export ready${suffix}`);
  }, [
    params.clientIds,
    params.endDate,
    params.projectIds,
    params.roles,
    params.search,
    params.startDate,
    params.view
  ]);

  const summaryCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      { label: 'Users', value: data.summary.total_users.toString() },
      { label: 'Billable Hours', value: `${data.summary.total_billable_hours.toFixed(1)}h` },
      { label: 'Non-Billable Hours', value: `${data.summary.total_non_billable_hours.toFixed(1)}h` },
      { label: 'Total Cost', value: `$${data.summary.total_amount.toLocaleString()}` }
    ];
  }, [data]);

  return (
    <div className="space-y-6 pb-12">
      <BillingHeader
        title="User Billing"
        subtitle="Review individual billable performance with task-level drilldowns"
        onRefresh={refresh}
        onExport={handleExport}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <FilterMultiSelect
              label="Projects"
              options={projectOptions}
              placeholder="All projects"
              selected={params.projectIds}
              onChange={setProjectIds}
            />
            <FilterMultiSelect
              label="Clients"
              options={clientOptions}
              placeholder="All clients"
              selected={params.clientIds}
              onChange={setClientIds}
            />
            <FilterMultiSelect
              label="Roles"
              options={ROLE_OPTIONS}
              placeholder="All roles"
              selected={params.roles}
              onChange={setRoles}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                View
              </label>
              <div className="relative">
                <select
                  value={viewMode}
                  onChange={(event) => handleViewChange(event.target.value as ViewMode)}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="timeline">Project timeline</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={handlePrevious}
                className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                aria-label="Previous period"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[160px] text-center font-medium text-slate-700 dark:text-slate-200">
                {currentRangeLabel}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                aria-label="Next period"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="search"
              value={params.search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name"
              className="w-64 rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
          >
            Clear filters
          </button>

          {rangeLocked && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300">
              <Lock className="h-3.5 w-3.5" />
              Locked period
            </span>
          )}
        </div>
      </section>

      {summaryCards.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {card.value}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {currentRangeLabel}
              </p>
            </div>
          ))}
        </section>
      )}

      <UserBillingTable
        data={data}
        loading={loading}
        locked={rangeLocked}
        onAdjust={handleProjectAdjust}
      />

      <BillingEditHoursDialog
        open={Boolean(editing)}
        title="Adjust User Billable Hours"
        description={
          editing ? (
            <>
              Update <strong>{editing.user.user_name}</strong> on{' '}
              <strong>{editing.projectName}</strong>.
            </>
          ) : undefined
        }
        initialHours={editing?.currentBillable ?? 0}
        originalHours={editing?.currentBillable}
        workedHours={editing?.totalHours}
        confirmLabel="Update Hours"
        onClose={() => setEditing(null)}
        onSave={handleDialogSave}
      />
    </div>
  );
}

export default UserBillingPage;
