import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Lock, X } from 'lucide-react';
import type { Project } from '../../types';
import type { ProjectBillingRecord } from '../../types/billing';
import { useBillingContext } from '../../store/contexts/BillingContext';
import { useProjectBilling } from '../../hooks/useProjectBilling';
import { BillingHeader } from './components/BillingHeader';
import { BillingEditHoursDialog } from './components/BillingEditHoursDialog';
import { ProjectBillingTable } from './components/ProjectBillingTable';
import { FilterMultiSelect, type MultiSelectOption } from './components/FilterMultiSelect';
import {
  buildMonthlyRange,
  buildTimelineRange,
  buildWeeklyRange,
  formatRangeLabel,
  type ViewMode
} from './utils/dateRanges';
import { BillingService } from '../../services/BillingService';
import { showError, showSuccess } from '../../utils/toast';

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'timeline', label: 'Project timeline' }
];

interface EditingState {
  project: ProjectBillingRecord;
  userId: string;
  userName: string;
  currentBillable: number;
  totalHours: number;
  verifiedWorkedHours?: number;
  verifiedBillableHours?: number;
  managerAdjustment?: number;
  verifiedAt?: string;
}

interface ProjectAdjustmentState {
  project: ProjectBillingRecord;
}

function normalizeProjectId(project: Project): string {
  return project._id ?? project.id ?? '';
}
export function ProjectBillingPage() {
  const { projects, clients } = useBillingContext();
  const {
    data,
    loading,
    params,
    setDateRange,
    setView,
    setProjectIds,
    setClientIds,
    refresh,
    updateBillingHours
  } = useProjectBilling();
  const initialMode: ViewMode =
    params.view === 'weekly' ? 'weekly' :
    params.view === 'custom' ? 'timeline' :
    'monthly';
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [monthlyOffset, setMonthlyOffset] = useState(0);
  const [weeklyOffset, setWeeklyOffset] = useState(0);
  const [editingMember, setEditingMember] = useState<EditingState | null>(null);
  const [projectAdjustment, setProjectAdjustment] = useState<ProjectAdjustmentState | null>(null);
  const [adjustingProject, setAdjustingProject] = useState(false);
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((project) => {
      map.set(normalizeProjectId(project), project);
    });
    return map;
  }, [projects]);
  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const lockedProjectIds = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((project) => {
      if (!project.end_date) return;
      const endDate = new Date(project.end_date);
      if (Number.isNaN(endDate.getTime())) return;
      if (endDate < todayStart) {
        set.add(normalizeProjectId(project));
      }
    });
    return set;
  }, [projects, todayStart]);
  useEffect(() => {
    const expected: ViewMode =
      params.view === 'weekly' ? 'weekly' :
      params.view === 'custom' ? 'timeline' :
      'monthly';
    if (viewMode !== expected) {
      setViewMode(expected);
    }
  }, [params.view, viewMode]);
  const projectOptions = useMemo<MultiSelectOption[]>(() => (
    projects.map((project) => {
      const startLabel = project.start_date ? new Date(project.start_date).toLocaleDateString() : null;
      const endLabel = project.end_date ? new Date(project.end_date).toLocaleDateString() : null;
      return {
        value: normalizeProjectId(project),
        label: project.name,
        description: startLabel
          ? endLabel
            ? `${startLabel} Ã¢â‚¬â€œ ${endLabel}`
            : `${startLabel} Ã¢â‚¬â€œ ongoing`
          : undefined
      };
    })
  ), [projects]);
  const clientOptions = useMemo<MultiSelectOption[]>(() => (
    clients.map((client) => ({
      value: client._id ?? client.id ?? '',
      label: client.name ?? 'Unnamed client'
    }))
  ), [clients]);
  const summaryCards = useMemo(() => {
    if (!data) {
      return [];
    }
    const totals = data.projects.reduce(
      (acc, project) => {
        acc.projects += 1;
        acc.billable += project.billable_hours;
        acc.worked += project.total_hours;
        acc.cost += project.total_amount ?? 0;
        return acc;
      },
      { projects: 0, billable: 0, worked: 0, cost: 0 }
    );
    return [
      { label: 'Projects', value: totals.projects.toString() },
      { label: 'Billable Hours', value: `${totals.billable.toFixed(1)}h` },
      { label: 'Worked Hours', value: `${totals.worked.toFixed(1)}h` },
      { label: 'Total Cost', value: `$${totals.cost.toLocaleString()}` }
    ];
  }, [data]);
  const rangeLabel = useMemo(
    () => formatRangeLabel(params.startDate, params.endDate, viewMode),
    [params.endDate, params.startDate, viewMode]
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
  const setTimelineRange = useCallback(() => {
    const fallback = buildMonthlyRange(0);
    const range = buildTimelineRange(params.projectIds, projects, fallback);
    setMonthlyOffset(0);
    setWeeklyOffset(0);
    setView('custom');
    setDateRange(range.startDate, range.endDate);
  }, [params.projectIds, projects, setDateRange, setView]);
  useEffect(() => {
    if (viewMode === 'timeline') {
      setTimelineRange();
    }
  }, [params.projectIds, setTimelineRange, viewMode]);
  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'monthly') {
      setMonthlyRange(0);
    } else if (mode === 'weekly') {
      setWeeklyRange(0);
    } else {
      setTimelineRange();
    }
  }, [setMonthlyRange, setTimelineRange, setWeeklyRange]);
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
    setMonthlyRange(0);
    setViewMode('monthly');
  }, [setClientIds, setMonthlyRange, setProjectIds]);
  const handleMemberEditRequest = useCallback((payload: EditingState) => {
    if (lockedProjectIds.has(payload.project.project_id)) {
      showError('This project is locked. Adjustments are disabled.');
      return;
    }
    setEditingMember(payload);
  }, [lockedProjectIds]);
  const handleProjectAdjustmentRequest = useCallback((project: ProjectBillingRecord) => {
    if (lockedProjectIds.has(project.project_id)) {
      showError('This project is locked. Adjustments are disabled.');
      return;
    }
    setProjectAdjustment({ project });
  }, [lockedProjectIds]);
  const handleMemberSave = useCallback(async (hours: number) => {
    if (!editingMember) return;
    const { userId, project, totalHours } = editingMember;
    const success = await updateBillingHours({
      userId,
      projectId: project.project_id,
      billableHours: hours,
      totalHours,
      reason: 'Manual adjustment from project billing view'
    });
    if (success) {
      setEditingMember(null);
    }
  }, [editingMember, updateBillingHours]);
  const handleProjectAdjustmentSave = useCallback(async (billableHours: number) => {
    if (!projectAdjustment) return;
    setAdjustingProject(true);
    const response = await BillingService.updateProjectTotalBillableHours(
      projectAdjustment.project.project_id,
      params.startDate,
      params.endDate,
      billableHours
    );
    if (!response.success) {
      showError(response.error ?? 'Unable to update project billable hours');
      setAdjustingProject(false);
      return;
    }
    setProjectAdjustment(null);
    setAdjustingProject(false);
    showSuccess('Project billable hours updated');
    await refresh();
  }, [params.endDate, params.startDate, projectAdjustment, refresh]);
  const handleExport = useCallback(async (format: 'csv' | 'pdf' | 'excel') => {
    const { success, error, filename, deliveredFormat } = await BillingService.exportBillingReport(
      params.startDate,
      params.endDate,
      format,
      {
        view: params.view,
        projectIds: params.projectIds,
        clientIds: params.clientIds
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
  }, [params.clientIds, params.endDate, params.projectIds, params.startDate, params.view]);
  const projectSelectedValues = params.projectIds;
  const clientSelectedValues = params.clientIds;
  return (
    <div className="space-y-6 pb-12">
      <BillingHeader
        title="Project Billing"
        subtitle="Review project-level billable hours, overrides, and revenue performance"
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
              selected={projectSelectedValues}
              onChange={setProjectIds}
            />
            <FilterMultiSelect
              label="Clients"
              options={clientOptions}
              placeholder="All clients"
              selected={clientSelectedValues}
              onChange={setClientIds}
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
                  {VIEW_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
            </div>
            {viewMode === 'timeline' ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-300">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{rangeLabel}</span>
              </div>
            ) : (
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
                  {rangeLabel}
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
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
          {lockedProjectIds.size > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300">
              <Lock className="h-3.5 w-3.5" />
              {lockedProjectIds.size} project{lockedProjectIds.size > 1 ? 's' : ''} locked
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
            </div>
          ))}
        </section>
      )}
      <ProjectBillingTable
        data={data}
        loading={loading}
        lockedProjects={lockedProjectIds}
        onEdit={handleMemberEditRequest}
        onProjectAdjust={handleProjectAdjustmentRequest}
      />
      <BillingEditHoursDialog
        open={Boolean(editingMember)}
        title="Adjust Project Billable Hours"
        description={
          editingMember ? (
            <>
              Update <strong>{editingMember.userName}</strong> on{' '}
              <strong>{editingMember.project.project_name}</strong>.
            </>
          ) : undefined
        }
        initialHours={editingMember?.currentBillable ?? 0}
        originalHours={editingMember?.currentBillable}
        workedHours={editingMember?.totalHours}
        verifiedWorkedHours={editingMember?.verifiedWorkedHours}
        verifiedBillableHours={editingMember?.verifiedBillableHours}
        managerAdjustment={editingMember?.managerAdjustment}
        verifiedAt={editingMember?.verifiedAt}
        confirmLabel="Update Hours"
        onClose={() => setEditingMember(null)}
        onSave={handleMemberSave}
      />
      <BillingEditHoursDialog
        open={Boolean(projectAdjustment)}
        title="Adjust Total Project Billable Hours"
        description={
          projectAdjustment ? (
            <>
              Update the billable total for{' '}
              <strong>{projectAdjustment.project.project_name}</strong>.
            </>
          ) : undefined
        }
        initialHours={projectAdjustment?.project.billable_hours ?? 0}
        originalHours={projectAdjustment?.project.billable_hours}
        workedHours={projectAdjustment?.project.total_hours}
        confirmLabel={adjustingProject ? 'Updating...' : 'Update Project'}
        onClose={() => {
          if (!adjustingProject) {
            setProjectAdjustment(null);
          }
        }}
        onSave={handleProjectAdjustmentSave}
      />
    </div>
  );
}
export default ProjectBillingPage;
