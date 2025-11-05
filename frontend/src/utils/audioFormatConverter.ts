/**
 * Audio Format Converter for Azure Speech SDK Compatibility
 *
 * Converts MediaRecorder output (WebM/Opus, Ogg/Opus, MP4/AAC) to Azure-compatible format:
 * - Sample Rate: 16,000 Hz
 * - Bit Depth: 16-bit signed integer
 * - Channels: 1 (Mono)
 * - Container: WAV with RIFF header
 * - Encoding: PCM (uncompressed)
 */

export interface AudioConversionOptions {
  targetSampleRate?: number;
  targetChannels?: number;
  targetBitDepth?: number;
}

export interface AudioConversionResult {
  wavBuffer: ArrayBuffer;
  duration: number;
  originalSampleRate: number;
  originalChannels: number;
  success: boolean;
  error?: string;
}

/**
 * Audio Format Converter class
 * Handles conversion of various audio formats to Azure Speech SDK compatible WAV format
 */
export class AudioFormatConverter {
  private static readonly AZURE_SAMPLE_RATE = 16000;
  private static readonly AZURE_CHANNELS = 1;
  private static readonly AZURE_BIT_DEPTH = 16;

  /**
   * Convert audio blob to Azure-compatible WAV format
   * @param audioBlob - Audio blob from MediaRecorder
   * @param options - Optional conversion parameters
   * @returns Promise with conversion result
   */
  static async convertToAzureFormat(
    audioBlob: Blob,
    options: AudioConversionOptions = {}
  ): Promise<AudioConversionResult> {
    const targetSampleRate = options.targetSampleRate || this.AZURE_SAMPLE_RATE;
    const targetChannels = options.targetChannels || this.AZURE_CHANNELS;
    const targetBitDepth = options.targetBitDepth || this.AZURE_BIT_DEPTH;

    try {
      // Step 1: Decode blob to AudioBuffer
      const audioBuffer = await this.decodeAudioBlob(audioBlob);

      if (!audioBuffer) {
        throw new Error('Failed to decode audio blob');
      }

      const originalSampleRate = audioBuffer.sampleRate;
      const originalChannels = audioBuffer.numberOfChannels;

      // Step 2: Resample and convert to mono if needed
      const resampledBuffer = await this.resampleAudio(
        audioBuffer,
        targetSampleRate,
        targetChannels
      );

      // Step 3: Convert AudioBuffer to Int16 PCM
      const pcmData = this.audioBufferToInt16PCM(resampledBuffer);

      // Step 4: Create WAV file with RIFF header
      const wavBuffer = this.createWavFile(
        pcmData,
        targetSampleRate,
        targetChannels,
        targetBitDepth
      );

      return {
        wavBuffer,
        duration: resampledBuffer.duration,
        originalSampleRate,
        originalChannels,
        success: true,
      };
    } catch (error: any) {
      // Use warn instead of error since partial failures are expected during streaming
      console.warn('Audio conversion warning:', error.message || error);
      return {
        wavBuffer: new ArrayBuffer(0),
        duration: 0,
        originalSampleRate: 0,
        originalChannels: 0,
        success: false,
        error: error.message || 'Unknown conversion error',
      };
    }
  }

  /**
   * Decode audio blob to AudioBuffer using Web Audio API
   */
  private static async decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext();

    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      await audioContext.close();
      return audioBuffer;
    } catch (error) {
      await audioContext.close();
      throw new Error(`Failed to decode audio: ${error}`);
    }
  }

  /**
   * Resample audio to target sample rate and channels using OfflineAudioContext
   */
  private static async resampleAudio(
    audioBuffer: AudioBuffer,
    targetSampleRate: number,
    targetChannels: number
  ): Promise<AudioBuffer> {
    // If no conversion needed, return original
    if (
      audioBuffer.sampleRate === targetSampleRate &&
      audioBuffer.numberOfChannels === targetChannels
    ) {
      return audioBuffer;
    }

    // Calculate duration in samples for target sample rate
    const durationInSamples = Math.ceil(audioBuffer.duration * targetSampleRate);

    // Create offline context with target configuration
    const offlineContext = new OfflineAudioContext(
      targetChannels,
      durationInSamples,
      targetSampleRate
    );

    // Create buffer source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    // Connect source to destination
    source.connect(offlineContext.destination);

    // Start playback
    source.start(0);

    // Render audio
    try {
      const resampledBuffer = await offlineContext.startRendering();
      return resampledBuffer;
    } catch (error) {
      throw new Error(`Failed to resample audio: ${error}`);
    }
  }

  /**
   * Convert AudioBuffer (Float32) to Int16 PCM array
   */
  private static audioBufferToInt16PCM(audioBuffer: AudioBuffer): Int16Array {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const totalSamples = length * numberOfChannels;
    const pcmData = new Int16Array(totalSamples);

    // Interleave channels if stereo
    if (numberOfChannels === 2) {
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.getChannelData(1);

      for (let i = 0; i < length; i++) {
        // Interleave left and right channels
        pcmData[i * 2] = this.floatToInt16(leftChannel[i]);
        pcmData[i * 2 + 1] = this.floatToInt16(rightChannel[i]);
      }
    } else {
      // Mono channel
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        pcmData[i] = this.floatToInt16(channelData[i]);
      }
    }

    return pcmData;
  }

  /**
   * Convert Float32 sample (-1.0 to 1.0) to Int16 (-32768 to 32767)
   */
  private static floatToInt16(float: number): number {
    // Clamp value between -1 and 1
    const clamped = Math.max(-1, Math.min(1, float));

    // Convert to Int16 range
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;

    return Math.round(int16);
  }

  /**
   * Create WAV file with RIFF header
   */
  public static createWavFile(
    pcmData: Int16Array,
    sampleRate: number,
    numChannels: number,
    bitDepth: number
  ): ArrayBuffer {
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length * bytesPerSample;
    const fileSize = 44 + dataSize; // 44 bytes for WAV header

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    let offset = 0;

    // RIFF chunk descriptor
    this.writeString(view, offset, 'RIFF');
    offset += 4;
    view.setUint32(offset, fileSize - 8, true); // File size - 8 bytes
    offset += 4;
    this.writeString(view, offset, 'WAVE');
    offset += 4;

    // fmt sub-chunk
    this.writeString(view, offset, 'fmt ');
    offset += 4;
    view.setUint32(offset, 16, true); // Subchunk1Size (16 for PCM)
    offset += 4;
    view.setUint16(offset, 1, true); // AudioFormat (1 = PCM)
    offset += 2;
    view.setUint16(offset, numChannels, true); // NumChannels
    offset += 2;
    view.setUint32(offset, sampleRate, true); // SampleRate
    offset += 4;
    view.setUint32(offset, byteRate, true); // ByteRate
    offset += 4;
    view.setUint16(offset, blockAlign, true); // BlockAlign
    offset += 2;
    view.setUint16(offset, bitDepth, true); // BitsPerSample
    offset += 2;

    // data sub-chunk
    this.writeString(view, offset, 'data');
    offset += 4;
    view.setUint32(offset, dataSize, true); // Subchunk2Size
    offset += 4;

    // Write PCM data
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(offset, pcmData[i], true); // Little-endian
      offset += 2;
    }

    return buffer;
  }

  /**
   * Write ASCII string to DataView
   */
  private static writeString(view: DataView, offset: number, text: string): void {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  }

  /**
   * Get audio info from blob without full conversion
   */
  static async getAudioInfo(audioBlob: Blob): Promise<{
    duration: number;
    sampleRate: number;
    channels: number;
  }> {
    try {
      const audioBuffer = await this.decodeAudioBlob(audioBlob);
      return {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
      };
    } catch (error) {
      throw new Error(`Failed to get audio info: ${error}`);
    }
  }

  /**
   * Validate if audio blob is compatible with conversion
   */
  static async validateAudioBlob(audioBlob: Blob): Promise<{
    valid: boolean;
    error?: string;
  }> {
    if (!audioBlob || audioBlob.size === 0) {
      return { valid: false, error: 'Audio blob is empty' };
    }

    if (audioBlob.size > 50 * 1024 * 1024) { // 50MB limit
      return { valid: false, error: 'Audio file too large (max 50MB)' };
    }

    try {
      const audioBuffer = await this.decodeAudioBlob(audioBlob);

      if (audioBuffer.duration === 0) {
        return { valid: false, error: 'Audio duration is zero' };
      }

      if (audioBuffer.duration > 60) { // 60 second limit
        return { valid: false, error: 'Audio too long (max 60 seconds)' };
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }
}

export default AudioFormatConverter;
