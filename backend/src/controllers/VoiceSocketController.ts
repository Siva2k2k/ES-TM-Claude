/**
 * Voice WebSocket Controller
 *
 * Handles WebSocket events for real-time voice recognition
 */

import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedSocket } from '../middleware/socketAuth';
import AzureSpeechService from '../services/AzureSpeechService';
import { AudioValidator } from '../utils/audioValidator';
import logger from '../config/logger';
import {
  VoiceSocketEvents,
  VoiceStartEvent,
  VoiceAudioChunkEvent,
  VoiceStopEvent,
  VoicePingEvent,
  VoiceSessionStartedEvent,
  VoiceInterimEvent,
  VoiceFinalEvent,
  VoiceErrorEvent,
  VoiceSessionStoppedEvent,
  VoicePongEvent,
  VoiceErrorCode,
} from '../types/voiceSocket.types';

/**
 * Session timeout configuration (in milliseconds)
 */
const SESSION_TIMEOUT = 30000; // 30 seconds of inactivity
const MAX_SESSION_DURATION = 300000; // 5 minutes max
const MAX_AUDIO_CHUNK_SIZE = 1024 * 1024; // 1MB
const MAX_TOTAL_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Voice Socket Controller class
 */
class VoiceSocketController {
  private socketSessions: Map<string, string> = new Map(); // socketId -> sessionId
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Attach event handlers to socket
   */
  attachHandlers(socket: AuthenticatedSocket): void {
    socket.on(VoiceSocketEvents.VOICE_START, (data: VoiceStartEvent) => {
      this.handleVoiceStart(socket, data);
    });

    socket.on(VoiceSocketEvents.VOICE_AUDIO_CHUNK, (data: VoiceAudioChunkEvent) => {
      this.handleAudioChunk(socket, data);
    });

    socket.on(VoiceSocketEvents.VOICE_STOP, (data: VoiceStopEvent) => {
      this.handleVoiceStop(socket, data);
    });

    socket.on(VoiceSocketEvents.VOICE_PING, (data: VoicePingEvent) => {
      this.handlePing(socket, data);
    });
  }

  /**
   * Handle voice:start event
   */
  private handleVoiceStart(socket: AuthenticatedSocket, data: VoiceStartEvent): void {
    const user = socket.user;
    const sessionId = uuidv4();

    try {
      // Check if Azure Speech is configured
      if (!AzureSpeechService.isServiceConfigured()) {
        this.emitError(socket, {
          error: 'Azure Speech Service is not configured',
          errorCode: VoiceErrorCode.AZURE_NOT_CONFIGURED,
          recoverable: false,
          suggestion: 'Please contact system administrator',
        });
        return;
      }

      // Check if user already has an active session
      const existingSessionId = this.socketSessions.get(socket.id);
      if (existingSessionId) {
        this.emitError(socket, {
          sessionId: existingSessionId,
          error: 'Session already active. Stop current session before starting new one.',
          errorCode: VoiceErrorCode.INVALID_SESSION,
          recoverable: true,
          suggestion: 'Call voice:stop first',
        });
        return;
      }

      const language = data.language || 'en-US';

      // Start continuous recognition
      AzureSpeechService.startContinuousRecognition(
        sessionId,
        language,
        // onInterim callback
        (transcript: string) => {
          this.emitInterimResult(socket, sessionId, transcript);
          this.resetSessionTimeout(sessionId);
        },
        // onFinal callback
        (transcript: string, confidence: number) => {
          this.emitFinalResult(socket, sessionId, transcript, confidence);
          this.resetSessionTimeout(sessionId);
        },
        // onError callback
        (error: string) => {
          this.emitError(socket, {
            sessionId,
            error: `Recognition error: ${error}`,
            errorCode: VoiceErrorCode.RECOGNITION_FAILED,
            recoverable: false,
            suggestion: 'Try restarting the session',
          });
        }
      );

      // Store session mapping
      this.socketSessions.set(socket.id, sessionId);

      // Set session timeout
      this.resetSessionTimeout(sessionId);

      // Set max session duration timeout
      setTimeout(() => {
        if (this.socketSessions.get(socket.id) === sessionId) {
          logger.warn('Session max duration reached', { sessionId, userId: user._id });
          this.handleVoiceStop(socket, { sessionId });
        }
      }, MAX_SESSION_DURATION);

      // Emit session started event
      const response: VoiceSessionStartedEvent = {
        sessionId,
        language,
        success: true,
        message: 'Voice recognition session started successfully',
      };

      socket.emit(VoiceSocketEvents.VOICE_SESSION_STARTED, response);

      logger.info('Voice session started', {
        socketId: socket.id,
        sessionId,
        userId: user._id,
        language,
      });
    } catch (error: any) {
      logger.error('Failed to start voice session', {
        socketId: socket.id,
        userId: user._id,
        error: error.message,
      });

      this.emitError(socket, {
        error: `Failed to start voice session: ${error.message}`,
        errorCode: VoiceErrorCode.INTERNAL_ERROR,
        recoverable: true,
        suggestion: 'Please try again',
      });
    }
  }

  /**
   * Handle voice:audio-chunk event
   */
  private handleAudioChunk(socket: AuthenticatedSocket, data: VoiceAudioChunkEvent): void {
    const user = socket.user;
    const { sessionId, audioData, chunkIndex, timestamp } = data;

    try {
      // Verify session exists
      const activeSessionId = this.socketSessions.get(socket.id);
      if (!activeSessionId || activeSessionId !== sessionId) {
        this.emitError(socket, {
          sessionId,
          error: 'Invalid session ID',
          errorCode: VoiceErrorCode.INVALID_SESSION,
          recoverable: false,
          suggestion: 'Start a new session with voice:start',
        });
        return;
      }

      // Decode base64 audio
      const audioBuffer = Buffer.from(audioData, 'base64');

      // Validate chunk size
      if (audioBuffer.length > MAX_AUDIO_CHUNK_SIZE) {
        this.emitError(socket, {
          sessionId,
          error: `Audio chunk too large: ${audioBuffer.length} bytes (max: ${MAX_AUDIO_CHUNK_SIZE})`,
          errorCode: VoiceErrorCode.AUDIO_TOO_LARGE,
          recoverable: true,
          suggestion: 'Reduce audio chunk size',
        });
        return;
      }

      // Get session from Azure Speech Service
      const session = AzureSpeechService.getActiveSession(sessionId);
      if (!session) {
        this.emitError(socket, {
          sessionId,
          error: 'Session not found in Azure Speech Service',
          errorCode: VoiceErrorCode.SESSION_NOT_FOUND,
          recoverable: false,
          suggestion: 'Start a new session',
        });
        return;
      }

      // Check total audio size
      if (session.totalBytesReceived + audioBuffer.length > MAX_TOTAL_AUDIO_SIZE) {
        this.emitError(socket, {
          sessionId,
          error: `Total audio size limit exceeded: ${MAX_TOTAL_AUDIO_SIZE} bytes`,
          errorCode: VoiceErrorCode.AUDIO_TOO_LARGE,
          recoverable: false,
          suggestion: 'Stop and start a new session',
        });
        this.handleVoiceStop(socket, { sessionId });
        return;
      }

      // Process audio chunk
      AzureSpeechService.processAudioChunk(sessionId, audioBuffer);

      // Reset session timeout
      this.resetSessionTimeout(sessionId);

      logger.debug('Audio chunk processed', {
        sessionId,
        userId: user._id,
        chunkIndex,
        chunkSize: audioBuffer.length,
      });
    } catch (error: any) {
      logger.error('Failed to process audio chunk', {
        socketId: socket.id,
        sessionId,
        userId: user._id,
        error: error.message,
      });

      this.emitError(socket, {
        sessionId,
        error: `Failed to process audio chunk: ${error.message}`,
        errorCode: VoiceErrorCode.INTERNAL_ERROR,
        recoverable: true,
        suggestion: 'Try sending the chunk again',
      });
    }
  }

  /**
   * Handle voice:stop event
   */
  private async handleVoiceStop(socket: AuthenticatedSocket, data: VoiceStopEvent): Promise<void> {
    const user = socket.user;
    const { sessionId } = data;

    try {
      // Verify session exists
      const activeSessionId = this.socketSessions.get(socket.id);
      if (!activeSessionId || activeSessionId !== sessionId) {
        this.emitError(socket, {
          sessionId,
          error: 'Invalid session ID',
          errorCode: VoiceErrorCode.INVALID_SESSION,
          recoverable: false,
        });
        return;
      }

      // Get session stats before stopping
      const session = AzureSpeechService.getActiveSession(sessionId);
      const audioChunksReceived = session?.audioChunksReceived || 0;
      const totalBytesReceived = session?.totalBytesReceived || 0;
      const startTime = session?.startTime || new Date();
      const duration = (new Date().getTime() - startTime.getTime()) / 1000;

      // Stop continuous recognition
      await AzureSpeechService.stopContinuousRecognition(sessionId);

      // Clear session timeout
      this.clearSessionTimeout(sessionId);

      // Remove session mapping
      this.socketSessions.delete(socket.id);

      // Emit session stopped event
      const response: VoiceSessionStoppedEvent = {
        sessionId,
        reason: 'user_request',
        duration,
        audioChunksReceived,
        totalBytesReceived,
      };

      socket.emit(VoiceSocketEvents.VOICE_SESSION_STOPPED, response);

      logger.info('Voice session stopped', {
        socketId: socket.id,
        sessionId,
        userId: user._id,
        duration: duration.toFixed(2) + 's',
        audioChunksReceived,
        totalBytesReceived,
      });
    } catch (error: any) {
      logger.error('Failed to stop voice session', {
        socketId: socket.id,
        sessionId,
        userId: user._id,
        error: error.message,
      });

      // Force cleanup
      this.clearSessionTimeout(sessionId);
      this.socketSessions.delete(socket.id);

      this.emitError(socket, {
        sessionId,
        error: `Failed to stop voice session: ${error.message}`,
        errorCode: VoiceErrorCode.INTERNAL_ERROR,
        recoverable: false,
      });
    }
  }

  /**
   * Handle voice:ping event
   */
  private handlePing(socket: AuthenticatedSocket, data: VoicePingEvent): void {
    const response: VoicePongEvent = {
      timestamp: data.timestamp,
      serverTime: Date.now(),
    };

    socket.emit(VoiceSocketEvents.VOICE_PONG, response);
  }

  /**
   * Emit interim result
   */
  private emitInterimResult(
    socket: AuthenticatedSocket,
    sessionId: string,
    transcript: string
  ): void {
    const event: VoiceInterimEvent = {
      sessionId,
      transcript,
      timestamp: Date.now(),
    };

    socket.emit(VoiceSocketEvents.VOICE_INTERIM, event);
  }

  /**
   * Emit final result
   */
  private emitFinalResult(
    socket: AuthenticatedSocket,
    sessionId: string,
    transcript: string,
    confidence: number
  ): void {
    const session = AzureSpeechService.getActiveSession(sessionId);
    const startTime = session?.startTime || new Date();
    const duration = (new Date().getTime() - startTime.getTime()) / 1000;

    const event: VoiceFinalEvent = {
      sessionId,
      transcript,
      confidence,
      duration,
      timestamp: Date.now(),
    };

    socket.emit(VoiceSocketEvents.VOICE_FINAL, event);
  }

  /**
   * Emit error event
   */
  private emitError(socket: AuthenticatedSocket, error: VoiceErrorEvent): void {
    socket.emit(VoiceSocketEvents.VOICE_ERROR, error);
  }

  /**
   * Reset session timeout
   */
  private resetSessionTimeout(sessionId: string): void {
    // Clear existing timeout
    this.clearSessionTimeout(sessionId);

    // Set new timeout
    const timeout = setTimeout(() => {
      logger.warn('Session timeout due to inactivity', { sessionId });

      // Find socket for this session
      for (const [socketId, sid] of this.socketSessions.entries()) {
        if (sid === sessionId) {
          // Cleanup session
          AzureSpeechService.stopContinuousRecognition(sessionId).catch((error) => {
            logger.error('Error stopping session on timeout', { sessionId, error: error.message });
          });

          this.socketSessions.delete(socketId);
          break;
        }
      }

      this.sessionTimeouts.delete(sessionId);
    }, SESSION_TIMEOUT);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  /**
   * Clear session timeout
   */
  private clearSessionTimeout(sessionId: string): void {
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }
  }

  /**
   * Cleanup sessions for a specific socket
   */
  async cleanupSocketSessions(socket: AuthenticatedSocket): Promise<void> {
    const sessionId = this.socketSessions.get(socket.id);

    if (sessionId) {
      logger.info('Cleaning up session for disconnected socket', {
        socketId: socket.id,
        sessionId,
        userId: socket.userId,
      });

      try {
        await AzureSpeechService.stopContinuousRecognition(sessionId);
      } catch (error: any) {
        logger.error('Error cleaning up session', {
          sessionId,
          error: error.message,
        });
      }

      this.clearSessionTimeout(sessionId);
      this.socketSessions.delete(socket.id);
    }
  }

  /**
   * Cleanup all sessions
   */
  async cleanupAllSessions(): Promise<void> {
    logger.info('Cleaning up all socket sessions', {
      count: this.socketSessions.size,
    });

    // Clear all timeouts
    for (const timeout of this.sessionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.sessionTimeouts.clear();

    // Stop all Azure Speech sessions
    await AzureSpeechService.cleanupAllSessions();

    // Clear socket sessions
    this.socketSessions.clear();

    logger.info('All socket sessions cleaned up');
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.socketSessions.size;
  }
}

export default VoiceSocketController;
