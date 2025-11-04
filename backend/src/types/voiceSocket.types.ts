/**
 * Voice WebSocket Types
 *
 * Type definitions for voice recognition WebSocket communication
 */

import { IUser } from '../models/User';

/**
 * Socket authentication data
 */
export interface SocketAuthData {
  token: string;
  userId?: string;
}

/**
 * Authenticated socket with user data
 */
export interface AuthenticatedSocket {
  id: string;
  user: IUser;
  sessionId?: string;
  emit: (event: string, data: any) => void;
  disconnect: () => void;
}

/**
 * Voice session metadata
 */
export interface VoiceSession {
  sessionId: string;
  userId: string;
  language: string;
  startTime: Date;
  recognizer: any; // Azure Speech SDK recognizer instance
  pushStream: any; // Azure Speech SDK push stream
  isActive: boolean;
  audioChunksReceived: number;
  totalBytesReceived: number;
  lastActivityTime: Date;
}

/**
 * Client -> Server Events
 */

/**
 * Start voice recognition session
 */
export interface VoiceStartEvent {
  language?: string; // Language code (e.g., 'en-US')
  sampleRate?: number; // Audio sample rate (default: 16000)
  channels?: number; // Number of channels (default: 1)
}

/**
 * Audio chunk data
 */
export interface VoiceAudioChunkEvent {
  sessionId: string;
  audioData: string; // Base64-encoded audio chunk (PCM/WAV)
  chunkIndex: number; // Sequential chunk index
  timestamp: number; // Client timestamp
}

/**
 * Stop voice recognition
 */
export interface VoiceStopEvent {
  sessionId: string;
}

/**
 * Ping for connection monitoring
 */
export interface VoicePingEvent {
  timestamp: number;
}

/**
 * Server -> Client Events
 */

/**
 * Session started confirmation
 */
export interface VoiceSessionStartedEvent {
  sessionId: string;
  language: string;
  success: boolean;
  message?: string;
}

/**
 * Interim transcript (real-time partial results)
 */
export interface VoiceInterimEvent {
  sessionId: string;
  transcript: string;
  timestamp: number;
}

/**
 * Final transcript (completed utterance)
 */
export interface VoiceFinalEvent {
  sessionId: string;
  transcript: string;
  confidence: number;
  duration: number; // Duration in seconds
  timestamp: number;
}

/**
 * Error event
 */
export interface VoiceErrorEvent {
  sessionId?: string;
  error: string;
  errorCode?: string;
  details?: string;
  recoverable: boolean; // Can client retry?
  suggestion?: string; // Recovery suggestion
}

/**
 * Session stopped confirmation
 */
export interface VoiceSessionStoppedEvent {
  sessionId: string;
  reason: 'user_request' | 'timeout' | 'error' | 'completed';
  duration: number; // Session duration in seconds
  audioChunksReceived: number;
  totalBytesReceived: number;
}

/**
 * Pong response
 */
export interface VoicePongEvent {
  timestamp: number;
  serverTime: number;
}

/**
 * Audio quality feedback
 */
export interface VoiceQualityEvent {
  sessionId: string;
  quality: 'good' | 'acceptable' | 'poor';
  audioLevel: number; // 0-100
  message?: string;
}

/**
 * WebSocket event names
 */
export const VoiceSocketEvents = {
  // Client -> Server
  VOICE_START: 'voice:start',
  VOICE_AUDIO_CHUNK: 'voice:audio-chunk',
  VOICE_STOP: 'voice:stop',
  VOICE_PING: 'voice:ping',

  // Server -> Client
  VOICE_SESSION_STARTED: 'voice:session-started',
  VOICE_INTERIM: 'voice:interim',
  VOICE_FINAL: 'voice:final',
  VOICE_ERROR: 'voice:error',
  VOICE_SESSION_STOPPED: 'voice:session-stopped',
  VOICE_PONG: 'voice:pong',
  VOICE_QUALITY: 'voice:quality',

  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
} as const;

/**
 * Error codes for voice recognition
 */
export enum VoiceErrorCode {
  AUTH_FAILED = 'AUTH_FAILED',
  INVALID_SESSION = 'INVALID_SESSION',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  AZURE_NOT_CONFIGURED = 'AZURE_NOT_CONFIGURED',
  RECOGNITION_FAILED = 'RECOGNITION_FAILED',
  INVALID_AUDIO_FORMAT = 'INVALID_AUDIO_FORMAT',
  AUDIO_TOO_LARGE = 'AUDIO_TOO_LARGE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Session configuration
 */
export interface VoiceSessionConfig {
  maxSessionDuration: number; // Maximum session duration in seconds (default: 300)
  sessionTimeout: number; // Inactivity timeout in seconds (default: 30)
  maxAudioChunkSize: number; // Maximum chunk size in bytes (default: 1MB)
  maxTotalAudioSize: number; // Maximum total audio size in bytes (default: 50MB)
  supportedLanguages: string[]; // Supported language codes
}

/**
 * Session statistics
 */
export interface VoiceSessionStats {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  audioChunksReceived: number;
  totalBytesReceived: number;
  interimResults: number;
  finalResults: number;
  errors: number;
  language: string;
}

export default VoiceSocketEvents;
