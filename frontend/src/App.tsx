import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './store/contexts/AuthContext';

// Layouts
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Auth Components & Pages
import {
  LoginPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  ForcePasswordChangePage,
} from './pages/auth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import NotFoundPage from './pages/auth/NotFoundPage';

// Dashboard Pages
import { RoleSpecificDashboard } from './components/RoleSpecificDashboard';
import NotificationsPage from './pages/NotificationsPage';

// User Management
import { UserManagement } from './components/UserManagement';

// Project Management
import { ProjectManagement } from './components/ProjectManagement';

// Timesheet Management
import { EmployeeTimesheet } from './components/EmployeeTimesheet';
import TeamReview from './components/TeamReview';
import TimesheetStatusView from './components/TimesheetStatusView';

// Billing Management
import { EnhancedBillingManagement } from './components/EnhancedBillingManagement';
import { EnhancedBillingDashboard } from './components/billing/EnhancedBillingDashboard';
import { BillingRateManagement } from './components/billing/BillingRateManagement';
import { EnhancedInvoiceWorkflow } from './components/billing/EnhancedInvoiceWorkflow';
import ProjectBillingView from './components/billing/ProjectBillingView';
import TaskBillingView from './components/billing/TaskBillingView';
import BillingOthersView from './components/billing/BillingOthersView';

// Reports & Admin
import ReportsHub from './components/ReportsHub';
import { AuditLogs } from './components/AuditLogs';
import { DeletedItemsView } from './components/admin/DeletedItemsView';
import { ClientManagement } from './components/ClientManagement';

const App: React.FC = () => {
  const { requirePasswordChange } = useAuth();

  // Handle force password change
  if (requirePasswordChange) {
    return (
      <>
        <ForcePasswordChangePage />
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </>
    );
  }

  return (
    <>
      <Routes>
        {/* Public Routes - No layout (pages have their own) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Routes - App Layout */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          {/* Dashboard Home */}
          <Route index element={<RoleSpecificDashboard />} />

          {/* Notifications */}
          <Route path="notifications" element={<NotificationsPage />} />

          {/* User Management - Admin/Management/Manager Only */}
          <Route path="users" element={
            <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
              <UserManagement />
            </ProtectedRoute>
          } />
          <Route path="users/create" element={
            <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
              <UserManagement defaultTab="all" />
            </ProtectedRoute>
          } />
          <Route path="users/pending" element={
            <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
              <UserManagement defaultTab="pending" />
            </ProtectedRoute>
          } />

          {/* Project Management */}
          <Route path="projects" element={
            <ProtectedRoute>
              <ProjectManagement />
            </ProtectedRoute>
          } />
          <Route path="projects/overview" element={
            <ProtectedRoute>
              <ProjectManagement />
            </ProtectedRoute>
          } />
          <Route path="projects/tasks" element={
            <ProtectedRoute>
              <ProjectManagement />
            </ProtectedRoute>
          } />

          {/* Client Management - Admin Only */}
          <Route path="clients" element={
            <ProtectedRoute requiredRoles={['super_admin', 'management']}>
              <ClientManagement />
            </ProtectedRoute>
          } />

          {/* Timesheet Management */}
          <Route path="timesheets">
            <Route index element={
              <ProtectedRoute>
                <EmployeeTimesheet viewMode="list" />
              </ProtectedRoute>
            } />
            <Route path="list" element={
              <ProtectedRoute>
                <EmployeeTimesheet viewMode="list" />
              </ProtectedRoute>
            } />
            <Route path="create" element={
              <ProtectedRoute>
                <EmployeeTimesheet viewMode="create" />
              </ProtectedRoute>
            } />
            <Route path="calendar" element={
              <ProtectedRoute>
                <EmployeeTimesheet viewMode="calendar" />
              </ProtectedRoute>
            } />
            <Route path="status" element={
              <ProtectedRoute>
                <TimesheetStatusView />
              </ProtectedRoute>
            } />
            <Route path="status/view" element={
              <ProtectedRoute>
                <TimesheetStatusView />
              </ProtectedRoute>
            } />
            <Route path="status/reports" element={
              <ProtectedRoute>
                <TimesheetStatusView />
              </ProtectedRoute>
            } />
          </Route>

          {/* Team Review - Manager/Lead Only */}
          <Route path="team">
            <Route index element={
              <ProtectedRoute requiredRoles={['manager', 'lead', 'management', 'super_admin']}>
                <TeamReview />
              </ProtectedRoute>
            } />
            <Route path="calendar" element={
              <ProtectedRoute requiredRoles={['manager', 'lead', 'management', 'super_admin']}>
                <TeamReview />
              </ProtectedRoute>
            } />
            <Route path="list" element={
              <ProtectedRoute requiredRoles={['manager', 'lead', 'management', 'super_admin']}>
                <TeamReview />
              </ProtectedRoute>
            } />
            <Route path="approval" element={
              <ProtectedRoute requiredRoles={['manager', 'lead', 'management', 'super_admin']}>
                <TeamReview />
              </ProtectedRoute>
            } />
            <Route path="verification" element={
              <ProtectedRoute requiredRoles={['manager', 'lead', 'management', 'super_admin']}>
                <TeamReview />
              </ProtectedRoute>
            } />
            <Route path="overview" element={
              <ProtectedRoute requiredRoles={['manager', 'lead', 'management', 'super_admin']}>
                <TeamReview />
              </ProtectedRoute>
            } />
          </Route>

          {/* Billing Management - Admin/Management/Manager Only */}
          <Route path="billing">
            <Route index element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <EnhancedBillingManagement />
              </ProtectedRoute>
            } />
            <Route path="dashboard" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <EnhancedBillingDashboard />
              </ProtectedRoute>
            } />
            <Route path="enhanced-dashboard" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <EnhancedBillingDashboard />
              </ProtectedRoute>
            } />
            <Route path="projects" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <ProjectBillingView />
              </ProtectedRoute>
            } />
            <Route path="tasks" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <TaskBillingView />
              </ProtectedRoute>
            } />
            <Route path="others" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <BillingOthersView />
              </ProtectedRoute>
            } />
            <Route path="invoices" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <EnhancedInvoiceWorkflow />
              </ProtectedRoute>
            } />
            <Route path="invoice-workflow" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <EnhancedInvoiceWorkflow />
              </ProtectedRoute>
            } />
            <Route path="rates" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <BillingRateManagement />
              </ProtectedRoute>
            } />
            <Route path="rate-management" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <BillingRateManagement />
              </ProtectedRoute>
            } />
            {/* Legacy billing routes */}
            <Route path="view" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <EnhancedBillingManagement />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <EnhancedBillingManagement />
              </ProtectedRoute>
            } />
            <Route path="snapshots" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <EnhancedBillingManagement />
              </ProtectedRoute>
            } />
            <Route path="approval" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <EnhancedBillingManagement />
              </ProtectedRoute>
            } />
            <Route path="provisions" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <EnhancedBillingManagement />
              </ProtectedRoute>
            } />
            <Route path="summaries" element={
              <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
                <EnhancedBillingManagement />
              </ProtectedRoute>
            } />
          </Route>

          {/* Reports - All Authenticated Users */}
          <Route path="reports" element={
            <ProtectedRoute>
              <ReportsHub />
            </ProtectedRoute>
          } />

          {/* Admin Routes - Super Admin Only */}
          <Route path="admin">
            <Route path="audit-logs" element={
              <ProtectedRoute requiredRoles={['super_admin']}>
                <AuditLogs />
              </ProtectedRoute>
            } />
            <Route path="audit-cleanup" element={
              <ProtectedRoute requiredRoles={['super_admin']}>
                <AuditLogs />
              </ProtectedRoute>
            } />
            <Route path="deleted-items" element={
              <ProtectedRoute requiredRoles={['super_admin']}>
                <DeletedItemsView />
              </ProtectedRoute>
            } />
          </Route>
        </Route>

        {/* Unauthorized Page */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Root redirect to dashboard or login */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 - Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default App;
