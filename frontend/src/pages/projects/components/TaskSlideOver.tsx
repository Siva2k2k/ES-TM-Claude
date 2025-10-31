import React, { useEffect, useState } from 'react';
import SlideOver from '../../../components/ui/SlideOver';
import { ProjectService } from '../../../services/ProjectService';
import type { Task, User } from '../../../types';

type Member = {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
};
import { showSuccess, showError } from '../../../utils/toast';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  task?: Task | null;
  users?: User[];
  members?: Member[];
  onSaved?: (task: Task) => void;
  onDeleted?: (taskId: string) => void;
};

export const TaskSlideOver: React.FC<Props> = ({ open, onClose, projectId, task, users = [], members = [], onSaved, onDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(task?.name || '');
  const [description, setDescription] = useState(task?.description || '');
  const [assignedTo, setAssignedTo] = useState<string | undefined>(task?.assigned_to_user_id as any || undefined);
  const [status, setStatus] = useState<string>(task?.status || 'open');
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(task?.estimated_hours || undefined);
  const [isBillable, setIsBillable] = useState<boolean>(task?.is_billable ?? true);

  useEffect(() => {
    if (task) {
      setName(task.name || '');
      setDescription(task.description || '');
      setAssignedTo(task.assigned_to_user_id as any || undefined);
      setStatus(task.status || 'open');
      setEstimatedHours(task.estimated_hours || undefined);
      setIsBillable(task.is_billable ?? true);
    } else {
      setName('');
      setDescription('');
      setAssignedTo(undefined);
      setStatus('open');
      setEstimatedHours(undefined);
      setIsBillable(true);
    }
  }, [task, open]);

  const save = async () => {
    if (!name.trim()) return showError('Task name is required');
    setLoading(true);
    try {
      if (task && (task as any).id) {
        const updates: Partial<Task> = {
          name: name.trim(),
          description: description || undefined,
          assigned_to_user_id: assignedTo ?? undefined,
          status,
          estimated_hours: estimatedHours,
          is_billable: isBillable
        };
        const res = await ProjectService.updateTask((task as any).id, updates);
        if (res.success) {
          showSuccess('Task updated');
          onSaved && onSaved({ ...(task as Task), ...updates } as Task);
          onClose();
        } else {
          showError(res.error || 'Failed to update task');
        }
      } else {
        const res = await ProjectService.createTask({
          project_id: projectId,
          name: name.trim(),
          description: description || undefined,
          assigned_to_user_id: assignedTo ?? undefined,
          status,
          estimated_hours: estimatedHours,
          is_billable: isBillable,
          created_by_user_id: undefined as any
        });
        if (res.task) {
          showSuccess('Task created');
          onSaved && onSaved(res.task);
          onClose();
        } else {
          showError(res.error || 'Failed to create task');
        }
      }
    } catch (e) {
      console.error(e);
      showError('Unexpected error saving task');
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!task || !(task as any).id) return;
    if (!confirm('Delete this task? This action can be undone from the trash.')) return;
    setLoading(true);
    try {
      const res = await ProjectService.deleteTask((task as any).id);
      if (res.success) {
        showSuccess('Task deleted');
        onDeleted && onDeleted((task as any).id);
        onClose();
      } else {
        showError(res.error || 'Failed to delete task');
      }
    } catch (err) {
      console.error(err);
      showError('Unexpected error deleting task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SlideOver open={open} onClose={onClose} title={task ? 'Edit Task' : 'Add Task'}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assigned to</label>
            <select value={assignedTo || ''} onChange={e => setAssignedTo(e.target.value || undefined)} className="mt-1 block w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">Unassigned</option>
              {(members && members.length > 0 ? members : users).map((u: any) => (
                <option key={u.user_id || u.id} value={u.user_id || u.id}>{u.user_name || u.full_name || u.user_email || u.email}</option>
              ))}
            </select>
          </div>

            <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="mt-1 block w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estimated hours</label>
            <input type="number" value={estimatedHours ?? ''} onChange={e => setEstimatedHours(e.target.value ? Number(e.target.value) : undefined)} className="mt-1 block w-full border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" min={0} />
          </div>

          <div className="flex items-center gap-3">
            <input id="is_billable" type="checkbox" checked={isBillable} onChange={e => setIsBillable(e.target.checked)} />
            <label htmlFor="is_billable" className="text-sm text-gray-700 dark:text-gray-300">Billable</label>
          </div>
        </div>

        <div className="flex justify-between items-center">
          {task && (
            <button onClick={remove} disabled={loading} className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-900/30 rounded-md text-sm">Delete</button>
          )}

          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="px-3 py-2 bg-white dark:bg-gray-700 dark:border-gray-600 border border-gray-200 rounded-md text-sm text-gray-900 dark:text-gray-100">Cancel</button>
            <button onClick={save} disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    </SlideOver>
  );
};

export default TaskSlideOver;
