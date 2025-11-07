import React from 'react';
import { useAuth } from '../../store/contexts/AuthContext';
import { BackendAuthService } from '../../services/BackendAuthService';

interface AuthDebugProps {
  className?: string;
}

export const AuthDebug: React.FC<AuthDebugProps> = ({ className = '' }) => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  const debugInfo = {
    isAuthenticated,
    isLoading,
    currentUser,
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    tokenExists: !!localStorage.getItem('accessToken'),
    authServiceAuthenticated: BackendAuthService.isAuthenticated(),
    shouldRefresh: BackendAuthService.shouldRefreshToken(),
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div className={`fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs z-50 max-w-xs ${className}`}>
      <h3 className="font-bold mb-2 text-yellow-300">Auth Debug Info</h3>
      <div className="space-y-1">
        <div>
          <span className="text-blue-300">Authenticated:</span>{' '}
          <span className={isAuthenticated ? 'text-green-300' : 'text-red-300'}>
            {isAuthenticated ? 'YES' : 'NO'}
          </span>
        </div>
        <div>
          <span className="text-blue-300">Loading:</span>{' '}
          <span className={isLoading ? 'text-yellow-300' : 'text-green-300'}>
            {isLoading ? 'YES' : 'NO'}
          </span>
        </div>
        <div>
          <span className="text-blue-300">User:</span>{' '}
          <span className="text-gray-300">
            {currentUser ? currentUser.full_name : 'None'}
          </span>
        </div>
        <div>
          <span className="text-blue-300">Token Exists:</span>{' '}
          <span className={debugInfo.tokenExists ? 'text-green-300' : 'text-red-300'}>
            {debugInfo.tokenExists ? 'YES' : 'NO'}
          </span>
        </div>
        <div>
          <span className="text-blue-300">Auth Service:</span>{' '}
          <span className={debugInfo.authServiceAuthenticated ? 'text-green-300' : 'text-red-300'}>
            {debugInfo.authServiceAuthenticated ? 'YES' : 'NO'}
          </span>
        </div>
        <div>
          <span className="text-blue-300">Should Refresh:</span>{' '}
          <span className={debugInfo.shouldRefresh ? 'text-yellow-300' : 'text-green-300'}>
            {debugInfo.shouldRefresh ? 'YES' : 'NO'}
          </span>
        </div>
        {debugInfo.accessToken && (
          <div>
            <span className="text-blue-300">Token Preview:</span>{' '}
            <span className="text-gray-300 break-all">
              {debugInfo.accessToken.substring(0, 20)}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};