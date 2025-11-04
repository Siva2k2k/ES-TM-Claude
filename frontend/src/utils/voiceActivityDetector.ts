/**
 * Voice Activity Detector (VAD)
 *
 * Detects speech vs silence in audio stream
 * Supports auto-stop after silence duration
 */

export type VoiceActivityState = 'idle' | 'speech_detected' | 'speaking' | 'silence_detected';

export interface VoiceActivityConfig {
  energyThreshold?: number; // Energy threshold for speech detection (default: 0.02)
  silenceDuration?: number; // Duration of silence before auto-stop in ms (default: 2000)
  speechDuration?: number; // Minimum speech duration to confirm speaking in ms (default: 300)
  smoothingFactor?: number; // Smoothing factor for energy calculation (default: 0.85)
  updateInterval?: number; // Update interval in ms (default: 100)
}

export interface VoiceActivityEvent {
  state: VoiceActivityState;
  isSpeaking: boolean;
  energy: number; // Current energy level (0-1)
  silenceDurationMs: number; // Duration of current silence in ms
  speechDurationMs: number; // Duration of current speech in ms
  timestamp: number;
}

/**
 * Voice Activity Detector class
 */
export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Float32Array | null = null;
  private animationFrameId: number | null = null;

  private config: Required<VoiceActivityConfig> = {
    energyThreshold: 0.02,
    silenceDuration: 2000,
    speechDuration: 300,
    smoothingFactor: 0.85,
    updateInterval: 100,
  };

  private state: VoiceActivityState = 'idle';
  private smoothedEnergy = 0;
  private silenceStartTime: number | null = null;
  private speechStartTime: number | null = null;
  private lastUpdateTime = 0;

  private onStateChange: ((event: VoiceActivityEvent) => void) | null = null;
  private onSilenceDetected: (() => void) | null = null;
  private onSpeechDetected: (() => void) | null = null;

  /**
   * Start voice activity detection
   */
  async start(
    stream: MediaStream,
    callbacks: {
      onStateChange?: (event: VoiceActivityEvent) => void;
      onSilenceDetected?: () => void;
      onSpeechDetected?: () => void;
    },
    config?: VoiceActivityConfig
  ): Promise<void> {
    // Merge config
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.onStateChange = callbacks.onStateChange || null;
    this.onSilenceDetected = callbacks.onSilenceDetected || null;
    this.onSpeechDetected = callbacks.onSpeechDetected || null;

    // Create audio context
    this.audioContext = new AudioContext();

    // Create analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Create microphone source
    this.microphone = this.audioContext.createMediaStreamSource(stream);

    // Connect microphone to analyser
    this.microphone.connect(this.analyser);

    // Create data array for time domain analysis
    const bufferLength = this.analyser.fftSize;
    this.dataArray = new Float32Array(bufferLength);

    // Reset state
    this.state = 'idle';
    this.smoothedEnergy = 0;
    this.silenceStartTime = null;
    this.speechStartTime = null;
    this.lastUpdateTime = Date.now();

    // Start detection loop
    this.detect();
  }

  /**
   * Stop voice activity detection
   */
  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.dataArray = null;
    this.onStateChange = null;
    this.onSilenceDetected = null;
    this.onSpeechDetected = null;
    this.state = 'idle';
    this.smoothedEnergy = 0;
    this.silenceStartTime = null;
    this.speechStartTime = null;
  }

  /**
   * Detection loop
   */
  private detect(): void {
    if (!this.analyser || !this.dataArray) {
      return;
    }

    const currentTime = Date.now();

    // Get time domain data
    this.analyser.getFloatTimeDomainData(this.dataArray);

    // Calculate energy
    const energy = this.calculateEnergy(this.dataArray);

    // Apply exponential smoothing
    this.smoothedEnergy =
      this.config.smoothingFactor * this.smoothedEnergy +
      (1 - this.config.smoothingFactor) * energy;

    // Update state machine
    this.updateState(this.smoothedEnergy, currentTime);

    // Emit state change at specified interval
    if (currentTime - this.lastUpdateTime >= this.config.updateInterval) {
      this.emitStateChange(currentTime);
      this.lastUpdateTime = currentTime;
    }

    // Continue detection
    this.animationFrameId = requestAnimationFrame(() => this.detect());
  }

  /**
   * Calculate energy from audio data
   */
  private calculateEnergy(dataArray: Float32Array): number {
    let sum = 0;

    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }

    return Math.sqrt(sum / dataArray.length);
  }

  /**
   * Update state machine based on energy level
   */
  private updateState(energy: number, currentTime: number): void {
    const isSpeech = energy > this.config.energyThreshold;
    const oldState = this.state;

    switch (this.state) {
      case 'idle':
        if (isSpeech) {
          this.state = 'speech_detected';
          this.speechStartTime = currentTime;
          this.silenceStartTime = null;
        }
        break;

      case 'speech_detected':
        if (isSpeech) {
          // Check if speech duration threshold met
          const speechDuration = currentTime - (this.speechStartTime || currentTime);
          if (speechDuration >= this.config.speechDuration) {
            this.state = 'speaking';

            // Trigger speech detected callback
            if (this.onSpeechDetected) {
              this.onSpeechDetected();
            }
          }
        } else {
          // False alarm, back to idle
          this.state = 'idle';
          this.speechStartTime = null;
        }
        break;

      case 'speaking':
        if (!isSpeech) {
          this.state = 'silence_detected';
          this.silenceStartTime = currentTime;
        }
        break;

      case 'silence_detected':
        if (isSpeech) {
          // Speech resumed
          this.state = 'speaking';
          this.silenceStartTime = null;
        } else {
          // Check if silence duration threshold met
          const silenceDuration = currentTime - (this.silenceStartTime || currentTime);
          if (silenceDuration >= this.config.silenceDuration) {
            this.state = 'idle';
            this.speechStartTime = null;
            this.silenceStartTime = null;

            // Trigger silence detected callback (auto-stop)
            if (this.onSilenceDetected) {
              this.onSilenceDetected();
            }
          }
        }
        break;
    }

    // Log state transitions
    if (oldState !== this.state) {
      console.debug(`VAD state: ${oldState} -> ${this.state}`);
    }
  }

  /**
   * Emit state change event
   */
  private emitStateChange(currentTime: number): void {
    if (!this.onStateChange) {
      return;
    }

    const silenceDurationMs = this.silenceStartTime
      ? currentTime - this.silenceStartTime
      : 0;

    const speechDurationMs = this.speechStartTime
      ? currentTime - this.speechStartTime
      : 0;

    const event: VoiceActivityEvent = {
      state: this.state,
      isSpeaking: this.state === 'speaking' || this.state === 'speech_detected',
      energy: this.smoothedEnergy,
      silenceDurationMs,
      speechDurationMs,
      timestamp: currentTime,
    };

    this.onStateChange(event);
  }

  /**
   * Get current state
   */
  getState(): VoiceActivityState {
    return this.state;
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.state === 'speaking' || this.state === 'speech_detected';
  }

  /**
   * Get current energy level
   */
  getEnergy(): number {
    return this.smoothedEnergy;
  }

  /**
   * Update configuration
   */
  updateConfig(config: VoiceActivityConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): VoiceActivityConfig {
    return { ...this.config };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = 'idle';
    this.smoothedEnergy = 0;
    this.silenceStartTime = null;
    this.speechStartTime = null;
  }

  /**
   * Check if detector is active
   */
  isActive(): boolean {
    return this.animationFrameId !== null;
  }
}

export default VoiceActivityDetector;
