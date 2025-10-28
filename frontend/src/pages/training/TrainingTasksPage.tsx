/**
 * TrainingTasksPage Component
 *
 * Management interface for Training Project tasks
 * Only accessible to Management, Managers, and Super Admins
 *
 * Features:
 * - View all training tasks
 * - Add new training tasks
 * - Edit existing training tasks
 * - Delete training tasks (soft delete)
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { backendApi } from '../../lib/backendApi';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

interface TrainingTask {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface TrainingProject {
  id: string;
  name: string;
}

export const TrainingTasksPage: React.FC = () => {
  const { user } = useAuth();
  const [trainingProject, setTrainingProject] = useState<TrainingProject | null>(null);
  const [tasks, setTasks] = useState<TrainingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TrainingTask | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  // Check if user has permission to manage training tasks
  const canManage = user?.role && ['management', 'manager', 'super_admin'].includes(user.role);

  useEffect(() => {
    fetchTrainingData();
  }, []);

  const fetchTrainingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await backendApi.get('/projects/training');
      if (response.success && response.project && response.tasks) {
        setTrainingProject(response.project);
        setTasks(response.tasks);
      } else {
        setError(response.error || 'Failed to load training data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({ name: '', description: '' });
    setEditingTask(null);
  };

  const handleEdit = (task: TrainingTask) => {
    setEditingTask(task);
    setFormData({ name: task.name, description: task.description });
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingTask(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Task name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editingTask) {
        // Update existing task
        const response = await backendApi.put(`/projects/training/tasks/${editingTask.id}`, formData);
        if (response.success) {
          await fetchTrainingData();
          handleCancel();
        } else {
          setError(response.error || 'Failed to update task');
        }
      } else {
        // Create new task
        const response = await backendApi.post('/projects/training/tasks', formData);
        if (response.success) {
          await fetchTrainingData();
          handleCancel();
        } else {
          setError(response.error || 'Failed to create task');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this training task? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await backendApi.delete(`/projects/training/tasks/${taskId}`);
      if (response.success) {
        await fetchTrainingData();
      } else {
        setError(response.error || 'Failed to delete task');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-gray-600">Loading training tasks...</p>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="error">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to manage training tasks. This feature is only available to Management, Managers, and Admins.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Task Management</h1>
          {trainingProject && (
            <p className="text-gray-600 mt-1">
              Manage tasks for <strong>{trainingProject.name}</strong> project
            </p>
          )}
        </div>
        {!isAdding && !editingTask && (
          <Button onClick={handleAdd} icon={Plus}>
            Add Training Task
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(isAdding || editingTask) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTask ? 'Edit Training Task' : 'Add New Training Task'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Task Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., General Training, Technical Skills, etc."
              />
              <Textarea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of this training task"
                rows={3}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} icon={Save}>
                  {submitting ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} icon={X}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Training Tasks ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No training tasks found.</p>
              <p className="text-sm mt-2">Click "Add Training Task" to create your first task.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{task.name}</h3>
                      {task.is_active ? (
                        <Badge variant="success" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="outline" size="sm">Inactive</Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Created: {new Date(task.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(task)}
                      icon={Edit}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(task.id)}
                      icon={Trash2}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">About Training Tasks</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Training tasks are visible to all employees when creating timesheets</li>
          <li>• Training entries are always non-billable</li>
          <li>• Training entries skip Lead approval and go directly to Manager approval</li>
          <li>• Training hours appear in project billing breakdown for visibility</li>
        </ul>
      </div>
    </div>
  );
};

export default TrainingTasksPage;
