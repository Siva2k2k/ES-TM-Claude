import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { AzureOpenAIConfig, LLMPrompt, LLMResponse } from '../types/voice';
import logger from '../config/logger';

class AzureOpenAIService {
  private client: OpenAIClient | null = null;
  private deploymentName: string;
  private config: AzureOpenAIConfig;

  constructor() {
    this.config = {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
      apiKey: process.env.AZURE_OPENAI_API_KEY || '',
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
    };

    this.deploymentName = this.config.deploymentName;

    // Initialize client if credentials are available
    if (this.config.endpoint && this.config.apiKey) {
      try {
        this.client = new OpenAIClient(
          this.config.endpoint,
          new AzureKeyCredential(this.config.apiKey)
        );

        logger.info('Azure OpenAI Service initialized', {
          endpoint: this.config.endpoint,
          deployment: this.deploymentName
        });
      } catch (error: any) {
        logger.error('Failed to initialize Azure OpenAI Service', {
          error: error.message
        });
      }
    } else {
      logger.warn('Azure OpenAI credentials not configured');
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Generate completion from Azure OpenAI
   */
  async generateCompletion(prompt: LLMPrompt): Promise<LLMResponse> {
    if (!this.client) {
      throw new Error('Azure OpenAI Service is not configured. Please add credentials to .env file.');
    }

    try {
      const startTime = Date.now();

      const messages = [
        { role: 'system' as const, content: prompt.systemPrompt },
        { role: 'user' as const, content: prompt.userPrompt }
      ];

      if (process.env.VOICE_DEBUG_MODE === 'true') {
        logger.debug('Azure OpenAI Request', {
          systemPrompt: prompt.systemPrompt.substring(0, 200) + '...',
          userPrompt: prompt.userPrompt,
          temperature: prompt.temperature,
          maxTokens: prompt.maxTokens
        });
      }

      const result = await this.client.getChatCompletions(
        this.deploymentName,
        messages,
        {
          temperature: prompt.temperature || 0.1,
          maxTokens: prompt.maxTokens || 2000,
          responseFormat: { type: 'json_object' } as any // Force JSON response
        }
      );

      const duration = Date.now() - startTime;

      const response: LLMResponse = {
        content: result.choices[0]?.message?.content || '',
        finishReason: result.choices[0]?.finishReason || '',
        usage: {
          promptTokens: result.usage?.promptTokens || 0,
          completionTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0
        }
      };

      logger.info('Azure OpenAI Response', {
        duration,
        tokens: response.usage.totalTokens,
        finishReason: response.finishReason
      });

      if (process.env.VOICE_DEBUG_MODE === 'true') {
        logger.debug('Azure OpenAI Response Content', {
          content: response.content
        });
      }

      return response;
    } catch (error: any) {
      logger.error('Azure OpenAI Error', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Azure OpenAI failed: ${error.message}`);
    }
  }

  /**
   * Parse JSON response from LLM
   */
  parseJSONResponse<T>(response: LLMResponse): T {
    try {
      return JSON.parse(response.content) as T;
    } catch (error) {
      logger.error('Failed to parse LLM JSON response', {
        content: response.content,
        error
      });
      throw new Error('Invalid JSON response from LLM');
    }
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const result = await this.generateCompletion({
        systemPrompt: 'You are a helpful assistant.',
        userPrompt: 'Respond with {"status": "ok"}',
        temperature: 0,
        maxTokens: 50
      });
      const parsed = this.parseJSONResponse<{ status: string }>(result);
      return parsed.status === 'ok';
    } catch (error) {
      logger.error('Azure OpenAI health check failed', { error });
      return false;
    }
  }

  /**
   * Get token usage statistics (can be expanded)
   */
  getConfig(): AzureOpenAIConfig {
    return {
      ...this.config,
      apiKey: '***' // Don't expose actual key
    };
  }
}

export default new AzureOpenAIService();
