Frontend Restructuring Strategy - SonarQube Compliant
Timesheet Management System | ReactJS + NodeJS + MongoDB
📊 Current State Assessment
App.tsx: 832 lines (❌ SonarQube limit: ~250 lines)
Total Components: 83 files, 60,764 lines
Architecture: State-based navigation (no routing)
Validation: Duplicate validation logic (2 separate validation files)
UI Components: Already have reusable UI components (Button, Input, etc.)
Issue: Tightly coupled components, poor code reusability, no form management
🎯 SonarQube Compliance Goals
Critical Metrics to Achieve:
Cognitive Complexity: < 15 per function
File Length: < 250 lines per file
Function Length: < 75 lines per function
Code Duplication: < 3%
Cyclomatic Complexity: < 10 per function
Test Coverage: > 80%
Maintainability: A rating
📦 Phase 1: Foundation - Core Architecture & Utilities
1.1 Install Required Dependencies
npm install react-router-dom react-hook-form zod @hookform/resolvers
npm install -D @types/react-router-dom
Purpose:
react-router-dom: Modern routing (reduce App.tsx complexity)
react-hook-form: Form state management (reduce boilerplate)
zod: Schema validation (type-safe, reusable validation)
@hookform/resolvers: Bridge between react-hook-form and zod
1.2 Consolidate & Enhance Validation System
Files to Create/Modify: Create: frontend/src/schemas/ (Centralized validation schemas)
schemas/
├── auth.schema.ts # Login, password, reset schemas
├── user.schema.ts # User management schemas
├── project.schema.ts # Project & task schemas
├── timesheet.schema.ts # Timesheet entry schemas
├── billing.schema.ts # Billing & invoice schemas
└── common.schema.ts # Shared validation rules
Merge & Enhance: Combine validation.ts + validations.ts → utils/validation.ts
Eliminate duplicate code (both files have email, phone, date validation)
Use Zod schemas instead of custom validators
Reduction: ~300 lines → ~150 lines
Example Schema (auth.schema.ts):
import { z } from 'zod';

export const loginSchema = z.object({
email: z.string().email('Invalid email format').min(1, 'Email is required'),
password: z.string().min(8, 'Password must be at least 8 characters')
});

export const passwordSchema = z.string()
.min(8, 'Password must be at least 8 characters')
.regex(/[A-Z]/, 'Must contain uppercase')
.regex(/[a-z]/, 'Must contain lowercase')
.regex(/[0-9]/, 'Must contain number')
.regex(/[!@#$%^&*]/, 'Must contain special character');
1.3 Create Form Wrapper Utilities
Files to Create: frontend/src/components/forms/FormField.tsx (Reusable form field)
// Wrapper for react-hook-form + UI Input component
// Handles error display, label, helper text automatically
// Reduces form code by ~60%
frontend/src/hooks/useFormValidation.ts (Form hook wrapper)
// Wraps react-hook-form with Zod resolver
// Provides consistent form handling across app
// Auto-focus on first error
frontend/src/components/forms/FormActions.tsx (Reusable form buttons)
// Cancel, Submit, Reset buttons with consistent styling
// Loading states, disabled states handled automatically
1.4 Enhanced UI Components (Build on existing)
Enhance Existing Files: frontend/src/components/ui/Input.tsx - Already good, add:
Character counter for max length fields
Password visibility toggle
Clear button for text inputs
Create New:
ui/FormError.tsx - Consistent error display
ui/FormLabel.tsx - Accessible labels with required indicators
ui/LoadingSpinner.tsx - Reusable loading states
ui/EmptyState.tsx - Consistent empty state UI
ui/ConfirmDialog.tsx - Reusable confirmation dialogs
ui/Toast.tsx - Enhance toast notifications
1.5 Create SuspenseWrapper
frontend/src/components/common/SuspenseWrapper.tsx
// Wraps lazy-loaded components with loading fallback
// Error boundary integration
// Retry mechanism for failed loads
📦 Phase 2: Routing Infrastructure
2.1 Update Entry Point
Modify: frontend/src/main.tsx
Wrap App with BrowserRouter
Add global error boundary
~10 lines total
2.2 Create Layout System
Create: frontend/src/layouts/ AppLayout.tsx (Main layout wrapper)
Header + Sidebar + Outlet
Role-based sidebar rendering
Responsive mobile handling
~150 lines (vs 830 in current App.tsx)
Header.tsx (Top navigation)
User menu with dropdown
Notifications bell
Global search
Theme toggle
~120 lines
Sidebar.tsx (Navigation sidebar)
Role-based menu items using NavLink
Collapsible sidebar
Active route highlighting
Mobile responsive
~180 lines
AuthLayout.tsx (Login/public pages layout)
Simple centered layout for auth pages
~50 lines
2.3 Refactor App.tsx
Transform: frontend/src/App.tsx (832 lines → ~100 lines) Remove:
All state-based navigation (~200 lines)
Navigation item logic (~150 lines)
Render content switch statements (~200 lines)
useEffect hooks for navigation (~100 lines)
Manual sidebar rendering (~180 lines)
Keep:
Route definitions with React Router
ProtectedRoute wrappers
Auth state checks
New Structure:
<Routes>
<Route path="/" element={<Navigate to="/login" />} />
<Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />

<Route path="/dashboard" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
<Route index element={<DashboardPage />} />
<Route path="users" element={<ProtectedRoute roles={['super_admin']}><UserManagementPage /></ProtectedRoute>} />
{/_ ... more nested routes _/}
</Route>
</Routes>
SonarQube Impact:
✅ File length: 832 → ~100 lines
✅ Cyclomatic complexity: Reduced by ~80%
✅ Cognitive complexity: Reduced by ~85%
📦 Phase 3: Authentication Service (Service #1)
3.1 Create Page Structure
Create: frontend/src/pages/auth/
pages/auth/
├── LoginPage.tsx (~150 lines, use FormField + loginSchema)
├── ForgotPasswordPage.tsx (~100 lines)
├── ResetPasswordPage.tsx (~120 lines)
├── ForcePasswordChangePage.tsx (~130 lines)
└── components/ (Auth-specific reusable components)
├── AuthCard.tsx (Reusable auth page wrapper)
├── PasswordStrengthIndicator.tsx
└── AuthHeader.tsx
3.2 Refactor Components
Migrate:
components/forms/LoginForm.tsx → pages/auth/LoginPage.tsx
Before: 162 lines, manual validation, inline styling
After: ~100 lines using FormField + loginSchema + AuthCard
Reduction: 38% less code
components/auth/ResetPassword.tsx → pages/auth/ResetPasswordPage.tsx
Use react-hook-form + passwordSchema
Extract PasswordStrengthIndicator component
components/ForgotPasswordModal.tsx → pages/auth/ForgotPasswordPage.tsx
Convert modal to full page (better UX)
Use FormField wrapper
3.3 Routes
<Route path="/login" element={<LoginPage />} />
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
<Route path="/force-change-password" element={
<ProtectedRoute><ForcePasswordChangePage /></ProtectedRoute>
} />
SonarQube Impact:
✅ Code duplication: Reduced by 40% (shared AuthCard, FormField)
✅ Validation logic: Centralized in schemas
✅ Form handling: Consistent across all auth pages
📦 Phase 4: Dashboard Service (Service #2)
4.1 Create Page Structure
Create: frontend/src/pages/dashboard/
pages/dashboard/
├── DashboardPage.tsx (~80 lines, role-based rendering)
├── components/ (Dashboard widgets)
│ ├── StatsCard.tsx (Reusable stat display)
│ ├── QuickActions.tsx (Quick action buttons)
│ ├── RecentActivity.tsx (Activity feed)
│ └── WeeklyHours.tsx (Hours summary widget)
4.2 Refactor Components
Migrate:
components/RoleSpecificDashboard.tsx → pages/dashboard/DashboardPage.tsx
Extract widgets to separate components
Use role hook for conditional rendering
Reduction: Split large component into 5 smaller ones
4.3 Routes
<Route path="/dashboard" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
<Route index element={<DashboardPage />} />
</Route>
SonarQube Impact:
✅ Component reusability: StatsCard, QuickActions used across dashboards
✅ File length: Large dashboard split into manageable pieces
📦 Phase 5: User Management Service (Service #3)
5.1 Create Page Structure
Create: frontend/src/pages/users/
pages/users/
├── UserManagementPage.tsx (~120 lines, layout & tabs)
├── components/
│ ├── UserTable.tsx (Table with pagination)
│ ├── UserForm.tsx (Create/Edit form with userSchema)
│ ├── UserFilters.tsx (Filter controls)
│ ├── UserStatusBadge.tsx (Status display)
│ └── BulkActions.tsx (Bulk user operations)
5.2 Refactor Components
Migrate:
components/UserManagement.tsx → Split into page + sub-components
Before: Monolithic ~800+ lines
After: 6 files, ~150 lines each
Extract table logic to UserTable
Extract form to UserForm with react-hook-form + userSchema
Extract filters to UserFilters
5.3 Routes
<Route path="users" element={
<ProtectedRoute roles={['super_admin', 'management', 'manager']}>
<UserManagementPage />
</ProtectedRoute>
} />
SonarQube Impact:
✅ Function complexity: Reduced by splitting concerns
✅ Code duplication: Table, Form, Filters reusable
✅ Testability: Individual components easily testable
📦 Phase 6: Project Management Service (Service #4)
6.1 Create Page Structure
Create: frontend/src/pages/projects/
pages/projects/
├── ProjectListPage.tsx (~100 lines)
├── ProjectDetailPage.tsx (~120 lines)
├── ProjectMembersPage.tsx (~140 lines)
├── components/
│ ├── ProjectCard.tsx (Enhance existing)
│ ├── ProjectForm.tsx (Use projectSchema)
│ ├── MemberTable.tsx (Role elevation UI)
│ ├── TaskBoard.tsx (Kanban view)
│ ├── TaskForm.tsx (Use existing + taskSchema)
│ └── RoleElevationModal.tsx (Secondary manager elevation)
6.2 Refactor Components
Migrate:
components/ProjectManagement.tsx → pages/projects/ProjectListPage.tsx
components/EnhancedProjectDashboard.tsx → pages/projects/ProjectDetailPage.tsx
components/EnhancedProjectMemberManagement.tsx → pages/projects/ProjectMembersPage.tsx
Add role elevation UI (from COMPLETE_UI_INTEGRATION_PLAN.md)
Use useRoleManager hook for permissions
6.3 Routes
<Route path="projects">
<Route index element={<ProtectedRoute><ProjectListPage /></ProtectedRoute>} />
<Route path=":id" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
<Route path=":id/members" element={<ProtectedRoute><ProjectMembersPage /></ProtectedRoute>} />
</Route>
SonarQube Impact:
✅ Role-based access: Clean ProtectedRoute usage
✅ Component reusability: ProjectCard, TaskBoard reused
✅ Form validation: Centralized in schemas
📦 Phase 7: Timesheet Service (Service #5)
7.1 Create Page Structure
Create: frontend/src/pages/timesheets/
pages/timesheets/
├── TimesheetListPage.tsx (~120 lines)
├── TimesheetCreatePage.tsx (~150 lines)
├── TimesheetCalendarPage.tsx (~140 lines)
├── TeamReviewPage.tsx (~180 lines)
├── components/
│ ├── TimesheetForm.tsx (Use timesheetSchema + FormField)
│ ├── TimesheetTable.tsx (With inline editing)
│ ├── TimesheetCalendar.tsx (Calendar view)
│ ├── WeekSelector.tsx (Week navigation)
│ ├── ApprovalActions.tsx (Approve/Reject buttons)
│ └── StatusTimeline.tsx (Approval flow visualization)
7.2 Refactor Components
Migrate:
components/EmployeeTimesheet.tsx → Split into List/Create/Calendar pages
Before: 1000+ lines with viewMode prop
After: 3 separate pages, shared components
Extract form logic to TimesheetForm
Use react-hook-form with timesheetSchema
components/TeamReview.tsx → pages/timesheets/TeamReviewPage.tsx
Extract approval logic to ApprovalActions
Use role hooks for permission checks
7.3 Routes
<Route path="timesheets">
<Route index element={<ProtectedRoute><TimesheetListPage /></ProtectedRoute>} />
<Route path="create" element={<ProtectedRoute><TimesheetCreatePage /></ProtectedRoute>} />
<Route path="calendar" element={<ProtectedRoute><TimesheetCalendarPage /></ProtectedRoute>} />
<Route path="team-review" element={
<ProtectedRoute roles={['manager', 'lead']}><TeamReviewPage /></ProtectedRoute>
} />
</Route>
SonarQube Impact:
✅ Huge file split: 1000+ lines → 6 files of ~150 lines
✅ Form complexity reduced: react-hook-form handles state
✅ Validation centralized: timesheetSchema
📦 Phase 8: Billing Service (Service #6)
8.1 Create Page Structure
Create: frontend/src/pages/billing/
pages/billing/
├── BillingDashboardPage.tsx (~100 lines)
├── ProjectBillingPage.tsx (~140 lines)
├── TaskBillingPage.tsx (~140 lines)
├── InvoiceManagementPage.tsx (~160 lines)
├── RateManagementPage.tsx (~120 lines)
├── components/
│ ├── BillingCard.tsx (Summary cards)
│ ├── InvoiceForm.tsx (Use billingSchema)
│ ├── RateForm.tsx (Rate configuration)
│ ├── BillingTable.tsx (Billing data display)
│ └── ExportOptions.tsx (PDF/Excel export)
8.2 Refactor Components
Migrate:
components/EnhancedBillingManagement.tsx → pages/billing/BillingDashboardPage.tsx
components/billing/\* → Separate pages + shared components
Extract forms with react-hook-form + billingSchema
8.3 Routes
<Route path="billing" element={
<ProtectedRoute roles={['super_admin', 'management', 'manager']}>
<Outlet />
</ProtectedRoute>
}>
<Route index element={<BillingDashboardPage />} />
<Route path="projects" element={<ProjectBillingPage />} />
<Route path="tasks" element={<TaskBillingPage />} />
<Route path="invoices" element={<InvoiceManagementPage />} />
<Route path="rates" element={<RateManagementPage />} />
</Route>
SonarQube Impact:
✅ Permission checking: Route-level protection
✅ Component reusability: BillingCard, Forms shared
📦 Phase 9: Reports & Admin Service (Service #7)
9.1 Create Page Structure
Create: frontend/src/pages/reports/ & frontend/src/pages/admin/
pages/
├── reports/
│ ├── ReportsPage.tsx (~120 lines)
│ ├── CustomReportPage.tsx (~150 lines)
│ └── components/
│ ├── ReportFilters.tsx
│ ├── ReportChart.tsx
│ └── ReportExport.tsx
│
└── admin/
├── AuditLogsPage.tsx (~130 lines)
├── DeletedItemsPage.tsx (~120 lines)
├── ClientManagementPage.tsx (~140 lines)
└── components/
├── AuditLogTable.tsx
├── DeletedItemsTable.tsx
└── ClientForm.tsx
9.2 Routes
<Route path="reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

<Route path="admin" element={<ProtectedRoute roles={['super_admin']}>
<Outlet />
</ProtectedRoute>}>
<Route path="audit-logs" element={<AuditLogsPage />} />
<Route path="deleted-items" element={<DeletedItemsPage />} />
<Route path="clients" element={<ClientManagementPage />} />
</Route>
📦 Phase 10: Cleanup & Optimization
10.1 Remove Legacy Code
Delete:
Old navigation state management from App.tsx
Duplicate validation files
Unused components after migration
Modal components converted to pages
Estimated Cleanup: ~5,000 lines removed
10.2 Create Custom Hooks Library
Create: frontend/src/hooks/
hooks/
├── useFormSubmit.ts (Handle form submission with loading/errors)
├── useTablePagination.ts (Reusable pagination logic)
├── useDebounceSearch.ts (Debounced search input)
├── useConfirmDialog.ts (Confirmation dialogs)
├── useRoleAccess.ts (Enhanced role checking)
└── useFetchData.ts (Data fetching with loading states)
Impact: Reduce boilerplate by ~50% in data-heavy components
10.3 Error Boundary & 404 Page
Create:
pages/ErrorPage.tsx - User-friendly error page
pages/NotFoundPage.tsx - 404 page
components/common/ErrorBoundary.tsx - Catch React errors
📊 SonarQube Compliance Summary
Before Restructuring:
❌ App.tsx: 832 lines (>3x limit)
❌ UserManagement: 800+ lines
❌ EmployeeTimesheet: 1000+ lines
❌ Code duplication: ~8% (validation files)
❌ Cyclomatic complexity: High (nested conditionals)
❌ No form validation reusability
❌ Total: ~60,764 lines in 83 files
After Restructuring:
✅ All files: < 200 lines average
✅ App.tsx: ~100 lines (87% reduction)
✅ Code duplication: < 3% (Zod schemas, FormField, UI components)
✅ Cyclomatic complexity: < 10 (extracted components)
✅ Form handling: 60% less code (react-hook-form + Zod)
✅ Validation: Centralized schemas
✅ Component reusability: 40% more reusable components
✅ Total: ~45,000 lines in ~120 files (25% reduction + better organization)
🔄 Migration Approach
Service-by-Service Strategy:
✅ Foundation setup (Phase 1-2) - All services benefit immediately
🔄 Migrate one service at a time (Phases 3-9)
✅ Each service is independently testable
✅ No breaking changes to backend
✅ Frontend continues to run during migration
Per-Service Checklist:
Create page structure
Create Zod schemas
Refactor forms to use react-hook-form + FormField
Extract reusable components
Add routes with ProtectedRoute
Test navigation and permissions
Delete old component files
Update imports across app
🎯 Key Improvements

1. Form Handling (60% less code)
   Before:
   const [email, setEmail] = useState('');
   const [emailError, setEmailError] = useState('');
   const validateEmail = () => { /_ manual validation _/ };
   After:
   const { control } = useForm({ resolver: zodResolver(loginSchema) });
   <FormField name="email" control={control} />
2. Validation (Centralized)
   Before: Duplicate validation in 2 files, ~500 lines After: Zod schemas in 6 files, ~200 lines total
3. Component Reusability
   New Reusable Components:
   FormField (reduces form code by 60%)
   AuthCard (consistent auth pages)
   StatsCard (dashboard widgets)
   TableWithPagination (all tables)
   ConfirmDialog (all deletions)
   LoadingSpinner (all loading states)
4. Better UX Flow
   URL-based navigation (shareable links)
   Browser back/forward works
   Form validation on blur + submit
   Clear error messages
   Consistent loading states
   Auto-focus on form errors
   🚀 Execution Timeline
   Week 1: Phase 1-2 (Foundation + Routing) Week 2: Phase 3-4 (Auth + Dashboard) Week 3: Phase 5-6 (Users + Projects) Week 4: Phase 7 (Timesheets) Week 5: Phase 8 (Billing) Week 6: Phase 9-10 (Admin + Cleanup) Total: 6 weeks for complete restructuring