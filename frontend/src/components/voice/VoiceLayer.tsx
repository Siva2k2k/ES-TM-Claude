import React, { useState, useEffect, useRef, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useVoice } from '../../contexts/VoiceContext';
import { voiceService } from '../../services/VoiceService';
import { DeviceDetector } from '../../utils/deviceDetection';
import { useAzureSpeech } from '../../hooks/useAzureSpeech';
import { parseVoiceError } from '../../types/voiceErrors';
import { AudioFormatConverter } from '../../utils/audioFormatConverter';
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
  const [shouldUseAzureSpeech, setShouldUseAzureSpeech] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [useContinuousMode, setUseContinuousMode] = useState(true); // Use continuous Azure Speech by default
  const [accumulatedTranscript, setAccumulatedTranscript] = useState(''); // Accumulate transcript during recording

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
    setError,
  } = useVoice();

  // Azure Speech Hook (Continuous Recognition via WebSocket)
  const [azureState, azureActions] = useAzureSpeech({
    language: state.preferences?.voiceSettings?.language || 'en-US',
    autoStop: false, // Manual control - user starts/stops recording
    silenceDuration: 2000, // Still detect silence for UI feedback
    enableQualityMonitoring: true,
    enableVoiceActivity: true,
    onInterim: (transcript) => {
      console.debug('Azure interim:', transcript);
      // Interim transcripts are shown via azureState.interimTranscript
    },
    onFinal: useCallback((transcript: string, confidence: number) => {
      console.log('Azure final:', transcript, 'confidence:', confidence);
      // Accumulate final transcripts instead of processing immediately
      if (transcript.trim()) {
        setAccumulatedTranscript((prev) => {
          const newText = prev ? `${prev} ${transcript}` : transcript;
          return newText;
        });
      }
    }, []),
    onError: useCallback((error: unknown) => {
      console.error('Azure Speech error:', error);
      const voiceError = parseVoiceError(error);
      setError(voiceError.message);
    }, [setError]),
    onQualityChange: useCallback(() => {
      // Audio quality monitoring is available but not used in this implementation
    }, []),
    onVoiceActivityChange: useCallback(() => {
      // Voice activity detection is available but not used in this implementation
    }, []),
  });

  // Determine speech method on mount
  useEffect(() => {
    const deviceInfo = DeviceDetector.detect();
    const preferredMethod = state.preferences?.speechMethod || 'auto';

    if (preferredMethod === 'azure-speech') {
      setShouldUseAzureSpeech(true);
    } else if (preferredMethod === 'web-speech') {
      setShouldUseAzureSpeech(false);
    } else {
      // Auto: use recommended method from device detection
      setShouldUseAzureSpeech(deviceInfo.recommendedMethod === 'azure-speech');
    }
  }, [state.preferences]);

  // Connect Azure Speech WebSocket if using continuous mode
  useEffect(() => {
    if (shouldUseAzureSpeech && useContinuousMode && !azureState.isConnected) {
      azureActions.connect().catch((error) => {
        console.error('Failed to connect Azure Speech:', error);
        // Fallback to batch mode if connection fails
        setUseContinuousMode(false);
      });
    }
  }, [shouldUseAzureSpeech, useContinuousMode, azureState.isConnected, azureActions]);

  // Start Web Speech API
  const startWebSpeech = () => {
    // Clear accumulated transcript when starting
    setAccumulatedTranscript('');
    const language = state.preferences?.voiceSettings?.language || 'en-US';
    SpeechRecognition.startListening({ continuous: true, language });
    startListening();
  };

  // Stop Web Speech API
  const stopWebSpeech = async () => {
    SpeechRecognition.stopListening();
    stopListening();

    // Process accumulated transcript (Web Speech accumulates in 'transcript' directly)
    // Note: Web Speech already accumulates, so we just need to process on stop
    if (transcript.trim()) {
      console.log('Processing Web Speech transcript:', transcript);
      await processTranscript(transcript);
      resetTranscript(); // Clear after processing
    }
  };

  // Start Azure Speech (Continuous Mode via WebSocket)
  const startAzureSpeechContinuous = async () => {
    try {
      // Clear accumulated transcript when starting
      setAccumulatedTranscript('');
      await azureActions.startRecording();
      startListening();
      // Note: setIsRecording not needed here as azureState.isRecording handles it
    } catch (error: any) {
      const voiceError = parseVoiceError(error);
      setError(voiceError.getUserMessage());
      // Fallback to batch mode on error
      console.warn('Continuous mode failed, falling back to batch mode');
      setUseContinuousMode(false);
      await startAzureSpeechBatch();
    }
  };

  // Start Azure Speech (Batch Mode - legacy)
  const startAzureSpeechBatch = async () => {
    try {
      // Clear accumulated transcript when starting
      setAccumulatedTranscript('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000, // Higher quality input for better conversion
        }
      });
      
      // Choose the best available audio format
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      
      console.log('Using MediaRecorder with:', { mimeType });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        console.log('Audio blob created:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunksRef.current.length
        });
        
        try {
          // Validate minimum audio size
          if (audioBlob.size < 1000) {
            setError('Audio recording too short. Please try speaking longer.');
            return;
          }

          // Convert WebM to WAV format using AudioFormatConverter
          console.log('Starting audio conversion...');
          const conversionResult = await AudioFormatConverter.convertToAzureFormat(audioBlob);
          
          console.log('Conversion result:', {
            success: conversionResult.success,
            error: conversionResult.error,
            wavBufferSize: conversionResult.wavBuffer?.byteLength,
            duration: conversionResult.duration
          });
          
          if (!conversionResult.success) {
            setError(`Audio conversion failed: ${conversionResult.error}`);
            return;
          }

          // Convert WAV buffer to base64
          const base64Audio = AudioFormatConverter.arrayBufferToBase64(conversionResult.wavBuffer);
          
          // Validate that the base64 audio starts with WAV signature
          const wavHeader = atob(base64Audio.substring(0, 8));
          console.log('WAV header check:', {
            headerBytes: Array.from(wavHeader).map(c => c.charCodeAt(0)),
            headerString: wavHeader,
            startsWithRIFF: wavHeader.startsWith('RIFF')
          });
          
          if (!wavHeader.startsWith('RIFF')) {
            setError('Audio conversion produced invalid WAV format. Please try again.');
            return;
          }
          
          console.log('Base64 audio created:', {
            base64Length: base64Audio.length,
            firstChars: base64Audio.substring(0, 20)
          });
          
          if (base64Audio) {
            try {
              const response = await voiceService.speechToText({
                audioData: base64Audio,
                format: 'wav', // Now sending WAV format
                language: state.preferences?.voiceSettings?.language || 'en-US',
              });
              if (response.success && response.transcript) {
                await processTranscript(response.transcript);
              } else {
                setError('Failed to convert speech to text');
              }
            } catch (error: any) {
              console.error('Speech-to-text API error:', error);
              setError(error.message);
            }
          }
        } catch (error: any) {
          console.error('Audio processing error:', error);
          setError(`Audio processing failed: ${error.message}`);
        }
        
        // Stop all tracks
        for (const track of stream.getTracks()) {
          track.stop();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      startListening();
    } catch (error: any) {
      setError('Failed to access microphone: ' + error.message);
    }
  };

  // Start Azure Speech (dispatches to continuous or batch mode)
  const startAzureSpeech = async () => {
    // Clear any previous transcripts
    azureActions.reset();
    
    if (useContinuousMode && azureState.isConnected) {
      console.log('Starting Azure Speech in continuous mode');
      await startAzureSpeechContinuous();
    } else {
      console.log('Starting Azure Speech in batch mode');
      await startAzureSpeechBatch();
    }
  };

  // Stop Azure Speech (Continuous Mode)
  const stopAzureSpeechContinuous = async () => {
    await azureActions.stopRecording();
    stopListening();

    // Process accumulated transcript after stopping
    if (accumulatedTranscript.trim()) {
      console.log('Processing accumulated transcript:', accumulatedTranscript);
      await processTranscript(accumulatedTranscript);
      setAccumulatedTranscript(''); // Clear after processing
    }
  };

  // Stop Azure Speech (Batch Mode)
  const stopAzureSpeechBatch = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopListening();
    }
  };

  // Stop Azure Speech (dispatches to continuous or batch mode)
  const stopAzureSpeech = async () => {
    if (useContinuousMode && azureState.isRecording) {
      console.log('Stopping Azure Speech continuous mode');
      await stopAzureSpeechContinuous();
    } else if (isRecording) {
      console.log('Stopping Azure Speech batch mode');
      stopAzureSpeechBatch();
    }
  };

  // Unified start handler
  const handleStart = () => {
    if (shouldUseAzureSpeech) {
      startAzureSpeech();
    } else {
      startWebSpeech();
    }
  };

  // Unified stop handler
  const handleStop = () => {
    if (shouldUseAzureSpeech) {
      stopAzureSpeech();
    } else {
      stopWebSpeech();
    }
  };

  // Submit transcript for processing
  // const handleSubmit = async () => {
  //   const finalTranscript = transcript.trim();
  //   if (!finalTranscript) {
  //     setError('No transcript to process');
  //     return;
  //   }

  //   await processTranscript(finalTranscript);
  //   resetTranscript();
  // };

  // Clear transcript and errors
  const handleClear = () => {
    resetTranscript();
    azureActions.reset(); // Clear Azure transcripts too
    setAccumulatedTranscript(''); // Clear accumulated transcript
    setError(null);
  };

  // Don't render if Web Speech is required but not supported and Azure is not enabled
  if (!shouldUseAzureSpeech && !browserSupportsSpeechRecognition) {
    return null;
  }

  const isListening = state.isListening || isRecording || azureState.isRecording;

  // Show transcripts from appropriate source
  // For Azure: show accumulated transcript + current interim
  // For Web Speech: show transcript directly (already accumulates)
  const currentTranscript = shouldUseAzureSpeech ? accumulatedTranscript : transcript;
  const currentInterim = shouldUseAzureSpeech ? azureState.interimTranscript : interimTranscript;

  return (
    <>
      <div className="fixed right-4 bottom-4 z-50">
        <div className="flex items-end gap-3">
          {visible && (
            <div className="w-80 max-w-xs bg-white dark:bg-slate-800 border rounded-lg shadow-lg p-3 text-sm text-slate-800 dark:text-slate-100">
              <div className="flex justify-between items-start">
                <div className="font-semibold">
                  Voice {shouldUseAzureSpeech ? '(Azure)' : '(Web Speech)'}
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
                {isListening && !shouldUseAzureSpeech && (
                  <div className="text-blue-500 dark:text-blue-400 text-xs mb-1">Listening...</div>
                )}
                {shouldUseAzureSpeech && (azureState.isRecording || isRecording) && (
                  <div className="text-red-500 dark:text-red-400 text-xs mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    {useContinuousMode ? 'Recording (Live)...' : 'Recording (Batch)...'}
                  </div>
                )}
                {shouldUseAzureSpeech && azureState.isProcessing && (
                  <div className="text-blue-500 dark:text-blue-400 text-xs mb-1 flex items-center gap-1">
                    <IconLoader size={12} />
                    Processing audio...
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
                
                <button
                  onClick={() => (isListening ? handleStop() : handleStart())}
                  disabled={state.isProcessing && !isListening}
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
                  onClick={() => setShouldUseAzureSpeech(!shouldUseAzureSpeech)}
                  disabled={isListening || state.isProcessing}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                >
                  Switch to {shouldUseAzureSpeech ? 'Web Speech' : 'Azure Speech'}
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
            disabled={state.isProcessing && !isListening}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform transform hover:scale-105
              ${
                isListening
                  ? 'bg-gradient-to-br from-red-600 to-pink-500 animate-pulse'
                  : 'bg-gradient-to-br from-purple-600 to-blue-500'
              } text-white disabled:opacity-50`}
          >
            {state.isProcessing && !isListening ? <IconLoader size={20} /> : <IconMicrophone size={20} />}
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
