/**
 * Offline Banner Component
 *
 * Displays warning when offline or connection is lost
 */

import React from 'react';

export interface OfflineBannerProps {
  isOnline: boolean;
  isConnected: boolean;
  queuedCommandsCount?: number;
  onRetry?: () => void;
  className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  isConnected,
  queuedCommandsCount = 0,
  onRetry,
  className = '',
}) => {
  // Don't show if everything is fine
  if (isOnline && isConnected) {
    return null;
  }

  const getMessage = (): string => {
    if (!isOnline) {
      return 'No internet connection';
    } else if (!isConnected) {
      return 'Disconnected from voice server';
    }
    return 'Connection issue';
  };

  const getSubMessage = (): string => {
    if (!isOnline) {
      return queuedCommandsCount > 0
        ? `${queuedCommandsCount} command${queuedCommandsCount > 1 ? 's' : ''} queued for when you're back online`
        : 'Voice commands will be queued until connection is restored';
    } else if (!isConnected) {
      return 'Attempting to reconnect...';
    }
    return '';
  };

  return (
    <div className={`offline-banner ${className}`}>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-yellow-800">{getMessage()}</p>
            {getSubMessage() && (
              <p className="mt-1 text-sm text-yellow-700">{getSubMessage()}</p>
            )}
            {queuedCommandsCount > 0 && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {queuedCommandsCount} queued
                </span>
              </div>
            )}
          </div>
          {onRetry && !isOnline === false && (
            <div className="ml-3">
              <button
                onClick={onRetry}
                className="text-sm font-medium text-yellow-800 hover:text-yellow-600 focus:outline-none focus:underline transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
