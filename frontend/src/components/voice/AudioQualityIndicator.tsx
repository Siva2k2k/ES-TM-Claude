/**
 * Audio Quality Indicator Component
 *
 * Displays real-time audio quality with volume bars and warnings
 */

import React from 'react';
import { AudioQualityMetrics } from '../../utils/audioQualityMonitor';

export interface AudioQualityIndicatorProps {
  metrics: AudioQualityMetrics | null;
  showWarnings?: boolean;
  className?: string;
}

export const AudioQualityIndicator: React.FC<AudioQualityIndicatorProps> = ({
  metrics,
  showWarnings = true,
  className = '',
}) => {
  if (!metrics) {
    return null;
  }

  const { volume, quality, recommendation } = metrics;

  // Calculate number of active bars (out of 5)
  const activeBars = Math.min(5, Math.ceil((volume / 100) * 5));

  // Determine color based on quality
  const getBarColor = (index: number): string => {
    if (index >= activeBars) {
      return 'bg-gray-300';
    }

    if (quality === 'good') {
      return 'bg-green-500';
    } else if (quality === 'acceptable') {
      return 'bg-yellow-500';
    } else {
      return 'bg-red-500';
    }
  };

  const getQualityColor = (): string => {
    switch (quality) {
      case 'good':
        return 'text-green-600';
      case 'acceptable':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`audio-quality-indicator ${className}`}>
      {/* Volume Bars */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-600 mr-2">Volume:</span>
        <div className="flex items-end gap-1">
          {[1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={`w-1.5 transition-all duration-150 ${getBarColor(index)}`}
              style={{
                height: `${8 + index * 2}px`,
              }}
            />
          ))}
        </div>
        <span className={`text-xs ml-2 font-medium ${getQualityColor()}`}>
          {quality === 'good' ? '✓' : quality === 'acceptable' ? '⚠' : '✗'}
        </span>
      </div>

      {/* Warning Message */}
      {showWarnings && recommendation && quality !== 'good' && (
        <div className="mt-2 text-xs text-gray-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
          {recommendation}
        </div>
      )}
    </div>
  );
};

export default AudioQualityIndicator;
