import { supabase } from '../lib/supabase';
import type { Project, Task, Client } from '../types';

/**
 * Project Management Service - Supabase Integration
 * Handles all project-related operations with real database operations
 */
export class ProjectService {
  /**
   * Create a new project (Management and Super Admin)
   */
  static async createProject(projectData: Partial<Project>): Promise<{ project?: Project; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: projectData.name!,
          client_id: projectData.client_id!,
          primary_manager_id: projectData.primary_manager_id!,
          status: projectData.status || 'active',
          start_date: projectData.start_date!,
          end_date: projectData.end_date || null,
          budget: projectData.budget || null,
          description: projectData.description || null,
          is_billable: projectData.is_billable ?? true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating project:', error);
        return { error: error.message };
      }

      console.log('Project created:', data);
      return { project: data as Project };
    } catch (error) {
      console.error('Error in createProject:', error);
      return { error: 'Failed to create project' };
    }
  }

  /**
   * Update project
   */
  static async updateProject(projectId: string, updates: Partial<Project>): Promise<{ success: boolean; error?: string }> {
    try {
      // Sanitize updates: convert empty date strings to null to avoid Postgres date parsing errors
  const payload: Partial<Project> & Record<string, unknown> = { ...updates };
      if ('start_date' in payload && ((payload as any).start_date === '' || (payload as any).start_date === undefined)) {
        (payload as any).start_date = null;
      }
      if ('end_date' in payload && ((payload as any).end_date === '' || (payload as any).end_date === undefined)) {
        (payload as any).end_date = null;
      }

      // If budget is an empty string from form input, convert to null
      if ('budget' in payload && (payload as any).budget === '') {
        (payload as any).budget = null;
      }

      payload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', projectId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error updating project:', error);
        return { success: false, error: error.message };
      }

      console.log(`Updated project ${projectId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in updateProject:', error);
      return { success: false, error: 'Failed to update project' };
    }
  }

  /**
   * Get all projects
   */
  static async getAllProjects(): Promise<{ projects: Project[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients!inner(name, contact_person),
          users!inner(full_name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        return { projects: [], error: error.message };
      }

      return { projects: data as Project[] };
    } catch (error) {
      console.error('Error in getAllProjects:', error);
      return { projects: [], error: 'Failed to fetch projects' };
    }
  }

  /**
   * Get projects by status
   */
  static async getProjectsByStatus(status: string): Promise<{ projects: Project[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients(name, contact_person),
          users(full_name)
        `)
        .eq('status', status)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects by status:', error);
        return { projects: [], error: error.message };
      }

      return { projects: data as Project[] };
    } catch (error) {
      console.error('Exception in getProjectsByStatus:', error);
      return { projects: [], error: 'Failed to fetch projects by status' };
    }
  }

  /**
   * Get active projects
   */
  static async getActiveProjects(): Promise<{ projects: Project[]; error?: string }> {
    return this.getProjectsByStatus('active');
  }

  /**
   * Get completed projects
   */
  static async getCompletedProjects(): Promise<{ projects: Project[]; error?: string }> {
    return this.getProjectsByStatus('completed');
  }

  /**
   * Get tasks for a project
   */
  static async getProjectTasks(projectId: string): Promise<{ tasks: Task[]; error?: string }> {
    try {
      console.log(`🔍 getProjectTasks: Querying tasks for project ${projectId}`);
      
      // First, let's try a simple query to see if ANY tasks exist for this project
      const { data: simpleTasks, error: simpleError } = await supabase
        .from('tasks')
        .select('id, name, project_id, status, deleted_at')
        .eq('project_id', projectId);
        
      console.log(`🔍 getProjectTasks: Simple query result:`, { simpleTasks, simpleError });
      console.log(`🔍 getProjectTasks: Simple query found ${simpleTasks?.length || 0} total tasks (including deleted)`);
      
      // Now the full query with filters
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:users!tasks_assigned_to_user_id_fkey(full_name),
          created_by_user:users!tasks_created_by_user_id_fkey(full_name)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      console.log(`🔍 getProjectTasks: Full query result for project ${projectId}:`, { data, error });
      console.log(`🔍 getProjectTasks: Found ${data?.length || 0} non-deleted tasks`);
      
      if (data && data.length > 0) {
        console.log(`🔍 getProjectTasks: Sample task:`, data[0]);
      }

      if (error) {
        console.error('Error fetching project tasks:', error);
        return { tasks: [], error: error.message };
      }

      return { tasks: data as Task[] };
    } catch (error) {
      console.error('Error in getProjectTasks:', error);
      return { tasks: [], error: 'Failed to fetch project tasks' };
    }
  }

  /**
   * Get project with tasks
   */
  static async getProjectWithTasks(projectId: string): Promise<{ 
    project?: Project; 
    tasks: Task[]; 
    error?: string 
  }> {
    try {
      const [projectResult, tasksResult] = await Promise.all([
        this.getProjectById(projectId),
        this.getProjectTasks(projectId)
      ]);

      if (projectResult.error) {
        return { tasks: [], error: projectResult.error };
      }

      if (tasksResult.error) {
        return { project: projectResult.project, tasks: [], error: tasksResult.error };
      }

      return { 
        project: projectResult.project, 
        tasks: tasksResult.tasks 
      };
    } catch (error) {
      console.error('Error in getProjectWithTasks:', error);
      return { tasks: [], error: 'Failed to fetch project with tasks' };
    }
  }

  /**
   * Update project status
   */
  static async updateProjectStatus(projectId: string, status: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error updating project status:', error);
        return { success: false, error: error.message };
      }

      console.log(`Updated project ${projectId} status to: ${status}`);
      return { success: true };
    } catch (error) {
      console.error('Error in updateProjectStatus:', error);
      return { success: false, error: 'Failed to update project status' };
    }
  }

  /**
   * Get project analytics
   */
  static async getProjectAnalytics(projectId?: string): Promise<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalTasks: number;
    completedTasks: number;
    budgetUtilization: number;
    error?: string;
  }> {
    try {
      // Get projects
      const projectsQuery = supabase
        .from('projects')
        .select('id, status, budget')
        .is('deleted_at', null);

      if (projectId) {
        projectsQuery.eq('id', projectId);
      }

      const { data: projects, error: projectsError } = await projectsQuery;

      if (projectsError) {
        console.error('Error fetching project analytics:', projectsError);
        return {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          totalTasks: 0,
          completedTasks: 0,
          budgetUtilization: 0,
          error: projectsError.message
        };
      }

      // Get tasks
      const tasksQuery = supabase
        .from('tasks')
        .select('id, status, project_id')
        .is('deleted_at', null);

      if (projectId) {
        tasksQuery.eq('project_id', projectId);
      }

      const { data: tasks, error: tasksError } = await tasksQuery;

      if (tasksError) {
        console.error('Error fetching tasks for analytics:', tasksError);
        return {
          totalProjects: projects.length,
          activeProjects: projects.filter(p => p.status === 'active').length,
          completedProjects: projects.filter(p => p.status === 'completed').length,
          totalTasks: 0,
          completedTasks: 0,
          budgetUtilization: 0,
          error: tasksError.message
        };
      }

      const completedTasks = tasks.filter(task => task.status === 'completed').length;
  // budget aggregation intentionally omitted (not required here)

      return {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        completedProjects: projects.filter(p => p.status === 'completed').length,
        totalTasks: tasks.length,
        completedTasks,
        budgetUtilization: tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0
      };
    } catch (error) {
      console.error('Error in getProjectAnalytics:', error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        budgetUtilization: 0,
        error: 'Failed to fetch project analytics'
      };
    }
  }

  /**
   * Get all clients
   */
  static async getAllClients(): Promise<{ clients: Client[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null);

      if (error) {
        console.error('Error fetching clients:', error);
        return { clients: [], error: error.message };
      }

      console.log('-----------------------------')
      console.log(data)

      return { clients: data as Client[] };
    } catch (error) {
      console.error('Error in getAllClients:', error);
      return { clients: [], error: 'Failed to fetch clients' };
    }
  }

  /**
   * Create a new client
   */
  static async createClient(clientData: Partial<Client>): Promise<{ client?: Client; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: clientData.name!,
          contact_person: clientData.contact_person || null,
          contact_email: clientData.contact_email || null,
          is_active: clientData.is_active ?? true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating client:', error);
        return { error: error.message };
      }

      console.log('Client created:', data);
      return { client: data as Client };
    } catch (error) {
      console.error('Error in createClient:', error);
      return { error: 'Failed to create client' };
    }
  }

  /**
   * Get project by ID
   */
  static async getProjectById(projectId: string): Promise<{ project?: Project; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients!inner(name, contact_person),
          users!inner(full_name)
        `)
        .eq('id', projectId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { error: 'Project not found' };
        }
        console.error('Error fetching project by ID:', error);
        return { error: error.message };
      }

      return { project: data as Project };
    } catch (error) {
      console.error('Error in getProjectById:', error);
      return { error: 'Failed to fetch project' };
    }
  }

  /**
   * Soft delete project
   */
  static async deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) {
        console.error('Error deleting project:', error);
        return { success: false, error: error.message };
      }

      console.log(`Soft deleted project: ${projectId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in deleteProject:', error);
      return { success: false, error: 'Failed to delete project' };
    }
  }

  /**
   * Validate project data
   */
  static validateProjectData(projectData: Partial<Project>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!projectData.name || projectData.name.trim().length < 2) {
      errors.push('Project name must be at least 2 characters');
    }

    if (!projectData.client_id) {
      errors.push('Client is required');
    }

    if (!projectData.primary_manager_id) {
      errors.push('Primary manager is required');
    }

    if (projectData.budget !== undefined && projectData.budget < 0) {
      errors.push('Budget cannot be negative');
    }

    if (projectData.start_date && projectData.end_date) {
      if (new Date(projectData.start_date) > new Date(projectData.end_date)) {
        errors.push('End date must be after start date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get user's assigned projects
   */
  static async getUserProjects(userId?: string): Promise<{ projects: Project[]; error?: string }> {
    try {
      // If no userId provided, get current user's projects via RLS
      const targetUserId = userId;
      console.log('🔍 ProjectService.getUserProjects called with userId:', targetUserId);
      
      if (!targetUserId) {
        console.warn('🔍 No userId provided, returning empty projects');
        return { projects: [] };
      }

      // Get projects in two ways:
      // 1. Projects where user is a member (via project_members table)
      // 2. Projects where user is the primary manager (via projects.primary_manager_id)
      
      const [memberProjectsResult, primaryManagerProjectsResult] = await Promise.all([
        // Projects via membership
        supabase
          .from('project_members')
          .select(`
            projects!inner(
              *,
              clients!left(name, contact_person),
              users!left(full_name)
            )
          `)
          .eq('user_id', targetUserId)
          .is('removed_at', null)
          .is('deleted_at', null)
          .is('projects.deleted_at', null),
        
        // Projects where user is primary manager
        supabase
          .from('projects')
          .select(`
            *,
            clients!left(name, contact_person),
            users!left(full_name)
          `)
          .eq('primary_manager_id', targetUserId)
          .is('deleted_at', null)
      ]);

      console.log('🔍 Member projects result:', memberProjectsResult);
      console.log('🔍 Primary manager projects result:', primaryManagerProjectsResult);

      if (memberProjectsResult.error) {
        console.error('Error fetching member projects:', memberProjectsResult.error);
        return { projects: [], error: memberProjectsResult.error.message };
      }

      if (primaryManagerProjectsResult.error) {
        console.error('Error fetching primary manager projects:', primaryManagerProjectsResult.error);
        return { projects: [], error: primaryManagerProjectsResult.error.message };
      }

      // Combine and deduplicate projects
      const memberProjects = memberProjectsResult.data?.map(item => (item as unknown as { projects: Project }).projects) || [];
      const primaryManagerProjects = primaryManagerProjectsResult.data as Project[] || [];
      
      // Merge and deduplicate by project ID
      const allProjects = [...memberProjects, ...primaryManagerProjects];
      const seen = new Set<string>();
      const deduplicatedProjects: Project[] = [];
      
      for (const project of allProjects) {
        if (project && project.id && !seen.has(project.id)) {
          seen.add(project.id);
          deduplicatedProjects.push(project);
        }
      }

      console.log('🔍 ProjectService final projects (combined & deduped):', deduplicatedProjects);
      return { projects: deduplicatedProjects };
    } catch (error) {
      console.error('Error in getUserProjects:', error);
      return { projects: [], error: 'Failed to fetch user projects' };
    }
  }

  /**
   * Get project members for a specific project
   */
  static async getProjectMembers(projectId: string): Promise<{ 
    members: Array<{
      id: string;
      user_id: string;
      project_role: string;
      is_primary_manager: boolean;
      is_secondary_manager: boolean;
      user_name: string;
      user_email: string;
    }>; 
    error?: string 
  }> {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          user_id,
          project_role,
          is_primary_manager,
          is_secondary_manager,
          users!inner(full_name, email)
        `)
        .eq('project_id', projectId)
        .is('removed_at', null)
        .is('deleted_at', null);

      if (error) {
        console.error('Error fetching project members:', error);
        return { members: [], error: error.message };
      }

      const members = data?.map(member => ({
        id: member.id,
        user_id: member.user_id,
        project_role: member.project_role,
        is_primary_manager: member.is_primary_manager,
        is_secondary_manager: member.is_secondary_manager,
        user_name: (member as unknown as { users: { full_name: string; email: string } }).users.full_name,
        user_email: (member as unknown as { users: { full_name: string; email: string } }).users.email
      })) || [];

      return { members };
    } catch (error) {
      console.error('Error in getProjectMembers:', error);
      return { members: [], error: 'Failed to fetch project members' };
    }
  }

  /**
   * Remove user from project
   */
  static async removeUserFromProject(projectId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ 
          removed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing user from project:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in removeUserFromProject:', error);
      return { success: false, error: 'Failed to remove user from project' };
    }
  }

  /**
   * Add user to project
   */
  static async addUserToProject(
    projectId: string,
    userId: string,
    projectRole: string,
    isPrimaryManager = false,
    isSecondaryManager = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userId,
          project_role: projectRole,
          is_primary_manager: isPrimaryManager,
          is_secondary_manager: isSecondaryManager
        });

      if (error) {
        console.error('Error adding user to project:', error);
        return { success: false, error: error.message };
      }

      console.log(`Added user ${userId} to project ${projectId} with role ${projectRole}`);
      return { success: true };
    } catch (error) {
      console.error('Error in addUserToProject:', error);
      return { success: false, error: 'Failed to add user to project' };
    }
  }

  /**
   * Create task
   */
  static async createTask(taskData: {
    project_id: string;
    name: string;
    description?: string;
    assigned_to_user_id?: string;
    status?: string;
    estimated_hours?: number;
    is_billable?: boolean;
    created_by_user_id?: string;
  }): Promise<{ task?: Task; error?: string }> {
    try {
      // Get current user ID from auth if not provided
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { error: 'Authentication required to create task' };
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: taskData.project_id,
          name: taskData.name,
          description: taskData.description || null,
          assigned_to_user_id: taskData.assigned_to_user_id || null,
          status: taskData.status || 'open',
          estimated_hours: taskData.estimated_hours || null,
          is_billable: taskData.is_billable ?? true,
          created_by_user_id: taskData.created_by_user_id || user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        return { error: error.message };
      }

      return { task: data as Task };
    } catch (error) {
      console.error('Error in createTask:', error);
      return { error: 'Failed to create task' };
    }
  }

  /**
   * Update task
   */
  static async updateTask(taskId: string, updates: Partial<Task>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error updating task:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateTask:', error);
      return { success: false, error: 'Failed to update task' };
    }
  }

  /**
   * Get user's assigned tasks
   */
  static async getUserTasks(userId: string): Promise<{ tasks: Task[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects!inner(name, client_id),
          assigned_user:users!tasks_assigned_to_user_id_fkey(full_name)
        `)
        .eq('assigned_to_user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user tasks:', error);
        return { tasks: [], error: error.message };
      }

      return { tasks: data as Task[] };
    } catch (error) {
      console.error('Error in getUserTasks:', error);
      return { tasks: [], error: 'Failed to fetch user tasks' };
    }
  }

  static async getLeadTasks(userId: string): Promise<{ tasks: Task[]; error?: string }> {
  try {
    // Step 1: find project_ids the lead manages
    const { data: leadProjects, error: projectError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId)
      .eq('project_role', 'lead');

    if (projectError) {
      console.error('Error fetching lead projects:', projectError);
      return { tasks: [], error: projectError.message };
    }

    const projectIds = leadProjects.map(p => p.project_id);
    if (projectIds.length === 0) {
      // No projects, so just return the lead's own tasks
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects(name, client_id),
          assigned_user:users!tasks_assigned_to_user_id_fkey(full_name)
        `)
        .eq('assigned_to_user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      return { tasks: data || [], error: error?.message };
    }

    // Step 2: fetch tasks (own tasks + employees' tasks from those projects)
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        projects(name, client_id),
        assigned_user:users!tasks_assigned_to_user_id_fkey(full_name)
      `)
      .or(`assigned_to_user_id.eq.${userId},project_id.in.(${projectIds.join(',')})`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lead tasks:', error);
      return { tasks: [], error: error.message };
    }

    return { tasks: data as Task[] };
  } catch (error: unknown) {
    console.error('Error in getLeadTasks:', error);
    return { tasks: [], error: 'Failed to fetch lead tasks' };
  }
  }

  /**
   * Add a member to a project
   */
  static async addProjectMember(projectId: string, userId: string, role: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userId,
          project_role: role,
          is_primary_manager: false,
          is_secondary_manager: role === 'manager'
        });

      if (error) {
        console.error('Error adding project member:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in addProjectMember:', error);
      return { success: false, error: 'Failed to add project member' };
    }
  }

  /**
   * Remove a member from a project
   */
  static async removeProjectMember(projectId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing project member:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in removeProjectMember:', error);
      return { success: false, error: 'Failed to remove project member' };
    }
  }


}export default ProjectService;