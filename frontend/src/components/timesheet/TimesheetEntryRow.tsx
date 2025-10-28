import React, { useState } from 'react';
import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
import { Copy, Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils/formatting';
import { cn } from '../../utils/cn';
import { isWeekend } from '../../utils/timesheetHelpers';
import type { TimeEntry } from '../../types/timesheet.schemas';
import type { ProjectApproval } from './TimesheetForm';
import type { TimesheetStatus } from '../../types/timesheetApprovals';

type TaskOptionWithProject = {
  value: string;
  label: string;
  projectId: string;
};

type WeekOption = {
  value: string;
  label: string;
};

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

export const TimesheetEntryRow: React.FC<TimesheetEntryRowProps> = ({
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
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [copySelection, setCopySelection] = useState<string[]>([]);

  // Get entry category (new field for categorizing entries)
  const entryCategory = (entry as any).entry_category || 'project';
  const isLeaveEntry = entryCategory === 'leave';
  const isMiscEntry = entryCategory === 'miscellaneous';
  const isTrainingEntry = entryCategory === 'training';
  const isProjectEntry = entryCategory === 'project';

  const projectName = isLeaveEntry ? '🏖️ Leave' :
                      isMiscEntry ? '🎯 Miscellaneous' :
                      isTrainingEntry ? '📚 Training' :
                      projects.find(p => p.value === entry.project_id)?.label || 'Unknown';
  const projectApproval = entry.project_id ? projectApprovalsMap?.[entry.project_id] : undefined;
  const isProjectApproved = projectApproval?.manager_status === 'approved';
  const isProjectRejectedByLead = projectApproval?.lead_status === 'rejected';
  const isProjectRejectedByManager = projectApproval?.manager_status === 'rejected';
  const isProjectRejected = isProjectRejectedByLead || isProjectRejectedByManager;
  const isEntryRejected = entry.is_rejected || false;
  const projectTasks = tasks.filter(task => task.projectId === entry.project_id);
  const entryType = entry.entry_type || 'project_task';
  const copyOptions = weekOptions.filter(option => option.value !== entry.date);

  const isTimesheetRejected = timesheetStatus === 'lead_rejected' || timesheetStatus === 'manager_rejected';
  const entryEditable = isPartialRejection 
  ? isProjectRejected || false
  : !isViewMode ? true : isProjectRejected || isTimesheetRejected;
  
  const entryLocked = !entryEditable;
  const canCopy = !isPartialRejection || !isProjectRejected;
  const canRemove = !isPartialRejection || !isProjectRejected;

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

  const minDate = weekOptions[0]?.value || '';
  const maxDate = weekOptions[weekOptions.length - 1]?.value || '';

  return (
    <div className={cn(
      'border rounded-lg p-4 hover:shadow-md transition-shadow',
      isProjectApproved && 'opacity-80',
      (isProjectRejected || isEntryRejected) && 'border-red-200 bg-red-50',
      isTimesheetRejected && !isProjectRejected && !isEntryRejected && 'border-orange-200 bg-orange-50'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{projectName}</Badge>
            <span className="text-sm text-gray-600">{formatDate(entry.date)}</span>
            <span className="font-semibold">{entry.hours}h</span>
            {entry.is_billable && !isTrainingEntry && <Badge variant="success" size="sm">Billable</Badge>}
            {(isTrainingEntry || isLeaveEntry || isMiscEntry) && <Badge variant="outline" size="sm">Non-Billable</Badge>}
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
            <p className="text-sm text-red-600 mt-1 truncate">Entry Rejection: {entry.rejection_reason}</p>
          )}
          {isProjectRejected && projectApproval?.lead_rejection_reason && (
            <p className="text-sm text-red-600 mt-1 truncate">Project Rejection: {projectApproval.lead_rejection_reason}</p>
          )}
        </div>

        {/* Actions */}
        {!entryLocked ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {canCopy && (
              <div className="relative">
                <Button variant="ghost" size="icon" type="button" onClick={() => setIsCopyOpen(prev => !prev)}>
                  <Copy className="h-4 w-4" />
                </Button>
                {isCopyOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-60 rounded-lg border bg-white shadow-lg">
                    <div className="p-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Copy to days</p>
                      <div className="space-y-2">
                        {copyOptions.length === 0 ? (
                          <p className="text-xs text-slate-400">No other days available.</p>
                        ) : (
                          copyOptions.map(option => (
                            <label key={option.value} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300"
                                checked={copySelection.includes(option.value)}
                                onChange={() => toggleCopySelection(option.value)}
                              />
                              {option.label}
                            </label>
                          ))
                        )}
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button variant="ghost" size="sm" type="button" onClick={() => { setCopySelection([]); setIsCopyOpen(false); }}>
                          Cancel
                        </Button>
                        <Button size="sm" type="button" onClick={applyCopySelection} disabled={copySelection.length === 0}>
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {canRemove && <Button variant="ghost" size="sm" type="button" onClick={onRemove}>Remove</Button>}
          </div>
        ) : (
          <div className="flex items-center text-sm text-gray-500">
            <Lock className="w-4 h-4 mr-1" />
            <span>{isViewMode ? 'View Only' : isProjectRejected ? 'Rejected - Can Edit' : 'Locked'}</span>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {entryLocked ? (
            <div className="space-y-2">
              {isLeaveEntry ? (
                <>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Session</p><p className="text-sm">{(entry as any).leave_session === 'morning' ? 'Morning' : (entry as any).leave_session === 'afternoon' ? 'Afternoon' : 'Full Day'}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Date</p><p className="text-sm">{entry.date}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Hours</p><p className="text-sm">{entry.hours}h</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Description</p><p className="text-sm">{entry.description || '—'}</p></div>
                </>
              ) : isMiscEntry ? (
                <>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Activity</p><p className="text-sm">{(entry as any).miscellaneous_activity || '—'}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Date</p><p className="text-sm">{entry.date}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Hours</p><p className="text-sm">{entry.hours}h</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Description</p><p className="text-sm">{entry.description || '—'}</p></div>
                </>
              ) : (
                <>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Task</p><p className="text-sm">{entryType === 'custom_task' ? entry.custom_task_description : projectTasks.find(t => t.value === entry.task_id)?.label || '—'}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Date</p><p className="text-sm">{entry.date}</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Hours</p><p className="text-sm">{entry.hours}h</p></div>
                  <div><p className="text-xs text-gray-500 uppercase mb-1">Description</p><p className="text-sm">{entry.description}</p></div>
                </>
              )}
            </div>
          ) : (
            <>
              {isLeaveEntry ? (
                <>
                  <Controller name={`entries.${index}.leave_session`} control={control} rules={{ required: 'Session is required' }} render={({ field }) => (
                    <Select
                      {...field}
                      label="Leave Session"
                      required
                      options={[
                        { value: 'morning', label: 'Morning (4 hours)' },
                        { value: 'afternoon', label: 'Afternoon (4 hours)' },
                        { value: 'full_day', label: 'Full Day (8 hours)' }
                      ]}
                      onChange={(value) => {
                        field.onChange(value);
                        // Auto-calculate hours based on session
                        const hours = value === 'morning' || value === 'afternoon' ? 4 : 8;
                        setValue(`entries.${index}.hours`, hours, { shouldDirty: true });
                      }}
                      error={errors?.task_id?.message}
                    />
                  )} />

                  <Controller name={`entries.${index}.date`} control={control} render={({ field }) => (
                    <Input {...field} type="date" label="Date" min={minDate} max={maxDate} error={errors?.date?.message} helperText={`Select date within ${formatDate(minDate)} - ${formatDate(maxDate)}`} />
                  )} />

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Hours</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{entry.hours}h (auto-calculated based on session)</p>
                  </div>

                  <Controller name={`entries.${index}.description`} control={control} render={({ field }) => (
                    <Textarea {...field} label="Description (Optional)" placeholder="Additional notes about the leave" error={errors?.description?.message} />
                  )} />
                </>
              ) : isMiscEntry ? (
                <>
                  <Controller name={`entries.${index}.miscellaneous_activity`} control={control} rules={{ required: 'Activity is required' }} render={({ field }) => (
                    <Input {...field} label="Activity" placeholder="e.g., Annual Company Meet, Workshop, Team Building" required error={errors?.custom_task_description?.message} />
                  )} />

                  <Controller name={`entries.${index}.date`} control={control} render={({ field }) => (
                    <Input {...field} type="date" label="Date" min={minDate} max={maxDate} error={errors?.date?.message} helperText={`Select date within ${formatDate(minDate)} - ${formatDate(maxDate)}`} />
                  )} />

                  <Controller name={`entries.${index}.hours`} control={control} rules={{ required: 'Hours required', min: { value: 0.5, message: 'Min 0.5h' }, max: { value: 10, message: 'Max 10h for miscellaneous' } }} render={({ field }) => (
                    <Input type="number" step="0.5" min="0.5" max="10" label="Hours" required error={errors?.hours?.message} value={field.value as any} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(`entries.${index}.hours`, e.target.valueAsNumber || Number(e.target.value), { shouldValidate: true, shouldDirty: true })} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                  )} />

                  <Controller name={`entries.${index}.description`} control={control} render={({ field }) => (
                    <Textarea {...field} label="Description (Optional)" placeholder="Additional details about the activity" error={errors?.description?.message} />
                  )} />
                </>
              ) : isTrainingEntry ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Project</p>
                    <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">📚 Training Program (Auto-assigned)</p>
                  </div>

                  <Controller name={`entries.${index}.entry_type`} control={control} render={({ field }) => (
                    <Select {...field} label="Entry Type" options={[{ value: 'project_task', label: 'Project Task' }, { value: 'custom_task', label: 'Custom Task' }]} onChange={(value) => { field.onChange(value); setValue(`entries.${index}.${value === 'custom_task' ? 'task_id' : 'custom_task_description'}`, ''); }} />
                  )} />

                  {entryType === 'project_task' ? (
                    <Controller name={`entries.${index}.task_id`} control={control} rules={{ required: 'Task is required' }} render={({ field }) => (
                      <Select {...field} label="Task" required options={projectTasks} placeholder="Select a training task" error={errors?.task_id?.message} />
                    )} />
                  ) : (
                    <Controller name={`entries.${index}.custom_task_description`} control={control} render={({ field }) => (
                      <Input {...field} label="Custom Task Name" placeholder="Describe the training work" required error={errors?.custom_task_description?.message} />
                    )} />
                  )}

                  <Controller name={`entries.${index}.date`} control={control} render={({ field }) => (
                    <Input {...field} type="date" label="Date" min={minDate} max={maxDate} error={errors?.date?.message} helperText={`Select date within ${formatDate(minDate)} - ${formatDate(maxDate)}`} />
                  )} />

                  <Controller name={`entries.${index}.hours`} control={control} rules={{ required: 'Hours required', min: { value: 0.5, message: 'Min 0.5h' }, max: { value: 24, message: 'Max 24h' } }} render={({ field }) => (
                    <Input type="number" step="0.5" min="0.5" max="24" label="Hours" required error={errors?.hours?.message} value={field.value as any} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(`entries.${index}.hours`, e.target.valueAsNumber || Number(e.target.value), { shouldValidate: true, shouldDirty: true })} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                  )} />

                  <Controller name={`entries.${index}.description`} control={control} render={({ field }) => (
                    <Textarea {...field} label="Description" placeholder="What training did you work on?" error={errors?.description?.message} />
                  )} />
                </>
              ) : (
                <>
                  <Controller name={`entries.${index}.entry_type`} control={control} render={({ field }) => (
                    <Select {...field} label="Entry Type" options={[{ value: 'project_task', label: 'Project Task' }, { value: 'custom_task', label: 'Custom Task' }]} onChange={(value) => { field.onChange(value); setValue(`entries.${index}.${value === 'custom_task' ? 'task_id' : 'custom_task_description'}`, ''); }} />
                  )} />

                  {entryType === 'project_task' ? (
                    <Controller name={`entries.${index}.task_id`} control={control} rules={{ required: 'Task is required' }} render={({ field }) => (
                      <Select {...field} label="Task" required options={projectTasks} placeholder={projectTasks.length === 0 ? 'Select a project first' : 'Select a task'} disabled={projectTasks.length === 0} error={errors?.task_id?.message} />
                    )} />
                  ) : (
                    <Controller name={`entries.${index}.custom_task_description`} control={control} render={({ field }) => (
                      <Input {...field} label="Custom Task Name" placeholder="Describe the work" required error={errors?.custom_task_description?.message} />
                    )} />
                  )}

                  <Controller name={`entries.${index}.date`} control={control} render={({ field }) => (
                    <Input {...field} type="date" label="Date" min={minDate} max={maxDate} error={errors?.date?.message} helperText={`Select date within ${formatDate(minDate)} - ${formatDate(maxDate)}`} onChange={(e: any) => { const val = e?.target?.value ?? e; field.onChange(val); if (isWeekend(String(val))) setValue(`entries.${index}.is_billable`, false, { shouldDirty: true }); }} />
                  )} />

                  <Controller name={`entries.${index}.hours`} control={control} rules={{ required: 'Hours required', min: { value: 0.5, message: 'Min 0.5h' }, max: { value: 24, message: 'Max 24h' } }} render={({ field }) => (
                    <Input type="number" step="0.5" min="0.5" max="24" label="Hours" required error={errors?.hours?.message} value={field.value as any} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(`entries.${index}.hours`, e.target.valueAsNumber || Number(e.target.value), { shouldValidate: true, shouldDirty: true })} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                  )} />

                  <Controller name={`entries.${index}.description`} control={control} render={({ field }) => (
                    <Textarea {...field} label="Description" placeholder="What did you work on?" error={errors?.description?.message} />
                  )} />

                  <Controller name={`entries.${index}.is_billable`} control={control} render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      label="Billable"
                      disabled={isTrainingEntry || isLeaveEntry || isMiscEntry}
                    />
                  )} />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};