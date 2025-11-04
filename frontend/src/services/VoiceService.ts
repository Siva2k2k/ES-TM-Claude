import axios from 'axios';
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

class VoiceService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/voice`;
  }

  /**
   * Process voice command transcript with LLM
   */
  async processCommand(
    transcript: string,
    context?: Partial<VoiceContext>
  ): Promise<VoiceCommandResponse> {
    try {
      const response = await axios.post<VoiceCommandResponse>(
        `${this.baseURL}/process-command`,
        { transcript, context },
        { withCredentials: true }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to process voice command');
    }
  }

  /**
   * Execute validated voice actions
   */
  async executeActions(
    actions: Array<{ intent: string; data: Record<string, any> }>,
    confirmAll: boolean = false
  ): Promise<VoiceExecuteResponse> {
    try {
      const response = await axios.post<VoiceExecuteResponse>(
        `${this.baseURL}/execute-action`,
        { actions, confirmAll },
        { withCredentials: true }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to execute voice actions');
    }
  }

  /**
   * Convert audio to text using Azure Speech (fallback for Safari/Opera)
   */
  async speechToText(request: SpeechToTextRequest): Promise<SpeechToTextResponse> {
    try {
      const response = await axios.post<SpeechToTextResponse>(
        `${this.baseURL}/speech-to-text`,
        request,
        { withCredentials: true }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to convert speech to text');
    }
  }

  /**
   * Get voice context (allowed intents and entities)
   */
  async getContext(): Promise<VoiceContext> {
    try {
      const response = await axios.get<{ success: boolean; context: VoiceContext }>(
        `${this.baseURL}/context`,
        { withCredentials: true }
      );
      return response.data.context;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch voice context');
    }
  }

  /**
   * Get user voice preferences
   */
  async getUserPreferences(): Promise<UserVoicePreferences> {
    try {
      const response = await axios.get<{ success: boolean; preferences: UserVoicePreferences }>(
        `${this.baseURL}/preferences`,
        { withCredentials: true }
      );
      return response.data.preferences;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user preferences');
    }
  }

  /**
   * Update user voice preferences
   */
  async updateUserPreferences(
    preferences: Partial<UserVoicePreferences>
  ): Promise<UserVoicePreferences> {
    try {
      const response = await axios.put<{ success: boolean; preferences: UserVoicePreferences }>(
        `${this.baseURL}/preferences`,
        preferences,
        { withCredentials: true }
      );
      return response.data.preferences;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update user preferences');
    }
  }

  /**
   * Get command history
   */
  async getCommandHistory(limit: number = 50): Promise<UserVoicePreferences['commandHistory']> {
    try {
      const response = await axios.get<{
        success: boolean;
        history: UserVoicePreferences['commandHistory'];
      }>(`${this.baseURL}/history?limit=${limit}`, { withCredentials: true });
      return response.data.history;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch command history');
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
      const response = await axios.get<{
        success: boolean;
        services: { azureOpenAI: boolean; azureSpeech: boolean; database: boolean };
      }>(`${this.baseURL}/health`, { withCredentials: true });
      return response.data.services;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to check service health');
    }
  }
}

// Intent Configuration Service
class IntentConfigService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/intent-config`;
  }

  /**
   * Get all intent definitions
   */
  async getAllIntents(activeOnly: boolean = true): Promise<IntentDefinition[]> {
    try {
      const response = await axios.get<{ success: boolean; intents: IntentDefinition[] }>(
        `${this.baseURL}/intents?activeOnly=${activeOnly}`,
        { withCredentials: true }
      );
      return response.data.intents;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch intents');
    }
  }

  /**
   * Get intents by category
   */
  async getIntentsByCategory(category: string): Promise<IntentDefinition[]> {
    try {
      const response = await axios.get<{ success: boolean; intents: IntentDefinition[] }>(
        `${this.baseURL}/intents/category/${category}`,
        { withCredentials: true }
      );
      return response.data.intents;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch intents by category');
    }
  }

  /**
   * Get user-specific intents (with user overrides)
   */
  async getUserIntents(): Promise<{ allowed: IntentDefinition[]; disallowed: IntentDefinition[] }> {
    try {
      const response = await axios.get<{
        success: boolean;
        allowed: IntentDefinition[];
        disallowed: IntentDefinition[];
      }>(`${this.baseURL}/intents/user`, { withCredentials: true });
      return { allowed: response.data.allowed, disallowed: response.data.disallowed };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user intents');
    }
  }

  /**
   * Get single intent definition
   */
  async getIntent(intent: string): Promise<IntentDefinition> {
    try {
      const response = await axios.get<{ success: boolean; intent: IntentDefinition }>(
        `${this.baseURL}/intents/${intent}`,
        { withCredentials: true }
      );
      return response.data.intent;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch intent');
    }
  }

  /**
   * Create new intent (admin only)
   */
  async createIntent(intentData: Partial<IntentDefinition>): Promise<IntentDefinition> {
    try {
      const response = await axios.post<{ success: boolean; intent: IntentDefinition }>(
        `${this.baseURL}/intents`,
        intentData,
        { withCredentials: true }
      );
      return response.data.intent;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create intent');
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
      const response = await axios.put<{ success: boolean; intent: IntentDefinition }>(
        `${this.baseURL}/intents/${intent}`,
        updates,
        { withCredentials: true }
      );
      return response.data.intent;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update intent');
    }
  }

  /**
   * Enable intent for user
   */
  async enableIntent(intent: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseURL}/intents/${intent}/enable`,
        {},
        { withCredentials: true }
      );
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to enable intent');
    }
  }

  /**
   * Disable intent for user
   */
  async disableIntent(intent: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseURL}/intents/${intent}/disable`,
        {},
        { withCredentials: true }
      );
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to disable intent');
    }
  }

  /**
   * Deactivate intent (admin only)
   */
  async deactivateIntent(intent: string): Promise<void> {
    try {
      await axios.delete(`${this.baseURL}/intents/${intent}/deactivate`, {
        withCredentials: true,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to deactivate intent');
    }
  }

  /**
   * Delete intent (admin only)
   */
  async deleteIntent(intent: string): Promise<void> {
    try {
      await axios.delete(`${this.baseURL}/intents/${intent}`, { withCredentials: true });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete intent');
    }
  }

  /**
   * Get intent statistics (admin only)
   */
  async getStatistics(): Promise<IntentStatistics> {
    try {
      const response = await axios.get<{ success: boolean; statistics: IntentStatistics }>(
        `${this.baseURL}/statistics`,
        { withCredentials: true }
      );
      return response.data.statistics;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch intent statistics');
    }
  }
}

// Export singleton instances
export const voiceService = new VoiceService();
export const intentConfigService = new IntentConfigService();
