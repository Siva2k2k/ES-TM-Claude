import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { ThemeProvider } from './store/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import UserManagementPage from './pages/UserManagementPage';
import ProfilePage from './pages/ProfilePage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import ToastProvider from './components/ui/ToastProvider';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            {/* OAuth callback */}
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              
              {/* Admin routes */}
              <Route path="admin/users" element={
                <ProtectedRoute requiredRoles={['Admin', 'SuperAdmin']}>
                  <UserManagementPage />
                </ProtectedRoute>
              } />
              
              <Route path="admin/analytics" element={
                <ProtectedRoute requiredRoles={['Admin', 'SuperAdmin']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Analytics</h1>
                    <p>Analytics dashboard coming soon...</p>
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="admin/settings" element={
                <ProtectedRoute requiredRoles={['SuperAdmin']}>
                  <SystemSettingsPage />
                </ProtectedRoute>
              } />
              
              <Route path="admin/audit-logs" element={
                <ProtectedRoute requiredRoles={['Admin', 'SuperAdmin']}>
                  <AuditLogsPage />
                </ProtectedRoute>
              } />
              
              <Route path="admin/security" element={
                <ProtectedRoute requiredRoles={['SuperAdmin']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Security</h1>
                    <p>Security settings coming soon...</p>
                  </div>
                </ProtectedRoute>
              } />
            </Route>

            {/* 404 route */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-foreground">404</h1>
                  <p className="text-muted-foreground mt-2">Page not found</p>
                </div>
              </div>
            } />
          </Routes>
        </Router>
        <ToastProvider />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
