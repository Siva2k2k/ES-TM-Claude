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
import { Calendar, Plus, AlertTriangle, Save, Send, Lock, Copy } from 'lucide-react';
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
export type ProjectApproval = {
  project_id: string;
  project_name?: string;
  // lead fields (optional)
  lead_id?: string;
  lead_name?: string;
  lead_status?: 'approved' | 'rejected' | 'pending' | 'not_required';
  lead_approved_at?: string | Date;
  lead_rejection_reason?: string;

  // manager fields
  manager_id?: string;
  manager_name?: string;
  manager_status: 'approved' | 'rejected' | 'pending' | 'not_required';
  manager_approved_at?: string | Date;
  manager_rejection_reason?: string;

  // project time tracking
  entries_count?: number;
  total_hours?: number;
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
  mode?: 'create' | 'edit';
  /** Timesheet identifier used in edit mode */
  timesheetId?: string;
  /** Available projects for selection */
  projects?: Array<{ id: string; name: string; is_active: boolean }>;
  /** Available tasks for selection */
  tasks?: Array<{ id: string; name: string; project_id: string }>;
  /** Optional project approvals (used to lock entries per-project) */
  projectApprovals?: ProjectApproval[];
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
  onSuccess,
  onCancel
}) => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

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
        // Debug log to diagnose empty edit form issues
        // eslint-disable-next-line no-console
        console.debug('TimesheetForm: resetting form with initialData', {
          week_start_date: initialData.week_start_date,
          entriesCount: Array.isArray(initialData.entries) ? initialData.entries.length : 0
        });

        // Ensure each entry has a stable client-side UID to keep Controller bindings stable
        const entriesWithUid = Array.isArray(initialData.entries)
          ? initialData.entries.map(e => ({ ...(e as any), _uid: (e as any)._uid || generateUid() }))
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
        // eslint-disable-next-line no-console
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
      map[p.project_id] = p as ProjectApproval;
    });
    return map;
  }, [projectApprovals]);

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
      custom_task_description: ''
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
        _uid: `e_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      } as any;

      newEntries.push(duplicate);
    });

    // If anything new was added, set entries once to avoid races and ensure validation runs once
    if (newEntries.length !== currentEntries.length) {
      // eslint-disable-next-line no-console
      console.debug('Copying entries, added', newEntries.length - currentEntries.length, 'entries');
      setValue('entries', newEntries, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleSubmit = async (status: 'draft' | 'submitted') => {
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

    // Check daily totals
      Object.entries(dailyTotals).forEach(([date, total]) => {
        // Skip weekend totals warnings
        if (isWeekend(date)) return;
        if (total < 8) warnings.push(`${formatDate(date)}: Less than 8 hours (${total}h)`);
        if (total > 10) warnings.push(`${formatDate(date)}: More than 10 hours (${total}h)`);
      });

    // Check weekly total
    if (weeklyTotal > 56) warnings.push(`Weekly total exceeds 56 hours (${weeklyTotal}h)`);

    // Check missing days (only Mon-Fri required; weekends are optional)
    const entryDates = new Set(entries.map(e => e.date));
    weekDates.forEach((date, idx) => {
      const dateStr = date.toISOString().split('T')[0];
      if (isWeekend(dateStr)) return; // skip weekends
      if (!entryDates.has(dateStr)) {
        warnings.push(`${WEEKDAYS[idx]}: No entries`);
      }
    });

    return warnings;
  };

  const warnings = getValidationWarnings();
  const hasErrors = Object.keys(errors).length > 0;
  const canSubmit = !hasErrors && warnings.length === 0 && entries.length > 0;

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
        {/* Error Display */}
        {validationWarnings && validationWarnings.length > 0 && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validation</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Warnings */}
        {warnings.length > 0 && (
          <Alert variant="warning">
            <AlertTitle>Validation Warnings</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm">{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Week Selector */}
        <Controller
          name="week_start_date"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="date"
              label="Week Starting"
              icon={Calendar}
              disabled={mode === 'edit'}
              error={errors.week_start_date?.message}
            />
          )}
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

        {/* Add Entry Section */}
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
              />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
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
            Submit for Approval
          </Button>
        </div>
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
  projectApprovalsMap
}) => {
  const projectName = projects.find(p => p.value === entry.project_id)?.label || 'Unknown';
  const projectApproval = (projectApprovalsMap || {})[entry.project_id];
  const isProjectApproved = projectApproval && projectApproval.manager_status === 'approved';
  const projectTasks = tasks.filter(task => task.projectId === entry.project_id);
  const entryType = entry.entry_type || 'project_task';
  const copyOptions = weekOptions.filter(option => option.value !== entry.date);

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
    <div className={cn('border rounded-lg p-4 hover:shadow-md transition-shadow', isProjectApproved && 'opacity-80')}>
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{projectName}</Badge>
            <span className="text-sm text-gray-600">{formatDate(entry.date)}</span>
            <span className="font-semibold">{entry.hours}h</span>
            {entry.is_billable && <Badge variant="success" size="sm">Billable</Badge>}
            {entryType === 'custom_task' && <Badge variant="outline" size="sm">Custom</Badge>}
          </div>
          {entry.description && (
            <p className="text-sm text-gray-600 mt-1 truncate">{entry.description}</p>
          )}
          {entryType === 'custom_task' && entry.custom_task_description && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              Custom Task: {entry.custom_task_description}
            </p>
          )}
        </div>
        {!isProjectApproved ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => onRemove()}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex items-center text-sm text-gray-500">
            <Lock className="w-4 h-4 mr-1" />
            <span>Locked</span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {/* If project is approved, show read-only values */}
          {isProjectApproved ? (
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
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Task"
                      options={projectTasks.map(task => ({ value: task.value, label: task.label }))}
                      placeholder={projectTasks.length === 0 ? 'No tasks assigned' : 'Select a task'}
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
                render={({ field }) => (
                  <Input
                    {...field}
                    type="date"
                    label="Date"
                    error={errors?.date?.message}
                    onChange={(e: any) => {
                      const val = e?.target?.value ?? e;
                      field.onChange(val);
                      // If user set a weekend date, default entry to non-billable
                      if (isWeekend(String(val))) {
                        setValue(`entries.${index}.is_billable`, false, { shouldDirty: true });
                      }
                    }}
                  />
                )}
              />
              <Controller
                name={`entries.${index}.hours`}
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    label="Hours"
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
