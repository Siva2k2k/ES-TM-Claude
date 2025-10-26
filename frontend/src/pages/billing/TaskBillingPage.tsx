import React, { useMemo, useState } from 'react';
import { useBillingContext } from '../../store/contexts/BillingContext';
import { useTaskBilling } from '../../hooks/useTaskBilling';
import type { TaskBillingRecord } from '../../types/billing';
import { BillingHeader } from './components/BillingHeader';
import { BillingEditHoursDialog } from './components/BillingEditHoursDialog';
import { TaskBillingTable } from './components/TaskBillingTable';
import * as formatting from '../../utils/formatting';

interface EditingState {
  task: TaskBillingRecord;
  userId: string;
  userName: string;
  currentBillable: number;
  totalHours: number;
}

export function TaskBillingPage() {
  const { projects } = useBillingContext();
  const {
    data,
    loading,
    params,
    setDateRange,
    setProjectIds,
    refresh,
    updateTaskHours
  } = useTaskBilling();

  const [editing, setEditing] = useState<EditingState | null>(null);

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        id: project.id ?? project.id ?? '',
        name: project.name
      })),
    [projects]
  );

  const summaryCards = data
    ? [
        {
          label: 'Tasks',
          value: data.summary.total_tasks.toString()
        },
        {
          label: 'Billable Hours',
          value: `${data.summary.total_billable_hours.toFixed(1)}h`
        },
        {
          label: 'Total Hours',
          value: `${data.summary.total_hours.toFixed(1)}h`
        },
        {
          label: 'Revenue',
          value: `$${data.summary.total_amount.toLocaleString()}`
        }
      ]
    : [];

  const handleSave = async (hours: number) => {
    if (!editing) return;
    const { userId, task, totalHours } = editing;
    setEditing(null);
    await updateTaskHours({
      userId,
      taskId: task.task_id,
      billableHours: hours,
      totalHours
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <BillingHeader
        title="Task Billing"
        subtitle="Inspect task-level billable adjustments and contributor performance"
        onRefresh={refresh}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Start Date
            </label>
            <input
              type="date"
              value={params.startDate}
              onChange={(event) => setDateRange(event.target.value, params.endDate)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              End Date
            </label>
            <input
              type="date"
              value={params.endDate}
              onChange={(event) => setDateRange(params.startDate, event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Projects
            </label>
            <select
              multiple
              value={params.projectIds}
              onChange={(event) => {
                const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                setProjectIds(values);
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              size={Math.min(6, Math.max(projectOptions.length, 3))}
            >
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Hold Ctrl/⌘ to select multiple projects.
            </p>
          </div>
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
                {formatting.formatDate(params.startDate, 'short')} – {formatting.formatDate(params.endDate, 'short')}
              </p>
            </div>
          ))}
        </section>
      )}

  <TaskBillingTable
        data={data}
        loading={loading}
        onEdit={(payload) => setEditing(payload)}
      />

      <BillingEditHoursDialog
        open={Boolean(editing)}
        title="Adjust Task Billable Hours"
        description={
          editing ? (
            <>
              Update <strong>{editing.userName}</strong> on{' '}
              <strong>{editing.task.task_name}</strong>.
            </>
          ) : undefined
        }
        initialHours={editing?.currentBillable ?? 0}
        originalHours={editing?.currentBillable}
        workedHours={editing?.totalHours}
        confirmLabel="Update Hours"
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
    </div>
  );
}

export default TaskBillingPage;
