import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import {
  VoiceState,
  VoiceActionType,
  VoiceAction,
  VoiceContext as IVoiceContext,
  UserVoicePreferences,
  DeviceInfo,
} from '../types/voice';
import { voiceService } from '../services/VoiceService';
import { DeviceDetector } from '../utils/deviceDetection';
import { SpeechFallbackManager } from '../services/SpeechFallbackManager';
import { VoiceError } from '../types/voiceErrors';

// Initial state
const initialState: VoiceState = {
  isListening: false,
  isProcessing: false,
  transcript: '',
  pendingActions: [],
  context: null,
  preferences: null,
  deviceInfo: null,
  error: null,
};

// Reducer
function voiceReducer(state: VoiceState, action: VoiceActionType): VoiceState {
  switch (action.type) {
    case 'START_LISTENING':
      return { ...state, isListening: true, error: null };
    case 'STOP_LISTENING':
      return { ...state, isListening: false };
    case 'SET_TRANSCRIPT':
      return { ...state, transcript: action.payload };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_PENDING_ACTIONS':
      return { ...state, pendingActions: action.payload };
    case 'CLEAR_PENDING_ACTIONS':
      return { ...state, pendingActions: [], transcript: '' };
    case 'SET_CONTEXT':
      return { ...state, context: action.payload };
    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };
    case 'SET_DEVICE_INFO':
      return { ...state, deviceInfo: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isProcessing: false };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// Context type
interface VoiceContextType {
  state: VoiceState;
  startListening: () => void;
  stopListening: () => void;
  processTranscript: (transcript: string) => Promise<void>;
  executeActions: (actions: VoiceAction[]) => Promise<void>;
  updatePreferences: (preferences: Partial<UserVoicePreferences>) => Promise<void>;
  clearPendingActions: () => void;
  refreshContext: () => Promise<void>;
  setError: (error: string | null) => void;
  // Fallback manager methods
  recordSpeechSuccess: (method: 'web-speech' | 'azure-speech') => void;
  recordSpeechFailure: (method: 'web-speech' | 'azure-speech', error: Error | VoiceError) => void;
  getRecommendedSpeechMethod: () => 'web-speech' | 'azure-speech';
  forceSpeechMethod: (method: 'web-speech' | 'azure-speech') => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

// Provider component
export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(voiceReducer, initialState);

  // Create fallback manager instance (persists across re-renders)
  const fallbackManagerRef = useRef<SpeechFallbackManager | null>(null);
  if (!fallbackManagerRef.current) {
    fallbackManagerRef.current = new SpeechFallbackManager({
      maxConsecutiveFailures: 3,
      recoverySuccessCount: 5,
    });
  }

  // Initialize device info and load user preferences
  useEffect(() => {
    const initializeVoice = async () => {
      try {
        // Detect device capabilities
        const deviceInfo = DeviceDetector.detect();
        dispatch({ type: 'SET_DEVICE_INFO', payload: deviceInfo });

        // Load user preferences
        const preferences = await voiceService.getUserPreferences();
        dispatch({ type: 'SET_PREFERENCES', payload: preferences });

        // Load voice context
        const context = await voiceService.getContext();
        dispatch({ type: 'SET_CONTEXT', payload: context });
      } catch (error: any) {
        console.error('Failed to initialize voice layer:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message });
      }
    };

    initializeVoice();
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    dispatch({ type: 'START_LISTENING' });
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    dispatch({ type: 'STOP_LISTENING' });
  }, []);

  // Process transcript with LLM
  const processTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) {
        dispatch({ type: 'SET_ERROR', payload: 'Transcript is empty' });
        return;
      }

      dispatch({ type: 'SET_PROCESSING', payload: true });
      dispatch({ type: 'SET_TRANSCRIPT', payload: transcript });

      try {
        // Send transcript to backend for processing
        const response = await voiceService.processCommand(transcript, state.context || undefined);

        if (response.success && response.actions.length > 0) {
          // Set pending actions for user confirmation
          dispatch({ type: 'SET_PENDING_ACTIONS', payload: response.actions });
        } else {
          dispatch({
            type: 'SET_ERROR',
            payload: response.message || 'No actions detected from command',
          });
        }
      } catch (error: any) {
        console.error('Failed to process transcript:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message });
      } finally {
        dispatch({ type: 'SET_PROCESSING', payload: false });
      }
    },
    [state.context]
  );

  // Execute confirmed actions
  const executeActions = useCallback(async (actions: VoiceAction[]) => {
    dispatch({ type: 'SET_PROCESSING', payload: true });

    try {
      // Send actions to backend for execution
      const response = await voiceService.executeActions(
        actions.map((a) => ({ intent: a.intent, data: a.data })),
        true
      );

      if (response.success) {
        // Clear pending actions
        dispatch({ type: 'CLEAR_PENDING_ACTIONS' });

        // Check for redirect URLs
        const redirectResult = response.results.find((r) => r.redirectUrl);
        if (redirectResult?.redirectUrl) {
          // Navigate to the redirect URL
          window.location.href = redirectResult.redirectUrl;
        }
      } else {
        dispatch({
          type: 'SET_ERROR',
          payload: response.message || 'Failed to execute actions',
        });
      }
    } catch (error: any) {
      console.error('Failed to execute actions:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  }, []);

  // Update user preferences
  const updatePreferences = useCallback(async (preferences: Partial<UserVoicePreferences>) => {
    try {
      const updatedPreferences = await voiceService.updateUserPreferences(preferences);
      dispatch({ type: 'SET_PREFERENCES', payload: updatedPreferences });
    } catch (error: any) {
      console.error('Failed to update preferences:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, []);

  // Clear pending actions
  const clearPendingActions = useCallback(() => {
    dispatch({ type: 'CLEAR_PENDING_ACTIONS' });
  }, []);

  // Refresh voice context
  const refreshContext = useCallback(async () => {
    try {
      const context = await voiceService.getContext();
      dispatch({ type: 'SET_CONTEXT', payload: context });
    } catch (error: any) {
      console.error('Failed to refresh context:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, []);

  // Set error
  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  // Fallback manager methods
  const recordSpeechSuccess = useCallback((method: 'web-speech' | 'azure-speech') => {
    fallbackManagerRef.current?.recordSuccess(method);
  }, []);

  const recordSpeechFailure = useCallback(
    (method: 'web-speech' | 'azure-speech', error: Error | VoiceError) => {
      fallbackManagerRef.current?.recordFailure(method, error);
    },
    []
  );

  const getRecommendedSpeechMethod = useCallback((): 'web-speech' | 'azure-speech' => {
    return fallbackManagerRef.current?.getCurrentMethod() || 'web-speech';
  }, []);

  const forceSpeechMethod = useCallback((method: 'web-speech' | 'azure-speech') => {
    fallbackManagerRef.current?.forceMethod(method);
  }, []);

  const value: VoiceContextType = {
    state,
    startListening,
    stopListening,
    processTranscript,
    executeActions,
    updatePreferences,
    clearPendingActions,
    refreshContext,
    setError,
    recordSpeechSuccess,
    recordSpeechFailure,
    getRecommendedSpeechMethod,
    forceSpeechMethod,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};

// Custom hook to use voice context
export const useVoice = (): VoiceContextType => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
