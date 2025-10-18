import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit3, Lock } from 'lucide-react';
import type { ProjectBillingRecord, ProjectBillingResponse } from '../../../types/billing';

interface ProjectBillingTableProps {
  data: ProjectBillingResponse | null;
  loading: boolean;
  onEdit: (args: {
    project: ProjectBillingRecord;
    userId: string;
    userName: string;
    currentBillable: number;
    totalHours: number;
  }) => void;
  onProjectAdjust?: (project: ProjectBillingRecord) => void;
  lockedProjects?: Set<string>;
}

export function ProjectBillingTable({
  data,
  loading,
  onEdit,
  onProjectAdjust,
  lockedProjects
}: ProjectBillingTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleProject = (projectId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
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

  if (!data || data.projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        No project billing records for the selected filters.
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
                Project
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Client
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
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.projects.map((project) => {
              const isLocked = lockedProjects?.has(project.project_id) ?? false;
              const isExpanded = expanded.has(project.project_id);
              const projectTotalHours =
                project.total_hours ??
                project.resources.reduce((sum, resource) => sum + resource.total_hours, 0);
              const projectBillableHours =
                project.billable_hours ??
                project.resources.reduce(
                  (sum, resource) => sum + (resource.billable_hours ?? resource.total_hours),
                  0
                );
              const projectCost =
                project.total_amount ??
                project.resources.reduce(
                  (sum, resource) => sum + (resource.total_amount ?? resource.billable_hours * resource.hourly_rate),
                  0
                );
              const projectNonBillable = Math.max(
                project.total_hours !== undefined && project.non_billable_hours !== undefined
                  ? project.non_billable_hours
                  : projectTotalHours - projectBillableHours,
                0
              );

              return (
                <React.Fragment key={project.project_id}>
                  <tr className="bg-white hover:bg-blue-50/40 dark:bg-slate-900 dark:hover:bg-blue-900/30">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleProject(project.project_id)}
                        className="flex items-center gap-2 text-left text-sm font-semibold text-slate-900 dark:text-slate-100"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="flex items-center gap-2">
                          {project.project_name}
                          {isLocked && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                              <Lock className="h-3 w-3" />
                              Locked
                            </span>
                          )}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {project.client_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300">
                      {projectTotalHours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {projectBillableHours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300">
                      {projectNonBillable.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                      ${projectCost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {onProjectAdjust && (
                        <button
                          type="button"
                          onClick={() => !isLocked && onProjectAdjust(project)}
                          disabled={isLocked}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-blue-900/20 dark:disabled:border-slate-700 dark:disabled:text-slate-600"
                        >
                          <Edit3 className="h-4 w-4" />
                          {isLocked ? 'Locked' : 'Adjust Total'}
                        </button>
                      )}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-slate-50/60 dark:bg-slate-800/40">
                      <td colSpan={7} className="px-4 pb-4 pt-0">
                        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-100 dark:bg-slate-800">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                  Team Member
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                  Role
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                  Worked Hours
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                  Billable Hours
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                  Hourly Rate
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                  Cost
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                              {project.resources.map((resource) => {
                                const workedHours = resource.total_hours;
                                const billableHours = resource.billable_hours ?? workedHours;
                                const cost = resource.total_amount ?? billableHours * resource.hourly_rate;

                                return (
                                  <tr key={resource.user_id}>
                                    <td className="px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                                      {resource.user_name}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
                                      {resource.role}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-slate-600 dark:text-slate-300">
                                      {workedHours.toFixed(1)}h
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {billableHours.toFixed(1)}h
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-slate-600 dark:text-slate-300">
                                      ${resource.hourly_rate.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      ${cost.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onEdit({
                                            project,
                                            userId: resource.user_id,
                                            userName: resource.user_name,
                                            currentBillable: billableHours,
                                            totalHours: workedHours
                                          })
                                        }
                                        disabled={isLocked}
                                        className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-blue-900/20 dark:disabled:border-slate-700 dark:disabled:text-slate-600"
                                      >
                                        <Edit3 className="mr-2 h-4 w-4" />
                                        {isLocked ? 'Locked' : 'Adjust'}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
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
