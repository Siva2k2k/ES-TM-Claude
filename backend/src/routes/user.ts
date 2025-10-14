import { Router } from 'express';
import {
  UserController,
  createUserValidation,
  userIdValidation,
  setUserStatusValidation,
  setUserBillingValidation,
  updateUserValidation,
  getUsersByRoleValidation,
  getUsersByRolesValidation
} from '@/controllers/UserController';
import { requireAuth, requireManager, requireManagement, requireSuperAdmin } from '@/middleware/auth';

const router = Router();

// Apply authentication to all user routes
router.use(requireAuth);

/**
 * @route GET /api/v1/users
 * @desc Get all users (Manager+ for team management)
 * @access Private (Manager+)
 */
router.get('/', requireManager, UserController.getAllUsers);

/**
 * @route POST /api/v1/users
 * @desc Create a new user (Super Admin only)
 * @access Private (Super Admin)
 */
router.post('/', requireSuperAdmin, createUserValidation, UserController.createUser);

/**
 * @route POST /api/v1/users/for-approval
 * @desc Create a new user for approval (Management role)
 * @access Private (Management+)
 */
router.post('/for-approval', requireManagement, createUserValidation, UserController.createUserForApproval);

/**
 * @route GET /api/v1/users/pending-approvals
 * @desc Get pending user approvals (Manager+ for team management)
 * @access Private (Manager+)
 */
router.get('/pending-approvals', requireManager, UserController.getPendingApprovals);

/**
 * @route GET /api/v1/users/deleted
 * @desc Get all deleted users (Super Admin only)
 * @access Private (Super Admin)
 */
router.get('/deleted', requireSuperAdmin, UserController.getDeletedUsers);

/**
 * @route GET /api/v1/users/by-role
 * @desc Get users based on role permissions
 * @access Private
 */
router.get('/by-role', getUsersByRoleValidation, UserController.getUsersByPermission);

/**
 * @route GET /api/v1/users/roles
 * @desc Get users by multiple roles
 * @access Private (Manager+)
 */
router.get('/roles', requireManager, getUsersByRolesValidation, UserController.getUsersByRoles);

/**
 * @route GET /api/v1/users/:userId
 * @desc Get user by ID
 * @access Private
 */
router.get('/:userId', userIdValidation, UserController.getUserById);

/**
 * @route PUT /api/v1/users/:userId
 * @desc Update user details
 * @access Private
 */
router.put('/:userId', updateUserValidation, UserController.updateUser);

/**
 * @route DELETE /api/v1/users/:userId
 * @desc Delete user (Super Admin only)
 * @access Private (Super Admin)
 */
router.delete('/:userId', requireSuperAdmin, userIdValidation, UserController.deleteUser);

/**
 * @route POST /api/v1/users/:userId/approve
 * @desc Approve user (Super Admin only)
 * @access Private (Super Admin)
 */
router.post('/:userId/approve', requireSuperAdmin, userIdValidation, UserController.approveUser);

/**
 * @route PUT /api/v1/users/:userId/status
 * @desc Set user active/inactive status (Super Admin only)
 * @access Private (Super Admin)
 */
router.put('/:userId/status', requireSuperAdmin, setUserStatusValidation, UserController.setUserStatus);

/**
 * @route PUT /api/v1/users/:userId/billing
 * @desc Update user billing rate (Super Admin only)
 * @access Private (Super Admin)
 */
router.put('/:userId/billing', requireSuperAdmin, setUserBillingValidation, UserController.setUserBilling);



/**
 * @route GET /api/v1/users/:managerId/team-members
 * @desc Get team members for manager
 * @access Private (Manager+)
 */
router.get('/:managerId/team-members', requireManager, userIdValidation, UserController.getTeamMembers);

/**
 * @route POST /api/v1/users/:userId/soft-delete
 * @desc Soft delete user (recoverable)
 * @access Private (Super Admin)
 */
router.post('/:userId/soft-delete', requireSuperAdmin, userIdValidation, UserController.softDeleteUser);

/**
 * @route POST /api/v1/users/:userId/hard-delete
 * @desc Hard delete user (permanent)
 * @access Private (Super Admin)
 */
router.post('/:userId/hard-delete', requireSuperAdmin, userIdValidation, UserController.hardDeleteUser);

/**
 * @route POST /api/v1/users/:userId/restore
 * @desc Restore soft deleted user
 * @access Private (Super Admin)
 */
router.post('/:userId/restore', requireSuperAdmin, userIdValidation, UserController.restoreUser);

/**
 * @route GET /api/v1/users/:userId/dependencies
 * @desc Check if user can be deleted (check dependencies)
 * @access Private (Super Admin)
 */
router.get('/:userId/dependencies', requireSuperAdmin, userIdValidation, UserController.checkUserDependencies);

export default router;