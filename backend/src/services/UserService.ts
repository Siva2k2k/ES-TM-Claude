import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User, { IUser, UserRole } from '@/models/User';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError
} from '@/utils/errors';
import {
  AuthUser,
  requireManagementRole,
  requireManagerRole,
  canManageRoleHierarchy
} from '@/utils/auth';

export interface UserWithProjectRoles extends IUser {
  userProjectRoles?: Map<string, string[]>;
  userManagerProjects?: Map<string, string[]>;
}

/**
 * Backend User Management Service - MongoDB Implementation
 * Handles all user-related operations with proper authorization
 */
export class UserService {
  /**
   * Create a new user (Super Admin only) - Direct creation with immediate activation
   */
  static async createUser(userData: Partial<IUser>, currentUser: AuthUser): Promise<{ user?: IUser; error?: string }> {
    try {
      // Only super admins can create users directly
      if (currentUser.role !== 'super_admin') {
        throw new AuthorizationError('Only super admins can create users directly');
      }

      // Check if user already exists
      const existingUser = await (User.findOne as any)({
        email: userData.email?.toLowerCase(),
        deleted_at: { $exists: false }
      });

      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Validate user data
      const validation = this.validateUserData(userData);
      if (!validation.isValid) {
        throw new ValidationError(validation.errors.join(', '));
      }

      const userDoc: any = {
        email: userData.email!.toLowerCase(),
        full_name: userData.full_name!,
        role: userData.role || 'employee',
        hourly_rate: userData.hourly_rate || 50,
        is_active: true,
        is_approved_by_super_admin: true, // Super Admin creates directly
      };

      // Only set manager_id if it's provided
      if (userData.manager_id) {
        userDoc.manager_id = userData.manager_id;
      }

      const user = new User(userDoc);

      await user.save();

      console.log('Super Admin created user directly:', user.id);
      return { user };
    } catch (error) {
      console.error('Error in createUser:', error);
      if (error instanceof ValidationError || error instanceof ConflictError || error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to create user' };
    }
  }

  /**
   * Create a new user (for Management role) - Returns user data to be submitted for Super Admin approval
   */
  static async createUserForApproval(userData: Partial<IUser>, currentUser: AuthUser): Promise<{ user?: IUser; error?: string }> {
    try {
      // Only management and super admin can create users for approval
      requireManagementRole(currentUser);

      // Check if user already exists
      const existingUser = await (User.findOne as any)({
        email: userData.email?.toLowerCase(),
        deleted_at: { $exists: false }
      });

      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Validate user data
      const validation = this.validateUserData(userData);
      if (!validation.isValid) {
        throw new ValidationError(validation.errors.join(', '));
      }

      const userDoc: any = {
        email: userData.email!.toLowerCase(),
        full_name: userData.full_name!,
        role: userData.role || 'employee',
        hourly_rate: userData.hourly_rate || 50,
        is_active: true,
        is_approved_by_super_admin: false, // Needs Super Admin approval
      };

      // Only set manager_id if it's provided
      if (userData.manager_id) {
        userDoc.manager_id = userData.manager_id;
      }

      const user = new User(userDoc);

      await user.save();

      console.log('User created for approval:', user.id);
      return { user };
    } catch (error) {
      console.error('Error in createUserForApproval:', error);
      if (error instanceof ValidationError || error instanceof ConflictError || error instanceof AuthorizationError) {
        return { error: error.message };
      }
      return { error: 'Failed to create user for approval' };
    }
  }

  /**
   * Approve user (Super Admin only)
   */
  static async approveUser(userId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      if (currentUser.role !== 'super_admin') {
        throw new AuthorizationError('Only super admins can approve users');
      }

      const result = await (User.updateOne as any)({
        _id: userId,
        deleted_at: { $exists: false }
      }, {
        is_approved_by_super_admin: true,
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('User not found');
      }

      console.log(`Super Admin approved user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in approveUser:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to approve user' };
    }
  }

  /**
   * Set user active/inactive status (Super Admin only)
   */
  static async setUserStatus(userId: string, isActive: boolean, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      if (currentUser.role !== 'super_admin') {
        throw new AuthorizationError('Only super admins can change user status');
      }

      const result = await (User.updateOne as any)({
        _id: userId,
        deleted_at: { $exists: false }
      }, {
        is_active: isActive,
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('User not found');
      }

      console.log(`Setting user ${userId} status to: ${isActive ? 'active' : 'inactive'}`);
      return { success: true };
    } catch (error) {
      console.error('Error in setUserStatus:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to update user status' };
    }
  }

  /**
   * Update user billing rate (Super Admin only)
   */
  static async setUserBilling(userId: string, hourlyRate: number, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      if (currentUser.role !== 'super_admin') {
        throw new AuthorizationError('Only super admins can change user billing rates');
      }

      if (hourlyRate <= 0) {
        throw new ValidationError('Hourly rate must be greater than 0');
      }

      const result = await (User.updateOne as any)({
        _id: userId,
        deleted_at: { $exists: false }
      }, {
        hourly_rate: hourlyRate,
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('User not found');
      }

      console.log(`Setting billing for user ${userId}: $${hourlyRate}/hr`);
      return { success: true };
    } catch (error) {
      console.error('Error in setUserBilling:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof ValidationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to update user billing' };
    }
  }

  /**
   * Get all users (Manager and above)
   */
  static async getAllUsers(currentUser: AuthUser): Promise<{ users: IUser[]; error?: string }> {
    try {
      requireManagerRole(currentUser);

      const users = await (User.find as any)({
        deleted_at: { $exists: false }
      }).sort({ created_at: -1 }).select('-password_hash');

      return { users };
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      if (error instanceof AuthorizationError) {
        return { users: [], error: error.message };
      }
      return { users: [], error: 'Failed to fetch users' };
    }
  }

  /**
   * Get users based on role permissions
   */
  static async getUsers(userRole: UserRole, currentUser: AuthUser): Promise<{ users: IUser[]; error?: string }> {
    try {
      let filter: any = { deleted_at: { $exists: false } };

      // Apply role-based filtering
      switch (currentUser.role) {
        case 'super_admin':
        case 'management':
          // Can see all users - no additional filter
          break;
        case 'manager':
          // Can see team members and subordinates
          filter.role = { $in: ['lead', 'employee'] };
          break;
        case 'lead':
          // Can see team members
          filter.role = 'employee';
          break;
        case 'employee':
          // Can only see themselves
          filter._id = currentUser.id;
          break;
      }

      const users = await (User.find as any)(filter)
        .sort({ created_at: -1 })
        .select('-password_hash');

      return { users };
    } catch (error) {
      console.error('Error in getUsers:', error);
      return { users: [], error: 'Failed to fetch users' };
    }
  }

  /**
   * Get pending approvals (Super Admin, Management, and Manager)
   */
  static async getPendingApprovals(currentUser: AuthUser): Promise<{ users: IUser[]; error?: string }> {
    try {
      // Manager, management, and super_admin can view pending approvals
      if (!['manager', 'management', 'super_admin'].includes(currentUser.role)) {
        throw new AuthorizationError('Access denied. Required roles: manager, management, super_admin');
      }

      const users = await (User.find as any)({
        is_approved_by_super_admin: false,
        is_active: true,
        deleted_at: { $exists: false }
      }).sort({ created_at: -1 }).select('-password_hash');

      return { users };
    } catch (error) {
      console.error('Error in getPendingApprovals:', error);
      if (error instanceof AuthorizationError) {
        return { users: [], error: error.message };
      }
      return { users: [], error: 'Failed to fetch pending approvals' };
    }
  }

  /**
   * Update user details
   */
  static async updateUser(userId: string, updates: Partial<IUser>, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      // Users can update themselves, or higher roles can update subordinates
      if (currentUser.id !== userId && !canManageRoleHierarchy(currentUser.role, 'employee')) {
        throw new AuthorizationError('You can only update your own profile');
      }

      // Remove sensitive fields that shouldn't be updated via this method
      const { password_hash, created_at, ...safeUpdates } = updates;

      const result = await (User.updateOne as any)({
        _id: userId,
        deleted_at: { $exists: false }
      }, {
        ...safeUpdates,
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('User not found');
      }

      console.log(`Updated user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in updateUser:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to update user' };
    }
  }

  /**
   * Soft delete user
   */
  static async deleteUser(userId: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      if (currentUser.role !== 'super_admin') {
        throw new AuthorizationError('Only super admins can delete users');
      }

      const result = await (User.updateOne as any)({
        _id: userId
      }, {
        deleted_at: new Date(),
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('User not found');
      }

      console.log(`Soft deleted user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in deleteUser:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to delete user' };
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string, currentUser: AuthUser): Promise<{ user?: IUser; error?: string }> {
    try {
      // Users can view themselves, or higher roles can view subordinates
      if (currentUser.id !== userId && !canManageRoleHierarchy(currentUser.role, 'employee')) {
        throw new AuthorizationError('You can only view your own profile');
      }

      const user = await (User.findOne as any)({
        _id: userId,
        deleted_at: { $exists: false }
      }).select('-password_hash');

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return { user };
    } catch (error) {
      console.error('Error in getUserById:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError) {
        return { error: error.message };
      }
      return { error: 'Failed to fetch user' };
    }
  }

  /**
   * Get team members for manager (simple version - can be enhanced with project roles later)
   */
  static async getTeamMembers(managerId: string, currentUser: AuthUser): Promise<{ users: IUser[]; error?: string }> {
    try {
      // Only the manager themselves or higher roles can view team members
      // Updated to include manager, management, super_admin access
      if (currentUser.id !== managerId && !['manager', 'management', 'super_admin'].includes(currentUser.role)) {
        throw new AuthorizationError('Access denied. Required roles: manager, management, super_admin');
      }

      const users = await (User.find as any)({
        manager_id: managerId,
        is_active: true,
        deleted_at: { $exists: false }
      }).sort({ full_name: 1 }).select('-password_hash');

      return { users };
    } catch (error) {
      console.error('Error in getTeamMembers:', error);
      if (error instanceof AuthorizationError) {
        return { users: [], error: error.message };
      }
      return { users: [], error: 'Failed to fetch team members' };
    }
  }

  /**
   * Get users by role (for team review filtering)
   */
  static async getUsersByRole(roles: UserRole[], currentUser: AuthUser): Promise<{ users: IUser[]; error?: string }> {
    try {
      // Apply role-based access control
      if (!canManageRoleHierarchy(currentUser.role, 'employee')) {
        throw new AuthorizationError('Insufficient permissions to view users by role');
      }

      const users = await (User.find as any)({
        role: { $in: roles },
        is_active: true,
        deleted_at: { $exists: false }
      }).sort({ full_name: 1 }).select('-password_hash');

      return { users };
    } catch (error) {
      console.error('Error in getUsersByRole:', error);
      if (error instanceof AuthorizationError) {
        return { users: [], error: error.message };
      }
      return { users: [], error: 'Failed to fetch users by role' };
    }
  }

  /**
   * Validate user data
   */
  static validateUserData(userData: Partial<IUser>): { isValid: boolean; errors: string[] } {
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
   * Set login credentials for user (Super Admin only)
   */
  static async setUserCredentials(userId: string, password: string, currentUser: AuthUser): Promise<{ success: boolean; error?: string }> {
    try {
      if (currentUser.role !== 'super_admin') {
        throw new AuthorizationError('Only super admins can set user credentials');
      }

      if (!password || password.length < 6) {
        throw new ValidationError('Password must be at least 6 characters long');
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);

      const result = await (User.updateOne as any)({
        _id: userId,
        deleted_at: { $exists: false }
      }, {
        password_hash: passwordHash,
        updated_at: new Date()
      });

      if (result.matchedCount === 0) {
        throw new NotFoundError('User not found');
      }

      console.log(`Set credentials for user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error in setUserCredentials:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof ValidationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to set user credentials' };
    }
  }

  // TODO: Implement complex project-role methods when ProjectService is migrated
  // - getTeamMembersWithProjectRoles
  // - getManagerTeamMembers
  // - getLeadTeamMembers
}