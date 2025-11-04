/**
 * Audio Validator for Azure Speech SDK
 *
 * Validates WAV file format and ensures compatibility with Azure Speech SDK requirements:
 * - Sample Rate: 16,000 Hz (or other supported rates)
 * - Bit Depth: 16-bit
 * - Channels: 1 (Mono) preferred
 * - Format: PCM (format code 1)
 */

import { logger } from '../config/logger';

export interface AudioFormat {
  valid: boolean;
  format?: string;
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  duration?: number;
  dataSize?: number;
  error?: string;
}

export interface WavHeader {
  riff: string;
  fileSize: number;
  wave: string;
  fmt: string;
  fmtSize: number;
  audioFormat: number;
  channels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitDepth: number;
  dataMarker: string;
  dataSize: number;
}

/**
 * Audio Validator class
 * Validates WAV file format and Azure Speech SDK compatibility
 */
export class AudioValidator {
  // Azure Speech SDK supported sample rates
  private static readonly SUPPORTED_SAMPLE_RATES = [
    8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000,
  ];

  // Preferred Azure Speech configuration
  private static readonly AZURE_PREFERRED_SAMPLE_RATE = 16000;
  private static readonly AZURE_PREFERRED_BIT_DEPTH = 16;
  private static readonly AZURE_PREFERRED_CHANNELS = 1;

  // Audio format codes
  private static readonly PCM_FORMAT = 1;
  private static readonly IEEE_FLOAT_FORMAT = 3;
  private static readonly ALAW_FORMAT = 6;
  private static readonly MULAW_FORMAT = 7;

  /**
   * Validate WAV file buffer
   * @param buffer - Audio buffer to validate
   * @returns Validation result with audio format details
   */
  static validateWavFile(buffer: Buffer): AudioFormat {
    try {
      if (!buffer || buffer.length === 0) {
        return {
          valid: false,
          error: 'Audio buffer is empty',
        };
      }

      if (buffer.length < 44) {
        return {
          valid: false,
          error: 'Audio buffer too small to contain valid WAV header',
        };
      }

      // Parse WAV header
      const header = this.parseWavHeader(buffer);

      // Validate RIFF header
      if (header.riff !== 'RIFF') {
        return {
          valid: false,
          error: `Invalid RIFF header: expected 'RIFF', got '${header.riff}'`,
        };
      }

      // Validate WAVE format
      if (header.wave !== 'WAVE') {
        return {
          valid: false,
          error: `Invalid WAVE format: expected 'WAVE', got '${header.wave}'`,
        };
      }

      // Validate fmt chunk
      if (header.fmt !== 'fmt ') {
        return {
          valid: false,
          error: `Invalid fmt chunk: expected 'fmt ', got '${header.fmt}'`,
        };
      }

      // Validate audio format (PCM, ALAW, MULAW supported by Azure)
      if (
        header.audioFormat !== this.PCM_FORMAT &&
        header.audioFormat !== this.ALAW_FORMAT &&
        header.audioFormat !== this.MULAW_FORMAT
      ) {
        return {
          valid: false,
          error: `Unsupported audio format: ${header.audioFormat} (expected PCM=1, ALAW=6, or MULAW=7)`,
        };
      }

      // Validate sample rate
      if (!this.SUPPORTED_SAMPLE_RATES.includes(header.sampleRate)) {
        return {
          valid: false,
          error: `Unsupported sample rate: ${header.sampleRate} Hz (supported: ${this.SUPPORTED_SAMPLE_RATES.join(', ')})`,
        };
      }

      // Validate channels (1 or 2)
      if (header.channels < 1 || header.channels > 2) {
        return {
          valid: false,
          error: `Invalid number of channels: ${header.channels} (expected 1 or 2)`,
        };
      }

      // Validate bit depth (8, 16, 24, 32 for PCM)
      if (header.audioFormat === this.PCM_FORMAT) {
        if (![8, 16, 24, 32].includes(header.bitDepth)) {
          return {
            valid: false,
            error: `Invalid bit depth: ${header.bitDepth} (expected 8, 16, 24, or 32 for PCM)`,
          };
        }
      }

      // Validate data chunk
      if (header.dataMarker !== 'data') {
        return {
          valid: false,
          error: `Invalid data chunk: expected 'data', got '${header.dataMarker}'`,
        };
      }

      // Validate data size
      if (header.dataSize === 0) {
        return {
          valid: false,
          error: 'Audio data size is zero',
        };
      }

      // Check if buffer contains all the data
      const expectedBufferSize = 44 + header.dataSize;
      if (buffer.length < expectedBufferSize) {
        return {
          valid: false,
          error: `Incomplete audio data: buffer size ${buffer.length}, expected ${expectedBufferSize}`,
        };
      }

      // Calculate duration
      const bytesPerSample = (header.bitDepth / 8) * header.channels;
      const numSamples = header.dataSize / bytesPerSample;
      const duration = numSamples / header.sampleRate;

      // Validate duration (reasonable limits)
      if (duration === 0) {
        return {
          valid: false,
          error: 'Audio duration is zero',
        };
      }

      if (duration > 300) {
        // 5 minutes max
        return {
          valid: false,
          error: `Audio too long: ${duration.toFixed(2)}s (max 300s)`,
        };
      }

      // Return validated format
      return {
        valid: true,
        format: this.getFormatName(header.audioFormat),
        sampleRate: header.sampleRate,
        channels: header.channels,
        bitDepth: header.bitDepth,
        duration: parseFloat(duration.toFixed(3)),
        dataSize: header.dataSize,
      };
    } catch (error: any) {
      logger.error('Audio validation error', { error: error.message });
      return {
        valid: false,
        error: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Parse WAV file header
   */
  private static parseWavHeader(buffer: Buffer): WavHeader {
    let offset = 0;

    // RIFF chunk descriptor (12 bytes)
    const riff = buffer.toString('ascii', offset, offset + 4);
    offset += 4;
    const fileSize = buffer.readUInt32LE(offset);
    offset += 4;
    const wave = buffer.toString('ascii', offset, offset + 4);
    offset += 4;

    // fmt sub-chunk (24 bytes for PCM)
    const fmt = buffer.toString('ascii', offset, offset + 4);
    offset += 4;
    const fmtSize = buffer.readUInt32LE(offset);
    offset += 4;
    const audioFormat = buffer.readUInt16LE(offset);
    offset += 2;
    const channels = buffer.readUInt16LE(offset);
    offset += 2;
    const sampleRate = buffer.readUInt32LE(offset);
    offset += 4;
    const byteRate = buffer.readUInt32LE(offset);
    offset += 4;
    const blockAlign = buffer.readUInt16LE(offset);
    offset += 2;
    const bitDepth = buffer.readUInt16LE(offset);
    offset += 2;

    // Skip extra format bytes if present
    if (fmtSize > 16) {
      offset += fmtSize - 16;
    }

    // Find data chunk (may have other chunks before it)
    let dataMarker = '';
    let dataSize = 0;

    while (offset < buffer.length - 8) {
      const chunkId = buffer.toString('ascii', offset, offset + 4);
      offset += 4;
      const chunkSize = buffer.readUInt32LE(offset);
      offset += 4;

      if (chunkId === 'data') {
        dataMarker = chunkId;
        dataSize = chunkSize;
        break;
      } else {
        // Skip this chunk
        offset += chunkSize;
      }
    }

    return {
      riff,
      fileSize,
      wave,
      fmt,
      fmtSize,
      audioFormat,
      channels,
      sampleRate,
      byteRate,
      blockAlign,
      bitDepth,
      dataMarker,
      dataSize,
    };
  }

  /**
   * Get audio format name from format code
   */
  private static getFormatName(formatCode: number): string {
    switch (formatCode) {
      case this.PCM_FORMAT:
        return 'PCM';
      case this.IEEE_FLOAT_FORMAT:
        return 'IEEE Float';
      case this.ALAW_FORMAT:
        return 'A-law';
      case this.MULAW_FORMAT:
        return 'μ-law';
      default:
        return `Unknown (${formatCode})`;
    }
  }

  /**
   * Check if audio format is optimal for Azure Speech SDK
   */
  static isOptimalFormat(format: AudioFormat): boolean {
    if (!format.valid) {
      return false;
    }

    return (
      format.sampleRate === this.AZURE_PREFERRED_SAMPLE_RATE &&
      format.bitDepth === this.AZURE_PREFERRED_BIT_DEPTH &&
      format.channels === this.AZURE_PREFERRED_CHANNELS
    );
  }

  /**
   * Get format recommendation message
   */
  static getFormatRecommendation(format: AudioFormat): string | null {
    if (!format.valid) {
      return null;
    }

    const issues: string[] = [];

    if (format.sampleRate !== this.AZURE_PREFERRED_SAMPLE_RATE) {
      issues.push(
        `Sample rate is ${format.sampleRate} Hz (recommended: ${this.AZURE_PREFERRED_SAMPLE_RATE} Hz)`
      );
    }

    if (format.bitDepth !== this.AZURE_PREFERRED_BIT_DEPTH) {
      issues.push(
        `Bit depth is ${format.bitDepth}-bit (recommended: ${this.AZURE_PREFERRED_BIT_DEPTH}-bit)`
      );
    }

    if (format.channels !== this.AZURE_PREFERRED_CHANNELS) {
      issues.push(
        `Audio is ${format.channels === 1 ? 'mono' : 'stereo'} (recommended: mono)`
      );
    }

    if (issues.length === 0) {
      return null;
    }

    return (
      'Audio format is valid but not optimal for Azure Speech SDK. ' +
      issues.join('; ') +
      '. Recognition may still work but with potentially lower accuracy.'
    );
  }

  /**
   * Validate base64-encoded audio string
   */
  static validateBase64Audio(base64Audio: string): AudioFormat {
    try {
      if (!base64Audio || base64Audio.length === 0) {
        return {
          valid: false,
          error: 'Base64 audio string is empty',
        };
      }

      // Decode base64 to buffer
      const buffer = Buffer.from(base64Audio, 'base64');

      // Validate WAV file
      return this.validateWavFile(buffer);
    } catch (error: any) {
      logger.error('Base64 audio validation error', { error: error.message });
      return {
        valid: false,
        error: `Base64 decode error: ${error.message}`,
      };
    }
  }

  /**
   * Log audio format details (for debugging)
   */
  static logAudioFormat(format: AudioFormat, sessionId?: string): void {
    if (format.valid) {
      const optimal = this.isOptimalFormat(format);
      const recommendation = this.getFormatRecommendation(format);

      logger.info('Audio format validated', {
        sessionId,
        format: format.format,
        sampleRate: format.sampleRate,
        channels: format.channels,
        bitDepth: format.bitDepth,
        duration: format.duration,
        dataSize: format.dataSize,
        optimal,
        recommendation: recommendation || 'None',
      });
    } else {
      logger.warn('Audio format validation failed', {
        sessionId,
        error: format.error,
      });
    }
  }
}

export default AudioValidator;
