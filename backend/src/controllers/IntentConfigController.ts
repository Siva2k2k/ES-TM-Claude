import { Request, Response } from 'express';
import IntentConfigService from '../services/IntentConfigService';
import logger from '../config/logger';

export class IntentConfigController {
  /**
   * GET /api/v1/intent-config/intents
   * Get all active intent definitions
   */
  async getAllIntents(req: Request, res: Response) {
    try {
      const intents = await IntentConfigService.getAllIntents();

      return res.status(200).json({
        success: true,
        intents,
        count: intents.length
      });
    } catch (error: any) {
      logger.error('Failed to get all intents', {
        error: error.message
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve intents',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/v1/intent-config/intents/category/:category
   * Get intents by category
   */
  async getIntentsByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;

      const intents = await IntentConfigService.getIntentsByCategory(category);

      return res.status(200).json({
        success: true,
        category,
        intents,
        count: intents.length
      });
    } catch (error: any) {
      logger.error('Failed to get intents by category', {
        error: error.message,
        category: req.params.category
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve intents',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/v1/intent-config/intents/user
   * Get intents allowed for current user
   */
  async getUserIntents(req: Request, res: Response) {
    try {
      const user = req.user;

      const { allowed, disallowed } = await IntentConfigService.getIntentsForUser(user);

      return res.status(200).json({
        success: true,
        allowed,
        disallowed,
        counts: {
          allowed: allowed.length,
          disallowed: disallowed.length
        }
      });
    } catch (error: any) {
      logger.error('Failed to get user intents', {
        error: error.message,
        userId: req.user?._id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve user intents',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/v1/intent-config/intents/:intent
   * Get specific intent definition
   */
  async getIntentDefinition(req: Request, res: Response) {
    try {
      const { intent } = req.params;

      const intentDef = await IntentConfigService.getIntentDefinition(intent);

      if (!intentDef) {
        return res.status(404).json({
          success: false,
          message: `Intent '${intent}' not found`
        });
      }

      return res.status(200).json({
        success: true,
        intent: intentDef
      });
    } catch (error: any) {
      logger.error('Failed to get intent definition', {
        error: error.message,
        intent: req.params.intent
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve intent definition',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * POST /api/v1/intent-config/intents
   * Create a new intent definition (admin only)
   */
  async createIntent(req: Request, res: Response) {
    try {
      const intentData = req.body;

      const intent = await IntentConfigService.createIntent(intentData);

      logger.info('Intent definition created', {
        intent: intent.intent,
        createdBy: req.user._id
      });

      return res.status(201).json({
        success: true,
        intent,
        message: 'Intent created successfully'
      });
    } catch (error: any) {
      logger.error('Failed to create intent', {
        error: error.message,
        userId: req.user._id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to create intent',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * PUT /api/v1/intent-config/intents/:intent
   * Update an intent definition (admin only)
   */
  async updateIntent(req: Request, res: Response) {
    try {
      const { intent } = req.params;
      const updates = req.body;

      const updatedIntent = await IntentConfigService.updateIntent(intent, updates);

      if (!updatedIntent) {
        return res.status(404).json({
          success: false,
          message: `Intent '${intent}' not found`
        });
      }

      logger.info('Intent definition updated', {
        intent,
        updatedBy: req.user._id
      });

      return res.status(200).json({
        success: true,
        intent: updatedIntent,
        message: 'Intent updated successfully'
      });
    } catch (error: any) {
      logger.error('Failed to update intent', {
        error: error.message,
        intent: req.params.intent
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to update intent',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * DELETE /api/v1/intent-config/intents/:intent/deactivate
   * Deactivate an intent (admin only)
   */
  async deactivateIntent(req: Request, res: Response) {
    try {
      const { intent } = req.params;

      const success = await IntentConfigService.deactivateIntent(intent);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: `Intent '${intent}' not found`
        });
      }

      logger.info('Intent deactivated', {
        intent,
        deactivatedBy: req.user._id
      });

      return res.status(200).json({
        success: true,
        message: 'Intent deactivated successfully'
      });
    } catch (error: any) {
      logger.error('Failed to deactivate intent', {
        error: error.message,
        intent: req.params.intent
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to deactivate intent',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * DELETE /api/v1/intent-config/intents/:intent
   * Permanently delete an intent (admin only)
   */
  async deleteIntent(req: Request, res: Response) {
    try {
      const { intent } = req.params;

      const success = await IntentConfigService.deleteIntent(intent);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: `Intent '${intent}' not found`
        });
      }

      logger.info('Intent deleted', {
        intent,
        deletedBy: req.user._id
      });

      return res.status(200).json({
        success: true,
        message: 'Intent deleted successfully'
      });
    } catch (error: any) {
      logger.error('Failed to delete intent', {
        error: error.message,
        intent: req.params.intent
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to delete intent',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * POST /api/v1/intent-config/intents/:intent/enable
   * Enable intent for current user
   */
  async enableIntentForUser(req: Request, res: Response) {
    try {
      const { intent } = req.params;
      const user = req.user;

      await IntentConfigService.enableIntentForUser(user._id, intent);

      return res.status(200).json({
        success: true,
        message: `Intent '${intent}' enabled`
      });
    } catch (error: any) {
      logger.error('Failed to enable intent for user', {
        error: error.message,
        intent: req.params.intent,
        userId: req.user._id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to enable intent',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * POST /api/v1/intent-config/intents/:intent/disable
   * Disable intent for current user
   */
  async disableIntentForUser(req: Request, res: Response) {
    try {
      const { intent } = req.params;
      const user = req.user;

      await IntentConfigService.disableIntentForUser(user._id, intent);

      return res.status(200).json({
        success: true,
        message: `Intent '${intent}' disabled`
      });
    } catch (error: any) {
      logger.error('Failed to disable intent for user', {
        error: error.message,
        intent: req.params.intent,
        userId: req.user._id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to disable intent',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/v1/intent-config/statistics
   * Get intent statistics (admin only)
   */
  async getStatistics(req: Request, res: Response) {
    try {
      const stats = await IntentConfigService.getIntentStatistics();

      return res.status(200).json({
        success: true,
        statistics: stats
      });
    } catch (error: any) {
      logger.error('Failed to get intent statistics', {
        error: error.message
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default new IntentConfigController();
