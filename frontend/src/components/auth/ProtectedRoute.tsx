import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/contexts/AuthContext';
import { hasAnyRole } from '../../utils/permissions';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { UserRole } from '../../types';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[] | string[];
  requireAuth?: boolean;
}

/**
 * ProtectedRoute Component
 * Protects routes with authentication and role-based authorization
 *
 * @param children - Child components to render if authorized
 * @param requiredRoles - Optional array of roles that can access this route
 * @param requireAuth - Whether authentication is required (default: true)
 *
 * @example
 * <ProtectedRoute requiredRoles={['admin', 'manager']}>
 *   <AdminPage />
 * </ProtectedRoute>
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  requireAuth = true,
}) => {
  const { isAuthenticated, isLoading, currentUserRole } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Redirect to login if authentication is required and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based authorization
  if (requiredRoles && requiredRoles.length > 0) {
    const hasPermission = hasAnyRole(currentUserRole || '', requiredRoles);

    if (!hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Render children if all checks pass
  return <>{children}</>;
};

export default ProtectedRoute;
