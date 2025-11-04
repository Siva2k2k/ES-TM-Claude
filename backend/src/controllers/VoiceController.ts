import { Response } from 'express';
import IntentRecognitionService from '../services/IntentRecognitionService';
import VoiceActionDispatcher from '../services/VoiceActionDispatcher';
import AzureSpeechService from '../services/AzureSpeechService';
import VoiceContextService from '../services/VoiceContextService';
import IntentConfigService from '../services/IntentConfigService';
import { VoiceCommandRequest, VoiceExecuteRequest } from '../types/voice';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import mongoose from 'mongoose';
import logger from '../config/logger';

export class VoiceController {
  /**
   * POST /api/v1/voice/process-command
   * Process voice command and return structured actions
   */
  async processCommand(req: AuthRequest, res: Response) {
    try {
      const { transcript, context }: VoiceCommandRequest = req.body;
      const authUser = req.user;

      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Transcript is required'
        });
      }

      // Fetch full user data from database
      const user = await (User as any).findById(authUser.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      logger.info('Voice command received', {
        userId: user._id,
        transcriptLength: transcript.length,
        context
      });

      // Check if voice is enabled
      if (process.env.VOICE_ENABLED !== 'true') {
        return res.status(503).json({
          success: false,
          message: 'Voice commands are currently disabled'
        });
      }

      // Process command through LLM
      const actions = await IntentRecognitionService.processCommand(transcript, user);

      return res.status(200).json({
        success: true,
        actions,
        message: `Processed ${actions.length} action(s)`
      });
    } catch (error: any) {
      logger.error('Voice command processing failed', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to process voice command',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * POST /api/v1/voice/execute-action
   * Execute confirmed voice actions
   */
  async executeAction(req: AuthRequest, res: Response) {
    try {
      const { actions, confirmed }: VoiceExecuteRequest = req.body;
      const authUser = req.user;

      if (!confirmed) {
        return res.status(400).json({
          success: false,
          message: 'Action must be confirmed'
        });
      }

      if (!actions || actions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No actions to execute'
        });
      }

      // Fetch full user data from database
      const user = await (User as any).findById(authUser.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      logger.info('Executing voice actions', {
        userId: user._id,
        actionCount: actions.length
      });

      // Execute all actions
      const results = await VoiceActionDispatcher.executeActions(actions, user);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return res.status(200).json({
        success: failureCount === 0,
        results,
        message: `Executed ${successCount} action(s) successfully${
          failureCount > 0 ? `, ${failureCount} failed` : ''
        }`
      });
    } catch (error: any) {
      logger.error('Voice action execution failed', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to execute voice action',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * POST /api/v1/voice/speech-to-text
   * Convert audio to text using Azure Speech (fallback for Safari/Opera)
   */
  async speechToText(req: AuthRequest, res: Response) {
    try {
      const { audioData, language } = req.body;
      const authUser = req.user;

      if (!audioData) {
        return res.status(400).json({
          success: false,
          message: 'Audio data is required'
        });
      }

      // Check if Azure Speech is configured
      if (!AzureSpeechService.isServiceConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Azure Speech Service is not configured'
        });
      }

      logger.info('Speech-to-text request', {
        userId: authUser.id,
        language,
        audioSize: audioData.length
      });

      const result = await AzureSpeechService.speechToText({
        audioData,
        language: language || 'en-US'
      });

      return res.status(200).json({
        success: true,
        transcript: result.transcript,
        confidence: result.confidence,
        language: result.language
      });
    } catch (error: any) {
      logger.error('Speech-to-text failed', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to convert speech to text',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/v1/voice/context
   * Get available context for current user
   */
  async getContext(req: AuthRequest, res: Response) {
    try {
      const authUser = req.user;
      const { intents } = req.query;

      // Fetch full user data from database
      const user = await (User as any).findById(authUser.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      let context;
      if (intents && typeof intents === 'string') {
        // Get context for specific intents
        const intentArray = intents.split(',').map(i => i.trim());
        context = await VoiceContextService.getContextForIntents(user, intentArray);
      } else {
        // Get basic context
        context = await VoiceContextService.getContext(user);
      }

      return res.status(200).json({
        success: true,
        context
      });
    } catch (error: any) {
      logger.error('Failed to get voice context', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to get context',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/v1/voice/preferences
   * Get user voice preferences
   */
  async getUserPreferences(req: AuthRequest, res: Response) {
    try {
      const authUser = req.user;

      const preferences = await IntentConfigService.getUserVoicePreferences(new mongoose.Types.ObjectId(authUser.id));

      return res.status(200).json({
        success: true,
        preferences: preferences || {
          speechMethod: 'auto',
          enabledIntents: [],
          disabledIntents: [],
          voiceSettings: {
            language: 'en-US',
            autoSubmit: false,
            confirmBeforeExecute: true
          }
        }
      });
    } catch (error: any) {
      logger.error('Failed to get user preferences', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to get preferences',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * PUT /api/v1/voice/preferences
   * Update user voice preferences
   */
  async updateUserPreferences(req: AuthRequest, res: Response) {
    try {
      const authUser = req.user;
      const updates = req.body;

      const preferences = await IntentConfigService.updateUserVoicePreferences(
        new mongoose.Types.ObjectId(authUser.id),
        updates
      );

      return res.status(200).json({
        success: true,
        preferences,
        message: 'Preferences updated successfully'
      });
    } catch (error: any) {
      logger.error('Failed to update user preferences', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to update preferences',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/v1/voice/history
   * Get user command history
   */
  async getCommandHistory(req: AuthRequest, res: Response) {
    try {
      const authUser = req.user;
      const limit = Number.parseInt(req.query.limit as string) || 20;

      const history = await IntentConfigService.getUserCommandHistory(new mongoose.Types.ObjectId(authUser.id), limit);

      return res.status(200).json({
        success: true,
        history
      });
    } catch (error: any) {
      logger.error('Failed to get command history', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to get command history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/v1/voice/health
   * Check voice services health
   */
  async healthCheck(req: AuthRequest, res: Response) {
    try {
      const checks = {
        voiceEnabled: process.env.VOICE_ENABLED === 'true',
        azureOpenAI: false,
        azureSpeech: false
      };

      // Check Azure OpenAI (skip actual call to save tokens)
      const AzureOpenAIService = (await import('../services/AzureOpenAIService')).default;
      checks.azureOpenAI = AzureOpenAIService.isConfigured();

      // Check Azure Speech
      checks.azureSpeech = AzureSpeechService.isServiceConfigured();

      const allHealthy = checks.voiceEnabled && checks.azureOpenAI && checks.azureSpeech;

      return res.status(allHealthy ? 200 : 503).json({
        success: allHealthy,
        checks,
        message: allHealthy ? 'All voice services are healthy' : 'Some voice services are unavailable'
      });
    } catch (error: any) {
      logger.error('Health check failed', {
        error: error.message
      });

      return res.status(500).json({
        success: false,
        message: 'Health check failed'
      });
    }
  }
}

export default new VoiceController();
