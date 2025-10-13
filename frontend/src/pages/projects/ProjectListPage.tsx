import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { useRoleManager } from '../../hooks/useRoleManager';
import { useAuth } from '../../store/contexts/AuthContext';
import { ProjectService } from '../../services/ProjectService';
import { UserService } from '../../services/UserService';
import { showSuccess, showError } from '../../utils/toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { DeleteActionModal } from '../../components/DeleteActionModal';
import type { Project, Client, User, ProjectWithClients } from '../../types';
import {
  ProjectCard,
  ProjectForm,
  ProjectFilters,
  ProjectStats,
  type ProjectFilterState,
} from './components';

/**
 * ProjectListPage
 * Main page for project management with mobile-first design
 *
 * Features:
 * - Mobile-first card layout
 * - Backend-driven filtering
 * - Advanced filters (search, status, client, billable)
 * - CRUD operations with react-hook-form + Zod
 * - Role-based permissions
 * - Analytics stats from backend
 * - Dark mode support
 * - Lightweight (backend handles computation)
 */
export const ProjectListPage: React.FC = () => {
  const { canManageProjects, currentRole } = useRoleManager();
  const { currentUser } = useAuth();

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [refreshTrigger, currentRole, currentUser?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Determine which projects to load based on role
      const projectsPromise =
        currentRole === 'manager' && currentUser?.id
          ? ProjectService.getProjectsByManager(currentUser.id)
          : currentRole === 'employee' || currentRole === 'lead'
          ? ProjectService.getUserProjects()
          : ProjectService.getAllProjects();

      const [projectsResult, clientsResult, usersResult, analyticsResult] = await Promise.all([
        projectsPromise,
        ProjectService.getClients?.() || Promise.resolve({ clients: [] }),
        UserService.getAllUsers(),
        ProjectService.getProjectAnalytics?.() || Promise.resolve({ analytics: null }),
      ]);

      if (projectsResult.error) {
        showError(projectsResult.error);
      } else {
        const projectData = projectsResult.projects || [];
        setProjects(projectData);
        setFilteredProjects(projectData);
      }

      if (!clientsResult.error && clientsResult.clients) {
        setClients(clientsResult.clients);
      }

      if (!usersResult.error && usersResult.users) {
        // Filter for managers and above
        const managerUsers = usersResult.users.filter((u: User) =>
          ['super_admin', 'management', 'manager'].includes(u.role)
        );
        setManagers(managerUsers);
      }

      if (analyticsResult.analytics) {
        setAnalytics(analyticsResult.analytics);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      showError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Filter handling (lightweight - simple frontend filtering)
  const handleFilterChange = useCallback(
    (filters: ProjectFilterState) => {
      let filtered = [...projects];

      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query)
        );
      }

      // Status filter
      if (filters.status !== 'all') {
        filtered = filtered.filter((p) => p.status === filters.status);
      }

      // Client filter
      if (filters.clientId) {
        filtered = filtered.filter((p) => {
          const clientId = typeof p.client_id === 'string' ? p.client_id : p.client_id?.id;
          return clientId === filters.clientId;
        });
      }

      // Billable filter
      if (filters.billable !== 'all') {
        const isBillable = filters.billable === 'billable';
        filtered = filtered.filter((p) => p.is_billable === isBillable);
      }

      setFilteredProjects(filtered);
    },
    [projects]
  );

  // CRUD operations
  const handleCreateProject = () => {
    setFormMode('create');
    setEditingProject(null);
    setShowForm(true);
  };

  const handleEditProject = (project: Project) => {
    setFormMode('edit');
    setEditingProject(project);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Convert string dates to Date objects for API
      const formattedData = {
        ...data,
        start_date: new Date(data.start_date),
        end_date: data.end_date ? new Date(data.end_date) : undefined,
      };

      if (formMode === 'create') {
        const result = await ProjectService.createProject(formattedData);
        if (result.error) {
          showError(`Error creating project: ${result.error}`);
        } else {
          showSuccess('Project created successfully');
          setShowForm(false);
          setRefreshTrigger((prev) => prev + 1);
        }
      } else if (editingProject) {
        const result = await ProjectService.updateProject(editingProject.id, formattedData);
        if (result.error) {
          showError(`Error updating project: ${result.error}`);
        } else {
          showSuccess('Project updated successfully');
          setShowForm(false);
          setRefreshTrigger((prev) => prev + 1);
        }
      }
    } catch (err) {
      showError('An error occurred');
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (project: Project) => {
    setDeletingProject(project);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (action: 'soft' | 'hard', reason?: string) => {
    if (!deletingProject) return;

    setDeleteLoading(true);
    try {
      const result =
        action === 'soft'
          ? await ProjectService.softDeleteProject(deletingProject.id, reason || 'No reason provided')
          : await ProjectService.hardDeleteProject?.(deletingProject.id);

      if (result && result.success) {
        showSuccess(
          action === 'soft' ? 'Project deleted successfully' : 'Project permanently deleted'
        );
        setShowDeleteModal(false);
        setDeletingProject(null);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        showError(`Error: ${result?.error || 'Unknown error'}`);
      }
    } catch (err) {
      showError('Error processing delete request');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return <LoadingSpinner fullScreen text="Loading projects..." />;
  }

  // Permission check
  if (!canManageProjects()) {
    return (
      <EmptyState
        icon={Building2}
        title="Access Denied"
        description="You don't have permission to access Project Management."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Project Management
              </h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
                Manage your projects and track progress
              </p>
            </div>

            {/* Create Project Button - Mobile-friendly */}
            {canManageProjects() && (
              <button
                onClick={handleCreateProject}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 md:py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium text-sm md:text-base min-h-[44px] w-full sm:w-auto"
              >
                <Plus className="h-5 w-5" />
                <span>Create Project</span>
              </button>
            )}
          </div>
        </div>

        {/* Analytics Stats */}
        {analytics && <ProjectStats analytics={analytics} loading={false} />}

        {/* Filters */}
        <ProjectFilters
          onFilterChange={handleFilterChange}
          clients={clients}
          managers={managers}
          showAdvanced={currentRole !== 'employee'}
        />

        {/* Projects Grid - Mobile-first Card Layout */}
        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No projects found"
            description="Try adjusting your filters or create a new project"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEditProject}
                onDelete={handleDeleteClick}
                canEdit={canManageProjects()}
                canDelete={currentRole === 'super_admin' || currentRole === 'management'}
              />
            ))}
          </div>
        )}

        {/* Project Form Modal */}
        <ProjectForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleFormSubmit}
          project={editingProject}
          mode={formMode}
          clients={clients}
          managers={managers}
          isSubmitting={isSubmitting}
        />

        {/* Delete Modal */}
        {deletingProject && (
          <DeleteActionModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setDeletingProject(null);
            }}
            onConfirm={handleDeleteConfirm}
            title="Delete Project"
            itemName={deletingProject.name}
            itemType="project"
            action="soft"
            isLoading={deleteLoading}
            dependencies={[]}
            isSoftDeleted={false}
            canHardDelete={currentRole === 'super_admin'}
          />
        )}
      </div>
    </div>
  );
};
