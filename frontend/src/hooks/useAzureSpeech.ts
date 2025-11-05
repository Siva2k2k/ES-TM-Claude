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
  parseVoiceError,
} from '../types/voiceErrors';

// Backend URL from environment - remove /api/v1 path for Socket.IO
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
const BACKEND_URL = API_URL.replace('/api/v1', '');

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
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const qualityMonitorRef = useRef<AudioQualityMonitor | null>(null);
  const voiceActivityRef = useRef<VoiceActivityDetector | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIndexRef = useRef(0);
  const audioBufferRef = useRef<Blob[]>([]);
  const sessionIdRef = useRef<string | null>(null); // Track session ID for interval access

  // Reconnection config
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

  /**
   * Get auth token from localStorage
   */
  const getAuthToken = useCallback((): string | null => {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      console.warn('No access token found in localStorage');
      return null;
    }

    // Basic token validation
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('Invalid token format - not a valid JWT');
        localStorage.removeItem('accessToken'); // Clear invalid token
        return null;
      }

      // Decode payload to check expiration (without verification)
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        console.warn('Access token has expired');
        localStorage.removeItem('accessToken'); // Clear expired token
        return null;
      }

      console.log('Token validation passed', {
        userId: payload.id || payload.userId,
        email: payload.email,
        role: payload.role,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'unknown'
      });

      return token;
    } catch (error) {
      console.error('Error validating token:', error);
      localStorage.removeItem('accessToken'); // Clear corrupted token
      return null;
    }
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
          
          let errorMessage = `Connection failed: ${err.message}`;
          let isRecoverable = true;
          
          // Handle specific authentication errors
          if (err.message?.includes('User account is inactive')) {
            errorMessage = 'Your account has been deactivated. Please contact an administrator to reactivate your account.';
            isRecoverable = false;
          } else if (err.message?.includes('User account is not approved')) {
            errorMessage = 'Your account is pending approval. Please contact an administrator.';
            isRecoverable = false;
          } else if (err.message?.includes('Authentication required') || err.message?.includes('Invalid or expired token')) {
            errorMessage = 'Your session has expired. Please log in again.';
            isRecoverable = false;
            // Clear invalid token
            localStorage.removeItem('accessToken');
          }
          
          const error = new WebSocketError(errorMessage, isRecoverable);
          setState((prev) => ({ ...prev, isConnected: false, error }));
          config.onError?.(error);

          // Only attempt reconnection for recoverable errors
          if (isRecoverable) {
            attemptReconnect();
          }
          reject(error);
        });

        // Disconnected
        socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected', reason);
          sessionIdRef.current = null;
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isRecording: false,
            isProcessing: false,
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
          sessionIdRef.current = data.sessionId;
          setState((prev) => ({ ...prev, sessionId: data.sessionId, isProcessing: false }));
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
          sessionIdRef.current = null;
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
              // Don't auto-stop - let user control recording manually
              console.debug('Silence detected (waiting for user to stop)');
            },
          },
          {
            silenceDuration: config.silenceDuration || 2000,
          }
        );
      }

      // Use Web Audio API to capture raw PCM audio directly (better for streaming)
      const audioContext = new AudioContext({ sampleRate: 16000 }); // Target Azure's required rate
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1); // 4096 buffer size, mono

      // Store refs for cleanup
      audioContextRef.current = audioContext;
      audioProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      let pcmBuffer: Int16Array[] = [];

      // Process audio in real-time
      processor.onaudioprocess = (e) => {
        if (!sessionIdRef.current || !socketRef.current?.connected) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0); // Mono channel

        // Convert Float32 to Int16 PCM
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i])); // Clamp
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF; // Convert to 16-bit
        }

        pcmBuffer.push(int16Data);
      };

      // Send accumulated PCM data periodically
      audioChunkIntervalRef.current = setInterval(() => {
        if (pcmBuffer.length > 0 && socketRef.current?.connected && sessionIdRef.current) {
          // Calculate total length
          const totalLength = pcmBuffer.reduce((sum, arr) => sum + arr.length, 0);

          // Merge all PCM chunks
          const mergedPCM = new Int16Array(totalLength);
          let offset = 0;
          for (const chunk of pcmBuffer) {
            mergedPCM.set(chunk, offset);
            offset += chunk.length;
          }
          pcmBuffer = [];

          // Create WAV header + data
          const wavBuffer = AudioFormatConverter.createWavFile(
            mergedPCM,
            16000, // Sample rate
            1,     // Channels
            16     // Bit depth
          );

          // Convert to base64
          const base64Audio = AudioFormatConverter.arrayBufferToBase64(wavBuffer);

          // Send to server
          socketRef.current.emit('voice:audio-chunk', {
            sessionId: sessionIdRef.current,
            audioData: base64Audio,
            chunkIndex: chunkIndexRef.current++,
            timestamp: Date.now(),
          });

          console.debug('Audio chunk sent', {
            chunkIndex: chunkIndexRef.current - 1,
            pcmSamples: totalLength,
            wavSize: wavBuffer.byteLength,
            duration: (totalLength / 16000).toFixed(2) + 's',
          });
        }
      }, 1000); // Send every 1 second

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
  }, [connect, config]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async (): Promise<void> => {
    // Clear chunk interval
    if (audioChunkIntervalRef.current) {
      clearInterval(audioChunkIntervalRef.current);
      audioChunkIntervalRef.current = null;
    }

    // Stop audio processor
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media recorder (for batch mode)
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
    if (socketRef.current?.connected && sessionIdRef.current) {
      socketRef.current.emit('voice:stop', { sessionId: sessionIdRef.current });
    }

    setState((prev) => ({
      ...prev,
      isRecording: false,
      audioLevel: 0,
      isSpeaking: false,
    }));
  }, []);

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
