import React, { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useVoice } from '../../contexts/VoiceContext';
import { voiceService } from '../../services/VoiceService';
import { DeviceDetector } from '../../utils/deviceDetection';
import VoiceConfirmationModal from './VoiceConfirmationModal';

const IconMicrophone = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M12 1v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 11a7 7 0 0 1-14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 21v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconX = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconLoader = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="animate-spin">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
  </svg>
);

const VoiceLayer: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [useAzureSpeech, setUseAzureSpeech] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const {
    transcript,
    interimTranscript,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const {
    state,
    startListening,
    stopListening,
    processTranscript,
    clearPendingActions,
    setError,
  } = useVoice();

  // Determine speech method on mount
  useEffect(() => {
    const deviceInfo = DeviceDetector.detect();
    const preferredMethod = state.preferences?.speechMethod || 'auto';

    if (preferredMethod === 'azure-speech') {
      setUseAzureSpeech(true);
    } else if (preferredMethod === 'web-speech') {
      setUseAzureSpeech(false);
    } else {
      // Auto: use recommended method from device detection
      setUseAzureSpeech(deviceInfo.recommendedMethod === 'azure-speech');
    }
  }, [state.preferences]);

  // Start Web Speech API
  const startWebSpeech = () => {
    const language = state.preferences?.voiceSettings?.language || 'en-US';
    SpeechRecognition.startListening({ continuous: true, language });
    startListening();
  };

  // Stop Web Speech API
  const stopWebSpeech = () => {
    SpeechRecognition.stopListening();
    stopListening();
  };

  // Start Azure Speech (MediaRecorder)
  const startAzureSpeech = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result?.toString().split(',')[1];
          if (base64Audio) {
            try {
              const response = await voiceService.speechToText({
                audioData: base64Audio,
                format: 'webm',
                language: state.preferences?.voiceSettings?.language || 'en-US',
              });
              if (response.success && response.transcript) {
                await processTranscript(response.transcript);
              } else {
                setError('Failed to convert speech to text');
              }
            } catch (error: any) {
              setError(error.message);
            }
          }
        };
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startListening();
    } catch (error: any) {
      setError('Failed to access microphone: ' + error.message);
    }
  };

  // Stop Azure Speech
  const stopAzureSpeech = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopListening();
    }
  };

  // Unified start handler
  const handleStart = () => {
    if (useAzureSpeech) {
      startAzureSpeech();
    } else {
      startWebSpeech();
    }
  };

  // Unified stop handler
  const handleStop = () => {
    if (useAzureSpeech) {
      stopAzureSpeech();
    } else {
      stopWebSpeech();
    }
  };

  // Submit transcript for processing
  const handleSubmit = async () => {
    const finalTranscript = transcript.trim();
    if (!finalTranscript) {
      setError('No transcript to process');
      return;
    }

    await processTranscript(finalTranscript);
    resetTranscript();
  };

  // Clear transcript and errors
  const handleClear = () => {
    resetTranscript();
    setError(null);
  };

  // Don't render if Web Speech is required but not supported and Azure is not enabled
  if (!useAzureSpeech && !browserSupportsSpeechRecognition) {
    return null;
  }

  const isListening = state.isListening || isRecording;
  const currentTranscript = useAzureSpeech ? '' : transcript; // Azure shows transcript after recording stops
  const currentInterim = useAzureSpeech ? '' : interimTranscript;

  return (
    <>
      <div className="fixed right-4 bottom-4 z-50">
        <div className="flex items-end gap-3">
          {visible && (
            <div className="w-80 max-w-xs bg-white dark:bg-slate-800 border rounded-lg shadow-lg p-3 text-sm text-slate-800 dark:text-slate-100">
              <div className="flex justify-between items-start">
                <div className="font-semibold">
                  Voice {useAzureSpeech ? '(Azure)' : '(Web Speech)'}
                </div>
                <button
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Close transcript"
                  onClick={() => setVisible(false)}
                >
                  <IconX size={16} />
                </button>
              </div>

              {/* Error display */}
              {state.error && (
                <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs">
                  {state.error}
                </div>
              )}

              {/* Transcript display */}
              <div className="mt-2 h-24 overflow-auto text-sm leading-relaxed">
                {isListening && !useAzureSpeech && (
                  <div className="text-blue-500 dark:text-blue-400 text-xs mb-1">Listening...</div>
                )}
                {isRecording && useAzureSpeech && (
                  <div className="text-red-500 dark:text-red-400 text-xs mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Recording...
                  </div>
                )}
                {state.isProcessing && (
                  <div className="text-blue-500 dark:text-blue-400 text-xs mb-1 flex items-center gap-1">
                    <IconLoader size={12} />
                    Processing command...
                  </div>
                )}
                {currentInterim ? (
                  <div className="text-gray-500 dark:text-gray-400 italic">{currentInterim}</div>
                ) : null}
                <div>{currentTranscript}</div>
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleClear}
                  disabled={state.isProcessing}
                  className="px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-xs hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                  Clear
                </button>
                {!useAzureSpeech && currentTranscript && !isListening && (
                  <button
                    onClick={handleSubmit}
                    disabled={state.isProcessing}
                    className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {state.isProcessing ? <IconLoader size={12} /> : null}
                    Process
                  </button>
                )}
                <button
                  onClick={() => (isListening ? handleStop() : handleStart())}
                  disabled={state.isProcessing}
                  className={`ml-auto px-3 py-1 rounded text-sm font-medium ${
                    isListening
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } disabled:opacity-50`}
                >
                  {isListening ? 'Stop' : 'Start'}
                </button>
              </div>

              {/* Speech method toggle */}
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => setUseAzureSpeech(!useAzureSpeech)}
                  disabled={isListening || state.isProcessing}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                >
                  Switch to {useAzureSpeech ? 'Web Speech' : 'Azure Speech'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              // If modal is closed, open it and start listening
              if (!visible) {
                setVisible(true);
                handleStart();
                return;
              }

              // If modal already open, toggle listening state
              if (isListening) handleStop();
              else handleStart();
            }}
            aria-label="Toggle voice"
            title="Voice (toggle)"
            disabled={state.isProcessing}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform transform hover:scale-105
              ${
                isListening
                  ? 'bg-gradient-to-br from-red-600 to-pink-500 animate-pulse'
                  : 'bg-gradient-to-br from-purple-600 to-blue-500'
              } text-white disabled:opacity-50`}
          >
            {state.isProcessing ? <IconLoader size={20} /> : <IconMicrophone size={20} />}
          </button>
        </div>
      </div>

      {/* Voice Confirmation Modal */}
      {state.pendingActions.length > 0 && (
        <VoiceConfirmationModal />
      )}
    </>
  );
};

export default VoiceLayer;
