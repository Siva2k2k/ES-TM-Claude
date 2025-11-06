import React from 'react';
import { VoiceError } from '../types/voice';

interface VoiceErrorDisplayProps {
  errors: VoiceError[] | null;
  formErrors?: Record<string, string>;
  systemError?: string;
  className?: string;
}

const VoiceErrorDisplay: React.FC<VoiceErrorDisplayProps> = ({
  errors,
  formErrors,
  systemError,
  className = ''
}) => {
  if (!errors && !formErrors && !systemError) {
    return null;
  }

  const renderFieldError = (field: string, message: string) => (
    <div key={field} className="bg-red-50 border border-red-200 rounded-md p-3 mb-2">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Field Error: {field}
          </h3>
          <div className="mt-1 text-sm text-red-700">
            {message}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemError = (message: string) => (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-3">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            System Error
          </h3>
          <div className="mt-1 text-sm text-red-700">
            {message}
          </div>
        </div>
      </div>
    </div>
  );

  const renderVoiceError = (error: VoiceError, index: number) => {
    const getErrorIcon = (type: VoiceError['type']) => {
      switch (type) {
        case 'validation':
          return (
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          );
        case 'permission':
          return (
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          );
        case 'data':
          return (
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          );
        case 'system':
          return (
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          );
        default:
          return (
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          );
      }
    };

    const getErrorBgColor = (type: VoiceError['type']) => {
      switch (type) {
        case 'validation': return 'bg-yellow-50 border-yellow-200';
        case 'permission': return 'bg-red-50 border-red-200';
        case 'data': return 'bg-blue-50 border-blue-200';
        case 'system': return 'bg-red-50 border-red-200';
        default: return 'bg-gray-50 border-gray-200';
      }
    };

    const getErrorTextColor = (type: VoiceError['type']) => {
      switch (type) {
        case 'validation': return 'text-yellow-800';
        case 'permission': return 'text-red-800';
        case 'data': return 'text-blue-800';
        case 'system': return 'text-red-800';
        default: return 'text-gray-800';
      }
    };

    return (
      <div key={index} className={`${getErrorBgColor(error.type)} border rounded-md p-3 mb-2`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getErrorIcon(error.type)}
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${getErrorTextColor(error.type)}`}>
              {error.type.charAt(0).toUpperCase() + error.type.slice(1)} Error
              {error.field && `: ${error.field}`}
            </h3>
            <div className={`mt-1 text-sm ${getErrorTextColor(error.type).replace('800', '700')}`}>
              {error.message}
            </div>
            {error.code && (
              <div className={`mt-1 text-xs ${getErrorTextColor(error.type).replace('800', '600')} font-mono`}>
                Code: {error.code}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`voice-error-display ${className}`}>
      {/* System Error - Highest Priority */}
      {systemError && renderSystemError(systemError)}
      
      {/* Form Field Errors */}
      {formErrors && Object.entries(formErrors).map(([field, message]) => 
        renderFieldError(field, message)
      )}
      
      {/* Detailed Voice Errors */}
      {errors && errors.map((error, index) => renderVoiceError(error, index))}
    </div>
  );
};

export default VoiceErrorDisplay;