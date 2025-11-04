import { Router } from 'express';
import VoiceController from '../controllers/VoiceController';
import { requireAuth } from '../middleware/auth';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

/**
 * All voice routes require authentication
 */
router.use(requireAuth);

/**
 * POST /api/v1/voice/process-command
 * Process voice command and return structured actions
 */
router.post(
  '/process-command',
  [
    body('transcript')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Transcript is required')
      .isLength({ max: 5000 })
      .withMessage('Transcript is too long'),
    body('context').optional().isObject().withMessage('Context must be an object')
  ],
  validate,
  VoiceController.processCommand
);

/**
 * POST /api/v1/voice/execute-action
 * Execute confirmed voice actions
 */
router.post(
  '/execute-action',
  [
    body('actions')
      .isArray()
      .withMessage('Actions must be an array')
      .notEmpty()
      .withMessage('Actions array cannot be empty'),
    body('actions.*.intent')
      .isString()
      .notEmpty()
      .withMessage('Each action must have an intent'),
    body('actions.*.data')
      .isObject()
      .withMessage('Each action must have a data object'),
    body('confirmed')
      .isBoolean()
      .withMessage('Confirmed must be a boolean')
      .equals('true')
      .withMessage('Action must be confirmed')
  ],
  validate,
  VoiceController.executeAction
);

/**
 * POST /api/v1/voice/speech-to-text
 * Convert audio to text (Azure Speech fallback)
 */
router.post(
  '/speech-to-text',
  [
    body('audioData')
      .isString()
      .notEmpty()
      .withMessage('Audio data is required'),
    body('format')
      .optional()
      .isIn(['webm', 'ogg', 'wav', 'mp3'])
      .withMessage('Invalid audio format'),
    body('language')
      .optional()
      .isString()
      .withMessage('Language must be a string')
  ],
  validate,
  VoiceController.speechToText
);

/**
 * GET /api/v1/voice/context
 * Get available context for current user
 */
router.get(
  '/context',
  [
    query('intents')
      .optional()
      .isString()
      .withMessage('Intents must be a comma-separated string')
  ],
  validate,
  VoiceController.getContext
);

/**
 * GET /api/v1/voice/preferences
 * Get user voice preferences
 */
router.get('/preferences', VoiceController.getUserPreferences);

/**
 * PUT /api/v1/voice/preferences
 * Update user voice preferences
 */
router.put(
  '/preferences',
  [
    body('speechMethod')
      .optional()
      .isIn(['web-speech', 'azure-speech', 'auto'])
      .withMessage('Invalid speech method'),
    body('enabledIntents')
      .optional()
      .isArray()
      .withMessage('enabledIntents must be an array'),
    body('disabledIntents')
      .optional()
      .isArray()
      .withMessage('disabledIntents must be an array'),
    body('voiceSettings')
      .optional()
      .isObject()
      .withMessage('voiceSettings must be an object'),
    body('voiceSettings.language')
      .optional()
      .isString()
      .withMessage('Language must be a string'),
    body('voiceSettings.autoSubmit')
      .optional()
      .isBoolean()
      .withMessage('autoSubmit must be a boolean'),
    body('voiceSettings.confirmBeforeExecute')
      .optional()
      .isBoolean()
      .withMessage('confirmBeforeExecute must be a boolean')
  ],
  validate,
  VoiceController.updateUserPreferences
);

/**
 * GET /api/v1/voice/history
 * Get user command history
 */
router.get(
  '/history',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  validate,
  VoiceController.getCommandHistory
);

/**
 * GET /api/v1/voice/health
 * Check voice services health
 */
router.get('/health', VoiceController.healthCheck);

export default router;
