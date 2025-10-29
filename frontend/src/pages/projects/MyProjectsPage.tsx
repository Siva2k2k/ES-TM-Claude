import React, { useEffect, useMemo, useState } from 'react';
// navigation not required for inline details view
import { ProjectService } from '../../services/ProjectService';
import { useAuth } from '../../store/contexts/AuthContext';
import { useRoleManager } from '../../hooks/useRoleManager';
import type { Project, Task } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Search } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Clock, DollarSign, Tag, Users, Calendar, Building2, CheckSquare, User } from 'lucide-react';
import * as formatting from '../../utils/formatting';

type Member = {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
};

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

type ProjectWithDetails = Project & {
  client_name?: string;
  manager_name?: string;
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

  // currently selected project for Modal
  const selectedProject: ProjectWithDetails | undefined = openProjectId ? projects.find(pr => ((pr as unknown as { id?: string; _id?: string }).id || (pr as unknown as { id?: string; _id?: string })._id) === openProjectId) : undefined;
  
  // precompute grid items to avoid complex nested JSX in the return
  const gridContent = filtered.map((p) => {
    const pid = (p as unknown as { id?: string; _id?: string }).id || (p as unknown as { id?: string; _id?: string })._id;
    const projectTasks = tasksMap[String(pid)] || [];
    const projectMembers = membersMap[String(pid)] || [];

    const teamCount = projectMembers.length;
    const myTasksCount = projectTasks.filter(t => t.assigned_to_user_id === currentUser?.id).length;
    const projectStatus = String(p.status).toLowerCase();

    return (
      <div key={String(pid)} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md dark:hover:shadow-gray-900/70 flex flex-col h-full">
        {/* Card Header */}
        <div className="p-4 space-y-3 flex-grow">
          {/* Top Row: Title & Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {p.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{(typeof p.client_id === 'object' && p.client_id?.name) || 'No Client'}</span>
              </div>
            </div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              projectStatus === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
              projectStatus === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
              projectStatus === 'on_hold' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
              'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
            }`}>
              {projectStatus}
            </span>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Team Count */}
            {!isEmployee && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Users className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="font-medium">{teamCount}</span>
                <span className="text-xs">team members</span>
              </div>
            )}

            {/* My Tasks Count */}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <CheckSquare className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
              <span className="font-medium">{myTasksCount}</span>
              <span className="text-xs">my tasks</span>
            </div>
          </div>

          {/* Description Preview */}
          {p.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {p.description}
            </p>
          )}
        </div>

        {/* Card Footer - Actions - Always at bottom */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={() => openDetails(String(pid))}
            className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors min-h-[44px]"
          >
            View Details
          </button>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Projects</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your assigned projects and track team progress
          </p>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm px-4 py-2.5 w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 mr-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, descriptions or clients..."
              className="w-full text-sm placeholder-gray-400 outline-none bg-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'completed')}
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-800"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No projects found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {query || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'You haven\'t been assigned to any projects yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridContent}
        </div>
      )}
      {/* Modal for project details */}
      <Modal isOpen={!!openProjectId} onClose={closeDetails} title={selectedProject?.name} size="lg">
        {slideData.loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : selectedProject ? (
          <div className="space-y-6">
            {/* Project Overview Card */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Client</span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 ml-6">
                    {(typeof selectedProject.client_id === 'object' && selectedProject.client_id?.name) || 'No Client'}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Manager</span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 ml-6">
                    {(typeof selectedProject.primary_manager_id === 'object' && selectedProject.primary_manager_id?.full_name) || 'No Manager Assigned'}
                  </p>
                </div>
                <div className="space-y-3"><div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 ml-6">
                    {selectedProject.start_date ? formatting.formatDate(selectedProject.start_date, 'short') : '—'}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 ml-6">
                    {selectedProject.end_date ? formatting.formatDate(selectedProject.end_date, 'short') : '—'}
                  </p>
                </div>
              </div>
              {selectedProject.description && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {selectedProject.description}
                  </p>
                </div>
              )}
            </div>

            {/* Tasks Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Tasks
                </h3>
              </div>

              {(slideData.tasks || []).length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <CheckSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No tasks assigned to this project</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const allTasks = slideData.tasks || [];
                    const tasksToRender = isEmployee ? allTasks.filter(t => t.assigned_to_user_id === currentUser?.id) : allTasks;
                    return tasksToRender.map((tt) => {
                      const t = tt as TaskView;
                      const tid = t.id || t._id || 'unknown';
                      const status = t.status || 'open';
                      const est = t.estimated_hours ?? 0;
                      const billable = !!t.is_billable;
                      const desc = t.description;

                      return (
                        <div key={String(tid)} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  {t.name}
                                </h4>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  status === 'completed' ? 'bg-green-100 text-green-800' :
                                  status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {status}
                                </span>
                              </div>
                              {desc && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                  {desc}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{est}h estimated</span>
                                </div>
                                {billable && (
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3 text-green-600" />
                                    <span className="text-green-600 dark:text-green-400">Billable</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <Tag className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Task Summary */}
              {(slideData.tasks || []).length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Your tasks:</strong> {(slideData.tasks || []).filter(t => t.assigned_to_user_id === currentUser?.id).length} of {(slideData.tasks || []).length} total
                  </div>
                </div>
              )}
            </div>

            {/* Team Members Section - Only for Leads */}
            {isLead && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Team Members ({(slideData.members || []).length})
                  </h3>
                </div>

                {(slideData.members || []).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No team members assigned</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(slideData.members || []).map(m => {
                      const memberTasks = (slideData.tasks || []).filter(t => t.assigned_to_user_id === m.user_id);
                      return (
                        <div key={m.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {m.user_name || m.user_email}
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {memberTasks.length} task{memberTasks.length !== 1 ? 's' : ''} assigned
                              </p>
                            </div>
                          </div>
                          {memberTasks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <div className="space-y-2">
                                {memberTasks.map(t => (
                                  <div key={(t as unknown as { id?: string; _id?: string }).id || (t as unknown as { id?: string; _id?: string })._id} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">{t.name}</span>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                      (t.status || 'open') === 'completed' ? 'bg-green-100 text-green-800' :
                                      (t.status || 'open') === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {t.status || 'open'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Project not found</p>
          </div>
        )}
      </Modal>
      </div>
    </div>
  );
};

export default MyProjectsPage;
