import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, List, Layers } from 'lucide-react';
import { ProjectService } from '../../services/ProjectService';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { ProjectCard } from './components/ProjectCard';
import { ProjectTasksSection } from './components/ProjectTasksSection';
import type { Project as ProjectType, Task } from '../../types';

type ViewTab = 'overview' | 'tasks' | 'members';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectType | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [membersCount, setMembersCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(true);
      try {
        const [projRes, tasksRes, membersRes] = await Promise.all([
          ProjectService.getProjectById(projectId),
          ProjectService.getProjectTasks(projectId),
          ProjectService.getProjectMembers?.(projectId) || Promise.resolve({ members: [] })
        ]);

        if (projRes.error) {
          console.error('Project fetch error:', projRes.error);
          setProject(null);
          return;
        }

        if (projRes.project) {
          // map minimal shape expected by ProjectCard
          const p = projRes.project as any;
          setProject({
            id: p.id || p._id,
            name: p.name,
            client_name: p.client_name || p.client_id?.name || p.client?.name,
            status: p.status,
            start_date: p.start_date,
            end_date: p.end_date,
            budget: p.budget || 0,
            description: p.description,
            is_billable: p.is_billable ?? true,
            tasks: (p.tasks || []) as any,
            total_hours_logged: p.total_hours_logged || 0,
            avg_hourly_rate: p.avg_hourly_rate || 0,
            team_members: (p.team_members || []).map((m: any) => ({ name: m.user?.full_name || m.user_name || m.name }))
          });
        }

        if (!tasksRes.error && tasksRes.tasks) {
          setTasks(tasksRes.tasks as Task[]);
        }

        if (!membersRes.error && Array.isArray(membersRes.members)) {
          setMembersCount(membersRes.members.length);
        }
      } catch (err) {
        console.error('Error loading project detail:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  if (loading) return <LoadingSpinner fullScreen text="Loading project..." />;

  if (!project) {
    return (
      <EmptyState
        icon={Layers}
        title="Project not found"
        description="The requested project could not be loaded."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard/projects')} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <div className="text-sm text-gray-600">{project.client_name}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate(`/dashboard/projects/${projectId}/members`)} icon={Users}>Members ({membersCount})</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-2 rounded ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                onClick={() => setActiveTab('overview')}
              >Overview</button>
              <button
                className={`px-3 py-2 rounded ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                onClick={() => setActiveTab('tasks')}
              >Tasks ({tasks.length})</button>
              <button
                className={`px-3 py-2 rounded ${activeTab === 'members' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                onClick={() => navigate(`/dashboard/projects/${projectId}/members`)}
              >Members ({membersCount})</button>
            </div>

            {activeTab === 'overview' && (
              <div>
                <ProjectCard project={project} onViewDetails={() => {}} onEdit={() => navigate('/dashboard/projects')} />
                {/* quick project description and details */}
                {project.description && <p className="mt-4 text-sm text-gray-700">{project.description}</p>}
              </div>
            )}

            {activeTab === 'tasks' && projectId && (
              <div>
                <ProjectTasksSection
                  projectId={projectId}
                  tasks={tasks}
                  onAddTask={() => console.log('Add task')}
                  onEditTask={(task) => console.log('Edit task', task)}
                  onDeleteTask={(taskId) => console.log('Delete task', taskId)}
                />
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-semibold mb-2">Quick Info</h3>
              <p className="text-sm">Status: <strong>{project.status}</strong></p>
              <p className="text-sm">Start: {project.start_date}</p>
              {project.end_date && <p className="text-sm">End: {project.end_date}</p>}
              <p className="text-sm">Budget: ${project.budget?.toLocaleString?.() ?? project.budget}</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-semibold mb-2">Team</h3>
              <p className="text-sm">Members: {membersCount}</p>
              <Button className="mt-3" onClick={() => navigate(`/dashboard/projects/${projectId}/members`)} icon={Users}>Manage Members</Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
