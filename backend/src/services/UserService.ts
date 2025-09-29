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
import { PasswordSecurity } from '@/utils/passwordSecurity';
import { EmailService } from '@/services/EmailService';
import { logger } from '@/config/logger';

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
   * Create a new user (Super Admin only) - Direct creation with secure credentials and email
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

      // Generate secure temporary password
      const temporaryPassword = PasswordSecurity.generateTemporaryPassword(16);
      const passwordExpiry = PasswordSecurity.generatePasswordExpiry(48); // 48 hours to change password
      const hashedTempPassword = await PasswordSecurity.hashPassword(temporaryPassword);

      const userDoc: any = {
        email: userData.email!.toLowerCase(),
        full_name: userData.full_name!,
        role: userData.role || 'employee',
        hourly_rate: userData.hourly_rate || 50,
        is_active: true,
        is_approved_by_super_admin: true, // Super Admin creates directly

        // Secure credential fields
        password_hash: hashedTempPassword,
        temporary_password: hashedTempPassword,
        password_expires_at: passwordExpiry,
        is_temporary_password: true,
        force_password_change: true,
        failed_login_attempts: 0
      };

      // Only set manager_id if it's provided
      if (userData.manager_id) {
        userDoc.manager_id = userData.manager_id;
      }

      const user = new User(userDoc);
      await user.save();

      // Send welcome email with credentials
      try {
        const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const emailSent = await EmailService.sendWelcomeEmail({
          fullName: user.full_name,
          email: user.email,
          temporaryPassword: temporaryPassword,
          loginUrl: `${loginUrl}/login`,
          expirationTime: passwordExpiry.toLocaleString()
        });

        if (emailSent) {
          logger.info(`Welcome email sent successfully to ${user.email}`);
        } else {
          logger.warn(`Failed to send welcome email to ${user.email}, but user was created`);
        }
      } catch (emailError) {
        logger.error('Error sending welcome email:', emailError);
        // Don't fail user creation if email fails
      }

      logger.info(`Super Admin created user with secure credentials: ${user.id}`);

      // Return user without sensitive fields
      const userResponse = user.toJSON();
      delete userResponse.password_hash;
      delete userResponse.temporary_password;

      return { user: userResponse as IUser };
    } catch (error) {
      logger.error('Error in createUser:', error);
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

  /**
   * Change user password with secure validation
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentUser: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Users can only change their own password, unless it's an admin
      if (currentUser.id !== userId && currentUser.role !== 'super_admin') {
        throw new AuthorizationError('You can only change your own password');
      }

      // Get user with password fields
      const user = await (User.findOne as any)({
        _id: userId,
        deleted_at: { $exists: false }
      }).select('+password_hash +temporary_password +is_temporary_password +account_locked_until');

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if account is locked
      if (user.account_locked_until && user.account_locked_until > new Date()) {
        const cooldownTime = PasswordSecurity.getCooldownTime(
          user.failed_login_attempts,
          user.last_failed_login || new Date()
        );
        throw new AuthorizationError(`Account is locked. Try again in ${Math.ceil(cooldownTime / 1000)} seconds`);
      }

      // Verify current password (skip for admin forced changes)
      if (currentUser.role !== 'super_admin') {
        const passwordToCheck = user.is_temporary_password ? user.temporary_password : user.password_hash;
        if (!passwordToCheck || !(await PasswordSecurity.verifyPassword(currentPassword, passwordToCheck))) {
          // Record failed attempt
          await this.recordFailedLogin(userId);
          throw new AuthorizationError('Current password is incorrect');
        }
      }

      // Validate new password strength
      const passwordValidation = PasswordSecurity.validatePassword(newPassword, {
        email: user.email,
        fullName: user.full_name
      });

      if (!passwordValidation.isValid) {
        throw new ValidationError(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash new password
      const newPasswordHash = await PasswordSecurity.hashPassword(newPassword);

      // Update user with new password
      await (User.updateOne as any)(
        { _id: userId },
        {
          password_hash: newPasswordHash,
          is_temporary_password: false,
          force_password_change: false,
          password_expires_at: null,
          temporary_password: null,
          failed_login_attempts: 0,
          last_failed_login: null,
          account_locked_until: null,
          last_password_change: new Date(),
          updated_at: new Date()
        }
      );

      logger.info(`Password changed successfully for user: ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error in changePassword:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof ValidationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to change password' };
    }
  }

  /**
   * Initiate password reset process
   */
  static async initiatePasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await (User.findOne as any)({
        email: email.toLowerCase(),
        deleted_at: { $exists: false },
        is_active: true
      });

      if (!user) {
        // Don't reveal if user exists or not for security
        return { success: true };
      }

      // Generate secure reset token
      const resetToken = PasswordSecurity.generateResetToken();
      const resetExpiry = PasswordSecurity.generatePasswordExpiry(1); // 1 hour to reset

      // Save reset token
      await (User.updateOne as any)(
        { _id: user._id },
        {
          password_reset_token: resetToken,
          password_reset_expires: resetExpiry,
          updated_at: new Date()
        }
      );

      // Send password reset email
      try {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        const emailSent = await EmailService.sendPasswordResetEmail({
          fullName: user.full_name,
          email: user.email,
          resetUrl,
          expirationTime: resetExpiry.toLocaleString()
        });

        if (emailSent) {
          logger.info(`Password reset email sent to ${user.email}`);
        } else {
          logger.warn(`Failed to send password reset email to ${user.email}`);
        }
      } catch (emailError) {
        logger.error('Error sending password reset email:', emailError);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error in initiatePasswordReset:', error);
      return { success: false, error: 'Failed to initiate password reset' };
    }
  }

  /**
   * Complete password reset with token
   */
  static async completePasswordReset(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find user with valid reset token
      const user = await (User.findOne as any)({
        password_reset_token: token,
        password_reset_expires: { $gt: new Date() },
        deleted_at: { $exists: false },
        is_active: true
      }).select('+password_reset_token');

      if (!user) {
        throw new AuthorizationError('Invalid or expired reset token');
      }

      // Validate new password
      const passwordValidation = PasswordSecurity.validatePassword(newPassword, {
        email: user.email,
        fullName: user.full_name
      });

      if (!passwordValidation.isValid) {
        throw new ValidationError(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash new password
      const newPasswordHash = await PasswordSecurity.hashPassword(newPassword);

      // Update user with new password and clear reset token
      await (User.updateOne as any)(
        { _id: user._id },
        {
          password_hash: newPasswordHash,
          is_temporary_password: false,
          force_password_change: false,
          password_expires_at: null,
          temporary_password: null,
          password_reset_token: null,
          password_reset_expires: null,
          failed_login_attempts: 0,
          last_failed_login: null,
          account_locked_until: null,
          last_password_change: new Date(),
          updated_at: new Date()
        }
      );

      logger.info(`Password reset completed for user: ${user.email}`);
      return { success: true };
    } catch (error) {
      logger.error('Error in completePasswordReset:', error);
      if (error instanceof AuthorizationError || error instanceof ValidationError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Failed to reset password' };
    }
  }

  /**
   * Update user profile information
   */
  static async updateProfile(
    userId: string,
    profileData: { full_name?: string; hourly_rate?: number },
    currentUser: AuthUser
  ): Promise<{ user?: IUser; error?: string }> {
    try {
      // Users can update their own profile, or admins can update any profile
      if (currentUser.id !== userId && !['management', 'super_admin'].includes(currentUser.role)) {
        throw new AuthorizationError('You can only update your own profile');
      }

      // Validate profile data
      const updates: any = {};

      if (profileData.full_name !== undefined) {
        if (!profileData.full_name || profileData.full_name.trim().length < 2) {
          throw new ValidationError('Full name must be at least 2 characters');
        }
        updates.full_name = profileData.full_name.trim();
      }

      if (profileData.hourly_rate !== undefined) {
        if (profileData.hourly_rate <= 0) {
          throw new ValidationError('Hourly rate must be greater than 0');
        }
        updates.hourly_rate = profileData.hourly_rate;
      }

      if (Object.keys(updates).length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      updates.updated_at = new Date();

      // Update user
      const result = await (User.findOneAndUpdate as any)(
        { _id: userId, deleted_at: { $exists: false } },
        updates,
        { new: true, runValidators: true }
      ).select('-password_hash -temporary_password -password_reset_token');

      if (!result) {
        throw new NotFoundError('User not found');
      }

      logger.info(`Profile updated for user: ${userId}`);
      return { user: result };
    } catch (error) {
      logger.error('Error in updateProfile:', error);
      if (error instanceof AuthorizationError || error instanceof NotFoundError || error instanceof ValidationError) {
        return { error: error.message };
      }
      return { error: 'Failed to update profile' };
    }
  }

  /**
   * Record failed login attempt
   */
  static async recordFailedLogin(userId: string): Promise<void> {
    try {
      const user = await (User.findById as any)(userId);
      if (!user) return;

      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const now = new Date();

      const updates: any = {
        failed_login_attempts: failedAttempts,
        last_failed_login: now,
        updated_at: now
      };

      // Lock account after 5 failed attempts with exponential backoff
      if (failedAttempts >= 5) {
        const lockDuration = Math.pow(2, Math.min(failedAttempts - 4, 10)) * 60 * 1000; // Max 17 hours
        updates.account_locked_until = new Date(now.getTime() + lockDuration);
      }

      await (User.updateOne as any)({ _id: userId }, updates);
      logger.warn(`Failed login attempt #${failedAttempts} for user: ${userId}`);
    } catch (error) {
      logger.error('Error recording failed login:', error);
    }
  }

  /**
   * Clear failed login attempts (on successful login)
   */
  static async clearFailedLogins(userId: string): Promise<void> {
    try {
      await (User.updateOne as any)(
        { _id: userId },
        {
          failed_login_attempts: 0,
          last_failed_login: null,
          account_locked_until: null,
          updated_at: new Date()
        }
      );
    } catch (error) {
      logger.error('Error clearing failed logins:', error);
    }
  }

  /**
   * Check if user password is expired
   */
  static async checkPasswordExpiry(userId: string): Promise<{ expired: boolean; forceChange: boolean }> {
    try {
      const user = await (User.findById as any)(userId).select('password_expires_at force_password_change is_temporary_password');
      if (!user) {
        return { expired: false, forceChange: false };
      }

      const expired = user.password_expires_at ? PasswordSecurity.isPasswordExpired(user.password_expires_at) : false;
      const forceChange = user.force_password_change || user.is_temporary_password || false;

      return { expired, forceChange };
    } catch (error) {
      logger.error('Error checking password expiry:', error);
      return { expired: false, forceChange: false };
    }
  }

  // TODO: Implement complex project-role methods when ProjectService is migrated
  // - getTeamMembersWithProjectRoles
  // - getManagerTeamMembers
  // - getLeadTeamMembers
}