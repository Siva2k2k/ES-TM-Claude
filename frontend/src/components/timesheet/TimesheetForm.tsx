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
 * Cognitive Complexity: Reduced from ~15 to ~8
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Plus, AlertTriangle, Save, Send } from 'lucide-react';
import { useTimesheetForm, type TimesheetSubmitResult } from '../../hooks/useTimesheetForm';
import { Button } from '../ui/Button';
import { Select, type SelectOption } from '../ui/Select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert';
import { formatDate, formatDuration } from '../../utils/formatting';
import type { TimeEntry } from '../../types/timesheet.schemas';
import { backendApi } from '../../lib/backendApi';
import type { TimesheetProjectApproval, TimesheetStatus } from '../../types/timesheetApprovals';
import { TimesheetEntryRow } from './TimesheetEntryRow';
import { WeekSelector } from './WeekSelector';
import { getValidationWarnings } from '../../utils/ValidationforTimesheet';
import { generateUid, getCurrentWeekMonday, isWeekend, WEEKDAYS } from '../../utils/timesheetHelpers';

export type ProjectApproval = Partial<TimesheetProjectApproval> & {
  project_id: string;
  project_name?: string;
};

export interface TimesheetFormProps {
  initialWeekStartDate?: string;
  initialData?: {
    week_start_date: string;
    entries: TimeEntry[];
  };
  mode?: 'create' | 'edit' | 'view';
  timesheetId?: string;
  projects?: Array<{ id: string; name: string; is_active: boolean }>;
  tasks?: Array<{ id: string; name: string; project_id: string }>;
  projectApprovals?: ProjectApproval[];
  editableProjectIds?: string[];
  timesheetStatus?: TimesheetStatus;
  leadRejectionReason?: string;
  onSuccess?: (result: TimesheetSubmitResult) => void;
  onCancel?: () => void;
}

type TaskOptionWithProject = {
  value: string;
  label: string;
  projectId: string;
};

type WeekOption = {
  value: string;
  label: string;
};

type EntryCategory = 'project' | 'leave' | 'training' | 'miscellaneous';

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
  const [selectedEntryCategory, setSelectedEntryCategory] = useState<EntryCategory>('project');
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [leadValidationError, setLeadValidationError] = useState<{
    message: string;
    pendingReviews: Array<{ projectName: string; employeeName: string }>;
  } | null>(null);
  const [trainingProject, setTrainingProject] = useState<{ id: string; name: string } | null>(null);
  const [trainingTasks, setTrainingTasks] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingTrainingData, setLoadingTrainingData] = useState(false);
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
    mode: mode === 'view' ? 'edit' : mode,
    timesheetId,
    onSuccess
  });

  // Fetch training project and tasks on mount
  useEffect(() => {
    const fetchTrainingData = async () => {
      setLoadingTrainingData(true);
      try {
        const response = await backendApi.get('/projects/training');
        if (response.success && response.project && response.tasks) {
          setTrainingProject({
            id: response.project.id,
            name: response.project.name
          });
          setTrainingTasks(
            response.tasks.map((task: any) => ({
              id: task._id, // Use task.id instead of task._id since we fixed the backend JSON transform
              name: task.name
            }))
          );
        }
       
      } catch (error) {
        console.error('Failed to fetch training project:', error);
      } finally {
        setLoadingTrainingData(false);
      }
    };

    fetchTrainingData();
  }, []);

  useEffect(() => {
    if (initialData) {
      try {
        const entriesWithUid = Array.isArray(initialData.entries)
          ? initialData.entries.map(entry => ({
              ...(entry as any),
              is_editable: entry.is_editable !== undefined ? Boolean(entry.is_editable) : true,
              _uid: (entry as any)._uid || generateUid()
            }))
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
        console.error('Failed to reset TimesheetForm with initialData', err);
      }
    } else if (mode === 'create') {
      setSelectedProject('');
    }
  }, [initialData, initialWeekStartDate, form, mode]);

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

  const hasRejections = useMemo(() => {
    return timesheetStatus === 'lead_rejected' || timesheetStatus === 'manager_rejected';
  }, [timesheetStatus]);

  const isPartialRejection = useMemo(() => {

    if (projectApprovals && projectApprovals.length > 0) {
      // Check if any project has been rejected
      const hasRejectedProjects = projectApprovals.some(pa => 
        pa?.lead_status === 'rejected' || pa?.manager_status === 'rejected',
      );
      // Check if any project is still approved or pending (not all are rejected)

      // It's a partial rejection if some projects are rejected but not all
      return hasRejectedProjects;
    }

    return false;
  }, [timesheetStatus, projectApprovals]);


  const allowRejectionEdit = hasRejections;
  const { control, watch, setValue, formState: { errors } } = form;
  const entries = watch('entries') || [];
  const weekStartDate = watch('week_start_date');

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

  const weekOptions = useMemo<WeekOption[]>(() => {
    return weekDates.map(date => ({
      value: date.toISOString().split('T')[0],
      label: formatDate(date, 'EEE, MMM dd')
    }));
  }, [weekDates]);

  const handleAddEntry = () => {
    let newEntry: TimeEntry;

    switch (selectedEntryCategory) {
      case 'leave':
        newEntry = {
          project_id: '',
          task_id: '',
          date: weekDates[0].toISOString().split('T')[0],
          hours: 8, // Default to full day, will be changed based on session
          description: '',
          is_billable: false,
          entry_type: 'project_task', // Will be overridden by entry_category
          custom_task_description: '',
          is_editable: true,
          entry_category: 'leave',
          leave_session: 'full_day'
        } as any;
        break;

      case 'miscellaneous':
        newEntry = {
          project_id: '',
          task_id: '',
          date: weekDates[0].toISOString().split('T')[0],
          hours: 8,
          description: '',
          is_billable: false,
          entry_type: 'project_task',
          custom_task_description: '',
          is_editable: true,
          entry_category: 'miscellaneous',
          miscellaneous_activity: ''
        } as any;
        break;

      case 'training':
        newEntry = {
          project_id: trainingProject?.id || '', // Auto-assigned to Training Program
          task_id: trainingTasks.length > 0 ? trainingTasks[0].id : '', // Default to first training task
          date: weekDates[0].toISOString().split('T')[0],
          hours: 8,
          description: '',
          is_billable: false,
          entry_type: 'project_task',
          custom_task_description: '',
          is_editable: true,
          entry_category: 'training'
        } as any;
        break;

      case 'project':
      default:
        newEntry = {
          project_id: selectedProject,
          task_id: '',
          date: weekDates[0].toISOString().split('T')[0],
          hours: 8,
          description: '',
          is_billable: true,
          entry_type: 'project_task',
          custom_task_description: '',
          is_editable: true,
          entry_category: 'project'
        } as any;
        break;
    }

    const entryWithUid = { ...newEntry, _uid: generateUid() } as any;
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
        is_billable: isWeekend(targetDate) ? false : !!entry.is_billable,
        is_editable: entry.is_editable !== undefined ? entry.is_editable : true
      };

      newEntries.push({ ...duplicate, _uid: generateUid() } as any);
    });

    if (newEntries.length !== currentEntries.length) {
      setValue('entries', newEntries, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleSubmit = async (status: 'draft' | 'submitted') => {
    if (status === 'submitted' && timesheetId) {
      try {
        const canSubmitCheck = await backendApi.checkCanSubmit(timesheetId);

        if (!canSubmitCheck.canSubmit) {
          setLeadValidationError({
            message: canSubmitCheck.message,
            pendingReviews: canSubmitCheck.pendingReviews
          });
          return;
        }
      } catch (error) {
        console.error('Error checking submission eligibility:', error);
      }
    }

    setLeadValidationError(null);

    try {
      await submitTimesheet(status);
    } catch {
      // Error handled by useTimesheetForm
    }
  };

  const getDayTotal = (dayIndex: number): number => {
    const date = weekDates[dayIndex].toISOString().split('T')[0];
    return dailyTotals[date] || 0;
  };

  const validation = getValidationWarnings(entries, dailyTotals, weeklyTotal, weekDates);
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
        {isViewMode && !allowRejectionEdit && (
          <Alert variant="info">
            <AlertTitle>View Only Mode</AlertTitle>
            <AlertDescription>
              This timesheet is read-only and cannot be edited. Only draft and rejected timesheets can be modified.
            </AlertDescription>
          </Alert>
        )}

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

        {hasRejections && (
          <Alert variant="warning" className="mb-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <AlertTitle className="font-semibold text-orange-800 mb-2">
                  {timesheetStatus === 'lead_rejected'
                    ? 'Timesheet Rejected by Lead'
                    : timesheetStatus === 'manager_rejected'
                    ? 'Timesheet Rejected by Manager'
                    : 'Some Entries Have Been Rejected'}
                </AlertTitle>
                <p className="text-sm text-orange-700">
                  Please review and update the rejected entries, then submit again for approval.
                </p>
              </div>
            </div>
          </Alert>
        )}

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

        <WeekSelector
          control={control}
          weekStartDate={weekStartDate}
          setValue={setValue}
          disabled={mode === 'edit' || mode === 'view'}
        />

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

        {(!isViewMode || allowRejectionEdit) && !isPartialRejection && (
          <div className="border-t pt-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Entry Type</label>
              <div className="grid grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedEntryCategory('project')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    selectedEntryCategory === 'project'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📋 Project Work
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEntryCategory('leave')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    selectedEntryCategory === 'leave'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🏖️ Leave
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEntryCategory('training')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    selectedEntryCategory === 'training'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  📚 Training
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEntryCategory('miscellaneous')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    selectedEntryCategory === 'miscellaneous'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🎯 Miscellaneous
                </button>
              </div>
            </div>

            {selectedEntryCategory === 'project' && (
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
                  Add Project Entry
                </Button>
              </div>
            )}

            {selectedEntryCategory === 'leave' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900 mb-1">Leave Entry</h4>
                    <p className="text-sm text-green-700">
                      Add leave entry - select session (morning/afternoon/full day) in the entry details.
                      Leave entries bypass project approval workflow.
                    </p>
                  </div>
                  <Button
                    onClick={handleAddEntry}
                    icon={Plus}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Add Leave Entry
                  </Button>
                </div>
              </div>
            )}

            {selectedEntryCategory === 'miscellaneous' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-purple-900 mb-1">Miscellaneous Entry</h4>
                    <p className="text-sm text-purple-700">
                      Add miscellaneous entry for company events or activities.
                      Entries bypass project approval workflow.
                    </p>
                  </div>
                  <Button
                    onClick={handleAddEntry}
                    icon={Plus}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Add Miscellaneous Entry
                  </Button>
                </div>
              </div>
            )}

            {selectedEntryCategory === 'training' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">Training Entry</h4>
                    <p className="text-sm text-blue-700">
                      {loadingTrainingData ? (
                        'Loading training data...'
                      ) : trainingProject ? (
                        <>
                          Training entries are automatically assigned to the <strong>{trainingProject.name}</strong> project.
                        </>
                      ) : (
                        'Training project not found. Please contact your administrator.'
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={handleAddEntry}
                    icon={Plus}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!trainingProject || loadingTrainingData}
                  >
                    Add Training Entry
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isPartialRejection && (
          <Alert variant="info" className="mt-4">
            <AlertTitle>Partial Rejection - Limited Editing</AlertTitle>
          </Alert>
        )}

        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No entries yet. Select a project and add your first entry.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => {
              // Determine which tasks to show based on entry category
              const entryTasks = (entry as any).entry_category === 'training' 
                ? trainingTasks.map(task => ({
                    value: task.id,
                    label: task.name,
                    projectId: trainingProject?.id || ''
                  }))
                : taskOptions.filter(task => task.projectId === entry.project_id);

              return (
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
                  tasks={entryTasks}
                  weekOptions={weekOptions}
                  onCopyEntry={handleCopyEntry}
                  isViewMode={isViewMode && !allowRejectionEdit}
                  timesheetStatus={timesheetStatus}
                  isPartialRejection={isPartialRejection}
                />
              );
            })}
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