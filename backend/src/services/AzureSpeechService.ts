// Azure Speech SDK types (package may not be installed)
let sdk: any;
try {
  sdk = require('microsoft-cognitiveservices-speech-sdk');
} catch (e) {
  // Package not installed, will use mock implementation
  sdk = null;
}

export interface SpeechToTextRequest {
  audioData: string;
  language?: string;
  format?: 'wav' | 'webm' | 'ogg' | 'mp3';
}

export interface SpeechToTextResponse {
  transcript: string;
  confidence: number;
  language: string;
  audioFormat?: {
    sampleRate: number;
    channels: number;
    bitDepth: number;
    duration: number;
  };
}

import logger from '../config/logger';
import { AudioValidator } from '../utils/audioValidator';

class AzureSpeechService {
  private speechConfig: any = null;
  private isConfigured: boolean = false;
  private activeSessions: Map<string, any> = new Map(); // sessionId -> session data

  constructor() {
    if (!sdk) {
      logger.warn('Azure Speech SDK not installed');
      return;
    }

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
    if (!sdk || !this.speechConfig) {
      throw new Error('Azure Speech Service is not configured. Please add credentials to .env file or install the SDK package.');
    }

    return new Promise((resolve, reject) => {
      try {
        // Decode base64 audio
        const audioBuffer = Buffer.from(request.audioData, 'base64');

        // Validate audio format
        const audioFormat = AudioValidator.validateWavFile(audioBuffer);

        if (!audioFormat.valid) {
          logger.error('Invalid audio format', { error: audioFormat.error });
          reject(new Error(`Invalid audio format: ${audioFormat.error}`));
          return;
        }

        // Log audio format details
        AudioValidator.logAudioFormat(audioFormat);

        // Warn if format is not optimal
        if (!AudioValidator.isOptimalFormat(audioFormat)) {
          const recommendation = AudioValidator.getFormatRecommendation(audioFormat);
          logger.warn('Non-optimal audio format', { recommendation });
        }

        // Create audio format specification for Azure Speech SDK
        // Use validated format parameters
        const azureAudioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(
          audioFormat.sampleRate!,
          audioFormat.bitDepth!,
          audioFormat.channels!
        );

        // Create push stream with explicit format
        const pushStream = sdk.AudioInputStream.createPushStream(azureAudioFormat);
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
                language: request.language || 'en-US',
                audioFormat: {
                  sampleRate: audioFormat.sampleRate!,
                  channels: audioFormat.channels!,
                  bitDepth: audioFormat.bitDepth!,
                  duration: audioFormat.duration!,
                },
              };

              logger.info('Speech to text successful', {
                transcriptLength: response.transcript.length,
                language: response.language,
                duration: audioFormat.duration,
              });

              resolve(response);
            } else if (result.reason === sdk.ResultReason.NoMatch) {
              const errorMessage = 'Speech could not be recognized. Please try again.';
              logger.warn('Speech recognition - no match', {
                reason: sdk.ResultReason[result.reason],
                audioFormat,
              });
              reject(new Error(errorMessage));
            } else {
              const errorMessage = `Speech recognition failed: ${sdk.ResultReason[result.reason]}`;
              logger.error('Speech recognition failed', {
                reason: sdk.ResultReason[result.reason],
                errorDetails: result.errorDetails,
                audioFormat,
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

  /**
   * Start continuous recognition session
   * @param sessionId - Unique session identifier
   * @param language - Language code (e.g., 'en-US')
   * @param onInterim - Callback for interim results
   * @param onFinal - Callback for final results
   * @param onError - Callback for errors
   * @returns Session object with recognizer and stream
   */
  startContinuousRecognition(
    sessionId: string,
    language: string = 'en-US',
    onInterim: (transcript: string) => void,
    onFinal: (transcript: string, confidence: number) => void,
    onError: (error: string) => void
  ): any {
    if (!sdk || !this.speechConfig) {
      throw new Error('Azure Speech Service is not configured');
    }

    if (this.activeSessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    try {
      // Create audio format specification (16kHz, 16-bit, mono PCM)
      const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);

      // Create push stream with explicit format
      const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);

      // Create audio config from stream
      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

      // Clone speech config and set language
      const recognitionConfig = sdk.SpeechConfig.fromSubscription(
        process.env.AZURE_SPEECH_KEY!,
        process.env.AZURE_SPEECH_REGION!
      );
      recognitionConfig.speechRecognitionLanguage = language;

      // Create recognizer
      const recognizer = new sdk.SpeechRecognizer(recognitionConfig, audioConfig);

      // Set up event handlers
      recognizer.recognizing = (sender: any, event: any) => {
        if (event.result.reason === sdk.ResultReason.RecognizingSpeech) {
          logger.debug('Interim result', {
            sessionId,
            text: event.result.text,
          });
          onInterim(event.result.text);
        }
      };

      recognizer.recognized = (sender: any, event: any) => {
        if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
          logger.info('Final result', {
            sessionId,
            text: event.result.text,
          });
          onFinal(event.result.text, 1.0);
        } else if (event.result.reason === sdk.ResultReason.NoMatch) {
          logger.warn('No speech recognized', { sessionId });
        }
      };

      recognizer.canceled = (sender: any, event: any) => {
        logger.warn('Recognition canceled', {
          sessionId,
          reason: event.reason,
          errorDetails: event.errorDetails,
        });

        if (event.reason === sdk.CancellationReason.Error) {
          onError(event.errorDetails || 'Recognition error');
        }
      };

      recognizer.sessionStopped = (sender: any, event: any) => {
        logger.info('Recognition session stopped', { sessionId });
      };

      // Start continuous recognition
      recognizer.startContinuousRecognitionAsync(
        () => {
          logger.info('Continuous recognition started', { sessionId, language });
        },
        (error: any) => {
          logger.error('Failed to start continuous recognition', {
            sessionId,
            error: error.toString(),
          });
          onError(error.toString());
        }
      );

      // Store session
      const session = {
        sessionId,
        recognizer,
        pushStream,
        audioConfig,
        language,
        startTime: new Date(),
        audioChunksReceived: 0,
        totalBytesReceived: 0,
      };

      this.activeSessions.set(sessionId, session);

      logger.info('Continuous recognition session created', {
        sessionId,
        language,
      });

      return session;
    } catch (error: any) {
      logger.error('Failed to start continuous recognition', {
        sessionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process audio chunk for continuous recognition
   * @param sessionId - Session identifier
   * @param audioChunk - Audio data buffer (PCM/WAV)
   */
  processAudioChunk(sessionId: string, audioChunk: Buffer): void {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      // Write audio chunk to push stream
      session.pushStream.write(audioChunk);

      // Update session statistics
      session.audioChunksReceived++;
      session.totalBytesReceived += audioChunk.length;
      session.lastActivityTime = new Date();

      logger.debug('Audio chunk processed', {
        sessionId,
        chunkSize: audioChunk.length,
        totalChunks: session.audioChunksReceived,
        totalBytes: session.totalBytesReceived,
      });
    } catch (error: any) {
      logger.error('Failed to process audio chunk', {
        sessionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Stop continuous recognition session
   * @param sessionId - Session identifier
   */
  async stopContinuousRecognition(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      logger.warn('Attempted to stop non-existent session', { sessionId });
      return;
    }

    try {
      // Close push stream (signals end of audio)
      session.pushStream.close();

      // Stop continuous recognition
      await new Promise<void>((resolve, reject) => {
        session.recognizer.stopContinuousRecognitionAsync(
          () => {
            logger.info('Continuous recognition stopped', { sessionId });
            resolve();
          },
          (error: any) => {
            logger.error('Failed to stop continuous recognition', {
              sessionId,
              error: error.toString(),
            });
            reject(new Error(error.toString()));
          }
        );
      });

      // Close recognizer
      session.recognizer.close();

      // Remove session
      this.activeSessions.delete(sessionId);

      const duration = (new Date().getTime() - session.startTime.getTime()) / 1000;

      logger.info('Continuous recognition session ended', {
        sessionId,
        duration: duration.toFixed(2) + 's',
        chunksReceived: session.audioChunksReceived,
        totalBytes: session.totalBytesReceived,
      });
    } catch (error: any) {
      logger.error('Error stopping continuous recognition', {
        sessionId,
        error: error.message,
      });

      // Force cleanup
      if (session.recognizer) {
        session.recognizer.close();
      }
      this.activeSessions.delete(sessionId);

      throw error;
    }
  }

  /**
   * Get active session
   */
  getActiveSession(sessionId: string): any | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions count
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Cleanup all active sessions (for shutdown)
   */
  async cleanupAllSessions(): Promise<void> {
    logger.info('Cleaning up all active sessions', {
      count: this.activeSessions.size,
    });

    const sessionIds = Array.from(this.activeSessions.keys());

    for (const sessionId of sessionIds) {
      try {
        await this.stopContinuousRecognition(sessionId);
      } catch (error: any) {
        logger.error('Error cleaning up session', {
          sessionId,
          error: error.message,
        });
      }
    }

    logger.info('All sessions cleaned up');
  }
}

export default new AzureSpeechService();
