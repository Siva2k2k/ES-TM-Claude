import { backendApi, BackendApiError } from '../lib/backendApi';
import type { User, UserRole } from '../types';

/**
 * User Management Service - MongoDB Backend Integration
 * Handles all user-related operations with backend API
 */
export class UserService {
  /**
   * Create a new user (Super Admin only) - Direct creation with immediate activation
   */
  static async createUser(userData: Partial<User>): Promise<{ user?: User; error?: string }> {
    try {
      const requestBody: any = {
        email: userData.email!,
        full_name: userData.full_name!,
        role: userData.role || 'employee',
        hourly_rate: userData.hourly_rate || 50
      };
      
      // Only include manager_id if it's provided and not null
      if (userData.manager_id) {
        requestBody.manager_id = userData.manager_id;
      }

      const response = await backendApi.post<{ success: boolean; user?: User; error?: string }>('/users', requestBody);

      if (response.success) {
        console.log('Super Admin created user directly:', response.user);
        return { user: response.user };
      } else {
        console.error('Error creating user:', response.error);
        return { error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in createUser:', error);
      
      // Handle BackendApiError specifically
      if (error instanceof Error) {
        const errorMessage = error.message || 'Failed to create user';
        const apiError = error as BackendApiError;
        console.error('Detailed error:', { 
          name: error.name, 
          message: error.message, 
          status: apiError.status,
          code: apiError.code 
        });
        return { error: errorMessage };
      }
      
      return { error: 'Failed to create user' };
    }
  }

  /**
   * Create a new user (for Management role) - Returns user data to be submitted for Super Admin approval
   */
  static async createUserForApproval(userData: Partial<User>): Promise<{ user?: User; error?: string }> {
    try {
      const requestBody: any = {
        email: userData.email!,
        full_name: userData.full_name!,
        role: userData.role || 'employee',
        hourly_rate: userData.hourly_rate || 50
      };
      
      // Only include manager_id if it's provided and not null
      if (userData.manager_id) {
        requestBody.manager_id = userData.manager_id;
      }

      const response = await backendApi.post<{ success: boolean; user?: User; error?: string }>('/users/for-approval', requestBody);

      if (response.success) {
        console.log('User created for approval:', response.user);
        return { user: response.user };
      } else {
        console.error('Error creating user for approval:', response.error);
        return { error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in createUserForApproval:', error);
      
      // Handle BackendApiError specifically
      if (error instanceof Error) {
        const errorMessage = error.message || 'Failed to create user for approval';
        const apiError = error as BackendApiError;
        console.error('Detailed error:', { 
          name: error.name, 
          message: error.message, 
          status: apiError.status,
          code: apiError.code 
        });
        return { error: errorMessage };
      }
      
      return { error: 'Failed to create user for approval' };
    }
  }

  /**
   * Approve user (Super Admin only)
   */
  static async approveUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.post<{ success: boolean; error?: string }>(`/users/${userId}/approve`, {});

      if (response.success) {
        console.log(`Super Admin approved user: ${userId}`);
        return { success: true };
      } else {
        console.error('Error approving user:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in approveUser:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to approve user';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Set user active/inactive status (Super Admin only)
   */
  static async setUserStatus(userId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.put<{ success: boolean; error?: string }>(`/users/${userId}/status`, { isActive });

      if (response.success) {
        console.log(`Setting user ${userId} status to: ${isActive ? 'active' : 'inactive'}`);
        return { success: true };
      } else {
        console.error('Error setting user status:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in setUserStatus:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to update user status';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update user billing rate (Super Admin only)
   */
  static async setUserBilling(userId: string, hourlyRate: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.put<{ success: boolean; error?: string }>(`/users/${userId}/billing`, { hourlyRate });

      if (response.success) {
        console.log(`Setting billing for user ${userId}: $${hourlyRate}/hr`);
        return { success: true };
      } else {
        console.error('Error setting user billing:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in setUserBilling:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to update user billing';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get all users (Super Admin and Management)
   */
  static async getAllUsers(): Promise<{ users: User[]; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; users?: User[]; error?: string }>('/users');

      if (response.success) {
        return { users: response.users || [] };
      } else {
        console.error('Error fetching users:', response.error);
        return { users: [], error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in getAllUsers:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to fetch users';
      return { users: [], error: errorMessage };
    }
  }

  /**
   * Get users based on role permissions
   */
  static async getUsers(userRole: UserRole): Promise<{ users: User[]; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; users?: User[]; error?: string }>(`/users/by-role?role=${userRole}`);

      if (response.success) {
        return { users: response.users || [] };
      } else {
        console.error('Error fetching users by role:', response.error);
        return { users: [], error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in getUsers:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to fetch users';
      return { users: [], error: errorMessage };
    }
  }

  /**
   * Get pending approvals (Super Admin only)
   */
  static async getPendingApprovals(): Promise<{ users: User[]; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; users?: User[]; error?: string }>('/users/pending-approvals');

      if (response.success) {
        return { users: response.users || [] };
      } else {
        console.error('Error fetching pending approvals:', response.error);
        return { users: [], error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in getPendingApprovals:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to fetch pending approvals';
      return { users: [], error: errorMessage };
    }
  }

  /**
   * Update user details
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.put<{ success: boolean; error?: string }>(`/users/${userId}`, updates);

      if (response.success) {
        console.log(`Updated user ${userId}`);
        return { success: true };
      } else {
        console.error('Error updating user:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in updateUser:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to update user';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Soft delete user
   */
  static async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.delete<{ success: boolean; error?: string }>(`/users/${userId}`);

      if (response.success) {
        console.log(`Soft deleted user: ${userId}`);
        return { success: true };
      } else {
        console.error('Error deleting user:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in deleteUser:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to delete user';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<{ user?: User; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; user?: User; error?: string }>(`/users/${userId}`);

      if (response.success) {
        return { user: response.user };
      } else {
        console.error('Error fetching user:', response.error);
        return { error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in getUserById:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to fetch user';
      return { error: errorMessage };
    }
  }

  /**
   * Get team members for manager
   */
  static async getTeamMembers(managerId: string): Promise<{ users: User[]; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; users?: User[]; error?: string }>(`/users?manager_id=${managerId}`);

      if (response.success) {
        return { users: response.users || [] };
      } else {
        console.error('Error fetching team members:', response.error);
        return { users: [], error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in getTeamMembers:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to fetch team members';
      return { users: [], error: errorMessage };
    }
  }

  /**
   * Get users by role (for team review filtering)
   */
  static async getUsersByRole(roles: UserRole[]): Promise<{ users: User[]; error?: string }> {
    try {
      const rolesParam = roles.join(',');
      const response = await backendApi.get<{ success: boolean; users?: User[]; error?: string }>(`/users/roles?roles=${rolesParam}`);

      if (response.success) {
        return { users: response.users || [] };
      } else {
        console.error('Error fetching users by roles:', response.error);
        return { users: [], error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in getUsersByRole:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to fetch users by role';
      return { users: [], error: errorMessage };
    }
  }

  /**
   * Set user login credentials (Super Admin only)
   */
  static async setUserCredentials(userId: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.put<{ success: boolean; error?: string }>(`/users/${userId}/credentials`, { password });

      if (response.success) {
        console.log(`Set credentials for user ${userId}`);
        return { success: true };
      } else {
        console.error('Error setting user credentials:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in setUserCredentials:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to set user credentials';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get team members with project-specific roles for multi-role users
   * This is used for timesheet approval flow to understand project hierarchies
   */
  static async getTeamMembersWithProjectRoles(userId: string): Promise<{ 
    users: User[]; 
    userProjectRoles: Map<string, string[]>; 
    userManagerProjects: Map<string, string[]>; 
    error?: string 
  }> {
    try {
      console.log('🔍 UserService.getTeamMembersWithProjectRoles called with userId:', userId);
      
      // For now, implement a simplified version using existing endpoints
      // Step 1: Get user's projects to understand their management scope
      const userProjectsResponse = await backendApi.get<{ success: boolean; projects?: { id: string; primary_manager_id: string; [key: string]: unknown }[]; error?: string }>(`/projects/user/${userId}`);
      
      if (!userProjectsResponse.success) {
        console.error('Error fetching user projects:', userProjectsResponse.error);
        return { users: [], userProjectRoles: new Map(), userManagerProjects: new Map(), error: userProjectsResponse.error };
      }

      const userProjects = userProjectsResponse.projects || [];
      console.log('🔍 User projects:', userProjects);
      
      // Step 2: Get team members based on manager hierarchy
      const teamMembersResponse = await this.getTeamMembers(userId);
      
      if (teamMembersResponse.error) {
        console.error('Error fetching team members:', teamMembersResponse.error);
        return { users: [], userProjectRoles: new Map(), userManagerProjects: new Map(), error: teamMembersResponse.error };
      }

      const teamMembers = teamMembersResponse.users;
      console.log('🔍 Team members found:', teamMembers.length);

      // Step 3: Build simplified role maps
      // For now, assume all team members are employees and user manages them across all projects they manage
      const userProjectRoles = new Map<string, string[]>();
      const userManagerProjects = new Map<string, string[]>();

      // Get projects where current user is primary manager
      const managedProjects = userProjects.filter(project => project.primary_manager_id === userId);
      const managedProjectIds = managedProjects.map(project => project.id);

      console.log('🔍 Managed projects:', managedProjectIds);

      // For each team member, assign basic role information
      teamMembers.forEach(member => {
        // Assume team members are employees (simplified for now)
        userProjectRoles.set(member.id, ['employee']);
        
        // Assign all managed projects to this team member relationship
        if (managedProjectIds.length > 0) {
          userManagerProjects.set(member.id, managedProjectIds);
        }
      });

      console.log('✅ Team members with project roles created:', {
        userCount: teamMembers.length,
        userProjectRoles: Object.fromEntries(userProjectRoles),
        userManagerProjects: Object.fromEntries(userManagerProjects)
      });

      return { 
        users: teamMembers, 
        userProjectRoles, 
        userManagerProjects 
      };
    } catch (error) {
      console.error('Error in getTeamMembersWithProjectRoles:', error);
      const errorMessage = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error 
        || (error as { message?: string })?.message 
        || 'Failed to fetch team members with project roles';
      return {
        users: [],
        userProjectRoles: new Map(),
        userManagerProjects: new Map(),
        error: errorMessage
      };
    }
  }

  /**
   * Soft delete user (recoverable)
   */
  static async softDeleteUser(userId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.post<{ success: boolean; error?: string }>(
        `/users/${userId}/soft-delete`,
        { reason }
      );

      if (response.success) {
        console.log('User soft deleted:', userId);
        return { success: true };
      } else {
        console.error('Error soft deleting user:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in softDeleteUser:', error);
      if (error instanceof Error) {
        return { success: false, error: error.message || 'Failed to delete user' };
      }
      return { success: false, error: 'Failed to delete user' };
    }
  }

  /**
   * Hard delete user (permanent)
   */
  static async hardDeleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.post<{ success: boolean; error?: string }>(
        `/users/${userId}/hard-delete`
      );

      if (response.success) {
        console.log('User permanently deleted:', userId);
        return { success: true };
      } else {
        console.error('Error permanently deleting user:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in hardDeleteUser:', error);
      if (error instanceof Error) {
        return { success: false, error: error.message || 'Failed to permanently delete user' };
      }
      return { success: false, error: 'Failed to permanently delete user' };
    }
  }

  /**
   * Restore soft deleted user
   */
  static async restoreUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await backendApi.post<{ success: boolean; error?: string }>(
        `/users/${userId}/restore`
      );

      if (response.success) {
        console.log('User restored:', userId);
        return { success: true };
      } else {
        console.error('Error restoring user:', response.error);
        return { success: false, error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in restoreUser:', error);
      if (error instanceof Error) {
        return { success: false, error: error.message || 'Failed to restore user' };
      }
      return { success: false, error: 'Failed to restore user' };
    }
  }

  /**
   * Get all deleted users
   */
  static async getDeletedUsers(): Promise<{ users: User[]; error?: string }> {
    try {
      const response = await backendApi.get<{ success: boolean; users: User[]; error?: string }>(
        '/users/deleted'
      );

      if (response.success) {
        return { users: response.users };
      } else {
        console.error('Error fetching deleted users:', response.error);
        return { users: [], error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in getDeletedUsers:', error);
      if (error instanceof Error) {
        return { users: [], error: error.message || 'Failed to fetch deleted users' };
      }
      return { users: [], error: 'Failed to fetch deleted users' };
    }
  }

  /**
   * Check if user can be deleted (check dependencies)
   */
  static async checkUserDependencies(userId: string): Promise<{
    canDelete: boolean;
    dependencies: string[];
    error?: string
  }> {
    try {
      const response = await backendApi.get<{
        success: boolean;
        canDelete: boolean;
        dependencies: string[];
        error?: string
      }>(`/users/${userId}/dependencies`);

      if (response.success) {
        return {
          canDelete: response.canDelete,
          dependencies: response.dependencies
        };
      } else {
        console.error('Error checking user dependencies:', response.error);
        return { canDelete: false, dependencies: [], error: response.error };
      }
    } catch (error: unknown) {
      console.error('Error in checkUserDependencies:', error);
      if (error instanceof Error) {
        return { canDelete: false, dependencies: [], error: error.message };
      }
      return { canDelete: false, dependencies: [], error: 'Failed to check dependencies' };
    }
  }
}