import { backendApi, BackendApiError } from '../lib/backendApi';
import {
  VoiceCommandResponse,
  VoiceExecuteResponse,
  VoiceContext,
  UserVoicePreferences,
  SpeechToTextRequest,
  SpeechToTextResponse,
  IntentDefinition,
  IntentStatistics,
} from '../types/voice';

class VoiceService {
  /**
   * Process voice command transcript with LLM
   */
  async processCommand(
    transcript: string,
    context?: Partial<VoiceContext>
  ): Promise<VoiceCommandResponse> {
    try {
      const response = await backendApi.post<VoiceCommandResponse>(
        '/voice/process-command',
        { transcript, context }
      );
      return response;
    } catch (error) {
      console.error('Error in processCommand:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to process voice command';
      throw new Error(errorMessage);
    }
  }

  /**
   * Execute validated voice actions
   */
  async executeActions(
    actions: Array<{ intent: string; data: Record<string, unknown> }>,
    confirmed: boolean = true
  ): Promise<VoiceExecuteResponse> {
    try {
      const response = await backendApi.post<VoiceExecuteResponse>(
        '/voice/execute-action',
        { actions, confirmed }
      );
      return response;
    } catch (error) {
      console.error('Error in executeActions:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to execute voice actions';
      throw new Error(errorMessage);
    }
  }

  /**
   * Convert audio to text using Azure Speech (fallback for Safari/Opera)
   */
  async speechToText(request: SpeechToTextRequest): Promise<SpeechToTextResponse> {
    try {
      const response = await backendApi.post<SpeechToTextResponse>(
        '/voice/speech-to-text',
        request
      );
      return response;
    } catch (error) {
      console.error('Error in speechToText:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to convert speech to text';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get voice context (allowed intents and entities)
   */
  async getContext(): Promise<VoiceContext> {
    try {
      const response = await backendApi.get<{ success: boolean; context: VoiceContext }>(
        '/voice/context'
      );
      return response.context;
    } catch (error) {
      console.error('Error in getContext:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch voice context';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get user voice preferences
   */
  async getUserPreferences(): Promise<UserVoicePreferences> {
    try {
      const response = await backendApi.get<{ success: boolean; preferences: UserVoicePreferences }>(
        '/voice/preferences'
      );
      return response.preferences;
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch user preferences';
      throw new Error(errorMessage);
    }
  }

  /**
   * Update user voice preferences
   */
  async updateUserPreferences(
    preferences: Partial<UserVoicePreferences>
  ): Promise<UserVoicePreferences> {
    try {
      const response = await backendApi.put<{ success: boolean; preferences: UserVoicePreferences }>(
        '/voice/preferences',
        preferences
      );
      return response.preferences;
    } catch (error) {
      console.error('Error in updateUserPreferences:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to update user preferences';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get command history
   */
  async getCommandHistory(limit: number = 50): Promise<UserVoicePreferences['commandHistory']> {
    try {
      const response = await backendApi.get<{
        success: boolean;
        history: UserVoicePreferences['commandHistory'];
      }>(`/voice/history?limit=${limit}`);
      return response.history;
    } catch (error) {
      console.error('Error in getCommandHistory:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch command history';
      throw new Error(errorMessage);
    }
  }

  /**
   * Health check for voice services
   */
  async healthCheck(): Promise<{
    azureOpenAI: boolean;
    azureSpeech: boolean;
    database: boolean;
  }> {
    try {
      const response = await backendApi.get<{
        success: boolean;
        checks: { azureOpenAI: boolean; azureSpeech: boolean; voiceEnabled: boolean };
      }>('/voice/health');
      return {
        azureOpenAI: response.checks.azureOpenAI,
        azureSpeech: response.checks.azureSpeech,
        database: true // Assume database is working if we get a response
      };
    } catch (error) {
      console.error('Error in healthCheck:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to check service health';
      throw new Error(errorMessage);
    }
  }
}

// Intent Configuration Service
class IntentConfigService {
  /**
   * Get all intent definitions
   */
  async getAllIntents(activeOnly: boolean = true): Promise<IntentDefinition[]> {
    try {
      const response = await backendApi.get<{ success: boolean; intents: IntentDefinition[] }>(
        `/intent-config/intents?activeOnly=${activeOnly}`
      );
      return response.intents;
    } catch (error) {
      console.error('Error in getAllIntents:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch intents';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get intents by category
   */
  async getIntentsByCategory(category: string): Promise<IntentDefinition[]> {
    try {
      const response = await backendApi.get<{ success: boolean; intents: IntentDefinition[] }>(
        `/intent-config/intents/category/${category}`
      );
      return response.intents;
    } catch (error) {
      console.error('Error in getIntentsByCategory:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch intents by category';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get user-specific intents (with user overrides)
   */
  async getUserIntents(): Promise<{ allowed: IntentDefinition[]; disallowed: IntentDefinition[] }> {
    try {
      const response = await backendApi.get<{
        success: boolean;
        allowed: IntentDefinition[];
        disallowed: IntentDefinition[];
      }>('/intent-config/intents/user');
      return { allowed: response.allowed, disallowed: response.disallowed };
    } catch (error) {
      console.error('Error in getUserIntents:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch user intents';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get single intent definition
   */
  async getIntent(intent: string): Promise<IntentDefinition> {
    try {
      const response = await backendApi.get<{ success: boolean; intent: IntentDefinition }>(
        `/intent-config/intents/${intent}`
      );
      return response.intent;
    } catch (error) {
      console.error('Error in getIntent:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch intent';
      throw new Error(errorMessage);
    }
  }

  /**
   * Create new intent (admin only)
   */
  async createIntent(intentData: Partial<IntentDefinition>): Promise<IntentDefinition> {
    try {
      const response = await backendApi.post<{ success: boolean; intent: IntentDefinition }>(
        '/intent-config/intents',
        intentData
      );
      return response.intent;
    } catch (error) {
      console.error('Error in createIntent:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to create intent';
      throw new Error(errorMessage);
    }
  }

  /**
   * Update intent (admin only)
   */
  async updateIntent(
    intent: string,
    updates: Partial<IntentDefinition>
  ): Promise<IntentDefinition> {
    try {
      const response = await backendApi.put<{ success: boolean; intent: IntentDefinition }>(
        `/intent-config/intents/${intent}`,
        updates
      );
      return response.intent;
    } catch (error) {
      console.error('Error in updateIntent:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to update intent';
      throw new Error(errorMessage);
    }
  }

  /**
   * Enable intent for user
   */
  async enableIntent(intent: string): Promise<void> {
    try {
      await backendApi.post(
        `/intent-config/intents/${intent}/enable`,
        {}
      );
    } catch (error) {
      console.error('Error in enableIntent:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to enable intent';
      throw new Error(errorMessage);
    }
  }

  /**
   * Disable intent for user
   */
  async disableIntent(intent: string): Promise<void> {
    try {
      await backendApi.post(
        `/intent-config/intents/${intent}/disable`,
        {}
      );
    } catch (error) {
      console.error('Error in disableIntent:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to disable intent';
      throw new Error(errorMessage);
    }
  }

  /**
   * Deactivate intent (admin only)
   */
  async deactivateIntent(intent: string): Promise<void> {
    try {
      await backendApi.delete(`/intent-config/intents/${intent}/deactivate`);
    } catch (error) {
      console.error('Error in deactivateIntent:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to deactivate intent';
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete intent (admin only)
   */
  async deleteIntent(intent: string): Promise<void> {
    try {
      await backendApi.delete(`/intent-config/intents/${intent}`);
    } catch (error) {
      console.error('Error in deleteIntent:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to delete intent';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get intent statistics (admin only)
   */
  async getStatistics(): Promise<IntentStatistics> {
    try {
      const response = await backendApi.get<{ success: boolean; statistics: IntentStatistics }>(
        '/intent-config/statistics'
      );
      return response.statistics;
    } catch (error) {
      console.error('Error in getStatistics:', error);
      const errorMessage = error instanceof BackendApiError ? error.message : 'Failed to fetch intent statistics';
      throw new Error(errorMessage);
    }
  }
}

// Export singleton instances
export const voiceService = new VoiceService();
export const intentConfigService = new IntentConfigService();
