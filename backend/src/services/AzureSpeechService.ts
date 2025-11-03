import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { SpeechToTextRequest, SpeechToTextResponse } from '../types/voice';
import logger from '../config/logger';

class AzureSpeechService {
  private speechConfig: sdk.SpeechConfig | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const subscriptionKey = process.env.AZURE_SPEECH_KEY;
    const serviceRegion = process.env.AZURE_SPEECH_REGION;

    if (subscriptionKey && serviceRegion) {
      try {
        this.speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
        this.speechConfig.speechRecognitionLanguage = 'en-US';
        this.isConfigured = true;

        logger.info('Azure Speech Service initialized', { region: serviceRegion });
      } catch (error: any) {
        logger.error('Failed to initialize Azure Speech Service', {
          error: error.message
        });
      }
    } else {
      logger.warn('Azure Speech credentials not configured');
    }
  }

  /**
   * Check if service is configured
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Convert speech audio to text
   */
  async speechToText(request: SpeechToTextRequest): Promise<SpeechToTextResponse> {
    if (!this.speechConfig) {
      throw new Error('Azure Speech Service is not configured. Please add credentials to .env file.');
    }

    return new Promise((resolve, reject) => {
      try {
        // Decode base64 audio
        const audioBuffer = Buffer.from(request.audioData, 'base64');

        // Create push stream
        const pushStream = sdk.AudioInputStream.createPushStream();
        pushStream.write(audioBuffer);
        pushStream.close();

        // Create audio config
        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

        // Set language if provided
        const recognitionConfig = this.speechConfig!;
        if (request.language) {
          recognitionConfig.speechRecognitionLanguage = request.language;
        }

        // Create recognizer
        const recognizer = new sdk.SpeechRecognizer(recognitionConfig, audioConfig);

        // Start recognition
        recognizer.recognizeOnceAsync(
          (result) => {
            recognizer.close();

            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
              const response: SpeechToTextResponse = {
                transcript: result.text,
                confidence: 1.0, // Azure doesn't provide confidence in simple API
                language: request.language || 'en-US'
              };

              logger.info('Speech to text successful', {
                transcriptLength: response.transcript.length,
                language: response.language
              });

              resolve(response);
            } else if (result.reason === sdk.ResultReason.NoMatch) {
              const errorMessage = 'Speech could not be recognized. Please try again.';
              logger.warn('Speech recognition - no match', {
                reason: sdk.ResultReason[result.reason]
              });
              reject(new Error(errorMessage));
            } else {
              const errorMessage = `Speech recognition failed: ${sdk.ResultReason[result.reason]}`;
              logger.error('Speech recognition failed', {
                reason: sdk.ResultReason[result.reason],
                errorDetails: result.errorDetails
              });
              reject(new Error(errorMessage));
            }
          },
          (error) => {
            recognizer.close();
            logger.error('Speech recognition error', { error: error.toString() });
            reject(new Error(`Speech recognition error: ${error}`));
          }
        );
      } catch (error: any) {
        logger.error('Azure Speech Service error', {
          error: error.message,
          stack: error.stack
        });
        reject(new Error(`Azure Speech Service error: ${error.message}`));
      }
    });
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<boolean> {
    if (!this.speechConfig) {
      return false;
    }

    // For health check, just verify the config is valid
    // Actual audio test would require a valid audio sample
    try {
      return this.isConfigured;
    } catch (error) {
      logger.error('Azure Speech health check failed', { error });
      return false;
    }
  }

  /**
   * Get supported languages (sample list)
   */
  getSupportedLanguages(): string[] {
    return [
      'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN',
      'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT',
      'pt-BR', 'pt-PT', 'zh-CN', 'ja-JP', 'ko-KR'
    ];
  }
}

export default new AzureSpeechService();
