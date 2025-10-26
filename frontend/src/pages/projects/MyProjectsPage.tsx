import React, { useEffect, useMemo, useState } from 'react';
// navigation not required for inline details view
import { ProjectService } from '../../services/ProjectService';
import { useAuth } from '../../store/contexts/AuthContext';
import { useRoleManager } from '../../hooks/useRoleManager';
import type { Project, Task } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Search } from 'lucide-react';
import SlideOver from '../../components/ui/SlideOver';
import { Clock, DollarSign, Tag } from 'lucide-react';

type Member = {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
};

const MyProjectsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const roleManager = useRoleManager();
  const isLead = roleManager?.currentRole === 'lead' || false;
  const isEmployee = roleManager?.currentRole === 'employee' || false;
  // navigate not used here (View Details opens inline), keep import in case of future use

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasksMap, setTasksMap] = useState<Record<string, Task[]>>({});
  const [membersMap, setMembersMap] = useState<Record<string, Member[]>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [slideData, setSlideData] = useState<{ loading?: boolean; tasks?: Task[]; members?: Member[] }>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const res = await ProjectService.getUserProjects(currentUser.id);
        const list = (res.projects || []) as Project[];
        if (!mounted) return;
        setProjects(list);

        // preload tasks and members in parallel to avoid sequential waits
        const tasksMapLocal: Record<string, Task[]> = {};
        const membersMapLocal: Record<string, Member[]> = {};

        await Promise.all(
          list.map(async (p) => {
            const pid = (p as unknown as { id?: string; _id?: string }).id || (p as unknown as { id?: string; _id?: string })._id;
            if (!pid) return;
            const t = await ProjectService.getProjectTasks(String(pid));
            // Normalize task ids and assigned_to_user_id to strings for consistent comparisons
            const normalizedTasks = (t.tasks || []).map(tsk => {
              const task = { ...(tsk as any) } as any;
              // normalize id
              task.id = task.id || task._id || (task._id && String(task._id)) || task.id;
              // normalize assigned_to_user_id
              const at = task.assigned_to_user_id;
              if (at && typeof at === 'object') {
                task.assigned_to_user_id = at._id || at.id || at.user_id || String(at);
              } else if (at === null || at === undefined) {
                task.assigned_to_user_id = undefined;
              } else {
                task.assigned_to_user_id = String(at);
              }
              return task as Task;
            });
            tasksMapLocal[String(pid)] = normalizedTasks;
            if (isLead) {
              try {
                const m = await ProjectService.getProjectMembers(String(pid));
                membersMapLocal[String(pid)] = m.members || [];
              } catch {
                membersMapLocal[String(pid)] = [];
              }
            }
          })
        );

        if (!mounted) return;
        setTasksMap(tasksMapLocal);
        setMembersMap(membersMapLocal);
      } catch (err) {
        // swallow for now; UI will show empty state
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [currentUser, isLead]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter === 'active' && String(p.status).toLowerCase() !== 'active') return false;
      if (statusFilter === 'completed' && String(p.status).toLowerCase() !== 'completed') return false;
      if (!q) return true;
      return (
        String(p.name).toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (typeof p.client_id === 'string' ? p.client_id.toLowerCase().includes(q) : (p.client_id as any)?.name?.toLowerCase()?.includes(q))
      );
    });
  }, [projects, query, statusFilter]);

  // currently selected project for SlideOver
  const selectedProject = openProjectId ? projects.find(pr => ((pr as unknown as { id?: string; _id?: string }).id || (pr as unknown as { id?: string; _id?: string })._id) === openProjectId) : undefined;

  // precompute grid items to avoid complex nested JSX in the return
  const gridContent = filtered.map((p) => {
    const pid = (p as unknown as { id?: string; _id?: string }).id || (p as unknown as { id?: string; _id?: string })._id;
    const projectTasks = tasksMap[String(pid)] || [];
    const projectMembers = membersMap[String(pid)] || [];

    const teamCount = projectMembers.length;
    const myTasksCount = projectTasks.filter(t => t.assigned_to_user_id === currentUser?.id).length;

    return (
      <div key={String(pid)} className="space-y-3">
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{p.name}</h3>
                <div className="text-sm text-gray-500 mt-1 truncate">{(p as unknown as { client_name?: string }).client_name || 'No Client'}</div>
              </div>
              <div className="text-sm text-gray-600">{String(p.status)}</div>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-gray-700">Team: <span className="font-normal">{teamCount}</span></div>
                <div className="text-sm font-medium text-gray-700">My Tasks: <span className="font-normal">{myTasksCount}</span></div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openDetails(String(pid))}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  });

  // open details in SlideOver (lazy-load tasks & members)
  const openDetails = async (projectId: string) => {
    setOpenProjectId(projectId);
    setSlideData({ loading: true });
    try {
      const [tRes, mRes] = await Promise.all([
        ProjectService.getProjectTasks(String(projectId)),
        ProjectService.getProjectMembers(String(projectId)).catch(() => ({ members: [] })),
      ]);

      const normalizedTasks = (tRes.tasks || []).map(tsk => {
        const task = { ...(tsk as any) } as any;
        task.id = task.id || task._id || (task._id && String(task._id)) || task.id;
        const at = task.assigned_to_user_id;
        if (at && typeof at === 'object') {
          task.assigned_to_user_id = at._id || at.id || at.user_id || String(at);
        } else if (at === null || at === undefined) {
          task.assigned_to_user_id = undefined;
        } else {
          task.assigned_to_user_id = String(at);
        }
        return task as Task;
      });

      setSlideData({ loading: false, tasks: normalizedTasks, members: mRes.members || [] });
    } catch (e) {
      setSlideData({ loading: false, tasks: [], members: [] });
    }
  };

  const closeDetails = () => {
    setOpenProjectId(null);
    setSlideData({});
  };

  if (loading) return <div className="p-8"><LoadingSpinner /></div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Projects</h1>
          <p className="text-sm text-gray-500">Projects assigned to you and your team's tasks</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex items-center bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, descriptions or clients..."
              className="w-full text-sm placeholder-gray-400 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg p-6 border border-gray-200 text-center text-gray-600">No projects found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridContent}
        </div>
      )}
      {/* SlideOver for project details (mobile-first, overlays page) */}
      <SlideOver open={!!openProjectId} onClose={closeDetails} title={selectedProject?.name}>
        {slideData.loading ? (
          <div className="p-6"><LoadingSpinner /></div>
        ) : selectedProject ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Project Details</h3>
              <div className="text-sm text-gray-700"><strong>Description:</strong> {(selectedProject as any).description || 'No description'}</div>
              <div className="mt-1 text-sm text-gray-700"><strong>Start:</strong> {(selectedProject as any).start_date || '—'}</div>
              <div className="mt-1 text-sm text-gray-700"><strong>End:</strong> {(selectedProject as any).end_date || '—'}</div>
              <div className="mt-1 text-sm text-gray-700"><strong>Client:</strong> {(selectedProject as any).client_name || 'No Client'}</div>
              <div className="mt-1 text-sm text-gray-700"><strong>Manager:</strong> {(selectedProject as any).manager_name || '—'}</div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Tasks</h3>
              <div className="text-sm text-gray-700"><strong>Available:</strong> {(slideData.tasks || []).length}</div>
              <div className="mt-1 text-sm text-gray-700"><strong>Your tasks:</strong> {(slideData.tasks || []).filter(t => t.assigned_to_user_id === currentUser?.id).length}</div>
              {((slideData.tasks || []).length > 0) && (() => {
                const allTasks = slideData.tasks || [];
                const tasksToRender = isEmployee ? allTasks.filter(t => t.assigned_to_user_id === currentUser?.id) : allTasks;
                type TaskView = {
                  id?: string;
                  _id?: string;
                  name?: string;
                  description?: string;
                  status?: string;
                  estimated_hours?: number | null;
                  is_billable?: boolean;
                  assigned_to_user_id?: string | { id?: string; _id?: string } | null;
                };
                return (
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    {tasksToRender.map((tt) => {
                      const t = tt as TaskView;
                      const tid = t.id || t._id || 'unknown';
                      const status = t.status || 'open';
                      const est = t.estimated_hours ?? 0;
                      const billable = !!t.is_billable;
                      const desc = t.description;
                      const statusColor = status === 'completed' ? 'bg-green-100 text-green-800' : status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800';
                      return (
                        <div key={String(tid)} className="bg-white rounded-md shadow-sm border border-gray-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">{t.name}</h4>
                              {desc && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{desc}</p>}
                              <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${statusColor}`}>{status}</span>
                                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-gray-500" /> {est}h</span>
                                {billable && <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3 text-green-600" /> Billable</span>}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 flex-shrink-0">
                              <Tag className="h-5 w-5" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {isLead && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Team Members</h3>
                {(slideData.members || []).length === 0 ? (
                  <div className="text-sm text-gray-500">No team members assigned.</div>
                ) : (
                  <div className="space-y-2">
                    {(slideData.members || []).map(m => {
                      const memberTasks = (slideData.tasks || []).filter(t => t.assigned_to_user_id === m.user_id);
                      return (
                        <div key={m.id} className="bg-gray-50 rounded-md p-3 flex items-start justify-between">
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{m.user_name || m.user_email}</div>
                            <div className="text-sm text-gray-500">{memberTasks.length} task(s)</div>
                          </div>
                          <div className="text-sm">
                            {memberTasks.length > 0 ? (
                              <ul className="list-disc list-inside text-sm text-gray-700">
                                {memberTasks.map(t => (
                                  <li key={(t as unknown as { id?: string; _id?: string }).id || (t as unknown as { id?: string; _id?: string })._id}>{t.name} {t.status ? `(${t.status})` : ''}</li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-sm text-gray-500">No tasks assigned</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-600">Project not found</div>
        )}
      </SlideOver>
    </div>
  );
};

export default MyProjectsPage;
