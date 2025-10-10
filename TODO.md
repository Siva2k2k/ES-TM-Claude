Update Todos

Phase 1.1: Install required dependencies (react-router-dom, react-hook-form, zod, @hookform/resolvers)

Phase 1.2: Consolidate validation files - Merge validation.ts + validations.ts into single enhanced validation.ts

Phase 1.2: Create schemas directory structure with auth.schema.ts, user.schema.ts, project.schema.ts, timesheet.schema.ts, billing.schema.ts, common.schema.ts

Phase 1.3: Create FormField.tsx component (reusable form field wrapper with react-hook-form integration)

Phase 1.3: Create useFormValidation.ts hook (form wrapper with Zod resolver)

Phase 1.3: Create FormActions.tsx component (reusable form buttons)

Phase 1.4: Enhance existing Input.tsx component (add character counter, password toggle, clear button)

Phase 1.4: Create FormError.tsx, FormLabel.tsx, LoadingSpinner.tsx, EmptyState.tsx, ConfirmDialog.tsx components

Phase 1.5: Create SuspenseWrapper.tsx component with error boundary and retry mechanism

Phase 2.1: Update main.tsx - Wrap App with BrowserRouter and global error boundary

Phase 2.2: Create layouts directory with AppLayout.tsx (Header + Sidebar + Outlet structure)

Phase 2.2: Create Header.tsx component (top navigation with user menu, notifications, search)

Phase 2.2:  

Phase 2.2: Create AuthLayout.tsx component (simple layout for login/public pages)

Phase 2.3: Refactor App.tsx - Remove state-based navigation and implement React Router (~832 lines to ~100 lines)

Phase 2.3: Define all route structure with ProtectedRoute wrappers

Phase 3.1: Create pages/auth directory structure with subdirectories

Phase 3.1: Create pages/auth/components with AuthCard.tsx, PasswordStrengthIndicator.tsx, AuthHeader.tsx

Phase 3.2: Migrate LoginForm.tsx to pages/auth/LoginPage.tsx using FormField + loginSchema

Phase 3.2: Migrate ResetPassword.tsx to pages/auth/ResetPasswordPage.tsx with react-hook-form

Phase 3.2: Migrate ForgotPasswordModal.tsx to pages/auth/ForgotPasswordPage.tsx (convert modal to page)

Phase 3.2: Migrate ForcePasswordChange.tsx to pages/auth/ForcePasswordChangePage.tsx

Phase 3.3: Add authentication routes (/login, /forgot-password, /reset-password, /force-change-password)

Phase 3.3: Test all authentication flows and form validations

Phase 4.1: Create pages/dashboard directory with DashboardPage.tsx

Phase 4.1: Create dashboard/components with StatsCard.tsx, QuickActions.tsx, RecentActivity.tsx, WeeklyHours.tsx

Phase 4.2: Migrate RoleSpecificDashboard.tsx to pages/dashboard/DashboardPage.tsx with role-based rendering

Phase 4.3: Add dashboard route (/dashboard) with ProtectedRoute wrapper

Phase 4.3: Test dashboard loading and role-based widget display

Phase 5.1: Create pages/users directory with UserManagementPage.tsx

Phase 5.1: Create users/components with UserTable.tsx, UserForm.tsx, UserFilters.tsx, UserStatusBadge.tsx, BulkActions.tsx

Phase 5.2: Split UserManagement.tsx monolithic component into page + sub-components

Phase 5.2: Refactor UserForm with react-hook-form + userSchema validation

Phase 5.3: Add user management route (/dashboard/users) with role-based ProtectedRoute

Phase 5.3: Test user CRUD operations, filtering, and bulk actions

Phase 6.1: Create pages/projects directory with ProjectListPage.tsx, ProjectDetailPage.tsx, ProjectMembersPage.tsx

Phase 6.1: Create projects/components with ProjectCard.tsx, ProjectForm.tsx, MemberTable.tsx, TaskBoard.tsx, TaskForm.tsx, RoleElevationModal.tsx

Phase 6.2: Migrate ProjectManagement.tsx to pages/projects/ProjectListPage.tsx

Phase 6.2: Migrate EnhancedProjectDashboard.tsx to pages/projects/ProjectDetailPage.tsx

Phase 6.2: Migrate EnhancedProjectMemberManagement.tsx to pages/projects/ProjectMembersPage.tsx with role elevation UI

Phase 6.2: Integrate useRoleManager hook for project permission checks

Phase 6.3: Add project routes (/dashboard/projects, /dashboard/projects/:id, /dashboard/projects/:id/members)

Phase 6.3: Test project CRUD, member management, and role elevation flows

Phase 7.1: Create pages/timesheets directory with TimesheetListPage.tsx, TimesheetCreatePage.tsx, TimesheetCalendarPage.tsx, TeamReviewPage.tsx

Phase 7.1: Create timesheets/components with TimesheetForm.tsx, TimesheetTable.tsx, TimesheetCalendar.tsx, WeekSelector.tsx, ApprovalActions.tsx, StatusTimeline.tsx

Phase 7.2: Split EmployeeTimesheet.tsx (1000+ lines) into List/Create/Calendar pages

Phase 7.2: Refactor TimesheetForm with react-hook-form + timesheetSchema validation

Phase 7.2: Migrate TeamReview.tsx to pages/timesheets/TeamReviewPage.tsx with ApprovalActions component

Phase 7.3: Add timesheet routes (/dashboard/timesheets, /timesheets/create, /timesheets/calendar, /timesheets/team-review)

Phase 7.3: Test timesheet CRUD, calendar view, week navigation, and approval workflows

Phase 8.1: Create pages/billing directory with BillingDashboardPage.tsx, ProjectBillingPage.tsx, TaskBillingPage.tsx, InvoiceManagementPage.tsx, RateManagementPage.tsx

Phase 8.1: Create billing/components with BillingCard.tsx, InvoiceForm.tsx, RateForm.tsx, BillingTable.tsx, ExportOptions.tsx

Phase 8.2: Migrate EnhancedBillingManagement.tsx to pages/billing/BillingDashboardPage.tsx

Phase 8.2: Migrate billing/\* components to separate pages with shared components

Phase 8.2: Refactor billing forms with react-hook-form + billingSchema validation

Phase 8.3: Add billing routes (/dashboard/billing, /billing/projects, /billing/tasks, /billing/invoices, /billing/rates) with role protection

Phase 8.3: Test billing operations, invoice generation, and export functionality

Phase 9.1: Create pages/reports directory with ReportsPage.tsx, CustomReportPage.tsx

Phase 9.1: Create reports/components with ReportFilters.tsx, ReportChart.tsx, ReportExport.tsx

Phase 9.1: Create pages/admin directory with AuditLogsPage.tsx, DeletedItemsPage.tsx, ClientManagementPage.tsx

Phase 9.1: Create admin/components with AuditLogTable.tsx, DeletedItemsTable.tsx, ClientForm.tsx

Phase 9.2: Migrate ReportsHub.tsx and EnhancedReports.tsx to pages/reports

Phase 9.2: Migrate AuditLogs.tsx, DeletedItemsView.tsx, ClientManagement.tsx to pages/admin

Phase 9.3: Add reports routes (/dashboard/reports) and admin routes (/dashboard/admin/\*) with role protection

Phase 9.3: Test reports generation, filtering, export, and admin operations

Phase 10.1: Delete old component files after successful migration (LoginForm, UserManagement, EmployeeTimesheet, etc.)

Phase 10.1: Remove state-based navigation code and unused useEffect hooks from App.tsx

Phase 10.1: Delete duplicate validation files and consolidate into single validation utility

Phase 10.2: Create custom hooks library (useFormSubmit, useTablePagination, useDebounceSearch, useConfirmDialog, useRoleAccess, useFetchData)

Phase 10.2: Refactor components to use new custom hooks to reduce boilerplate

Phase 10.3: Create ErrorPage.tsx, NotFoundPage.tsx (404), and ErrorBoundary.tsx component

Phase 10.3: Add error boundary to main App and route structure

Phase 10.4: Run full application test - Test all routes, forms, validations, and role-based access

Phase 10.4: Verify SonarQube compliance - Check file lengths, complexity, duplication, and maintainability ratings

Phase 10.5: Update documentation - Document new routing structure, form patterns, and validation schemas

Phase 10.5: Create developer guide for using FormField, validation schemas, and custom hooks
Perfect! I've created a comprehensive 80-task todo list covering the entire restructuring plan. Here's the breakdown:
📋 Complete Todo List Summary
Phase 1: Foundation (9 tasks) - Core Architecture & Utilities
Install dependencies (react-router-dom, react-hook-form, zod)
Consolidate validation files and create Zod schemas
Create reusable form components (FormField, FormActions)
Enhance UI components
Create SuspenseWrapper
Phase 2: Routing Infrastructure (6 tasks)
Update main.tsx with BrowserRouter
Create layouts (AppLayout, Header, Sidebar, AuthLayout)
Refactor App.tsx from 832 → ~100 lines
Phase 3: Authentication Service (7 tasks)
Create auth pages structure
Migrate all auth components to pages
Implement routes and test flows
Phase 4: Dashboard Service (5 tasks)
Create dashboard page and widgets
Migrate RoleSpecificDashboard
Test role-based rendering
Phase 5: User Management Service (6 tasks)
Create user pages structure
Split monolithic UserManagement component
Implement CRUD with validation schemas
Phase 6: Project Management Service (8 tasks)
Create project pages (List, Detail, Members)
Implement role elevation UI
Integrate useRoleManager permissions
Phase 7: Timesheet Service (7 tasks)
Split 1000+ line EmployeeTimesheet component
Create List/Create/Calendar/TeamReview pages
Implement approval workflows
Phase 8: Billing Service (7 tasks)
Create billing pages (Dashboard, Projects, Tasks, Invoices, Rates)
Migrate billing components with forms
Test invoice generation and exports
Phase 9: Reports & Admin Service (8 tasks)
Create reports and admin pages
Migrate reporting and admin components
Test with role-based protection
Phase 10: Cleanup & Optimization (17 tasks)
Delete legacy component files (~5,000 lines)
Create custom hooks library (6 hooks)
Add error handling (ErrorBoundary, 404)
Full testing and SonarQube verification
Documentation updates
🎯 Key Metrics Tracked
Total Tasks: 80 Estimated Timeline: 6 weeks Expected Code Reduction:
From 60,764 lines → ~45,000 lines (25% reduction)
App.tsx: 832 → ~100 lines (87% reduction)
Improved organization: 83 files → ~120 files (better structure)
SonarQube Compliance Goals: ✅ File length < 250 lines ✅ Function complexity < 15 ✅ Code duplication < 3% ✅ Maintainability Rating: A
📊 Progress Tracking
The todo list is now active and ready! You can:
See progress as each task is marked in_progress → completed
Track by phase - Each phase is clearly labeled
Independent execution - Each service can be done separately
Testable milestones - Each phase ends with testing tasks
