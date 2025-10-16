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
import { DashboardPage } from './pages/dashboard';
import NotificationsPage from './pages/NotificationsPage';

// User Management
import { UserManagementPage } from './pages/users';

// Project Management
import { ProjectListPage, ProjectMembersPage, ProjectDetailPage } from './pages/projects';
import MyProjectsPage from './pages/projects/MyProjectsPage';
import { useRoleManager } from './hooks/useRoleManager';

const ProjectSelector: React.FC = () => {
  const { canManageProjects } = useRoleManager();
  return canManageProjects() ? <ProjectListPage /> : <MyProjectsPage />;
};

// Timesheet Management
import { EmployeeTimesheetPage } from './pages/employee/EmployeeTimesheetPage';
import TeamReview from './components/TeamReview';
import TimesheetStatusView from './components/TimesheetStatusView';

// Phase 7: Team Review (Project-wise approval)
import { TeamReviewPageV2 as TeamReviewPage } from './pages/team-review/TeamReviewPageV2';

// Billing Management (Phase 8)
import BillingLayout from './pages/billing/BillingLayout';
import BillingDashboardPage from './pages/billing/BillingDashboardPage';
import ProjectBillingPage from './pages/billing/ProjectBillingPage';
import TaskBillingPage from './pages/billing/TaskBillingPage';
import InvoiceManagementPage from './pages/billing/InvoiceManagementPage';
import RateManagementPage from './pages/billing/RateManagementPage';

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
          <Route index element={<DashboardPage />} />

          {/* Notifications */}
          <Route path="notifications" element={<NotificationsPage />} />

          {/* User Management - Admin/Management/Manager Only */}
          <Route path="users" element={
            <ProtectedRoute requiredRoles={['super_admin', 'management', 'manager']}>
              <UserManagementPage />
            </ProtectedRoute>
          } />

          {/* Project Management / My Projects selector */}
          <Route path="projects" element={
            <ProtectedRoute>
              {/* Inline selector: if user can manage projects show full management view, otherwise show My Projects */}
              <ProjectSelector />
            </ProtectedRoute>
          } />
          <Route path="projects/:projectId" element={
            <ProtectedRoute>
              <ProjectDetailPage />
            </ProtectedRoute>
          } />
          <Route path="projects/:projectId/members" element={
            <ProtectedRoute>
              <ProjectMembersPage />
            </ProtectedRoute>
          } />

          {/* Client Management - Admin Only */}
          <Route path="clients" element={
            <ProtectedRoute requiredRoles={['super_admin', 'management']}>
              <ClientManagement />
            </ProtectedRoute>
          } />

          {/* Timesheet Management - Restructured */}
          <Route path="timesheets" element={
            <ProtectedRoute>
              <EmployeeTimesheetPage />
            </ProtectedRoute>
          } />
          <Route path="timesheets/status" element={
            <ProtectedRoute>
              <TimesheetStatusView />
            </ProtectedRoute>
          } />
          <Route path="timesheets/status/reports" element={
            <ProtectedRoute>
              <TimesheetStatusView />
            </ProtectedRoute>
          } />

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

          {/* Phase 7: Team Review - Project-wise Approval (Lead/Manager/Management) */}
          <Route path="team-review" element={
            <ProtectedRoute requiredRoles={['lead', 'manager', 'management', 'super_admin']}>
              <TeamReviewPage />
            </ProtectedRoute>
          } />

          {/* Billing Management - Phase 8 */}
          <Route
            path="billing"
            element={
              <ProtectedRoute requiredRoles={['super_admin', 'management']}>
                <BillingLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ProjectBillingPage />} />
            <Route path="dashboard" element={<BillingDashboardPage />} />
            <Route
              path="projects"
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'management']}>
                  <ProjectBillingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="tasks"
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'management']}>
                  <TaskBillingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="invoices"
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'management']}>
                  <InvoiceManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="rates"
              element={
                <ProtectedRoute requiredRoles={['super_admin', 'management']}>
                  <RateManagementPage />
                </ProtectedRoute>
              }
            />
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
