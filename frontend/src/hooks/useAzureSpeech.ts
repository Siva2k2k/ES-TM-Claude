/**
 * Azure Speech Hook
 *
 * Custom hook for Azure Speech recognition with WebSocket streaming
 * Provides continuous real-time transcription with audio quality monitoring
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { AudioFormatConverter } from '../utils/audioFormatConverter';
import { AudioQualityMonitor, AudioQualityMetrics } from '../utils/audioQualityMonitor';
import { VoiceActivityDetector, VoiceActivityEvent } from '../utils/voiceActivityDetector';
import {
  VoiceError,
  WebSocketError,
  MicrophoneAccessError,
  AudioConversionError,
  parseVoiceError,
} from '../types/voiceErrors';

// Backend URL from environment
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface UseAzureSpeechConfig {
  language?: string;
  autoStop?: boolean; // Auto-stop after silence
  silenceDuration?: number; // Silence duration for auto-stop (ms)
  enableQualityMonitoring?: boolean;
  enableVoiceActivity?: boolean;
  onInterim?: (transcript: string) => void;
  onFinal?: (transcript: string, confidence: number) => void;
  onError?: (error: VoiceError) => void;
  onQualityChange?: (metrics: AudioQualityMetrics) => void;
  onVoiceActivityChange?: (event: VoiceActivityEvent) => void;
}

export interface UseAzureSpeechState {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: VoiceError | null;
  audioLevel: number;
  quality: 'good' | 'acceptable' | 'poor';
  isSpeaking: boolean;
  isOnline: boolean;
  sessionId: string | null;
}

export interface UseAzureSpeechActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  reset: () => void;
}

/**
 * Azure Speech Hook
 */
export function useAzureSpeech(
  config: UseAzureSpeechConfig = {}
): [UseAzureSpeechState, UseAzureSpeechActions] {
  // State
  const [state, setState] = useState<UseAzureSpeechState>({
    isConnected: false,
    isRecording: false,
    isProcessing: false,
    interimTranscript: '',
    finalTranscript: '',
    error: null,
    audioLevel: 0,
    quality: 'good',
    isSpeaking: false,
    isOnline: navigator.onLine,
    sessionId: null,
  });

  // Refs for WebSocket and media
  const socketRef = useRef<Socket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const qualityMonitorRef = useRef<AudioQualityMonitor | null>(null);
  const voiceActivityRef = useRef<VoiceActivityDetector | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIndexRef = useRef(0);
  const audioBufferRef = useRef<Blob[]>([]);

  // Reconnection config
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

  /**
   * Get auth token from localStorage
   */
  const getAuthToken = useCallback((): string | null => {
    return localStorage.getItem('accessToken');
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async (): Promise<void> => {
    if (socketRef.current?.connected) {
      console.log('Already connected to WebSocket');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      const error = new WebSocketError('Authentication token not found', false);
      setState((prev) => ({ ...prev, error }));
      config.onError?.(error);
      throw error;
    }

    return new Promise((resolve, reject) => {
      try {
        // Create Socket.IO connection
        const socket = io(BACKEND_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: false, // Manual reconnection
        });

        socketRef.current = socket;

        // Connection established
        socket.on('connect', () => {
          console.log('WebSocket connected', socket.id);
          setState((prev) => ({ ...prev, isConnected: true, error: null }));
          reconnectAttempts.current = 0;
          resolve();
        });

        // Connection error
        socket.on('connect_error', (err) => {
          console.error('WebSocket connection error', err);
          const error = new WebSocketError(`Connection failed: ${err.message}`, true);
          setState((prev) => ({ ...prev, isConnected: false, error }));
          config.onError?.(error);

          // Attempt reconnection
          attemptReconnect();
          reject(error);
        });

        // Disconnected
        socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected', reason);
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isRecording: false,
            sessionId: null,
          }));

          // Attempt reconnection if not manual disconnect
          if (reason !== 'io client disconnect') {
            attemptReconnect();
          }
        });

        // Voice events
        socket.on('voice:session-started', (data: any) => {
          console.log('Voice session started', data);
          setState((prev) => ({ ...prev, sessionId: data.sessionId, isProcessing: true }));
        });

        socket.on('voice:interim', (data: any) => {
          console.debug('Interim result', data.transcript);
          setState((prev) => ({ ...prev, interimTranscript: data.transcript }));
          config.onInterim?.(data.transcript);
        });

        socket.on('voice:final', (data: any) => {
          console.log('Final result', data.transcript);
          setState((prev) => ({
            ...prev,
            finalTranscript: data.transcript,
            interimTranscript: '',
          }));
          config.onFinal?.(data.transcript, data.confidence);
        });

        socket.on('voice:error', (data: any) => {
          console.error('Voice error', data);
          const error = parseVoiceError(data);
          setState((prev) => ({ ...prev, error }));
          config.onError?.(error);
        });

        socket.on('voice:session-stopped', (data: any) => {
          console.log('Voice session stopped', data);
          setState((prev) => ({
            ...prev,
            sessionId: null,
            isProcessing: false,
            isRecording: false,
          }));
        });

        socket.on('voice:pong', (data: any) => {
          // Heartbeat response
          const latency = Date.now() - data.timestamp;
          console.debug('Ping latency:', latency, 'ms');
        });

      } catch (error: any) {
        const wsError = new WebSocketError(error.message, true);
        setState((prev) => ({ ...prev, error: wsError }));
        config.onError?.(wsError);
        reject(wsError);
      }
    });
  }, [getAuthToken, config]);

  /**
   * Attempt reconnection with exponential backoff
   */
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      const error = new WebSocketError('Unable to reconnect to server', false);
      setState((prev) => ({ ...prev, error }));
      config.onError?.(error);
      return;
    }

    const delay = reconnectDelays[Math.min(reconnectAttempts.current, reconnectDelays.length - 1)];
    reconnectAttempts.current++;

    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect().catch((error) => {
        console.error('Reconnection failed', error);
      });
    }, delay);
  }, [connect, config]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState((prev) => ({ ...prev, isConnected: false, sessionId: null }));
  }, []);

  /**
   * Start recording
   */
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      // Ensure connected
      if (!socketRef.current?.connected) {
        await connect();
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000, // Will be converted to 16kHz
        },
      });

      mediaStreamRef.current = stream;

      // Start quality monitoring
      if (config.enableQualityMonitoring !== false) {
        qualityMonitorRef.current = new AudioQualityMonitor();
        await qualityMonitorRef.current.start(
          stream,
          (metrics) => {
            setState((prev) => ({
              ...prev,
              audioLevel: metrics.volume,
              quality: metrics.quality,
            }));
            config.onQualityChange?.(metrics);
          },
          { updateInterval: 100 }
        );
      }

      // Start voice activity detection
      if (config.enableVoiceActivity !== false) {
        voiceActivityRef.current = new VoiceActivityDetector();
        await voiceActivityRef.current.start(
          stream,
          {
            onStateChange: (event) => {
              setState((prev) => ({ ...prev, isSpeaking: event.isSpeaking }));
              config.onVoiceActivityChange?.(event);
            },
            onSilenceDetected: () => {
              if (config.autoStop) {
                console.log('Auto-stopping due to silence');
                stopRecording();
              }
            },
          },
          {
            silenceDuration: config.silenceDuration || 2000,
          }
        );
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioBufferRef.current = [];
      chunkIndexRef.current = 0;

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioBufferRef.current.push(event.data);
        }
      };

      // Start recording with timeslice for streaming
      mediaRecorder.start(250); // Capture 250ms chunks

      // Send audio chunks periodically
      audioChunkIntervalRef.current = setInterval(async () => {
        if (audioBufferRef.current.length > 0 && socketRef.current?.connected && state.sessionId) {
          const audioBlob = new Blob(audioBufferRef.current, { type: 'audio/webm' });
          audioBufferRef.current = [];

          try {
            // Convert to Azure format (16kHz WAV)
            const result = await AudioFormatConverter.convertToAzureFormat(audioBlob);

            if (!result.success) {
              throw new AudioConversionError(result.error);
            }

            // Convert to base64
            const base64Audio = AudioFormatConverter.arrayBufferToBase64(result.wavBuffer);

            // Send to server
            socketRef.current.emit('voice:audio-chunk', {
              sessionId: state.sessionId,
              audioData: base64Audio,
              chunkIndex: chunkIndexRef.current++,
              timestamp: Date.now(),
            });

          } catch (error: any) {
            console.error('Audio conversion error', error);
            const conversionError = new AudioConversionError(error.message);
            setState((prev) => ({ ...prev, error: conversionError }));
            config.onError?.(conversionError);
          }
        }
      }, 250);

      setState((prev) => ({ ...prev, isRecording: true, error: null }));

      // Start voice session on server
      socketRef.current!.emit('voice:start', {
        language: config.language || 'en-US',
        sampleRate: 16000,
        channels: 1,
      });

    } catch (error: any) {
      console.error('Failed to start recording', error);
      let voiceError: VoiceError;

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        voiceError = new MicrophoneAccessError('Microphone permission denied');
      } else {
        voiceError = parseVoiceError(error);
      }

      setState((prev) => ({ ...prev, error: voiceError }));
      config.onError?.(voiceError);
      throw voiceError;
    }
  }, [connect, config, state.sessionId]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async (): Promise<void> => {
    // Clear chunk interval
    if (audioChunkIntervalRef.current) {
      clearInterval(audioChunkIntervalRef.current);
      audioChunkIntervalRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Stop quality monitor
    if (qualityMonitorRef.current) {
      qualityMonitorRef.current.stop();
      qualityMonitorRef.current = null;
    }

    // Stop voice activity detector
    if (voiceActivityRef.current) {
      voiceActivityRef.current.stop();
      voiceActivityRef.current = null;
    }

    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Notify server to stop session
    if (socketRef.current?.connected && state.sessionId) {
      socketRef.current.emit('voice:stop', { sessionId: state.sessionId });
    }

    setState((prev) => ({
      ...prev,
      isRecording: false,
      audioLevel: 0,
      isSpeaking: false,
    }));
  }, [state.sessionId]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      interimTranscript: '',
      finalTranscript: '',
      error: null,
      audioLevel: 0,
      quality: 'good',
      isSpeaking: false,
    }));
  }, []);

  /**
   * Monitor online/offline status
   */
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network online');
      setState((prev) => ({ ...prev, isOnline: true }));

      // Reconnect if disconnected
      if (!socketRef.current?.connected) {
        connect();
      }
    };

    const handleOffline = () => {
      console.log('Network offline');
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopRecording();
      disconnect();
    };
  }, [stopRecording, disconnect]);

  return [
    state,
    {
      connect,
      disconnect,
      startRecording,
      stopRecording,
      reset,
    },
  ];
}

export default useAzureSpeech;
