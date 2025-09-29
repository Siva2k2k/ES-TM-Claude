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
 */
router.post('/login', loginValidation, AuthController.login);

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

/**
 * @route PUT /api/v1/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', requireAuth, updateProfileValidation, AuthController.updateProfile);

export default router;