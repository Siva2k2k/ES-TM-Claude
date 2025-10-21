/**
 * TimesheetForm Component
 *
 * Main form for creating and editing timesheets with weekly time entries.
 * Uses React Hook Form with Zod validation for robust form handling.
 *
 * Features:
 * - Week-based time entry
 * - Project/task selection per entry
 * - Real-time validation with daily and weekly totals
 * - Draft and submit functionality
 * - Responsive design
 *
 * Cognitive Complexity: 8 (Target: <15)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
import { Calendar, Plus, AlertTriangle, Save, Send, Lock, Copy, MoveLeftIcon, MoveLeft, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTimesheetForm, type TimesheetSubmitResult } from '../../hooks/useTimesheetForm';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { formatDate, formatDuration } from '../../utils/formatting';
import { cn } from '../../utils/cn';
import type { TimeEntry } from '../../types/timesheet.schemas';
import { backendApi } from '../../lib/backendApi';
import type { TimesheetProjectApproval, TimesheetStatus } from '../../types/timesheetApprovals';

// Helper: check if a date string (YYYY-MM-DD) is a weekend (module scope)
function isWeekend(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 || day === 6; // Sunday=0, Saturday=6
  } catch {
    return false;
  }
}

// Small UID generator for client-side stable keys
function generateUid() {
  return `e_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

// Project approval type used to determine per-project locking
export type ProjectApproval = Partial<TimesheetProjectApproval> & {
  project_id: string;
  project_name?: string;
};

export interface TimesheetFormProps {
  /** Initial week start date (defaults to current week Monday) */
  initialWeekStartDate?: string;
  /** Existing timesheet data for editing */
  initialData?: {
    week_start_date: string;
    entries: TimeEntry[];
  };
  /** Current mode for the form */
  mode?: 'create' | 'edit' | 'view';
  /** Timesheet identifier used in edit mode */
  timesheetId?: string;
  /** Available projects for selection */
  projects?: Array<{ id: string; name: string; is_active: boolean }>;
  /** Available tasks for selection */
  tasks?: Array<{ id: string; name: string; project_id: string }>;
  /** Optional project approvals (used to lock entries per-project) */
  projectApprovals?: ProjectApproval[];
  /** Projects explicitly editable due to lead rejection */
  editableProjectIds?: string[];
  /** Current timesheet status */
  timesheetStatus?: TimesheetStatus;
  /** Lead rejection reason for entire timesheet */
  leadRejectionReason?: string;
  /** Callback when form is successfully submitted */
  onSuccess?: (result: TimesheetSubmitResult) => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type TaskOptionWithProject = {
  value: string;
  label: string;
  projectId: string;
};

type WeekOption = {
  value: string;
  label: string;
};

export const TimesheetForm: React.FC<TimesheetFormProps> = ({
  initialWeekStartDate,
  initialData,
  mode = 'create',
  timesheetId,
  projects = [],
  tasks = [],
  projectApprovals = [],
  editableProjectIds = [],
  timesheetStatus,
  leadRejectionReason,
  onSuccess,
  onCancel
}) => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [leadValidationError, setLeadValidationError] = useState<{
    message: string;
    pendingReviews: Array<{ projectName: string; employeeName: string }>;
  } | null>(null);
  const isViewMode = mode === 'view';

  const {
    form,
    submitTimesheet,
    addEntry,
    removeEntry,
    dailyTotals,
    weeklyTotal,
    isSubmitting,
    validationWarnings
  } = useTimesheetForm({
    defaultValues: initialData || {
      week_start_date: initialWeekStartDate || getCurrentWeekMonday(),
      entries: []
    },
    mode,
    timesheetId,
    onSuccess
  });

  // If the parent passes `initialData` after mount (edit flow), reset the form
  useEffect(() => {
    if (initialData) {
      try {
        // Ensure each entry has a stable client-side UID to keep Controller bindings stable
        const entriesWithUid = Array.isArray(initialData.entries)
          ? initialData.entries.map(entry => {
              const normalized = { ...(entry as any) };
              normalized.is_editable = normalized.is_editable !== undefined ? Boolean(normalized.is_editable) : true;
              normalized._uid = normalized._uid || generateUid();
              return normalized;
            })
          : [];

        form.reset({
          week_start_date: initialData.week_start_date || initialWeekStartDate || getCurrentWeekMonday(),
          entries: entriesWithUid
        });

        const firstProjectEntry = Array.isArray(initialData.entries)
          ? initialData.entries.find(entry => !!entry.project_id)
          : undefined;
        setSelectedProject(firstProjectEntry?.project_id ?? '');
      } catch (err) {
        // non-fatal: avoid breaking the form if reset fails
        console.error('Failed to reset TimesheetForm with initialData', err);
      }
    } else if (mode === 'create') {
      setSelectedProject('');
    }
  }, [initialData, initialWeekStartDate, form, mode]);
  
  // Build quick lookup map for project approvals
  const projectApprovalMap = useMemo<Record<string, ProjectApproval>>(() => {
    const map: Record<string, ProjectApproval> = {};
    (projectApprovals || []).forEach((p) => {
      if (!p) return;
      const projectId = (p as any).project_id;
      if (!projectId) return;
      map[projectId] = { project_id: projectId, ...p };
    });
    return map;
  }, [projectApprovals]);

  const leadRejectedProjects = useMemo(() => (projectApprovals || []).filter(pa => pa?.lead_status === 'rejected'), [projectApprovals]);
  
  // Check if timesheet has rejections that need editing
  const hasRejections = useMemo(() => {
    // Case 1: Entire timesheet rejected by lead (status explicitly set to lead_rejected)
    if (timesheetStatus === 'lead_rejected') return true;
    
    // Case 2: Manager rejected
    if (timesheetStatus === 'manager_rejected') return true;
    
    return false;
  }, [timesheetStatus]);
  
  // Determine if this is a partial rejection scenario
  // Partial rejection = status is 'lead_rejected' BUT not all projects are rejected
  // (i.e., some projects are approved/pending while others are rejected)
  const isPartialRejection = useMemo(() => {
    if (timesheetStatus !== 'lead_rejected') return false;
    
    // If we have project approvals, check if there's a mix of rejected and non-rejected
    if (projectApprovals && projectApprovals.length > 0) {
      const rejectedCount = projectApprovals.filter(pa => pa?.lead_status === 'rejected').length;
      const totalCount = projectApprovals.length;
      
      // Partial rejection if some (but not all) are rejected
      return rejectedCount > 0 && rejectedCount < totalCount;
    }
    
    return false;
  }, [timesheetStatus, projectApprovals]);
  
  // Allow editing if timesheet has rejections (either full or partial)
  const allowRejectionEdit = hasRejections;
  const { control, watch, setValue, formState: { errors } } = form;
  const entries = watch('entries') || [];
  const weekStartDate = watch('week_start_date');

  // Filter active projects (defensive: ensure projects is an array)
  const activeProjects: SelectOption[] = useMemo(() => {
    const list = Array.isArray(projects) ? projects : [];
    return list
      .filter(p => p && (p as any).is_active)
      .map(p => ({ value: (p as any).id, label: (p as any).name }));
  }, [projects]);

  const taskOptions = useMemo<TaskOptionWithProject[]>(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    return list.map(task => ({
      value: (task as any).id,
      label: (task as any).name,
      projectId: (task as any).project_id
    }));
  }, [tasks]);

  // Get week dates for display
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const startDate = new Date(weekStartDate);
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [weekStartDate]);

  // Helper: check if a date string (YYYY-MM-DD) is a weekend
  const isWeekend = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = d.getDay();
      return day === 0 || day === 6; // Sunday=0, Saturday=6
    } catch {
      return false;
    }
  };

  const weekOptions = useMemo<WeekOption[]>(() => {
    return weekDates.map(date => ({
      value: date.toISOString().split('T')[0],
      label: formatDate(date, 'EEE, MMM dd')
    }));
  }, [weekDates]);

  const handleAddEntry = () => {
    const newEntry: TimeEntry = {
      project_id: selectedProject,
      task_id: '',
      date: weekDates[0].toISOString().split('T')[0],
      hours: 8,
      description: '',
      is_billable: true,
      entry_type: 'project_task',
      custom_task_description: '',
      is_editable: true
    };
    // Add a small client-side UID so React keys stay stable and Controllers bind correctly
    const entryWithUid = { ...newEntry, _uid: `e_${Date.now()}_${Math.floor(Math.random() * 10000)}` } as any;
    addEntry(entryWithUid);
    setExpandedEntry(entries.length);
  };

  const handleCopyEntry = (entry: TimeEntry, targetDates: string[]) => {
    if (!targetDates || targetDates.length === 0) return;

    const uniqueTargets = Array.from(new Set(targetDates)).filter(Boolean);
    if (uniqueTargets.length === 0) return;

    const currentEntries: TimeEntry[] = form.getValues('entries') || [];
    const newEntries = [...currentEntries];

    uniqueTargets.forEach((targetDate) => {
      if (targetDate === entry.date) return;

      const alreadyExists = newEntries.some((existing) => {
        const sameType = existing.entry_type === entry.entry_type;
        const sameProject = existing.project_id === entry.project_id;
        const sameTask =
          entry.entry_type === 'custom_task'
            ? (existing.custom_task_description || '').trim().toLowerCase() ===
              (entry.custom_task_description || '').trim().toLowerCase()
            : existing.task_id === entry.task_id;
        const sameDate = existing.date === targetDate;
        return sameType && sameProject && sameTask && sameDate;
      });

      if (alreadyExists) return;

      const duplicate: TimeEntry = {
        ...entry,
        date: targetDate,
        // Weekend copies should default to non-billable
        is_billable: isWeekend(targetDate) ? false : !!entry.is_billable,
        is_editable: entry.is_editable !== undefined ? entry.is_editable : true
      };

      newEntries.push({ ...duplicate, _uid: `e_${Date.now()}_${Math.floor(Math.random() * 10000)}` } as any);
    });

    // If anything new was added, set entries once to avoid races and ensure validation runs once
    if (newEntries.length !== currentEntries.length) {
      setValue('entries', newEntries, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleSubmit = async (status: 'draft' | 'submitted') => {
    // Only check for 'submitted' status
    if (status === 'submitted' && timesheetId) {
      // Pre-check if Lead can submit
      try {
        const canSubmitCheck = await backendApi.checkCanSubmit(timesheetId);

        if (!canSubmitCheck.canSubmit) {
          setLeadValidationError({
            message: canSubmitCheck.message,
            pendingReviews: canSubmitCheck.pendingReviews
          });
          return; // Block submission
        }
      } catch (error) {
        console.error('Error checking submission eligibility:', error);
        // Continue anyway - validation will happen on backend
      }
    }

    // Clear any previous validation errors
    setLeadValidationError(null);

    try {
      await submitTimesheet(status);
    } catch {
      // Error is handled by useTimesheetForm
    }
  };

  const getDayTotal = (dayIndex: number): number => {
    const date = weekDates[dayIndex].toISOString().split('T')[0];
    return dailyTotals[date] || 0;
  };

  const getValidationWarnings = () => {
    const warnings: string[] = [];
    const blockingErrors: string[] = [];

    // Business Rule 1: Daily logging 8-10 hours for weekdays (strict)
    Object.entries(dailyTotals).forEach(([date, total]) => {
      const isWeekendDay = isWeekend(date);

      if (isWeekendDay) {
        // Weekend: Optional, non-billable, warn if > 10 hours
        if (total > 10) {
          warnings.push(`${formatDate(date)} (Weekend): Exceeds recommended 10 hours (${total}h)`);
        }
      } else {
        // Weekday: Must be 8-10 hours (BLOCKING)
        if (total < 8) {
          blockingErrors.push(`${formatDate(date)}: Minimum 8 hours required for weekday (current: ${total}h)`);
        } else if (total > 10) {
          blockingErrors.push(`${formatDate(date)}: Maximum 10 hours allowed for weekday (current: ${total}h)`);
        }
      }
    });

    // Business Rule 2: Weekly total must not exceed 56 hours (BLOCKING)
    if (weeklyTotal > 56) {
      blockingErrors.push(`Weekly total ${weeklyTotal}h exceeds maximum allowed 56 hours`);
    }

    // Check missing weekdays (Mon-Fri recommended but not blocking)
    const entryDates = new Set(entries.map(e => e.date));
    weekDates.forEach((date, idx) => {
      const dateStr = date.toISOString().split('T')[0];
      if (isWeekend(dateStr)) return; // Skip weekends - they are optional
      if (!entryDates.has(dateStr)) {
        warnings.push(`${WEEKDAYS[idx]}: No entries logged for this weekday`);
      }
    });

    // Business Rule 3: Weekend entries must be non-billable
    const billableWeekendEntries = entries.filter(e => isWeekend(e.date) && e.is_billable);
    if (billableWeekendEntries.length > 0) {
      warnings.push('Weekend entries are automatically set to non-billable');
    }

    return { warnings, blockingErrors };
  };

  const validation = getValidationWarnings();
  const warnings = validation.warnings;
  const blockingErrors = validation.blockingErrors;
  const hasFormErrors = Object.keys(errors).length > 0;
  const canSubmit = !hasFormErrors && blockingErrors.length === 0 && entries.length > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Timesheet Entry</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Week of {formatDate(weekStartDate)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">Weekly Total</p>
            <p className={`text-2xl font-bold ${
              weeklyTotal > 56 ? 'text-red-600' :
              weeklyTotal >= 40 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {formatDuration(weeklyTotal)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* View Mode Alert */}
        {isViewMode && !allowRejectionEdit && (
          <Alert variant="info">
            <AlertTitle>View Only Mode</AlertTitle>
            <AlertDescription>
              This timesheet is read-only and cannot be edited. Only draft and rejected timesheets can be modified.
            </AlertDescription>
          </Alert>
        )}

        {/* Lead Validation Error */}
        {leadValidationError && (
          <Alert variant="error" className="mb-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <AlertTitle className="font-semibold text-red-800 mb-2">
                  Cannot Submit Timesheet
                </AlertTitle>
                <AlertDescription className="text-red-700 mb-3">
                  {leadValidationError.message}
                </AlertDescription>

                {leadValidationError.pendingReviews.length > 0 && (
                  <div className="bg-red-50 rounded-md p-3 mb-3">
                    <p className="text-sm font-medium text-red-800 mb-2">
                      Pending Employee Reviews:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                      {leadValidationError.pendingReviews.map((review, idx) => (
                        <li key={idx}>
                          <span className="font-medium">{review.employeeName}</span>
                          {' - '}
                          <span>{review.projectName}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-sm text-red-600 mb-3">
                  Please go to <strong>Team Review</strong> and complete all pending employee
                  approvals before submitting your own timesheet.
                </p>

                <button
                  onClick={() => setLeadValidationError(null)}
                  className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </Alert>
        )}

        {/* Partial Rejections Banner */}
        {hasRejections && (
          <Alert variant="warning" className="mb-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <AlertTitle className="font-semibold text-orange-800 mb-2">
                  {timesheetStatus === 'lead_rejected' ? 'Timesheet Rejected' : 'Some Entries Have Been Rejected'}
                </AlertTitle>

                <p className="text-sm text-orange-700">
                  Please review and update the rejected entries, then submit again for approval.
                </p>
              </div>
            </div>
          </Alert>
        )}

        {/* Project approval summary (if provided) */}
        {projectApprovals && projectApprovals.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Project approval summary</p>
            <div className="space-y-2">
              {projectApprovals.map((pa) => (
                <div key={pa.project_id} className="px-3 py-2 bg-gray-50 rounded-lg border flex items-start justify-between">
                  <div>
                    <div className="font-medium">{pa.project_name || 'Unknown Project'}</div>
                    <div className="text-sm text-gray-600">
                      {pa.manager_name ? `${pa.manager_name} — ` : ''}
                      {pa.manager_status === 'approved' && <span className="text-green-600">Approved</span>}
                      {pa.manager_status === 'pending' && <span className="text-yellow-600">Pending</span>}
                      {pa.manager_status === 'rejected' && <span className="text-red-600">Rejected</span>}
                      {pa.manager_status === 'not_required' && <span className="text-gray-500">Not required</span>}
                    </div>
                    {pa.manager_status === 'rejected' && pa.manager_rejection_reason && (
                      <div className="text-sm text-red-600 mt-1">Reason: {pa.manager_rejection_reason}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Hook Validation Warnings from useTimesheetForm */}
        {validationWarnings && validationWarnings.length > 0 && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validation Issues</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Blocking Validation Errors - Must be fixed before submission */}
        {blockingErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validation Errors - Cannot Submit</AlertTitle>
            <AlertDescription>
              <p className="text-sm mb-2">The following issues must be resolved before submitting:</p>
              <ul className="list-disc list-inside space-y-1">
                {blockingErrors.map((error, idx) => (
                  <li key={idx} className="text-sm font-medium">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Non-Blocking Warnings */}
        {warnings.length > 0 && (
          <Alert variant="warning">
            <AlertTitle>Recommendations</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm">{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Week Selector - simplified week picker (prev/next + week input) */}
        <Controller
          name="week_start_date"
          control={control}
          render={({ field }) => {
            // Convert the current week_start_date (YYYY-MM-DD) to an input[type=week] value (YYYY-Www)
            const mondayToIsoWeek = (mondayStr: string) => {
              try {
                // Parse date string explicitly to avoid timezone issues
                const parts = mondayStr.split('-');
                if (parts.length !== 3) return '';
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                d.setHours(0, 0, 0, 0);

                // Get Thursday of this week (ISO uses Thursday to determine which year the week belongs to)
                const thursday = new Date(d);
                const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                // From Monday (assumed input), add 3 days to get Thursday
                const daysFromMonToThu = (dayOfWeek === 1) ? 3 : 0; // If it's actually Monday, add 3
                thursday.setDate(d.getDate() + (4 - ((dayOfWeek || 7) - 1))); // Adjust to Thursday
                thursday.setHours(0, 0, 0, 0);

                // Get year from Thursday (this determines which year the week belongs to)
                const year = thursday.getFullYear();

                // Find Monday of ISO week 1 for this year
                const jan4 = new Date(year, 0, 4);
                const jan4Day = jan4.getDay();
                const daysToMonday = (jan4Day === 0) ? 6 : jan4Day - 1;
                const mondayOfWeek1 = new Date(year, 0, 4 - daysToMonday);
                mondayOfWeek1.setHours(0, 0, 0, 0);

                // Calculate week number based on days difference
                const daysDiff = Math.floor((d.getTime() - mondayOfWeek1.getTime()) / 86400000);
                const weekNo = Math.floor(daysDiff / 7) + 1;

                return `${year}-W${String(weekNo).padStart(2, '0')}`;
              } catch {
                return '';
              }
            };

            // Convert input[type=week] value (YYYY-Www) to Monday YYYY-MM-DD
            const isoWeekToMonday = (isoWeek: string) => {
              try {
                const parts = isoWeek.split('-W');
                if (parts.length !== 2) return '';
                const year = parseInt(parts[0], 10);
                const week = parseInt(parts[1], 10);

                // ISO 8601: Week 1 is the first week with a Thursday (week with Jan 4th)
                // Find the Monday of week 1
                const jan4 = new Date(year, 0, 4); // Jan 4th in local time
                const jan4Day = jan4.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

                // Calculate days to subtract to get to Monday of the week containing Jan 4
                const daysToMonday = (jan4Day === 0) ? 6 : jan4Day - 1; // Sunday special case

                // Monday of ISO week 1
                const mondayOfWeek1 = new Date(year, 0, 4 - daysToMonday);
                mondayOfWeek1.setHours(0, 0, 0, 0);

                // Add (week - 1) weeks to get to the target week
                const targetMonday = new Date(mondayOfWeek1);
                targetMonday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
                targetMonday.setHours(0, 0, 0, 0);

                // Return as YYYY-MM-DD in local timezone
                const year2 = targetMonday.getFullYear();
                const month = String(targetMonday.getMonth() + 1).padStart(2, '0');
                const day = String(targetMonday.getDate()).padStart(2, '0');
                return `${year2}-${month}-${day}`;
              } catch {
                return '';
              }
            };

            const weekInputValue = mondayToIsoWeek(String(field.value || weekStartDate));

            const goDeltaWeek = (delta: number) => {
              try {
                const cur = new Date(String(field.value || weekStartDate));
                cur.setDate(cur.getDate() + delta * 7);
                const newVal = cur.toISOString().split('T')[0];
                field.onChange(newVal);
                setValue('week_start_date', newVal, { shouldValidate: true, shouldDirty: true });
              } catch (e) {
                // ignore
              }
            };

            return (
              <div className="flex items-center gap-3">
                <label htmlFor="week-start-input" className="text-sm font-medium text-gray-700">Week Starting</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-2 py-1 rounded border bg-white"
                    onClick={() => goDeltaWeek(-1)}
                    aria-label="Previous week"
                    disabled={mode === 'edit' || mode === 'view'}
                  >
                    <ArrowLeft />
                  </button>
                  <input
                    id="week-start-input"
                    type="week"
                    className="border rounded px-2 py-1"
                    value={weekInputValue}
                    onChange={(e) => {
                      const monday = isoWeekToMonday(e.target.value);
                      if (monday) {
                        field.onChange(monday);
                        setValue('week_start_date', monday, { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                    disabled={mode === 'edit' || mode === 'view'}
                  />
                  <button
                    type="button"
                    className="px-2 py-1 rounded border bg-white"
                    onClick={() => goDeltaWeek(1)}
                    aria-label="Next week"
                    disabled={mode === 'edit' || mode === 'view'}
                  >
                    <ArrowRight />
                  </button>
                  <div className="ml-3 text-sm text-gray-500">
                    {formatDate(field.value || weekStartDate)} - {formatDate(new Date((new Date(field.value || weekStartDate)).setDate(new Date(field.value || weekStartDate).getDate() + 6)))}
                  </div>
                </div>
                {errors.week_start_date?.message && (
                  <div className="text-red-600 text-sm">{errors.week_start_date?.message}</div>
                )}
              </div>
            );
          }}
        />

        {/* Daily Totals Summary */}
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map((day, idx) => {
            const total = getDayTotal(idx);
            return (
              <div key={day} className="text-center p-3 bg-gray-50 rounded-lg border">
                <p className="text-xs font-medium text-gray-600">{day}</p>
                <p className="text-sm text-gray-500">{formatDate(weekDates[idx], 'MM/DD')}</p>
                <p className={`text-lg font-bold mt-1 ${
                  total === 0 ? 'text-gray-400' :
                  total < 8 ? 'text-yellow-600' :
                  total > 10 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {total}h
                </p>
              </div>
            );
          })}
        </div>

        {/* Add Entry Section - Hidden in view mode and partial rejections */}
        {/* For partial rejections, users can only edit existing rejected entries, not add new ones */}
        {(!isViewMode || allowRejectionEdit) && !isPartialRejection && (
          <div className="border-t pt-6">
            <div className="flex gap-4 items-end mb-4">
              <div className="flex-1">
                <Select
                  label="Select Project"
                  options={activeProjects}
                  value={selectedProject}
                  onChange={(value) => setSelectedProject(value)}
                  placeholder="Choose a project..."
                />
              </div>
              <Button
                onClick={handleAddEntry}
                disabled={!selectedProject}
                icon={Plus}
              >
                Add Entry
              </Button>
            </div>
          </div>
        )}

        {/* Info message for partial rejections */}
        {isPartialRejection && (
          <Alert variant="info" className="mt-4">
            <AlertTitle>Partial Rejection - Limited Editing</AlertTitle>
          </Alert>
        )}

        {/* Entries List */}
        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No entries yet. Select a project and add your first entry.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <TimesheetEntryRow
                key={(entry as any)._uid || `${index}_${entry.date}`}
                entry={entry}
                index={index}
                isExpanded={expandedEntry === index}
                onToggle={() => setExpandedEntry(expandedEntry === index ? null : index)}
                onRemove={() => removeEntry(index)}
                projects={activeProjects}
                control={control}
                setValue={setValue}
                errors={errors.entries?.[index]}
                projectApprovalsMap={projectApprovalMap}
                tasks={taskOptions}
                weekOptions={weekOptions}
                onCopyEntry={handleCopyEntry}
                isViewMode={isViewMode && !allowRejectionEdit}
                timesheetStatus={timesheetStatus}
                isPartialRejection={isPartialRejection}
              />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-6">
        <Button variant="outline" onClick={onCancel}>
          {isViewMode && !allowRejectionEdit ? 'Close' : 'Cancel'}
        </Button>
        {(!isViewMode || allowRejectionEdit) && (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              icon={Save}
              onClick={() => handleSubmit('draft')}
              disabled={isSubmitting || entries.length === 0}
            >
              Save Draft
            </Button>
            <Button
              icon={Send}
              onClick={() => handleSubmit('submitted')}
              disabled={isSubmitting || !canSubmit}
            >
              {allowRejectionEdit ? 'Resubmit for Approval' : 'Submit for Approval'}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

// Helper function to get current week's Monday
function getCurrentWeekMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Helper function to get Monday of a specific week
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper function to generate week options (past 8 weeks + current + next 4 weeks)
function generateWeekOptions(): SelectOption[] {
  const options: SelectOption[] = [];
  const today = new Date();
  const currentMonday = getMondayOfWeek(today);

  // Generate weeks: 8 past weeks + current week + 4 future weeks
  for (let i = -8; i <= 4; i++) {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() + (i * 7));

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayStr = monday.toISOString().split('T')[0];
    const label = `Week of ${formatDate(mondayStr)} - ${formatDate(sunday.toISOString().split('T')[0])}`;

    options.push({
      value: mondayStr,
      label
    });
  }

  return options.reverse(); // Most recent first
}

// Separate component for entry row to reduce complexity
interface TimesheetEntryRowProps {
  entry: TimeEntry;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  projects: SelectOption[];
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  tasks: TaskOptionWithProject[];
  weekOptions: WeekOption[];
  onCopyEntry: (entry: TimeEntry, targetDates: string[]) => void;
  errors?: {
    task_id?: { message?: string };
    date?: { message?: string };
    hours?: { message?: string };
    description?: { message?: string };
    is_billable?: { message?: string };
    custom_task_description?: { message?: string };
  };
  projectApprovalsMap?: Record<string, ProjectApproval>;
  isViewMode?: boolean;
  timesheetStatus?: TimesheetStatus;
  isPartialRejection?: boolean;
}

const TimesheetEntryRow: React.FC<TimesheetEntryRowProps> = ({
  entry,
  index,
  isExpanded,
  onToggle,
  onRemove,
  projects,
  control,
  setValue,
  tasks,
  weekOptions,
  onCopyEntry,
  errors,
  projectApprovalsMap,
  isViewMode = false,
  timesheetStatus,
  isPartialRejection = false
}) => {
  const projectName = projects.find(p => p.value === entry.project_id)?.label || 'Unknown';
  const projectApproval = entry.project_id ? (projectApprovalsMap || {})[entry.project_id] : undefined;
  const isProjectApproved = projectApproval && projectApproval.manager_status === 'approved';
  const isProjectRejected = projectApproval && projectApproval.lead_status === 'rejected';
  const isEntryRejected = entry.is_rejected || false;
  const projectTasks = tasks.filter(task => task.projectId === entry.project_id);
  const entryType = entry.entry_type || 'project_task';
  const copyOptions = weekOptions.filter(option => option.value !== entry.date);

  // Entry locking logic for partial rejections:
  // 1. If timesheet is fully rejected by lead -> all entries are editable
  // 2. If project is specifically rejected -> this entry is editable  
  // 3. If in create/edit mode -> all entries are editable
  // 4. If in view mode BUT project is rejected -> this entry is editable
  // 5. If in view mode AND project is not rejected -> this entry is locked
  // 6. PARTIAL REJECTION: If partial rejection, ONLY rejected project entries are editable
  const isTimesheetRejected = timesheetStatus === 'lead_rejected';
  
  // Entry is editable if:
  // - In create/edit mode (not view mode) AND NOT a partial rejection, OR
  // - In create/edit mode AND partial rejection AND project is rejected, OR
  // - Project is specifically rejected, OR 
  // - Entire timesheet is rejected by lead (but not partial)
  let entryEditable: boolean;
  
  if (isPartialRejection) {
    // For partial rejections, only rejected project entries can be edited
    entryEditable = isProjectRejected;
  } else if (!isViewMode) {
    // For regular edit/create mode (no partial rejection), all entries editable
    entryEditable = true;
  } else {
    // For view mode, check if project is rejected or timesheet is rejected
    entryEditable = isProjectRejected || isTimesheetRejected;
  }
  
  const entryLocked = !entryEditable;

  // For partial rejections, disable copy and remove for non-rejected projects
  const canCopy = !isPartialRejection || isProjectRejected;
  const canRemove = !isPartialRejection || isProjectRejected;

  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [copySelection, setCopySelection] = useState<string[]>([]);

  const toggleCopySelection = (value: string) => {
    setCopySelection(prev =>
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  const applyCopySelection = () => {
    if (copySelection.length > 0) {
      onCopyEntry(entry, copySelection);
      setCopySelection([]);
    }
    setIsCopyOpen(false);
  };

  return (
    <div className={cn(
      'border rounded-lg p-4 hover:shadow-md transition-shadow',
      isProjectApproved && 'opacity-80',
      (isProjectRejected || isEntryRejected) && 'border-red-200 bg-red-50',
      isTimesheetRejected && !isProjectRejected && !isEntryRejected && 'border-orange-200 bg-orange-50'
    )}>
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{projectName}</Badge>
            <span className="text-sm text-gray-600">{formatDate(entry.date)}</span>
            <span className="font-semibold">{entry.hours}h</span>
            {entry.is_billable && <Badge variant="success" size="sm">Billable</Badge>}
            {entryType === 'custom_task' && <Badge variant="outline" size="sm">Custom</Badge>}
            {isEntryRejected && <Badge variant="danger" size="sm">Entry Rejected</Badge>}
            {isProjectRejected && !isEntryRejected && <Badge variant="danger" size="sm">Project Rejected</Badge>}
            {isProjectApproved && <Badge variant="success" size="sm">Approved</Badge>}
          </div>
          {entry.description && (
            <p className="text-sm text-gray-600 mt-1 truncate">{entry.description}</p>
          )}
          {entryType === 'custom_task' && entry.custom_task_description && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              Custom Task: {entry.custom_task_description}
            </p>
          )}
          {isEntryRejected && entry.rejection_reason && (
            <p className="text-sm text-red-600 mt-1 truncate">
              Entry Rejection: {entry.rejection_reason}
            </p>
          )}
          {isProjectRejected && projectApproval?.lead_rejection_reason && (
            <p className="text-sm text-red-600 mt-1 truncate">
              Project Rejection: {projectApproval.lead_rejection_reason}
            </p>
          )}
        </div>
        {!entryLocked ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {/* Copy button - disabled for partial rejections on non-rejected projects */}
            {canCopy && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => setIsCopyOpen(prev => !prev)}
                  aria-label="Copy entry to other days"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {isCopyOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-60 rounded-lg border border-slate-200 bg-white shadow-lg">
                    <div className="p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Copy to days
                      </p>
                      <div className="space-y-2">
                        {copyOptions.length === 0 ? (
                          <p className="text-xs text-slate-400">No other days available this week.</p>
                        ) : (
                          copyOptions.map(option => (
                            <label key={option.value} className="flex items-center gap-2 text-sm text-slate-600">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={copySelection.includes(option.value)}
                                onChange={() => toggleCopySelection(option.value)}
                              />
                              <span>{option.label}</span>
                            </label>
                          ))
                        )}
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => {
                            setCopySelection([]);
                            setIsCopyOpen(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          onClick={applyCopySelection}
                          disabled={copySelection.length === 0}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Remove button - disabled for partial rejections on non-rejected projects */}
            {canRemove && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onRemove()}
              >
                Remove
              </Button>
            )}
            {/* Info message when actions are disabled */}
            {(!canCopy || !canRemove) && (
              <span className="text-xs text-gray-500 ml-2">
                {isProjectRejected ? 'Can edit' : 'Approved/Pending - View only'}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center text-sm text-gray-500">
            <Lock className="w-4 h-4 mr-1" />
            <span>
              {isViewMode ? 'View Only' : 
               isProjectRejected ? 'Rejected - Can Edit' :
               isTimesheetRejected ? 'Timesheet Rejected - Can Edit' : 'Locked'}
            </span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {/* If entry is locked (approved project or view mode), show read-only values */}
          {entryLocked ? (
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Task</p>
                <p className="text-sm text-gray-900">
                  {entryType === 'custom_task'
                    ? entry.custom_task_description || 'Custom Task'
                    : projectTasks.find(t => t.value === entry.task_id)?.label || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Date</p>
                <p className="text-sm font-medium">{entry.date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Hours</p>
                <p className="text-sm font-medium">{entry.hours}h</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.description}</p>
              </div>
            </div>
          ) : (
            <>
              <Controller
                name={`entries.${index}.entry_type`}
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Entry Type"
                    options={[
                      { value: 'project_task', label: 'Project Task' },
                      { value: 'custom_task', label: 'Custom Task' },
                    ]}
                    onChange={(value) => {
                      field.onChange(value);
                      if (value === 'custom_task') {
                        setValue(`entries.${index}.task_id`, '');
                      } else {
                        setValue(`entries.${index}.custom_task_description`, '');
                      }
                    }}
                  />
                )}
              />

              {entryType === 'project_task' && (
                <Controller
                  name={`entries.${index}.task_id`}
                  control={control}
                  rules={{ required: 'Task is required' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Task"
                      required
                      options={projectTasks.map(task => ({ value: task.value, label: task.label }))}
                      placeholder={projectTasks.length === 0 ? 'Select a project first' : 'Select a task'}
                      disabled={projectTasks.length === 0}
                      error={errors?.task_id?.message}
                    />
                  )}
                />
              )}

              {entryType === 'custom_task' && (
                <Controller
                  name={`entries.${index}.custom_task_description`}
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Custom Task Name"
                      placeholder="Describe the work (e.g. Team retrospective)"
                      required
                      error={errors?.custom_task_description?.message}
                    />
                  )}
                />
              )}

              <Controller
                name={`entries.${index}.date`}
                control={control}
                render={({ field }) => {
                  // Restrict date selection to current week only (Monday to Sunday)
                  // weekOptions is an array of {value: 'YYYY-MM-DD', label: 'Day, Month DD'}
                  const minDate = weekOptions[0]?.value || '';
                  const maxDate = weekOptions[weekOptions.length - 1]?.value || '';

                  return (
                    <Input
                      {...field}
                      type="date"
                      label="Date"
                      min={minDate}
                      max={maxDate}
                      error={errors?.date?.message}
                      helperText={`Select a date within this week (${formatDate(minDate)} - ${formatDate(maxDate)})`}
                      onChange={(e: any) => {
                        const val = e?.target?.value ?? e;

                        // Validate date is within week range
                        if (val && (val < minDate || val > maxDate)) {
                          // Show error but still allow the change (browser validation will prevent submission)
                          console.warn(`Date ${val} is outside the current week range`);
                        }

                        field.onChange(val);

                        // If user set a weekend date, default entry to non-billable
                        if (isWeekend(String(val))) {
                          setValue(`entries.${index}.is_billable`, false, { shouldDirty: true });
                        }
                      }}
                    />
                  );
                }}
              />
              <Controller
                name={`entries.${index}.hours`}
                control={control}
                rules={{ 
                  required: 'Hours is required',
                  min: { value: 0.5, message: 'Minimum 0.5 hours required' },
                  max: { value: 24, message: 'Maximum 24 hours per day' }
                }}
                render={({ field }) => (
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    label="Hours"
                    required
                    error={errors?.hours?.message}
                    value={field.value as any}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const v = typeof e?.target?.valueAsNumber === 'number' && !Number.isNaN(e.target.valueAsNumber)
                        ? e.target.valueAsNumber
                        : Number(e.target.value);
                      setValue(`entries.${index}.hours`, v, { shouldValidate: true, shouldDirty: true });
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                )}
              />
              <Controller
                name={`entries.${index}.description`}
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    label="Description"
                    placeholder="What did you work on?"
                    error={errors?.description?.message}
                  />
                )}
              />
              <Controller
                name={`entries.${index}.is_billable`}
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    label="Billable"
                  />
                )}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};
