/**
 * Audio Quality Monitor
 *
 * Monitors microphone audio quality in real-time using Web Audio API
 * Provides volume levels, quality metrics, and recommendations
 */

export interface AudioQualityMetrics {
  volume: number; // 0-100 percentage
  rms: number; // Root Mean Square value (0-1)
  peak: number; // Peak amplitude (0-1)
  quality: 'good' | 'acceptable' | 'poor';
  issues: AudioQualityIssue[];
  recommendation?: string;
}

export type AudioQualityIssue =
  | 'too_quiet'
  | 'too_loud'
  | 'clipping'
  | 'noise'
  | 'silence'
  | 'none';

export interface AudioQualityConfig {
  quietThreshold?: number; // RMS threshold for "too quiet" (default: 0.01)
  loudThreshold?: number; // RMS threshold for "too loud" (default: 0.7)
  clippingThreshold?: number; // Peak threshold for clipping (default: 0.98)
  silenceThreshold?: number; // RMS threshold for silence (default: 0.005)
  smoothingFactor?: number; // Exponential smoothing (0-1, default: 0.8)
  updateInterval?: number; // Update interval in ms (default: 100)
}

/**
 * Audio Quality Monitor class
 */
export class AudioQualityMonitor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;
  private updateCallback: ((metrics: AudioQualityMetrics) => void) | null = null;

  private config: Required<AudioQualityConfig> = {
    quietThreshold: 0.01,
    loudThreshold: 0.7,
    clippingThreshold: 0.98,
    silenceThreshold: 0.005,
    smoothingFactor: 0.8,
    updateInterval: 100,
  };

  private smoothedRMS = 0;
  private smoothedPeak = 0;
  private lastUpdateTime = 0;

  /**
   * Initialize audio quality monitoring
   */
  async start(
    stream: MediaStream,
    callback: (metrics: AudioQualityMetrics) => void,
    config?: AudioQualityConfig
  ): Promise<void> {
    // Merge config
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.updateCallback = callback;

    // Create audio context
    this.audioContext = new AudioContext();

    // Create analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Create microphone source from stream
    this.microphone = this.audioContext.createMediaStreamSource(stream);

    // Connect microphone to analyser
    this.microphone.connect(this.analyser);

    // Create data array for frequency data
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    // Start monitoring loop
    this.monitor();
  }

  /**
   * Stop monitoring
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
    this.updateCallback = null;
    this.smoothedRMS = 0;
    this.smoothedPeak = 0;
  }

  /**
   * Monitor audio quality in real-time
   */
  private monitor(): void {
    if (!this.analyser || !this.dataArray || !this.updateCallback) {
      return;
    }

    const currentTime = Date.now();

    // Get time domain data (waveform)
    this.analyser.getByteTimeDomainData(this.dataArray);

    // Calculate metrics
    const { rms, peak } = this.calculateAmplitude(this.dataArray);

    // Apply exponential smoothing
    this.smoothedRMS =
      this.config.smoothingFactor * this.smoothedRMS +
      (1 - this.config.smoothingFactor) * rms;
    this.smoothedPeak =
      this.config.smoothingFactor * this.smoothedPeak +
      (1 - this.config.smoothingFactor) * peak;

    // Update callback at specified interval
    if (currentTime - this.lastUpdateTime >= this.config.updateInterval) {
      const metrics = this.analyzeQuality(this.smoothedRMS, this.smoothedPeak);
      this.updateCallback(metrics);
      this.lastUpdateTime = currentTime;
    }

    // Continue monitoring
    this.animationFrameId = requestAnimationFrame(() => this.monitor());
  }

  /**
   * Calculate RMS and peak amplitude from waveform data
   */
  private calculateAmplitude(dataArray: Uint8Array): { rms: number; peak: number } {
    let sum = 0;
    let peak = 0;

    for (let i = 0; i < dataArray.length; i++) {
      // Convert byte (0-255) to amplitude (-1 to 1)
      const amplitude = (dataArray[i] - 128) / 128;
      const absAmplitude = Math.abs(amplitude);

      // Calculate sum of squares for RMS
      sum += amplitude * amplitude;

      // Track peak
      if (absAmplitude > peak) {
        peak = absAmplitude;
      }
    }

    // Calculate RMS (Root Mean Square)
    const rms = Math.sqrt(sum / dataArray.length);

    return { rms, peak };
  }

  /**
   * Analyze audio quality and detect issues
   */
  private analyzeQuality(rms: number, peak: number): AudioQualityMetrics {
    const issues: AudioQualityIssue[] = [];
    let quality: 'good' | 'acceptable' | 'poor' = 'good';
    let recommendation: string | undefined;

    // Check for silence
    if (rms < this.config.silenceThreshold) {
      issues.push('silence');
      quality = 'poor';
      recommendation = 'No audio detected. Please speak into the microphone.';
    }
    // Check if too quiet
    else if (rms < this.config.quietThreshold) {
      issues.push('too_quiet');
      quality = 'poor';
      recommendation = 'Audio is too quiet. Please speak louder or move closer to the microphone.';
    }
    // Check if too loud
    else if (rms > this.config.loudThreshold) {
      issues.push('too_loud');
      quality = 'acceptable';
      recommendation = 'Audio is very loud. Consider reducing microphone volume or speaking softer.';
    }

    // Check for clipping
    if (peak > this.config.clippingThreshold) {
      issues.push('clipping');
      quality = 'poor';
      recommendation =
        'Audio is clipping (distorted). Please reduce microphone volume or speak softer.';
    }

    // If no issues, mark as none
    if (issues.length === 0) {
      issues.push('none');
    }

    // Calculate volume percentage (0-100)
    const volume = Math.min(100, Math.round(rms * 100 * 2)); // Scale to make it more visible

    return {
      volume,
      rms,
      peak,
      quality,
      issues,
      recommendation,
    };
  }

  /**
   * Get current audio metrics (without callback)
   */
  getCurrentMetrics(): AudioQualityMetrics | null {
    if (!this.analyser || !this.dataArray) {
      return null;
    }

    this.analyser.getByteTimeDomainData(this.dataArray);
    const { rms, peak } = this.calculateAmplitude(this.dataArray);

    return this.analyzeQuality(rms, peak);
  }

  /**
   * Check if audio is active (not silent)
   */
  isAudioActive(): boolean {
    if (!this.analyser || !this.dataArray) {
      return false;
    }

    this.analyser.getByteTimeDomainData(this.dataArray);
    const { rms } = this.calculateAmplitude(this.dataArray);

    return rms > this.config.silenceThreshold;
  }

  /**
   * Get audio level (0-100)
   */
  getAudioLevel(): number {
    const metrics = this.getCurrentMetrics();
    return metrics ? metrics.volume : 0;
  }

  /**
   * Update configuration
   */
  updateConfig(config: AudioQualityConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioQualityConfig {
    return { ...this.config };
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.animationFrameId !== null;
  }
}

export default AudioQualityMonitor;
