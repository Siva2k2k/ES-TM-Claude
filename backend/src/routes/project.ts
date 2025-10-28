import { Router } from 'express';
import {
  ProjectController,
  createProjectValidation,
  projectIdValidation,
  userIdValidation,
  addProjectMemberValidation,
  projectStatusValidation,
  createTaskValidation,
  updateTaskValidation,
  taskIdValidation,
  createClientValidation,
  clientIdValidation,
  addProjectMemberEnhancedValidation,
  updateProjectMemberRoleValidation,
  createTrainingTaskValidation,
  updateTrainingTaskValidation
} from '@/controllers/ProjectController';
import { requireAuth, requireManager, requireManagement, requireSuperAdmin } from '@/middleware/auth';

const router = Router();

// Apply authentication to all project routes
router.use(requireAuth);

/**
 * @route GET /api/v1/projects
 * @desc Get all projects based on user permissions
 * @access Private
 */
router.get('/', ProjectController.getProjects);

/**
 * @route POST /api/v1/projects
 * @desc Create a new project (Management+ only)
 * @access Private (Management+)
 */
router.post('/', requireManagement, createProjectValidation, ProjectController.createProject);

/**
 * @route GET /api/v1/projects/status
 * @desc Get projects by status
 * @access Private
 */
router.get('/status', projectStatusValidation, ProjectController.getProjectsByStatus);

/**
 * @route GET /api/v1/projects/deleted/all
 * @desc Get all deleted projects
 * @access Private (Management+)
 */
router.get('/deleted/all', requireManagement, ProjectController.getDeletedProjects);

// Client Management - Must come before /:projectId routes to avoid conflicts
/**
 * @route GET /api/v1/projects/clients
 * @desc Get all clients
 * @access Private (Manager+)
 */
router.get('/clients',requireAuth, ProjectController.getClients);

/**
 * @route POST /api/v1/projects/clients
 * @desc Create new client (Management+ only)
 * @access Private (Management+)
 */
router.post('/clients', requireManagement, createClientValidation, ProjectController.createClient);

/**
 * @route GET /api/v1/projects/clients/:clientId
 * @desc Get client by ID
 * @access Private (Manager+)
 */
router.get('/clients/:clientId', requireManager, clientIdValidation, ProjectController.getClientById);

/**
 * @route PUT /api/v1/projects/clients/:clientId
 * @desc Update client (Management+ only)
 * @access Private (Management+)
 */
router.put('/clients/:clientId', requireManagement, clientIdValidation, createClientValidation, ProjectController.updateClient);

/**
 * @route DELETE /api/v1/projects/clients/:clientId
 * @desc Delete client (Management+ only)
 * @access Private (Management+)
 */
router.delete('/clients/:clientId', requireManagement, clientIdValidation, ProjectController.deleteClient);

/**
 * @route GET /api/v1/projects/user/:userId
 * @desc Get projects for specific user
 * @access Private (Users can view own projects, Manager+ can view team member projects)
 */
router.get('/user/:userId', userIdValidation, ProjectController.getUserProjects);

// ========================================================================
// TRAINING PROJECT ROUTES (Must come before /:projectId)
// ========================================================================

/**
 * @route GET /api/v1/projects/training
 * @desc Get Training Project with all tasks
 * @access Private (All authenticated users)
 */
router.get('/training', ProjectController.getTrainingProject);

/**
 * @route POST /api/v1/projects/training/tasks
 * @desc Add task to Training Project
 * @access Private (Management, Manager, Admin only)
 */
router.post('/training/tasks', createTrainingTaskValidation, ProjectController.addTrainingTask);

/**
 * @route PUT /api/v1/projects/training/tasks/:taskId
 * @desc Update task in Training Project
 * @access Private (Management, Manager, Admin only)
 */
router.put('/training/tasks/:taskId', updateTrainingTaskValidation, ProjectController.updateTrainingTask);

/**
 * @route DELETE /api/v1/projects/training/tasks/:taskId
 * @desc Delete task from Training Project
 * @access Private (Management, Manager, Admin only)
 */
router.delete('/training/tasks/:taskId', taskIdValidation, ProjectController.deleteTrainingTask);

/**
 * @route GET /api/v1/projects/:projectId
 * @desc Get project by ID
 * @access Private
 */
router.get('/:projectId', projectIdValidation, ProjectController.getProjectById);

/**
 * @route PUT /api/v1/projects/:projectId
 * @desc Update project
 * @access Private (Manager+ for assigned projects, Management+ for all)
 */
router.put('/:projectId', projectIdValidation, createProjectValidation, ProjectController.updateProject);

/**
 * @route DELETE /api/v1/projects/:projectId
 * @desc Soft delete project (Management+ only)
 * @access Private (Management+)
 */
router.delete('/:projectId', requireManagement, projectIdValidation, ProjectController.deleteProject);

/**
 * @route GET /api/v1/projects/:projectId/dependencies
 * @desc Check if project can be permanently deleted (check dependencies)
 * @access Private (Super Admin)
 */
// TEMPORARILY DISABLED - troubleshooting
// router.get('/:projectId/dependencies', requireSuperAdmin, projectIdValidation, ProjectController.checkProjectDependencies);

/**
 * @route DELETE /api/v1/projects/:projectId/hard-delete
 * @desc Permanently delete project (Super Admin only)
 * @access Private (Super Admin)
 */
router.delete('/:projectId/hard-delete', requireSuperAdmin, projectIdValidation, ProjectController.hardDeleteProject);

/**
 * @route POST /api/v1/projects/:projectId/restore
 * @desc Restore soft-deleted project (Management+ only)
 * @access Private (Management+)
 */
router.post('/:projectId/restore', requireManagement, projectIdValidation, ProjectController.restoreProject);

// Project Members Management
/**
 * @route GET /api/v1/projects/:projectId/members
 * @desc Get project members
 * @access Private
 */
router.get('/:projectId/members', projectIdValidation, ProjectController.getProjectMembers);

/**
 * @route POST /api/v1/projects/:projectId/members
 * @desc Add project member (Manager+ only)
 * @access Private (Manager+)
 */
router.post('/:projectId/members', requireManager, addProjectMemberValidation, ProjectController.addProjectMember);

/**
 * @route DELETE /api/v1/projects/:projectId/members/:userId
 * @desc Remove project member (Manager+ only)
 * @access Private (Manager+)
 */
router.delete('/:projectId/members/:userId', requireManager, projectIdValidation, userIdValidation, ProjectController.removeProjectMember);

// Task Management
/**
 * @route GET /api/v1/projects/:projectId/tasks
 * @desc Get project tasks
 * @access Private
 */
router.get('/:projectId/tasks', projectIdValidation, ProjectController.getProjectTasks);

/**
 * @route POST /api/v1/projects/:projectId/tasks
 * @desc Create task in project (Manager+ only)
 * @access Private (Manager+)
 */
router.post('/:projectId/tasks', requireManager, createTaskValidation, ProjectController.createTask);

/**
 * @route PUT /api/v1/projects/tasks/:taskId
 * @desc Update task
 * @access Private
 */
router.put('/tasks/:taskId', taskIdValidation, updateTaskValidation, ProjectController.updateTask);

/**
 * @route DELETE /api/v1/projects/tasks/:taskId
 * @desc Delete task (Manager+ only)
 * @access Private (Manager+)
 */
router.delete('/tasks/:taskId', requireManager, taskIdValidation, ProjectController.deleteTask);

// ========================================================================
// MULTI-PROJECT ROLE SYSTEM ROUTES
// ========================================================================

/**
 * @route GET /api/v1/projects/:projectId/permissions
 * @desc Get project permissions for current user
 * @access Private
 */
// router.get('/:projectId/permissions', projectIdValidation, ProjectController.getProjectPermissions);

/**
 * @route POST /api/v1/projects/:projectId/members/enhanced
 * @desc Add project member with enhanced role validation (Manager+ only)
 * @access Private (Manager+)
 */
router.post('/:projectId/members/enhanced', requireManager, addProjectMemberEnhancedValidation, ProjectController.addProjectMemberEnhanced);

/**
 * @route PUT /api/v1/projects/:projectId/members/:userId/role
 * @desc Update project member role and permissions (Manager+ only)
 * @access Private (Manager+)
 */
router.put('/:projectId/members/:userId/role', requireManager, updateProjectMemberRoleValidation, ProjectController.updateProjectMemberRole);

/**
 * @route GET /api/v1/projects/users/:userId/roles
 * @desc Get user's roles across all projects
 * @access Private (Users can view own, Manager+ can view others)
 */
router.get('/users/:userId/roles', userIdValidation, ProjectController.getUserProjectRoles);

/**
 * @route GET /api/v1/projects/:projectId/available-users
 * @desc Get available users for project (filtered by permissions)
 * @access Private (Manager+ only)
 */
router.get('/:projectId/available-users', requireManager, projectIdValidation, ProjectController.getAvailableUsersForProject);

/**
 * @route GET /api/v1/projects/:projectId/members/enhanced
 * @desc Get enhanced project members with detailed role information
 * @access Private
 */
router.get('/:projectId/members/enhanced', projectIdValidation, ProjectController.getProjectMembersEnhanced);

export default router;