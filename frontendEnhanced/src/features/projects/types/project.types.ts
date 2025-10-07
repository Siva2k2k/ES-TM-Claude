/**
 * Project Feature Type Definitions
 * Type safety for projects, tasks, and team management
 */

export type ProjectStatus = 'active' | 'completed' | 'archived';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectRole = 'employee' | 'lead' | 'manager' | 'admin';

export interface Client {
  id: string;
  name: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_id: string;
  client_name?: string;
  primary_manager_id: string;
  primary_manager_name?: string;
  status: ProjectStatus;
  start_date: string;
  end_date: string;
  budget: number;
  spent_amount?: number;
  description?: string;
  is_billable: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  project_name?: string;
  name: string;
  description?: string;
  assigned_to_user_id: string;
  assigned_to_user_name?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  estimated_hours: number;
  actual_hours?: number;
  is_billable: boolean;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  project_role: ProjectRole;
  is_primary_manager: boolean;
  is_secondary_manager: boolean;
  joined_at: string;
}

export interface ProjectFormData {
  name: string;
  client_id: string;
  primary_manager_id: string;
  status: ProjectStatus;
  start_date: string;
  end_date: string;
  budget: number;
  description?: string;
  is_billable: boolean;
}

export interface TaskFormData {
  name: string;
  description?: string;
  assigned_to_user_id: string;
  status: TaskStatus;
  estimated_hours: number;
  is_billable: boolean;
  due_date?: string;
}

export interface ProjectFilters {
  status: 'all' | ProjectStatus;
  search: string;
  clientId?: string;
  managerId?: string;
}

export interface TaskFilters {
  status: 'all' | TaskStatus;
  search: string;
  projectId?: string;
  assignedToUserId?: string;
}

export interface ProjectAnalytics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  budgetUtilization: number;
  totalBudget: number;
  totalSpent: number;
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  totalHours: number;
  budgetUsed: number;
  teamSize: number;
}
