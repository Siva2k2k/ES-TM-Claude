import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User, { IUser, UserRole } from '@/models/User';
import { PasswordUtils } from '@/utils/password';
import { JWTUtils, TokenPair } from '@/utils/jwt';
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
  handleAsyncError
} from '@/utils/errors';

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
  static register = handleAsyncError(async (req: Request, res: Response) => {
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
    const passwordValidation = PasswordUtils.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.errors.join(', '));
    }

    // Hash password
    const passwordHash = await PasswordUtils.hashPassword(password);

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
   * User login
   */
  static login = handleAsyncError(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await (User.findOne as any)({
      email: email.toLowerCase(),
      deleted_at: { $exists: false }
    });

    if (!user || !user.password_hash) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await PasswordUtils.verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new AuthenticationError('Account is deactivated. Please contact administrator.');
    }

    // Check if user is approved
    if (!user.is_approved_by_super_admin) {
      throw new AuthenticationError('Account is pending approval. Please contact administrator.');
    }

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
      message: 'Login successful',
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
   * Logout (invalidate tokens - in a real implementation, you'd maintain a blacklist)
   */
  static logout = handleAsyncError(async (req: Request, res: Response) => {
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
   * Change password
   */
  static changePassword = handleAsyncError(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError(errors.array().map(err => err.msg).join(', '));
    }

    const userId = (req as any).user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      throw new AuthenticationError('User not authenticated');
    }

    // Find user
    const user = await (User.findOne as any)({
      _id: userId,
      deleted_at: { $exists: false }
    });

    if (!user || !user.password_hash) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordUtils.verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.errors.join(', '));
    }

    // Hash new password and update
    const newPasswordHash = await PasswordUtils.hashPassword(newPassword);
    user.password_hash = newPasswordHash;
    user.updated_at = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
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
    .isLength({ min: 8, max: 100 })
    .withMessage('New password must be between 8 and 100 characters')
];