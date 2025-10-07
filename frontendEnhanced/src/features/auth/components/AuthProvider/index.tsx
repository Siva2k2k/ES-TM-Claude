/**
 * AuthProvider Component
 * Context provider for authentication state
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { AuthContextType } from '../../types/auth.types';

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  /**
   * Child components
   */
  children: ReactNode;
}

/**
 * Auth provider component
 * Provides authentication state to the entire app
 * Complexity: 2
 * LOC: ~40
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 * Must be used within AuthProvider
 */
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
};
