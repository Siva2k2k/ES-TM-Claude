import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requireEmailVerification?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRoles,
  requireEmailVerification = false,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname + location.search }} 
        replace 
      />
    );
  }

  // Check email verification requirement
  if (requireEmailVerification && !user.isEmailVerified) {
    return (
      <Navigate 
        to="/verify-email" 
        state={{ from: location.pathname + location.search }} 
        replace 
      />
    );
  }

  // Check role requirements
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(user.role)) {
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ from: location.pathname + location.search }} 
          replace 
        />
      );
    }
  }

  return <>{children}</>;
}

// Convenience components for common role checks
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['Admin', 'SuperAdmin']}>
      {children}
    </ProtectedRoute>
  );
}

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['SuperAdmin']}>
      {children}
    </ProtectedRoute>
  );
}

export function VerifiedUserRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireEmailVerification>
      {children}
    </ProtectedRoute>
  );
}

export default ProtectedRoute;