import { Router } from 'express';
import {
  AuthController,
  registerValidation,
  loginValidation,
  changePasswordValidation,
  passwordResetValidation,
  completePasswordResetValidation,
  updateProfileValidation
} from '@/controllers/AuthController';
import { requireAuth } from '@/middleware/auth';

const router = Router();

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', registerValidation, AuthController.register);

/**
 * @route POST /api/v1/auth/login
 * @desc Login user
 * @access Public
 */router
.post('/login', loginValidation, AuthController.login);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', AuthController.refreshToken);

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', requireAuth, AuthController.logout);

/**
 * @route GET /api/v1/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', requireAuth, AuthController.getProfile);

/**
 * @route POST /api/v1/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password', requireAuth, changePasswordValidation, AuthController.changePassword);

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Initiate password reset
 * @access Public
 */
router.post('/forgot-password', passwordResetValidation, AuthController.initiatePasswordReset);

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Complete password reset with token
 * @access Public
 */
router.post('/reset-password', completePasswordResetValidation, AuthController.completePasswordReset);

// Validate reset token (check expiry) - Public
import User from '@/models/User';
router.get('/reset-password/validate', async (req, res, next) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

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
  } catch (err) {
    next(err);
  }
});

/**
 * @route PUT /api/v1/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', requireAuth, updateProfileValidation, AuthController.updateProfile);

export default router;