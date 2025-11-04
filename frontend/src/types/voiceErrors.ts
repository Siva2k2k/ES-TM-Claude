/**
 * Voice Recognition Error Types
 *
 * Custom error classes for voice recognition failures
 */

/**
 * Base voice error class
 */
export class VoiceError extends Error {
  code: string;
  recoverable: boolean;
  suggestion?: string;
  details?: any;

  constructor(
    message: string,
    code: string = 'VOICE_ERROR',
    recoverable: boolean = true,
    suggestion?: string,
    details?: any
  ) {
    super(message);
    this.name = 'VoiceError';
    this.code = code;
    this.recoverable = recoverable;
    this.suggestion = suggestion;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VoiceError);
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    if (this.suggestion) {
      return `${this.message}. ${this.suggestion}`;
    }
    return this.message;
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      suggestion: this.suggestion,
      details: this.details,
    };
  }
}

/**
 * Microphone access error
 */
export class MicrophoneAccessError extends VoiceError {
  constructor(message: string = 'Microphone access denied', details?: any) {
    super(
      message,
      'MICROPHONE_ACCESS_DENIED',
      true,
      'Please allow microphone access in your browser settings and try again.',
      details
    );
    this.name = 'MicrophoneAccessError';
  }
}

/**
 * Microphone not found error
 */
export class MicrophoneNotFoundError extends VoiceError {
  constructor(message: string = 'No microphone device found', details?: any) {
    super(
      message,
      'MICROPHONE_NOT_FOUND',
      false,
      'Please connect a microphone device and refresh the page.',
      details
    );
    this.name = 'MicrophoneNotFoundError';
  }
}

/**
 * Network connection error
 */
export class NetworkError extends VoiceError {
  constructor(message: string = 'Network connection failed', details?: any) {
    super(
      message,
      'NETWORK_ERROR',
      true,
      'Please check your internet connection and try again.',
      details
    );
    this.name = 'NetworkError';
  }
}

/**
 * Azure Speech recognition error
 */
export class AzureSpeechError extends VoiceError {
  constructor(message: string, recoverable: boolean = true, details?: any) {
    super(
      message,
      'AZURE_SPEECH_ERROR',
      recoverable,
      recoverable ? 'Please try again or switch to Web Speech recognition.' : undefined,
      details
    );
    this.name = 'AzureSpeechError';
  }
}

/**
 * Web Speech API not supported error
 */
export class WebSpeechNotSupportedError extends VoiceError {
  constructor(message: string = 'Web Speech API is not supported in this browser', details?: any) {
    super(
      message,
      'WEB_SPEECH_NOT_SUPPORTED',
      false,
      'Your browser does not support Web Speech. Azure Speech will be used automatically.',
      details
    );
    this.name = 'WebSpeechNotSupportedError';
  }
}

/**
 * Session timeout error
 */
export class SessionTimeoutError extends VoiceError {
  constructor(message: string = 'Voice session timed out', details?: any) {
    super(
      message,
      'SESSION_TIMEOUT',
      true,
      'Please start a new voice session.',
      details
    );
    this.name = 'SessionTimeoutError';
  }
}

/**
 * Audio quality error
 */
export class AudioQualityError extends VoiceError {
  qualityIssue: 'too_quiet' | 'too_loud' | 'clipping' | 'noise';

  constructor(
    qualityIssue: 'too_quiet' | 'too_loud' | 'clipping' | 'noise',
    details?: any
  ) {
    const messages = {
      too_quiet: 'Audio input is too quiet',
      too_loud: 'Audio input is too loud',
      clipping: 'Audio is clipping (distorted)',
      noise: 'Too much background noise detected',
    };

    const suggestions = {
      too_quiet: 'Please speak louder or move closer to the microphone.',
      too_loud: 'Please speak softer or move away from the microphone.',
      clipping: 'Please reduce microphone volume or speak softer.',
      noise: 'Please reduce background noise for better recognition.',
    };

    super(
      messages[qualityIssue],
      'AUDIO_QUALITY_ERROR',
      true,
      suggestions[qualityIssue],
      details
    );

    this.name = 'AudioQualityError';
    this.qualityIssue = qualityIssue;
  }
}

/**
 * Audio format conversion error
 */
export class AudioConversionError extends VoiceError {
  constructor(message: string = 'Failed to convert audio format', details?: any) {
    super(
      message,
      'AUDIO_CONVERSION_ERROR',
      true,
      'There was an issue processing your audio. Please try again.',
      details
    );
    this.name = 'AudioConversionError';
  }
}

/**
 * WebSocket connection error
 */
export class WebSocketError extends VoiceError {
  constructor(message: string, recoverable: boolean = true, details?: any) {
    super(
      message,
      'WEBSOCKET_ERROR',
      recoverable,
      recoverable
        ? 'Connection to voice server failed. Reconnecting...'
        : 'Unable to connect to voice server.',
      details
    );
    this.name = 'WebSocketError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends VoiceError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super(
      message,
      'AUTH_FAILED',
      false,
      'Please log in again to use voice recognition.',
      details
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends VoiceError {
  retryAfter?: number; // seconds

  constructor(message: string = 'Voice recognition rate limit exceeded', retryAfter?: number) {
    super(
      message,
      'RATE_LIMIT_EXCEEDED',
      true,
      retryAfter
        ? `Please wait ${retryAfter} seconds before trying again.`
        : 'Please wait a moment before trying again.',
      { retryAfter }
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Error severity level
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Get error severity
 */
export function getErrorSeverity(error: VoiceError): ErrorSeverity {
  if (error instanceof AudioQualityError) {
    return ErrorSeverity.WARNING;
  }

  if (error instanceof MicrophoneNotFoundError) {
    return ErrorSeverity.CRITICAL;
  }

  if (error instanceof AuthenticationError) {
    return ErrorSeverity.CRITICAL;
  }

  if (error instanceof WebSpeechNotSupportedError) {
    return ErrorSeverity.INFO;
  }

  if (!error.recoverable) {
    return ErrorSeverity.CRITICAL;
  }

  return ErrorSeverity.ERROR;
}

/**
 * Parse error from unknown type
 */
export function parseVoiceError(error: any): VoiceError {
  if (error instanceof VoiceError) {
    return error;
  }

  if (error instanceof Error) {
    return new VoiceError(error.message, 'UNKNOWN_ERROR', true, undefined, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  if (typeof error === 'string') {
    return new VoiceError(error, 'UNKNOWN_ERROR', true);
  }

  if (error && typeof error === 'object') {
    const message = error.message || error.error || 'Unknown error occurred';
    const code = error.errorCode || error.code || 'UNKNOWN_ERROR';
    const recoverable = error.recoverable !== undefined ? error.recoverable : true;
    const suggestion = error.suggestion;
    const details = error.details;

    return new VoiceError(message, code, recoverable, suggestion, details);
  }

  return new VoiceError('Unknown error occurred', 'UNKNOWN_ERROR', true);
}

/**
 * Check if error is related to network/connectivity
 */
export function isNetworkError(error: VoiceError): boolean {
  return (
    error instanceof NetworkError ||
    error instanceof WebSocketError ||
    error.code === 'NETWORK_ERROR' ||
    error.code === 'WEBSOCKET_ERROR' ||
    error.code === 'CONNECTION_FAILED'
  );
}

/**
 * Check if error is related to permissions
 */
export function isPermissionError(error: VoiceError): boolean {
  return (
    error instanceof MicrophoneAccessError ||
    error instanceof AuthenticationError ||
    error.code === 'MICROPHONE_ACCESS_DENIED' ||
    error.code === 'AUTH_FAILED' ||
    error.code === 'PERMISSION_DENIED'
  );
}

/**
 * Check if error is related to audio quality
 */
export function isQualityError(error: VoiceError): boolean {
  return error instanceof AudioQualityError || error.code === 'AUDIO_QUALITY_ERROR';
}

export default VoiceError;
