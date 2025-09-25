import { Router } from 'express';
import {
  ProjectController,
  createProjectValidation,
  projectIdValidation,
  userIdValidation,
  addProjectMemberValidation,
  projectStatusValidation,
  createTaskValidation,
  taskIdValidation,
  createClientValidation,
  clientIdValidation
} from '@/controllers/ProjectController';
import { requireAuth, requireManager, requireManagement } from '@/middleware/auth';

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
 * @desc Delete project (Management+ only)
 * @access Private (Management+)
 */
router.delete('/:projectId', requireManagement, projectIdValidation, ProjectController.deleteProject);

/**
 * @route GET /api/v1/projects/user/:userId
 * @desc Get projects for specific user
 * @access Private (Manager+ can view team member projects)
 */
router.get('/user/:userId', requireManager, userIdValidation, ProjectController.getUserProjects);

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
router.put('/tasks/:taskId', taskIdValidation, createTaskValidation, ProjectController.updateTask);

/**
 * @route DELETE /api/v1/projects/tasks/:taskId
 * @desc Delete task (Manager+ only)
 * @access Private (Manager+)
 */
router.delete('/tasks/:taskId', requireManager, taskIdValidation, ProjectController.deleteTask);

// Client Management
/**
 * @route GET /api/v1/projects/clients
 * @desc Get all clients
 * @access Private (Manager+)
 */
router.get('/clients', requireManager, ProjectController.getClients);

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

export default router;