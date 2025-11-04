/**
 * Speech Fallback Manager
 *
 * Manages intelligent fallback between Web Speech API and Azure Speech
 * Tracks errors and decides when to switch methods
 */

import { VoiceError } from '../types/voiceErrors';

export type SpeechMethod = 'web-speech' | 'azure-speech';

export interface FallbackConfig {
  maxConsecutiveFailures?: number; // Max failures before permanent fallback (default: 3)
  failureWindowMs?: number; // Time window for counting failures (default: 60000 = 1 minute)
  enableAutoRecovery?: boolean; // Allow recovery to Web Speech after success (default: true)
  successCountForRecovery?: number; // Consecutive successes needed for recovery (default: 5)
}

export interface FallbackState {
  currentMethod: SpeechMethod;
  recommendedMethod: SpeechMethod;
  permanentFallback: boolean;
  failureCount: number;
  successCount: number;
  lastError: VoiceError | null;
  lastErrorTimestamp: number | null;
  fallbackReason: string | null;
}

interface FailureRecord {
  method: SpeechMethod;
  error: VoiceError;
  timestamp: number;
}

/**
 * Speech Fallback Manager class
 */
export class SpeechFallbackManager {
  private config: Required<FallbackConfig> = {
    maxConsecutiveFailures: 3,
    failureWindowMs: 60000,
    enableAutoRecovery: true,
    successCountForRecovery: 5,
  };

  private currentMethod: SpeechMethod;
  private recommendedMethod: SpeechMethod;
  private permanentFallback = false;
  private failureRecords: FailureRecord[] = [];
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private lastError: VoiceError | null = null;
  private lastErrorTimestamp: number | null = null;
  private fallbackReason: string | null = null;

  // Callbacks
  private onMethodChange: ((method: SpeechMethod, reason: string) => void) | null = null;
  private onStateChange: ((state: FallbackState) => void) | null = null;

  constructor(initialMethod: SpeechMethod, config?: FallbackConfig) {
    this.currentMethod = initialMethod;
    this.recommendedMethod = initialMethod;

    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks: {
    onMethodChange?: (method: SpeechMethod, reason: string) => void;
    onStateChange?: (state: FallbackState) => void;
  }): void {
    this.onMethodChange = callbacks.onMethodChange || null;
    this.onStateChange = callbacks.onStateChange || null;
  }

  /**
   * Record a failure
   */
  recordFailure(method: SpeechMethod, error: VoiceError): void {
    const now = Date.now();

    // Add failure record
    this.failureRecords.push({
      method,
      error,
      timestamp: now,
    });

    // Clean old failure records (outside time window)
    this.failureRecords = this.failureRecords.filter(
      (record) => now - record.timestamp < this.config.failureWindowMs
    );

    // Update last error
    this.lastError = error;
    this.lastErrorTimestamp = now;

    // Reset success count
    this.consecutiveSuccesses = 0;

    // Increment consecutive failures if same method
    if (method === this.currentMethod) {
      this.consecutiveFailures++;
    }

    // Count recent failures for this method
    const recentFailures = this.failureRecords.filter((r) => r.method === method).length;

    console.warn(`Speech recognition failure`, {
      method,
      error: error.message,
      consecutiveFailures: this.consecutiveFailures,
      recentFailures,
    });

    // Check if we should fallback
    this.evaluateFallback(method, recentFailures);

    // Emit state change
    this.emitStateChange();
  }

  /**
   * Record a success
   */
  recordSuccess(method: SpeechMethod): void {
    // Reset consecutive failures
    this.consecutiveFailures = 0;

    // Increment consecutive successes
    this.consecutiveSuccesses++;

    // Check if we can recover from fallback
    if (
      this.config.enableAutoRecovery &&
      this.permanentFallback &&
      this.consecutiveSuccesses >= this.config.successCountForRecovery
    ) {
      console.info('Sufficient successes, recovering from fallback', {
        consecutiveSuccesses: this.consecutiveSuccesses,
      });

      this.permanentFallback = false;
      this.fallbackReason = null;
      this.consecutiveSuccesses = 0;

      // Try to use recommended method
      if (this.recommendedMethod !== this.currentMethod) {
        this.switchMethod(this.recommendedMethod, 'Recovered from fallback after consecutive successes');
      }
    }

    // Emit state change
    this.emitStateChange();
  }

  /**
   * Evaluate if fallback is needed
   */
  private evaluateFallback(failedMethod: SpeechMethod, recentFailures: number): void {
    // Already on permanent fallback, no further action
    if (this.permanentFallback && failedMethod === this.currentMethod) {
      return;
    }

    // Check consecutive failures
    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.triggerFallback(
        failedMethod,
        `${this.consecutiveFailures} consecutive failures detected`,
        true
      );
      return;
    }

    // Check recent failures within time window
    if (recentFailures >= this.config.maxConsecutiveFailures) {
      this.triggerFallback(
        failedMethod,
        `${recentFailures} failures within ${this.config.failureWindowMs / 1000}s`,
        true
      );
      return;
    }

    // Single failure - try fallback temporarily
    if (this.consecutiveFailures === 1) {
      this.triggerFallback(failedMethod, 'Single failure detected', false);
    }
  }

  /**
   * Trigger fallback to alternative method
   */
  private triggerFallback(
    failedMethod: SpeechMethod,
    reason: string,
    permanent: boolean
  ): void {
    const alternativeMethod: SpeechMethod =
      failedMethod === 'web-speech' ? 'azure-speech' : 'web-speech';

    if (permanent) {
      this.permanentFallback = true;
      this.fallbackReason = reason;
      console.warn(`Permanent fallback triggered: ${reason}`, {
        from: failedMethod,
        to: alternativeMethod,
      });
    } else {
      console.info(`Temporary fallback triggered: ${reason}`, {
        from: failedMethod,
        to: alternativeMethod,
      });
    }

    this.switchMethod(alternativeMethod, reason);
  }

  /**
   * Switch to specified method
   */
  private switchMethod(method: SpeechMethod, reason: string): void {
    if (method === this.currentMethod) {
      return;
    }

    const oldMethod = this.currentMethod;
    this.currentMethod = method;

    console.info(`Switching speech method`, {
      from: oldMethod,
      to: method,
      reason,
      permanent: this.permanentFallback,
    });

    // Emit method change callback
    if (this.onMethodChange) {
      this.onMethodChange(method, reason);
    }

    // Emit state change
    this.emitStateChange();
  }

  /**
   * Force method switch (user override)
   */
  forceMethod(method: SpeechMethod): void {
    this.currentMethod = method;
    this.permanentFallback = false;
    this.fallbackReason = null;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.failureRecords = [];

    console.info(`Method manually set to ${method}`);

    // Emit callbacks
    if (this.onMethodChange) {
      this.onMethodChange(method, 'User override');
    }

    this.emitStateChange();
  }

  /**
   * Set recommended method (from device detection)
   */
  setRecommendedMethod(method: SpeechMethod): void {
    this.recommendedMethod = method;

    // If not on permanent fallback, switch to recommended
    if (!this.permanentFallback && this.currentMethod !== method) {
      this.switchMethod(method, 'Device detection recommendation');
    }
  }

  /**
   * Get current method
   */
  getCurrentMethod(): SpeechMethod {
    return this.currentMethod;
  }

  /**
   * Get recommended method
   */
  getRecommendedMethod(): SpeechMethod {
    return this.recommendedMethod;
  }

  /**
   * Check if on permanent fallback
   */
  isPermanentFallback(): boolean {
    return this.permanentFallback;
  }

  /**
   * Get fallback state
   */
  getState(): FallbackState {
    return {
      currentMethod: this.currentMethod,
      recommendedMethod: this.recommendedMethod,
      permanentFallback: this.permanentFallback,
      failureCount: this.consecutiveFailures,
      successCount: this.consecutiveSuccesses,
      lastError: this.lastError,
      lastErrorTimestamp: this.lastErrorTimestamp,
      fallbackReason: this.fallbackReason,
    };
  }

  /**
   * Reset fallback state
   */
  reset(): void {
    this.currentMethod = this.recommendedMethod;
    this.permanentFallback = false;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.failureRecords = [];
    this.lastError = null;
    this.lastErrorTimestamp = null;
    this.fallbackReason = null;

    console.info('Fallback manager reset');

    this.emitStateChange();
  }

  /**
   * Update configuration
   */
  updateConfig(config: FallbackConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): FallbackConfig {
    return { ...this.config };
  }

  /**
   * Emit state change
   */
  private emitStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalFailures: number;
    recentFailures: number;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    isPermanentFallback: boolean;
    currentMethod: SpeechMethod;
  } {
    return {
      totalFailures: this.failureRecords.length,
      recentFailures: this.failureRecords.filter(
        (r) => Date.now() - r.timestamp < this.config.failureWindowMs
      ).length,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      isPermanentFallback: this.permanentFallback,
      currentMethod: this.currentMethod,
    };
  }
}

export default SpeechFallbackManager;
