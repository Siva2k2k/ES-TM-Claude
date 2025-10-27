import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit3, Lock, CheckCircle, BarChart3 } from 'lucide-react';
import type { ProjectBillingRecord, ProjectBillingResponse, ProjectBillingResource } from '../../../types/billing';
import { UserBreakdownDialog } from './UserBreakdownDialog';
import { showError } from '../../../utils/toast';

interface ProjectBillingTableProps {
  data: ProjectBillingResponse | null;
  loading: boolean;
  viewMode?: 'weekly' | 'monthly' | 'timeline';
  params?: {
    startDate: string;
    endDate: string;
  };
  onEdit: (args: {
    project: ProjectBillingRecord;
    userId: string;
    userName: string;
    currentBillable: number;
    totalHours: number;
    verifiedWorkedHours?: number;
    verifiedBillableHours?: number;
    managerAdjustment?: number;
    verifiedAt?: string;
  }) => void;
  onProjectAdjust?: (project: ProjectBillingRecord) => void;
  lockedProjects?: Set<string>;
}

export function ProjectBillingTable({
  data,
  loading,
  viewMode,
  params,
  onEdit,
  onProjectAdjust,
  lockedProjects
}: ProjectBillingTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [breakdownDialog, setBreakdownDialog] = useState<{
    open: boolean;
    projectId: string;
    projectName: string;
    userId: string;
    userName: string;
    breakdownType: 'weekly' | 'monthly';
  } | null>(null);

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

  const handleViewBreakdown = (resource: ProjectBillingResource, project: ProjectBillingRecord) => {
    // Determine breakdown type based on view mode
    const breakdownType = viewMode === 'monthly' ? 'weekly' as const :
                         viewMode === 'timeline' ? 'monthly' as const :
                         null;

    if (!breakdownType) {
      showError('Breakdown view not available for weekly mode');
      return;
    }

    if (!params) {
      showError('Date parameters not available');
      return;
    }

    setBreakdownDialog({
      open: true,
      projectId: project.project_id,
      projectName: project.project_name,
      userId: resource.user_id,
      userName: resource.user_name,
      breakdownType
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
                          {project.verification_info?.is_verified && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-green-700 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300">
                              <CheckCircle className="h-3 w-3" />
                              Verified {project.verification_info.verified_at ? new Date(project.verification_info.verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                            </span>
                          )}
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
                                const hasVerification = resource.verified_worked_hours !== undefined;

                                return (
                                  <tr key={resource.user_id} className={hasVerification ? 'bg-green-50/30 dark:bg-green-900/10' : ''}>
                                    <td className="px-4 py-2">
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                          {resource.user_name}
                                        </span>
                                        {hasVerification && (
                                          <div className="mt-1 flex items-center gap-2 text-xs">
                                            <span className="text-slate-500 dark:text-slate-400">
                                              Verified: {resource.verified_worked_hours}h worked
                                            </span>
                                            {resource.manager_adjustment !== 0 && resource.manager_adjustment !== undefined && (
                                              <span className={`font-medium ${resource.manager_adjustment > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {resource.manager_adjustment > 0 ? '+' : ''}{resource.manager_adjustment}h adj
                                              </span>
                                            )}
                                            <span className="font-medium text-green-600 dark:text-green-400">
                                              = {resource.verified_billable_hours}h billable
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
                                      {resource.role}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-slate-600 dark:text-slate-300">
                                      {workedHours.toFixed(1)}h
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <div className="flex flex-col items-end">
                                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          {billableHours.toFixed(1)}h
                                        </span>
                                        {hasVerification && resource.verified_billable_hours !== billableHours && (
                                          <span className="text-xs text-slate-500 dark:text-slate-400">
                                            (was {resource.verified_billable_hours}h)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-slate-600 dark:text-slate-300">
                                      ${resource.hourly_rate.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      ${cost.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        {(viewMode === 'monthly' || viewMode === 'timeline') && (
                                          <button
                                            type="button"
                                            onClick={() => handleViewBreakdown(resource, project)}
                                            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium transition hover:bg-purple-50 hover:text-purple-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
                                          >
                                            <BarChart3 className="mr-2 h-4 w-4" />
                                            Breakdown
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onEdit({
                                              project,
                                              userId: resource.user_id,
                                              userName: resource.user_name,
                                              currentBillable: billableHours,
                                              totalHours: workedHours,
                                              verifiedWorkedHours: resource.verified_worked_hours,
                                              verifiedBillableHours: resource.verified_billable_hours,
                                              managerAdjustment: resource.manager_adjustment,
                                              verifiedAt: resource.verified_at
                                            })
                                          }
                                          disabled={isLocked}
                                          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-blue-900/20 dark:disabled:border-slate-700 dark:disabled:text-slate-600"
                                        >
                                          <Edit3 className="mr-2 h-4 w-4" />
                                          {isLocked ? 'Locked' : 'Adjust'}
                                        </button>
                                      </div>
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

      {/* Breakdown Dialog */}
      {breakdownDialog && params && (
        <UserBreakdownDialog
          open={breakdownDialog.open}
          onClose={() => setBreakdownDialog(null)}
          projectId={breakdownDialog.projectId}
          projectName={breakdownDialog.projectName}
          userId={breakdownDialog.userId}
          userName={breakdownDialog.userName}
          breakdownType={breakdownDialog.breakdownType}
          startDate={params.startDate}
          endDate={params.endDate}
        />
      )}
    </div>
  );
}
