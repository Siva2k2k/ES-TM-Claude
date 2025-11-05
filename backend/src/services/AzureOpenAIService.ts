import { AzureOpenAI } from 'openai';
import '@azure/openai/types'; // Azure-specific type definitions
import { AzureOpenAIConfig, LLMPrompt, LLMResponse } from '../types/voice';
import logger from '../config/logger';

class AzureOpenAIService {
  private client: AzureOpenAI | null = null;
  private readonly deploymentName: string;
  private readonly config: AzureOpenAIConfig;

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
        // Remove trailing slash from endpoint if present
        const endpoint = this.config.endpoint.replace(/\/$/, '');

        this.client = new AzureOpenAI({
          apiKey: this.config.apiKey,
          endpoint: endpoint,
          apiVersion: this.config.apiVersion
          // Note: deployment is NOT passed here, it's used as 'model' in API calls
        });

        logger.info('Azure OpenAI Service initialized successfully', {
          endpoint: endpoint,
          deployment: this.deploymentName,
          apiVersion: this.config.apiVersion
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

      const result = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: messages,
        temperature: prompt.temperature || 0.1,
        max_tokens: prompt.maxTokens || 2000,
        response_format: { type: 'json_object' } // Force JSON response
      });

      const duration = Date.now() - startTime;

      const response: LLMResponse = {
        content: result.choices[0]?.message?.content || '',
        finishReason: result.choices[0]?.finish_reason || '',
        usage: {
          promptTokens: result.usage?.prompt_tokens || 0,
          completionTokens: result.usage?.completion_tokens || 0,
          totalTokens: result.usage?.total_tokens || 0
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
      // Enhanced error handling for common Azure OpenAI issues
      if (error.status === 404) {
        const errorMsg = `Azure OpenAI deployment '${this.deploymentName}' not found. Please check:
1. Deployment name is correct in your Azure OpenAI resource
2. Deployment is active and available
3. Endpoint URL is correct: ${this.config.endpoint}`;
        
        logger.error('Azure OpenAI 404 Error - Deployment not found', {
          deploymentName: this.deploymentName,
          endpoint: this.config.endpoint,
          apiVersion: this.config.apiVersion,
          error: error.message
        });
        throw new Error(errorMsg);
      }
      
      if (error.status === 401 || error.status === 403) {
        logger.error('Azure OpenAI Authentication Error', {
          status: error.status,
          error: error.message
        });
        throw new Error('Azure OpenAI authentication failed. Please check your API key.');
      }

      logger.error('Azure OpenAI Error', {
        error: error.message,
        stack: error.stack,
        status: error.status
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
