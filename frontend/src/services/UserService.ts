import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../types';

/**
 * User Management Service - Supabase Integration
 * Handles all user-related operations with real database operations
 */
export class UserService {
  /**
   * Create a new user (Super Admin only) - Direct creation with immediate activation
   */
  static async createUser(userData: Partial<User>): Promise<{ user?: User; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: userData.email!,
          full_name: userData.full_name!,
          role: userData.role || 'employee',
          hourly_rate: userData.hourly_rate || 50,
          is_active: true,
          is_approved_by_super_admin: true, // Super Admin creates directly
          manager_id: userData.manager_id || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return { error: error.message };
      }

      console.log('Super Admin created user directly:', data);
      return { user: data as User };
    } catch (error) {
      console.error('Error in createUser:', error);
      return { error: 'Failed to create user' };
    }
  }

  /**
   * Create a new user (for Management role)
   * Returns user data to be submitted for Super Admin approval
   */
  static async createUserForApproval(userData: Partial<User>): Promise<{ user?: User; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: userData.email!,
          full_name: userData.full_name!,
          role: userData.role || 'employee',
          hourly_rate: userData.hourly_rate || 50,
          is_active: true,
          is_approved_by_super_admin: false, // Needs Super Admin approval
          manager_id: userData.manager_id || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user for approval:', error);
        return { error: error.message };
      }

      console.log('User created for approval:', data);
      return { user: data as User };
    } catch (error) {
      console.error('Error in createUserForApproval:', error);
      return { error: 'Failed to create user for approval' };
    }
  }

  /**
   * Approve user (Super Admin only)
   */
  static async approveUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_approved_by_super_admin: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error approving user:', error);
        return { success: false, error: error.message };
      }

      console.log(`Super Admin approved user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in approveUser:', error);
      return { success: false, error: 'Failed to approve user' };
    }
  }

  /**
   * Set user active/inactive status (Super Admin only)
   */
  static async setUserStatus(userId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error setting user status:', error);
        return { success: false, error: error.message };
      }

      console.log(`Setting user ${userId} status to: ${isActive ? 'active' : 'inactive'}`);
      return { success: true };
    } catch (error) {
      console.error('Error in setUserStatus:', error);
      return { success: false, error: 'Failed to update user status' };
    }
  }

  /**
   * Update user billing rate (Super Admin only)
   */
  static async setUserBilling(userId: string, hourlyRate: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          hourly_rate: hourlyRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error setting user billing:', error);
        return { success: false, error: error.message };
      }

      console.log(`Setting billing for user ${userId}: $${hourlyRate}/hr`);
      return { success: true };
    } catch (error) {
      console.error('Error in setUserBilling:', error);
      return { success: false, error: 'Failed to update user billing' };
    }
  }

  /**
   * Get all users (Super Admin and Management)
   */
  static async getAllUsers(): Promise<{ users: User[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return { users: [], error: error.message };
      }

      return { users: data as User[] };
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return { users: [], error: 'Failed to fetch users' };
    }
  }

  /**
   * Get users based on role permissions
   */
  static async getUsers(userRole: UserRole): Promise<{ users: User[]; error?: string }> {
    try {
      let query = supabase
        .from('users')
        .select('*')
        .is('deleted_at', null);

      // Apply role-based filtering
      switch (userRole) {
        case 'super_admin':
        case 'management':
          // Can see all users - no additional filter
          break;
        case 'manager':
          // Can see team members and subordinates
          query = query.in('role', ['lead', 'employee']);
          break;
        case 'lead':
          // Can see team members
          query = query.eq('role', 'employee');
          break;
        case 'employee':
          // Can only see themselves - handled by RLS
          break;
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users by role:', error);
        return { users: [], error: error.message };
      }

      return { users: data as User[] };
    } catch (error) {
      console.error('Error in getUsers:', error);
      return { users: [], error: 'Failed to fetch users' };
    }
  }

  /**
   * Get pending approvals (Super Admin only)
   */
  static async getPendingApprovals(): Promise<{ users: User[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_approved_by_super_admin', false)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending approvals:', error);
        return { users: [], error: error.message };
      }

      return { users: data as User[] };
    } catch (error) {
      console.error('Error in getPendingApprovals:', error);
      return { users: [], error: 'Failed to fetch pending approvals' };
    }
  }

  /**
   * Update user details
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error updating user:', error);
        return { success: false, error: error.message };
      }

      console.log(`Updated user ${userId}:`, updates);
      return { success: true };
    } catch (error) {
      console.error('Error in updateUser:', error);
      return { success: false, error: 'Failed to update user' };
    }
  }

  /**
   * Soft delete user
   */
  static async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        return { success: false, error: error.message };
      }

      console.log(`Soft deleted user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in deleteUser:', error);
      return { success: false, error: 'Failed to delete user' };
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<{ user?: User; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { error: 'User not found' };
        }
        console.error('Error fetching user by ID:', error);
        return { error: error.message };
      }

      return { user: data as User };
    } catch (error) {
      console.error('Error in getUserById:', error);
      return { error: 'Failed to fetch user' };
    }
  }

  /**
   * Validate user data
   */
  static validateUserData(userData: Partial<User>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!userData.email || !userData.email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (!userData.full_name || userData.full_name.trim().length < 2) {
      errors.push('Full name must be at least 2 characters');
    }

    if (!userData.role || !['super_admin', 'management', 'manager', 'lead', 'employee'].includes(userData.role)) {
      errors.push('Valid role is required');
    }

    if (userData.hourly_rate !== undefined && userData.hourly_rate <= 0) {
      errors.push('Hourly rate must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get current user's team members (for managers)
   */
  static async getTeamMembers(managerId: string): Promise<{ users: User[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('manager_id', managerId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching team members:', error);
        return { users: [], error: error.message };
      }

      return { users: data as User[] };
    } catch (error) {
      console.error('Error in getTeamMembers:', error);
      return { users: [], error: 'Failed to fetch team members' };
    }
  }

  /**
   * Get users by role (for team review filtering)
   */
  static async getUsersByRole(roles: UserRole[]): Promise<{ users: User[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('role', roles)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching users by role:', error);
        return { users: [], error: error.message };
      }

      return { users: data as User[] };
    } catch (error) {
      console.error('Error in getUsersByRole:', error);
      return { users: [], error: 'Failed to fetch users by role' };
    }
  }

  /**
   * Get team members with project-specific roles for multi-role users
   * (e.g., Lead who is also Manager in some projects)
   */
  static async getTeamMembersWithProjectRoles(userId: string): Promise<{ 
    users: User[]; 
    userProjectRoles: Map<string, string[]>; // userId -> [project_roles they have across projects]
    userManagerProjects: Map<string, string[]>; // userId -> [project_ids where current user is manager]
    error?: string 
  }> {
    try {
      console.log('🔍 UserService.getTeamMembersWithProjectRoles called with userId:', userId);
      
      // Step 1: Get all project roles for current user
      const { data: currentUserRoles, error: rolesError } = await supabase
        .from('project_members')
        .select('project_id, project_role')
        .eq('user_id', userId)
        .is('removed_at', null)
        .is('deleted_at', null);

      console.log('🔍 Current user project roles:', { currentUserRoles, rolesError });

      if (rolesError) {
        console.error('Error fetching user project roles:', rolesError);
        return { users: [], userProjectRoles: new Map(), userManagerProjects: new Map(), error: rolesError.message };
      }

      if (!currentUserRoles || currentUserRoles.length === 0) {
        console.log('❌ No project roles found for user');
        return { users: [], userProjectRoles: new Map(), userManagerProjects: new Map() };
      }

      // Separate projects by role
      const leadProjects = currentUserRoles.filter(ur => ur.project_role === 'lead').map(ur => ur.project_id);
      const managerProjects = currentUserRoles.filter(ur => ur.project_role === 'manager').map(ur => ur.project_id);
      const allProjects = [...new Set([...leadProjects, ...managerProjects])];

      console.log('🔍 User roles breakdown:', {
        leadProjects,
        managerProjects,
        allProjects
      });

      // Step 2: Get all project members in projects where user has any role
      const { data: allProjectMembers, error: membersError } = await supabase
        .from('project_members')
        .select('user_id, project_id, project_role')
        .in('project_id', allProjects)
        .in('project_role', ['employee', 'lead', 'manager'])
        .neq('user_id', userId)
        .is('removed_at', null)
        .is('deleted_at', null);

      console.log('🔍 All project members query result:', { allProjectMembers, membersError });

      if (membersError) {
        console.error('Error fetching all project members:', membersError);
        return { users: [], userProjectRoles: new Map(), userManagerProjects: new Map(), error: membersError.message };
      }

      if (!allProjectMembers || allProjectMembers.length === 0) {
        console.log('❌ No team members found in accessible projects');
        return { users: [], userProjectRoles: new Map(), userManagerProjects: new Map() };
      }

      // Step 3: Build maps for project relationships
      const userProjectRoles = new Map<string, string[]>();
      const userManagerProjects = new Map<string, string[]>();
      const uniqueUserIds = [...new Set(allProjectMembers.map(pm => pm.user_id))];

      // For each team member, determine:
      // 1. What roles they have across projects
      // 2. In which projects the current user is their manager
      allProjectMembers.forEach(member => {
        console.log(`🔍 Processing member: ${member.user_id} in project ${member.project_id} as ${member.project_role}`);
        
        // Track user roles
        if (!userProjectRoles.has(member.user_id)) {
          userProjectRoles.set(member.user_id, []);
        }
        const roles = userProjectRoles.get(member.user_id)!;
        if (!roles.includes(member.project_role)) {
          roles.push(member.project_role);
        }

        // Track where current user is manager of this member
        console.log(`🔍 Checking if current user manages project ${member.project_id}. Manager projects:`, managerProjects);
        if (managerProjects.includes(member.project_id)) {
          console.log(`✅ Current user IS manager of project ${member.project_id} for user ${member.user_id}`);
          if (!userManagerProjects.has(member.user_id)) {
            userManagerProjects.set(member.user_id, []);
          }
          userManagerProjects.get(member.user_id)!.push(member.project_id);
        } else {
          console.log(`❌ Current user is NOT manager of project ${member.project_id} for user ${member.user_id}`);
        }
      });

      console.log('🔍 Built relationship maps:', {
        userProjectRoles: Object.fromEntries(userProjectRoles),
        userManagerProjects: Object.fromEntries(userManagerProjects)
      });

      // Step 4: Get full user details
      const { data: teamMembers, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', uniqueUserIds)
        .eq('is_active', true)
        .is('deleted_at', null);

      console.log('🔍 Team members query result:', { teamMembers, usersError });

      if (usersError) {
        console.error('Error fetching team member details:', usersError);
        return { users: [], userProjectRoles: new Map(), userManagerProjects: new Map(), error: usersError.message };
      }

      const finalUsers = teamMembers as User[] || [];
      console.log('✅ Final team members with project roles:', finalUsers.length, 'users found');
      console.log('👥 Team member breakdown:', finalUsers.map(u => ({
        name: u.full_name,
        roles: userProjectRoles.get(u.id),
        managerProjects: userManagerProjects.get(u.id)
      })));

      return { 
        users: finalUsers, 
        userProjectRoles, 
        userManagerProjects 
      };
    } catch (error) {
      console.error('Error in getTeamMembersWithProjectRoles:', error);
      return { 
        users: [], 
        userProjectRoles: new Map(), 
        userManagerProjects: new Map(), 
        error: 'Failed to fetch team members with project roles' 
      };
    }
  }

  /**
   * Get team members for manager (employees and leads in same projects)
   */
  static async getManagerTeamMembers(managerId: string): Promise<{ users: User[]; error?: string }> {
    try {
      console.log('🔍 UserService.getManagerTeamMembers called with managerId:', managerId);
      
      // Step 1: Get projects where this manager is assigned
      console.log('📋 Step 1: Getting projects for manager...');
      const { data: managerProjects, error: projectError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', managerId)
        .eq('project_role', 'manager')
        .is('removed_at', null)
        .is('deleted_at', null);

      console.log('🔍 Manager projects query result:', { managerProjects, projectError });

      if (projectError) {
        console.error('Error fetching manager projects:', projectError);
        return { users: [], error: projectError.message };
      }

      if (!managerProjects || managerProjects.length === 0) {
        console.log('❌ No projects found for manager');
        return { users: [] };
      }

      const projectIds = managerProjects.map(pm => pm.project_id);
      console.log('🔍 Project IDs where manager is assigned:', projectIds);

      // Step 2: Get all project members (employees and leads) in those projects
      console.log('📋 Step 2: Getting employees and leads in managed projects...');
      const { data: projectMembers, error: teamError } = await supabase
        .from('project_members')
        .select('user_id, project_role')
        .in('project_id', projectIds)
        .in('project_role', ['employee', 'lead'])
        .neq('user_id', managerId)
        .is('removed_at', null)
        .is('deleted_at', null);

      console.log('🔍 Project members query result:', { projectMembers, teamError });

      if (teamError) {
        console.error('Error fetching project members:', teamError);
        return { users: [], error: teamError.message };
      }

      if (!projectMembers || projectMembers.length === 0) {
        console.log('❌ No employees or leads found in managed projects');
        return { users: [] };
      }

      // Step 3: Get unique user IDs
      const teamMemberIds = [...new Set(projectMembers.map(pm => pm.user_id))];
      console.log('🔍 Unique team member IDs found:', teamMemberIds);

      // Step 4: Get full user details for these team members
      console.log('📋 Step 3: Getting full user details...');
      const { data: teamMembers, error: memberError } = await supabase
        .from('users')
        .select('*')
        .in('id', teamMemberIds)
        .eq('is_active', true)
        .is('deleted_at', null);

      console.log('🔍 Team members query result:', { teamMembers, memberError });

      if (memberError) {
        console.error('Error fetching team member details:', memberError);
        return { users: [], error: memberError.message };
      }

      const finalUsers = teamMembers as User[] || [];
      console.log('✅ Final team members for manager:', finalUsers.length, 'users found');
      console.log('👥 Team member names:', finalUsers.map(u => u.full_name));

      return { users: finalUsers };
    } catch (error) {
      console.error('Error in getManagerTeamMembers:', error);
      return { users: [], error: 'Failed to fetch team members for manager' };
    }
  }

  /**
   * Get team members for lead (employees in same projects)
   */
  static async getLeadTeamMembers(leadId: string): Promise<{ users: User[]; error?: string }> {
    try {
      console.log('🔍 UserService.getLeadTeamMembers called with leadId:', leadId);
      
      // Step 1: Get projects where this lead is assigned
      console.log('📋 Step 1: Getting projects for lead...');
      const { data: leadProjects, error: projectError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', leadId)
        .eq('project_role', 'lead')
        .is('removed_at', null)
        .is('deleted_at', null);

      console.log('🔍 Lead projects query result:', { leadProjects, projectError });

      if (projectError) {
        console.error('Error fetching lead projects:', projectError);
        return { users: [], error: projectError.message };
      }

      if (!leadProjects || leadProjects.length === 0) {
        console.log('❌ No projects found for lead');
        return { users: [] };
      }

      const projectIds = leadProjects.map(pm => pm.project_id);
      console.log('🔍 Project IDs where lead is assigned:', projectIds);

      // Step 2: Get all project members (employees) in those projects
      console.log('📋 Step 2: Getting employees in shared projects...');
      const { data: projectMembers, error: teamError } = await supabase
        .from('project_members')
        .select('user_id, project_role')
        .in('project_id', projectIds)
        .eq('project_role', 'employee')
        .neq('user_id', leadId)
        .is('removed_at', null)
        .is('deleted_at', null);

      console.log('🔍 Project members query result:', { projectMembers, teamError });

      if (teamError) {
        console.error('Error fetching project members:', teamError);
        return { users: [], error: teamError.message };
      }

      if (!projectMembers || projectMembers.length === 0) {
        console.log('❌ No employees found in shared projects');
        return { users: [] };
      }

      // Step 3: Get unique employee user IDs
      const employeeIds = [...new Set(projectMembers.map(pm => pm.user_id))];
      console.log('🔍 Unique employee IDs found:', employeeIds);

      // Step 4: Get full user details for these employees
      console.log('📋 Step 3: Getting full user details...');
      const { data: employees, error: employeeError } = await supabase
        .from('users')
        .select('*')
        .in('id', employeeIds)
        .eq('is_active', true)
        .is('deleted_at', null);

      console.log('🔍 Employees query result:', { employees, employeeError });

      if (employeeError) {
        console.error('Error fetching employee details:', employeeError);
        return { users: [], error: employeeError.message };
      }

      const finalUsers = employees as User[] || [];
      console.log('✅ Final team members for lead:', finalUsers.length, 'users found');
      console.log('👥 Team member names:', finalUsers.map(u => u.full_name));

      return { users: finalUsers };
    } catch (error) {
      console.error('Error in getLeadTeamMembers:', error);
      return { users: [], error: 'Failed to fetch team members for lead' };
    }
  }
}

export default UserService;