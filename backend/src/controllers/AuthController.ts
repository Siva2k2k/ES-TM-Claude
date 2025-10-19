import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User, { UserRole } from '@/models/User';
import { JWTUtils, TokenPair } from '@/utils/jwt';
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
  handleAsyncError
} from '@/utils/errors';
import { PasswordSecurity } from '@/utils/passwordSecurity';
import { UserService } from '@/services/UserService';
import { logger } from '@/config/logger';
import { AuditLogService } from '@/services/AuditLogService';

interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
    is_approved_by_super_admin: boolean;
  };
  tokens?: TokenPair;
}

export class AuthController {
  /**
   * User registration
   */
  static readonly register = handleAsyncError(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    const { email, password, full_name, role = 'employee' } = req.body;

    // Check if user already exists
    const existingUser = await (User.findOne as any)({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = PasswordSecurity.validatePassword(password, {
      email: email.toLowerCase(),
      fullName: full_name
    });
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.errors.join(', '));
    }

    // Hash password
    const passwordHash = await PasswordSecurity.hashPassword(password);

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      full_name,
      role,
      password_hash: passwordHash,
      is_active: true,
      is_approved_by_super_admin: false // Requires admin approval
    });

    await user.save();

    // Log registration audit event
    await AuditLogService.logEvent(
      'users',
      user.id,
      'USER_CREATED',
      user.id,
      user.full_name,
      {
        email: user.email,
        role: user.role,
        registration_method: 'self-registration'
      }
    );

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    const tokens = JWTUtils.generateTokenPair(tokenPayload);

    const response: AuthResponse = {
      success: true,
      message: 'User registered successfully. Awaiting admin approval.',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        is_approved_by_super_admin: user.is_approved_by_super_admin
      },
      tokens
    };

    res.status(201).json(response);
  });

  /**
   * User login with enhanced security
   */
  static login = handleAsyncError(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    const { email, password } = req.body;

    // Find user by email with security fields
    const user = await (User.findOne as any)({
      email: email.toLowerCase(),
      deleted_at: { $exists: false }
    }).select('+password_hash +temporary_password +is_temporary_password +failed_login_attempts +account_locked_until +password_expires_at +force_password_change');

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if account is locked
    if (user.account_locked_until && user.account_locked_until > new Date()) {
      const cooldownTime = PasswordSecurity.getCooldownTime(
        user.failed_login_attempts,
        user.last_failed_login || new Date()
      );
      throw new AuthenticationError(`Account is locked. Try again in ${Math.ceil(cooldownTime / 1000)} seconds`);
    }

    // Verify password (check both regular and temporary passwords)
    const passwordToCheck = user.is_temporary_password ? user.temporary_password : user.password_hash;

    if (!passwordToCheck) {
      throw new AuthenticationError('No password set for this account. Please contact administrator.');
    }

    const isPasswordValid = await PasswordSecurity.verifyPassword(password, passwordToCheck);
    if (!isPasswordValid) {
      // Record failed login attempt
      await UserService.recordFailedLogin(user._id);

      // Log failed login attempt
      await AuditLogService.logEvent(
        'users',
        user.id,
        'USER_LOGIN',
        user.id,
        user.full_name,
        {
          success: false,
          reason: 'Invalid password',
          ip_address: req.ip || req.socket.remoteAddress
        }
      );

      throw new AuthenticationError('Invalid email or password');
    }

    // Clear failed login attempts on successful verification
    await UserService.clearFailedLogins(user._id);

    // Check if user is active
    if (!user.is_active) {
      throw new AuthenticationError('Account is deactivated. Please contact administrator.');
    }

    // Check if user is approved
    if (!user.is_approved_by_super_admin) {
      throw new AuthenticationError('Account is pending approval. Please contact administrator.');
    }

    // Check password expiry
    const passwordStatus = await UserService.checkPasswordExpiry(user._id);

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    const tokens = JWTUtils.generateTokenPair(tokenPayload);

    let message = 'Login successful';
    if (passwordStatus.expired || passwordStatus.forceChange) {
      message = 'Login successful. You must change your password before continuing.';
    }

    const response: AuthResponse = {
      success: true,
      message,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        is_approved_by_super_admin: user.is_approved_by_super_admin
      },
      tokens
    };

    // Add password change requirement to response
    if (passwordStatus.expired || passwordStatus.forceChange) {
      (response as any).requirePasswordChange = true;
      (response as any).passwordExpired = passwordStatus.expired;
    }

    // Log successful login
    await AuditLogService.logEvent(
      'users',
      user.id,
      'USER_LOGIN',
      user.id,
      user.full_name,
      {
        success: true,
        ip_address: req.ip || req.socket.remoteAddress,
        user_agent: req.headers['user-agent']
      }
    );

    logger.info(`Successful login for user: ${user.email}`);
    res.json(response);
  });

  /**
   * Refresh tokens
   */
  static refreshToken = handleAsyncError(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = JWTUtils.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    // Find user to ensure they still exist and are active
    const user = await (User.findOne as any)({
      _id: decoded.id,
      is_active: true,
      is_approved_by_super_admin: true,
      deleted_at: { $exists: false }
    });

    if (!user) {
      throw new AuthenticationError('User not found or account deactivated');
    }

    // Generate new tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    const tokens = JWTUtils.generateTokenPair(tokenPayload);

    const response: AuthResponse = {
      success: true,
      message: 'Tokens refreshed successfully',
      tokens
    };

    res.json(response);
  });

  /**
   * Get current user profile
   */
  static getProfile = handleAsyncError(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new AuthenticationError('User not authenticated');
    }

    const user = await (User.findOne as any)({
      _id: userId,
      deleted_at: { $exists: false }
    }).select('-password_hash');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        hourly_rate: user.hourly_rate,
        is_active: user.is_active,
        is_approved_by_super_admin: user.is_approved_by_super_admin,
        manager_id: user.manager_id,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  });

  /**
   * Validate reset token
   * GET /api/v1/auth/reset-password/validate?token=...
   */
  static validateResetToken = handleAsyncError(async (req: Request, res: Response) => {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    // Find user with token and ensure not expired
    const user = await (User.findOne as any)({
      password_reset_token: token,
      password_reset_expires: { $gt: new Date() },
      deleted_at: { $exists: false },
      is_active: true
    }).select('+password_reset_token');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    return res.json({ success: true, message: 'Token is valid' });
  });

  /**
   * Logout (invalidate tokens - in a real implementation, you'd maintain a blacklist)
   */
  static logout = handleAsyncError(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.full_name || 'Unknown User';

    // Log logout event
    if (userId) {
      await AuditLogService.logEvent(
        'users',
        userId,
        'USER_LOGOUT',
        userId,
        userName,
        {
          ip_address: req.ip || req.socket.remoteAddress
        }
      );
    }

    // In a more sophisticated implementation, you would:
    // 1. Add the tokens to a blacklist/revocation list
    // 2. Store blacklisted tokens in Redis or database
    // 3. Check blacklist in auth middleware

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  /**
   * Change password with enhanced security
   */
  static changePassword = handleAsyncError(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    const userId = (req as any).user?.id;
    const currentUser = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    if (!userId || !currentUser) {
      throw new AuthenticationError('User not authenticated');
    }

    // Use UserService for secure password change
    const result = await UserService.changePassword(
      userId,
      currentPassword,
      newPassword,
      currentUser
    );

    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to change password');
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  });

  /**
   * Initiate password reset
   */
  static initiatePasswordReset = handleAsyncError(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    const { email } = req.body;

    const result = await UserService.initiatePasswordReset(email);

    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to initiate password reset');
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  });

  /**
   * Complete password reset
   */
  static completePasswordReset = handleAsyncError(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    const { token, newPassword } = req.body;

    const result = await UserService.completePasswordReset(token, newPassword);

    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to reset password');
    }

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  });

  /**
   * Update user profile
   */
  static updateProfile = handleAsyncError(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    const userId = (req as any).user?.id;
    const currentUser = (req as any).user;
    const { full_name, hourly_rate } = req.body;

    if (!userId || !currentUser) {
      throw new AuthenticationError('User not authenticated');
    }

    const profileData: any = {};
    if (full_name !== undefined) profileData.full_name = full_name;
    if (hourly_rate !== undefined) profileData.hourly_rate = hourly_rate;

    const result = await UserService.updateProfile(userId, profileData, currentUser);

    if (result.error) {
      throw new ValidationError(result.error);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: result.user
    });
  });
}

// Validation middleware
export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be between 8 and 100 characters'),
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('role')
    .optional()
    .isIn(['employee', 'lead', 'manager', 'management', 'super_admin'])
    .withMessage('Invalid role')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    // Temporarily simplified for testing
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

export const passwordResetValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
];

export const completePasswordResetValidation = [
  body('token')
    .notEmpty()
    .isLength({ min: 64, max: 64 })
    .withMessage('Valid reset token is required'),
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

export const updateProfileValidation = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('hourly_rate')
    .optional()
    .isFloat({ min: 0.01, max: 10000 })
    .withMessage('Hourly rate must be between 0.01 and 10000')
];