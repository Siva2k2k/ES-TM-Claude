import React, { useEffect, useState } from 'react';
import { X, Calendar, User, BarChart3 } from 'lucide-react';
import { BillingService } from '../../../services/BillingService';
import type { UserBreakdownResponse, WeeklyBreakdown, MonthlyBreakdown } from '../../../types/billing';

interface UserBreakdownDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  breakdownType: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
}

export function UserBreakdownDialog({
  open,
  onClose,
  projectId,
  projectName,
  userId,
  userName,
  breakdownType,
  startDate,
  endDate
}: UserBreakdownDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breakdownData, setBreakdownData] = useState<UserBreakdownResponse | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchBreakdown = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = breakdownType === 'weekly'
          ? await BillingService.getUserWeeklyBreakdown(projectId, userId, startDate, endDate)
          : await BillingService.getUserMonthlyBreakdown(projectId, userId, startDate, endDate);

        if (response.success && response.data) {
          setBreakdownData(response.data);
        } else {
          setError(response.error || 'Failed to load breakdown data');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error('Error fetching breakdown:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBreakdown();
  }, [open, projectId, userId, breakdownType, startDate, endDate]);

  if (!open) return null;

  const formatPeriod = (period: string, type: 'weekly' | 'monthly'): string => {
    const date = new Date(period);
    if (type === 'weekly') {
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                User Breakdown - {breakdownType === 'weekly' ? 'Weekly' : 'Monthly'}
              </h2>
              <div className="mt-1 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {userName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {projectName}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          ) : breakdownData && breakdownData.breakdown.length > 0 ? (
            <div className="space-y-4">
              {/* Period Info */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-800 dark:bg-blue-900/20">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Showing {breakdownType} breakdown for {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                </p>
              </div>

              {/* Breakdown Table */}
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Period
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Worked Hours
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Billable Hours
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {breakdownData.breakdown.map((item, index) => {
                      const period = breakdownType === 'weekly'
                        ? (item as WeeklyBreakdown).week_start
                        : (item as MonthlyBreakdown).month_start;

                      return (
                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                            {formatPeriod(period, breakdownType)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300">
                            {item.total_hours.toFixed(1)}h
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {item.billable_hours.toFixed(1)}h
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                            ${item.amount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 dark:bg-slate-800/40">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900 dark:text-slate-100">
                        {breakdownData.total_worked_hours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900 dark:text-slate-100">
                        {breakdownData.total_billable_hours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900 dark:text-slate-100">
                        ${breakdownData.total_amount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No breakdown data available for this period
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
