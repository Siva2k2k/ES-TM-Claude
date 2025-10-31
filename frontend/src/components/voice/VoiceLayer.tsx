import React, { useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

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

const VoiceLayer: React.FC = () => {
  // transcript modal should be closed by default after sign in
  const [visible, setVisible] = useState(false);
  const [listening, setListening] = useState(false);

  const {
    transcript,
    interimTranscript,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // initial listening state is false; start/stop handlers keep it in sync

  if (!browserSupportsSpeechRecognition) return null;

  const start = () => {
    // continuous to keep transcribing; user can stop
    SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
    setListening(true);
  };

  const stop = () => {
    SpeechRecognition.stopListening();
    setListening(false);
  };

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <div className="flex items-end gap-3">
        {visible && (
          <div className="w-80 max-w-xs bg-white dark:bg-slate-800 border rounded-lg shadow-lg p-3 text-sm text-slate-800 dark:text-slate-100">
            <div className="flex justify-between items-start">
              <div className="font-semibold">Voice (Live)</div>
              <button
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Close transcript"
                onClick={() => setVisible(false)}
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="mt-2 h-24 overflow-auto text-sm leading-relaxed">
              {interimTranscript ? (
                <div className="text-gray-500 dark:text-gray-400">{interimTranscript}</div>
              ) : null}
              <div>{transcript}</div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => resetTranscript()}
                className="px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-xs"
              >
                Clear
              </button>
              <button
                onClick={() => (listening ? stop() : start())}
                className={`ml-auto px-3 py-1 rounded text-sm font-medium ${listening ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
              >
                {listening ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            // If modal is closed, open it and start listening
            if (!visible) {
              setVisible(true);
              start();
              return;
            }

            // If modal already open, toggle listening state
            if (listening) stop(); else start();
          }}
          aria-label="Toggle voice"
          title="Voice (toggle)"
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform transform hover:scale-105
            bg-gradient-to-br from-purple-600 to-blue-500 text-white`}
        >
          <IconMicrophone size={20} />
        </button>
      </div>
    </div>
  );
};

export default VoiceLayer;
