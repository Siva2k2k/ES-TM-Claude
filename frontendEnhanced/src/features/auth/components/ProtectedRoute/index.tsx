/**
 * ProtectedRoute Component
 * Route protection with authentication and role-based access control
 * Adapted from /frontend with frontendEnhanced design system
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../../../types/common.types';

export interface ProtectedRouteProps {
  /**
   * Child components to render if authorized
   */
  children: React.ReactNode;
  /**
   * Optional array of roles that can access this route
   */
  requiredRoles?: UserRole[];
  /**
   * Whether authentication is required (default: true)
   */
  requireAuth?: boolean;
  /**
   * Custom redirect path for unauthorized users
   */
  redirectTo?: string;
}

/**
 * Check if user has any of the required roles
 */
const hasAnyRole = (userRole: UserRole, requiredRoles: UserRole[]): boolean => {
  if (requiredRoles.length === 0) return true;
  return requiredRoles.includes(userRole);
};

/**
 * Protected route component
 * Complexity: 5
 * LOC: ~80
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requireAuth = true,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary dark:bg-dark-background-primary">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400 mx-auto mb-4" />
          <p className="text-text-secondary dark:text-dark-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if authentication is required and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role-based authorization
  if (requiredRoles.length > 0 && user) {
    const hasPermission = hasAnyRole(user.role, requiredRoles);

    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Render children if all checks pass
  return <>{children}</>;
};
