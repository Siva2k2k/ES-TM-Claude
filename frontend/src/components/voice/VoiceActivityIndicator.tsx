/**
 * Voice Activity Indicator Component
 *
 * Shows speaking/silence status with optional countdown timer
 */

import React from 'react';
import { VoiceActivityEvent } from '../../utils/voiceActivityDetector';

export interface VoiceActivityIndicatorProps {
  event: VoiceActivityEvent | null;
  showCountdown?: boolean;
  silenceDuration?: number; // Max silence duration in ms
  className?: string;
}

export const VoiceActivityIndicator: React.FC<VoiceActivityIndicatorProps> = ({
  event,
  showCountdown = true,
  silenceDuration = 2000,
  className = '',
}) => {
  if (!event) {
    return null;
  }

  const { isSpeaking, state, silenceDurationMs } = event;

  // Calculate countdown for auto-stop
  const remainingMs = Math.max(0, silenceDuration - silenceDurationMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  const getIndicatorStyle = (): string => {
    if (isSpeaking) {
      return 'bg-green-100 text-green-800 border-green-300';
    } else if (state === 'silence_detected') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else {
      return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getIndicatorText = (): string => {
    if (isSpeaking) {
      return 'Speaking';
    } else if (state === 'silence_detected') {
      return 'Silent';
    } else {
      return 'Idle';
    }
  };

  return (
    <div className={`voice-activity-indicator ${className}`}>
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getIndicatorStyle()} transition-all duration-200`}>
        {/* Pulse animation when speaking */}
        {isSpeaking && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        )}

        {/* Status text */}
        <span className="text-xs font-medium">{getIndicatorText()}</span>

        {/* Countdown timer */}
        {showCountdown && state === 'silence_detected' && remainingSeconds > 0 && (
          <span className="text-xs font-mono">
            {remainingSeconds}s
          </span>
        )}
      </div>
    </div>
  );
};

export default VoiceActivityIndicator;
