import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit3, Lock } from 'lucide-react';
import type { UserBillingRecord, UserBillingResponse } from '../../../types/billing';

interface UserBillingTableProps {
  data: UserBillingResponse | null;
  loading: boolean;
  locked: boolean;
  onAdjust: (args: {
    user: UserBillingRecord;
    projectId: string;
    projectName: string;
    billableHours: number;
    totalHours: number;
  }) => void;
}

export function UserBillingTable({
  data,
  loading,
  locked,
  onAdjust
}: UserBillingTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleUser = (userId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        No user billing records for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Role
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Worked Hours
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Billable Hours
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Non-Billable
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Cost
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Projects
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.users.map((user) => {
              const isExpanded = expanded.has(user.user_id);

              return (
                <React.Fragment key={user.user_id}>
                  <tr className="bg-white hover:bg-blue-50/40 dark:bg-slate-900 dark:hover:bg-blue-900/30">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleUser(user.user_id)}
                        className="flex items-center gap-2 text-left text-sm font-semibold text-slate-900 dark:text-slate-100"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="flex items-center gap-2">
                          {user.user_name}
                          {locked && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                              <Lock className="h-3 w-3" />
                              Locked
                            </span>
                          )}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {user.role}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300">
                      {user.total_hours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {user.billable_hours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300">
                      {user.non_billable_hours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                      ${user.total_amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300">
                      {user.projects.length}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => toggleUser(user.user_id)}
                        className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium transition hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-blue-900/20"
                      >
                        {isExpanded ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-slate-50/60 dark:bg-slate-800/40">
                      <td colSpan={8} className="px-4 pb-4 pt-0">
                        <div className="space-y-4">
                          {user.projects.map((project) => {
                            const projectTasks = (user.tasks ?? []).filter(
                              (task) => task.project_id === project.project_id
                            );

                            return (
                              <div
                                key={`${user.user_id}-${project.project_id}`}
                                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                      {project.project_name}
                                    </h4>
                                    {project.client_name && (
                                      <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {project.client_name}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="text-sm text-slate-600 dark:text-slate-300">
                                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {project.total_hours.toFixed(1)}h
                                      </span>{' '}
                                      worked
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300">
                                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {project.billable_hours.toFixed(1)}h
                                      </span>{' '}
                                      billable
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300">
                                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {project.non_billable_hours.toFixed(1)}h
                                      </span>{' '}
                                      non-billable
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300">
                                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        ${project.amount.toLocaleString()}
                                      </span>{' '}
                                      cost
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onAdjust({
                                          user,
                                          projectId: project.project_id,
                                          projectName: project.project_name,
                                          billableHours: project.billable_hours,
                                          totalHours: project.total_hours
                                        })
                                      }
                                      disabled={locked}
                                      className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-blue-900/20 dark:disabled:border-slate-700 dark:disabled:text-slate-600"
                                    >
                                      <Edit3 className="mr-2 h-4 w-4" />
                                      {locked ? 'Locked' : 'Adjust'}
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                  {projectTasks.length > 0 ? (
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                      <thead className="bg-slate-100 dark:bg-slate-800">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                            Task
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                            Worked Hours
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                            Billable Hours
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                            Non-Billable
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                            Cost
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm text-slate-600 dark:text-slate-300">
                                        {projectTasks.map((task) => (
                                          <tr key={`${task.task_id}-${task.project_id}`}>
                                            <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">
                                              {task.task_name}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              {task.total_hours.toFixed(1)}h
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              {task.billable_hours.toFixed(1)}h
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              {task.non_billable_hours.toFixed(1)}h
                                            </td>
                                            <td className="px-4 py-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                                              ${task.amount.toLocaleString()}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
                                      No task breakdown available for this project.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
