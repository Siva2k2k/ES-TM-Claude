import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { UserRole, User } from '../../types';

interface AuthContextType {
  currentUser: User | null;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  setCurrentUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  supabaseUser: SupabaseUser | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('employee');
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const isAuthenticated = !!supabaseUser && !!currentUser;

  // Load user profile from database
  const loadUserProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
        return null;
      }

      if (!data) {
        console.warn('User profile not found in database for ID:', userId);
        return null;
      }

      return data as User;
    } catch (error) {
      console.error('Exception in loadUserProfile:', error);
      return null;
    }
  }, []);

  // Helper function to set user state
  const setUserState = useCallback(async (user: SupabaseUser, isSessionRestoration = false): Promise<boolean> => {
    try {
      const userProfile = await loadUserProfile(user.id);
      
      if (userProfile && userProfile.is_approved_by_super_admin && userProfile.is_active) {
        // Always ensure user metadata is correct in JWT for RLS policies
        const currentMetadata = user.user_metadata;
        const needsMetadataUpdate = !currentMetadata?.user_role || 
                                   currentMetadata.user_role !== userProfile.role ||
                                   currentMetadata.full_name !== userProfile.full_name ||
                                   currentMetadata.user_id !== userProfile.id;
        
        if (needsMetadataUpdate || !isSessionRestoration) {
          try {
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                user_role: userProfile.role,
                full_name: userProfile.full_name,
                user_id: userProfile.id
              }
            });

            if (updateError) {
              console.warn('Could not update user metadata:', updateError);
            }
          } catch (metadataError) {
            console.warn('Error updating user metadata:', metadataError);
          }
        }

        setCurrentUser(userProfile);
        setCurrentUserRole(userProfile.role);
        setSupabaseUser(user);
        return true;
      } else {
        console.warn('User profile not found, not approved, or inactive. Signing out.');
        await supabase.auth.signOut();
        setCurrentUser(null);
        setCurrentUserRole('employee');
        setSupabaseUser(null);
        return false;
      }
    } catch (error) {
      console.error('Error in setUserState:', error);
      return false;
    }
  }, [loadUserProfile]);

  // Sign in function
  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error: error.message };
      }

      if (data.user && data.session) {
        const success = await setUserState(data.user, false);
        if (!success) {
          return { error: 'User profile not found, inactive, or not approved' };
        }
      }

      return {};
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 === SIGN OUT PROCESS START ===');
      setIsLoading(true);
      
      // Clear local state immediately to ensure UI updates
      setCurrentUser(null);
      setCurrentUserRole('employee');
      setSupabaseUser(null);
      
      // Sign out from Supabase (this will trigger SIGNED_OUT event)
      await supabase.auth.signOut();
      
      // Ensure loading state is cleared after a brief delay if event doesn't fire
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      
      console.log('🚪 === SIGN OUT PROCESS END ===');
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear state and loading on error
      setCurrentUser(null);
      setCurrentUserRole('employee');
      setSupabaseUser(null);
      setIsLoading(false);
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else if (session?.user) {
          await setUserState(session.user, true); // Mark as session restoration
        }
        
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
      
      console.log('🔍 === INITIAL SESSION CHECK END ===');
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Only handle events after initial load to prevent double processing
        if (!isInitialized) {
          return;
        }

        switch (event) {
          case 'SIGNED_IN':
            if (session?.user) {
              await setUserState(session.user, false);
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('🚪 User signed out - clearing state');
            setCurrentUser(null);
            setCurrentUserRole('employee');
            setSupabaseUser(null);
            setIsLoading(false);
            break;
            
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              setSupabaseUser(session.user);
            }
            break;
            
          default:
            console.log(`ℹ️ Unhandled auth event: ${event}`);
        }
      }
    );

    // Initialize
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isInitialized, setUserState]);

  const value: AuthContextType = {
    currentUser,
    currentUserRole,
    setCurrentUserRole,
    setCurrentUser,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    supabaseUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};