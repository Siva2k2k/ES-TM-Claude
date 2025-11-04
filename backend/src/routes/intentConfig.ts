import { Router } from 'express';
import IntentConfigController from '../controllers/IntentConfigController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/authorization';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * All intent config routes require authentication
 */
router.use(requireAuth);

/**
 * GET /api/v1/intent-config/statistics
 * Get intent statistics (admin only)
 * IMPORTANT: This route must be before /intents/:intent to avoid conflicts
 */
router.get(
  '/statistics',
  requireRole(['super_admin', 'management']),
  IntentConfigController.getStatistics
);

/**
 * GET /api/v1/intent-config/intents
 * Get all active intent definitions
 */
router.get('/intents', IntentConfigController.getAllIntents);

/**
 * GET /api/v1/intent-config/intents/category/:category
 * Get intents by category
 */
router.get(
  '/intents/category/:category',
  [
    param('category')
      .isIn(['project', 'user', 'client', 'timesheet', 'team_review', 'billing', 'audit'])
      .withMessage('Invalid category')
  ],
  validate,
  IntentConfigController.getIntentsByCategory
);

/**
 * GET /api/v1/intent-config/intents/user
 * Get intents allowed for current user
 */
router.get('/intents/user', IntentConfigController.getUserIntents);

/**
 * GET /api/v1/intent-config/intents/:intent
 * Get specific intent definition
 */
router.get(
  '/intents/:intent',
  [
    param('intent')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Intent name is required')
  ],
  validate,
  IntentConfigController.getIntentDefinition
);

/**
 * POST /api/v1/intent-config/intents
 * Create a new intent definition (admin only)
 */
router.post(
  '/intents',
  requireRole(['super_admin', 'management']),
  [
    body('intent')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Intent name is required'),
    body('category')
      .isIn(['project', 'user', 'client', 'timesheet', 'team_review', 'billing', 'audit'])
      .withMessage('Invalid category'),
    body('description')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Description is required'),
    body('requiredFields')
      .isArray()
      .withMessage('requiredFields must be an array'),
    body('optionalFields')
      .isArray()
      .withMessage('optionalFields must be an array'),
    body('fieldTypes')
      .isObject()
      .withMessage('fieldTypes must be an object'),
    body('contextRequired')
      .isArray()
      .withMessage('contextRequired must be an array'),
    body('allowedRoles')
      .isArray()
      .withMessage('allowedRoles must be an array'),
    body('exampleCommand')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('exampleCommand is required')
  ],
  validate,
  IntentConfigController.createIntent
);

/**
 * PUT /api/v1/intent-config/intents/:intent
 * Update an intent definition (admin only)
 */
router.put(
  '/intents/:intent',
  requireRole(['super_admin', 'management']),
  [
    param('intent')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Intent name is required'),
    body('description')
      .optional()
      .isString()
      .trim()
      .withMessage('Description must be a string'),
    body('requiredFields')
      .optional()
      .isArray()
      .withMessage('requiredFields must be an array'),
    body('optionalFields')
      .optional()
      .isArray()
      .withMessage('optionalFields must be an array'),
    body('allowedRoles')
      .optional()
      .isArray()
      .withMessage('allowedRoles must be an array'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],
  validate,
  IntentConfigController.updateIntent
);

/**
 * DELETE /api/v1/intent-config/intents/:intent/deactivate
 * Deactivate an intent (admin only)
 */
router.delete(
  '/intents/:intent/deactivate',
  requireRole(['super_admin', 'management']),
  [
    param('intent')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Intent name is required')
  ],
  validate,
  IntentConfigController.deactivateIntent
);

/**
 * POST /api/v1/intent-config/intents/:intent/enable
 * Enable intent for current user
 */
router.post(
  '/intents/:intent/enable',
  [
    param('intent')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Intent name is required')
  ],
  validate,
  IntentConfigController.enableIntentForUser
);

/**
 * POST /api/v1/intent-config/intents/:intent/disable
 * Disable intent for current user
 */
router.post(
  '/intents/:intent/disable',
  [
    param('intent')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Intent name is required')
  ],
  validate,
  IntentConfigController.disableIntentForUser
);

/**
 * DELETE /api/v1/intent-config/intents/:intent
 * Permanently delete an intent (admin only)
 */
router.delete(
  '/intents/:intent',
  requireRole(['super_admin']),
  [
    param('intent')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Intent name is required')
  ],
  validate,
  IntentConfigController.deleteIntent
);

export default router;
