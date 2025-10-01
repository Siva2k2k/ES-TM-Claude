# 🚀 NEW FEATURES IMPLEMENTATION PLAN

## Overview
Three major feature sets to implement:
1. **Hard/Soft Delete with Audit Review**
2. **Billing Management Enhancement**
3. **User Profile, Settings & Theme System**

---

## 🗑️ FEATURE 1: HARD & SOFT DELETE SYSTEM

### Architecture

#### Database Schema Updates
```typescript
// All important tables should have:
interface SoftDeleteSchema {
  deleted_at: Date | null;
  deleted_by: ObjectId | null;
  deleted_reason: string | null;
  is_hard_deleted: boolean;
  hard_deleted_at: Date | null;
  hard_deleted_by: ObjectId | null;
}
```

### Implementation Plan

#### Phase 1.1: Backend - Soft Delete Enhancement

**Files to Update:**
1. **`backend/src/models/User.ts`**
   - Add `deleted_reason`, `is_hard_deleted`, `hard_deleted_at`, `hard_deleted_by`

2. **`backend/src/models/Timesheet.ts`**
   - Add soft delete fields if missing

3. **`backend/src/models/BillingSnapshot.ts`** (Create if doesn't exist)
   - Add complete soft/hard delete support

4. **`backend/src/services/UserService.ts`**
```typescript
// Add methods:
static async softDeleteUser(
  userId: string,
  reason: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }>

static async hardDeleteUser(
  userId: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }>

static async restoreUser(
  userId: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }>

static async getDeletedUsers(
  currentUser: AuthUser
): Promise<{ users: IUser[]; error?: string }>

static async canHardDelete(
  userId: string,
  currentUser: AuthUser
): Promise<{ allowed: boolean; reason?: string; auditLogCount?: number }>
```

5. **`backend/src/services/TimesheetService.ts`**
```typescript
// Add methods:
static async softDeleteTimesheet()
static async hardDeleteTimesheet()
static async restoreTimesheet()
static async getDeletedTimesheets()
```

6. **`backend/src/services/BillingService.ts`**
```typescript
// Add methods:
static async softDeleteBillingSnapshot()
static async hardDeleteBillingSnapshot()
static async restoreBillingSnapshot()
```

#### Phase 1.2: Frontend - Delete UI

**Component: `frontend/src/components/DeleteManagementModal.tsx`** (NEW)
```typescript
interface DeleteManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'user' | 'timesheet' | 'billing';
  entityId: string;
  entityName: string;
  deleteType: 'soft' | 'hard';
  auditLogCount?: number;
  onConfirm: (reason?: string) => Promise<void>;
}

// Features:
// - Show audit log count for hard delete
// - Require reason for soft delete
// - Type entity name for hard delete confirmation
// - Show dependencies
// - Display audit log summary
```

**Component: `frontend/src/components/DeletedItemsManager.tsx`** (NEW)
```typescript
// Admin-only panel to view and restore deleted items
interface DeletedItemsManagerProps {
  entityType: 'user' | 'timesheet' | 'billing';
}

// Features:
// - List all soft-deleted items
// - Show deletion date, deleted by, reason
// - Restore functionality
// - Hard delete (admin only) with audit review
// - Filter and search deleted items
```

**Update Files:**
1. `UserManagement.tsx` - Add delete buttons and modals
2. `EmployeeTimesheet.tsx` - Add delete for draft timesheets
3. `EnhancedBillingManagement.tsx` - Add delete for billing snapshots

#### Phase 1.3: Admin Audit Log Review

**Component: `frontend/src/components/AuditLogReview.tsx`** (NEW)
```typescript
// Show audit logs before hard delete
interface AuditLogReviewProps {
  entityType: string;
  entityId: string;
  onClose: () => void;
  onConfirmDelete: () => void;
}

// Features:
// - Display all audit logs for entity
// - Group by action type
// - Show timeline
// - Highlight important changes
// - Export logs before deletion
```

### Routes to Add

**Backend:**
```typescript
// User routes
DELETE /api/users/:id/soft        // Soft delete
DELETE /api/users/:id/hard        // Hard delete (super admin)
POST   /api/users/:id/restore     // Restore
GET    /api/users/deleted          // List deleted

// Timesheet routes
DELETE /api/timesheets/:id/soft
DELETE /api/timesheets/:id/hard
POST   /api/timesheets/:id/restore
GET    /api/timesheets/deleted

// Billing routes
DELETE /api/billing/:id/soft
DELETE /api/billing/:id/hard
POST   /api/billing/:id/restore
GET    /api/billing/deleted
```

---

## 💰 FEATURE 2: BILLING MANAGEMENT ENHANCEMENT

### Current State Analysis
Need to review existing billing implementation and enhance it.

### Billing Management Features

#### 2.1 Billing Workflow
```
1. Generate Billing Snapshot (Weekly/Monthly)
   ↓
2. Review & Adjust Hours/Rates
   ↓
3. Manager Approval
   ↓
4. Management Approval
   ↓
5. Mark as Finalized
   ↓
6. Export Invoice
   ↓
7. Mark as Paid
```

#### 2.2 Backend Implementation

**File: `backend/src/models/BillingSnapshot.ts`** (Enhanced)
```typescript
interface IBillingSnapshot {
  id: string;
  period_start: Date;
  period_end: Date;
  client_id: ObjectId;
  project_id: ObjectId;

  // Status workflow
  status: 'draft' | 'pending_manager' | 'pending_management' | 'finalized' | 'invoiced' | 'paid';

  // Approval tracking
  submitted_at: Date | null;
  manager_approved_at: Date | null;
  manager_approved_by: ObjectId | null;
  management_approved_at: Date | null;
  management_approved_by: ObjectId | null;
  finalized_at: Date | null;
  finalized_by: ObjectId | null;

  // Financial data
  total_hours: number;
  billable_hours: number;
  total_amount: number;
  currency: string;

  // Line items
  line_items: BillingLineItem[];

  // Adjustments
  adjustments: BillingAdjustment[];
  adjustment_notes: string | null;

  // Invoice data
  invoice_number: string | null;
  invoice_date: Date | null;
  invoice_due_date: Date | null;
  payment_terms: string | null;

  // Payment tracking
  paid_at: Date | null;
  payment_method: string | null;
  payment_reference: string | null;

  // Metadata
  created_by: ObjectId;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface BillingLineItem {
  id: string;
  timesheet_id: ObjectId;
  user_id: ObjectId;
  user_name: string;
  date: Date;
  hours: number;
  hourly_rate: number;
  amount: number;
  description: string;
  is_billable: boolean;
}

interface BillingAdjustment {
  id: string;
  type: 'discount' | 'surcharge' | 'credit' | 'debit';
  amount: number;
  percentage: number | null;
  reason: string;
  applied_by: ObjectId;
  applied_at: Date;
}
```

**File: `backend/src/services/BillingService.ts`** (Enhanced)
```typescript
class BillingService {
  // Generation
  static async generateBillingSnapshot()
  static async generateMonthlyBilling()
  static async generateClientBilling()

  // Workflow
  static async submitForApproval()
  static async approveByManager()
  static async approveByManagement()
  static async rejectBilling()
  static async finalizeBilling()

  // Adjustments
  static async addAdjustment()
  static async removeAdjustment()
  static async updateLineItem()

  // Invoice
  static async generateInvoice()
  static async exportInvoicePDF()
  static async markAsPaid()

  // Reports
  static async getBillingDashboard()
  static async getRevenueForecast()
  static async getClientBillingSummary()
}
```

#### 2.3 Frontend Implementation

**Component: `frontend/src/components/BillingWorkflow.tsx`** (NEW)
```typescript
// Visual workflow component showing billing status
// - Progress stepper UI
// - Current status highlighted
// - Actions available at each stage
// - Approval history
```

**Component: `frontend/src/components/BillingEditor.tsx`** (NEW)
```typescript
// Edit billing snapshot
// - Adjust hours
// - Adjust rates
// - Add discounts/surcharges
// - Add notes
// - Preview total
```

**Component: `frontend/src/components/InvoiceGenerator.tsx`** (NEW)
```typescript
// Generate and preview invoice
// - Company details
// - Client details
// - Line items table
// - Adjustments
// - Total calculation
// - Payment terms
// - Export as PDF
```

**Component: `frontend/src/components/BillingDashboard.tsx`** (Enhanced)
```typescript
// Executive billing dashboard
// - Revenue this month/quarter/year
// - Outstanding invoices
// - Overdue payments
// - Client breakdown
// - Charts and graphs
// - Quick actions
```

---

## 👤 FEATURE 3: USER PROFILE & SETTINGS

### 3.1 Profile Management

#### Backend: User Profile Schema
**File: `backend/src/models/UserProfile.ts`** (NEW)
```typescript
interface IUserProfile {
  user_id: ObjectId;

  // Personal Info
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string;

  // Professional Info
  title: string | null;
  department: string | null;
  skills: string[];
  bio: string | null;

  // Avatar
  avatar_url: string | null;
  avatar_type: 'initials' | 'upload' | 'gravatar';

  // Settings
  settings: UserSettings;

  updated_at: Date;
}

interface UserSettings {
  // Appearance
  theme: 'light' | 'dark' | 'system';
  color_scheme: 'blue' | 'purple' | 'green' | 'red';
  compact_mode: boolean;

  // Notifications
  email_notifications: boolean;
  desktop_notifications: boolean;
  notification_frequency: 'realtime' | 'daily' | 'weekly';

  // Preferences
  default_view: string;
  items_per_page: number;
  date_format: string;
  time_format: '12h' | '24h';

  // Role-specific settings
  role_settings: RoleSpecificSettings;
}

interface RoleSpecificSettings {
  // Admin settings
  admin?: {
    show_deleted_items: boolean;
    auto_approve_timesheets: boolean;
    strict_validation: boolean;
    export_format_preference: 'csv' | 'excel' | 'pdf';
    retention_policy_days: number;
  };

  // Manager settings
  manager?: {
    auto_notify_submissions: boolean;
    approval_reminder_frequency: 'daily' | 'weekly';
    show_team_summary: boolean;
  };

  // Employee settings
  employee?: {
    show_timesheet_reminders: boolean;
    reminder_day: number; // 0-6 (Sunday-Saturday)
    reminder_time: string; // HH:mm
  };
}
```

#### Backend: Profile Service
**File: `backend/src/services/ProfileService.ts`** (NEW)
```typescript
class ProfileService {
  // Profile Management
  static async getProfile(userId: string): Promise<IUserProfile>
  static async updateProfile(userId: string, updates: Partial<IUserProfile>)
  static async uploadAvatar(userId: string, file: File)

  // Settings
  static async updateSettings(userId: string, settings: Partial<UserSettings>)
  static async updateRoleSettings(userId: string, roleSettings: RoleSpecificSettings)

  // Password Management
  static async changePassword(userId: string, oldPassword: string, newPassword: string)
  static async resetPasswordRequest(email: string)
  static async resetPasswordConfirm(token: string, newPassword: string)

  // Theme & Appearance
  static async updateTheme(userId: string, theme: string)
  static async updateColorScheme(userId: string, scheme: string)
}
```

### 3.2 Frontend Implementation

#### Component: `frontend/src/pages/UserProfile.tsx`** (NEW)
```typescript
// Comprehensive user profile page
interface UserProfileProps {
  userId?: string; // View other user's profile (admin)
}

// Tabs:
// 1. Overview - Basic info, stats
// 2. Personal Info - Edit personal details
// 3. Professional - Title, department, skills
// 4. Settings - Preferences
// 5. Security - Password, 2FA
// 6. Activity - Recent actions
```

#### Component: `frontend/src/components/ProfileSettings.tsx`** (NEW)
```typescript
// Settings panel with sections:
// - Appearance (theme, colors)
// - Notifications
// - Preferences
// - Role-specific settings
// - Privacy
```

#### Component: `frontend/src/components/ThemeSwitcher.tsx`** (NEW)
```typescript
// Theme switcher component
interface ThemeSwitcherProps {
  currentTheme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: string) => void;
}

// Features:
// - Light/Dark/System toggle
// - Preview mode
// - Color scheme selector
// - Save preference
```

#### Component: `frontend/src/components/PasswordChange.tsx`** (NEW)
```typescript
// Password change form
// Features:
// - Current password verification
// - Password strength indicator
// - Requirements checklist
// - Confirm new password
// - Security tips
```

### 3.3 Theme System Implementation

**File: `frontend/src/contexts/ThemeContext.tsx`** (NEW)
```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  colorScheme: string;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setColorScheme: (scheme: string) => void;
  isDark: boolean;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // - Read from localStorage
  // - Apply system preference if 'system' selected
  // - Update CSS variables
  // - Persist changes
};
```

**File: `frontend/src/styles/theme.css`** (NEW)
```css
:root {
  /* Light theme variables */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  /* ... more variables */
}

[data-theme='dark'] {
  /* Dark theme variables */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --border-color: #334155;
  /* ... more variables */
}

/* Color schemes */
[data-color='blue'] { --accent-color: #3b82f6; }
[data-color='purple'] { --accent-color: #a855f7; }
[data-color='green'] { --accent-color: #10b981; }
[data-color='red'] { --accent-color: #ef4444; }
```

### 3.4 Admin-Specific Settings

**Component: `frontend/src/components/AdminSettings.tsx`** (NEW)
```typescript
// Admin-only settings panel
// Sections:
// 1. User Management Policies
//    - Auto-approval rules
//    - Validation strictness
//    - Bulk actions permissions

// 2. Export Policies
//    - Default export formats
//    - Data retention
//    - Audit log retention
//    - Export restrictions

// 3. System Permissions
//    - Feature flags
//    - Role permissions matrix
//    - Access control rules

// 4. Security Settings
//    - Password policies
//    - Session timeout
//    - IP restrictions
//    - 2FA requirements
```

---

## 📅 IMPLEMENTATION TIMELINE

### Week 1: Hard/Soft Delete System
- **Day 1-2:** Backend models and services
- **Day 3:** Delete management modals
- **Day 4:** Deleted items manager
- **Day 5:** Audit log review and testing

### Week 2: Billing Management
- **Day 1-2:** Enhanced billing models and workflow
- **Day 3:** Billing editor and adjustments
- **Day 4:** Invoice generation
- **Day 5:** Testing and integration

### Week 3: User Profile & Settings
- **Day 1-2:** Profile backend and models
- **Day 3:** Profile UI components
- **Day 4:** Theme system implementation
- **Day 5:** Admin settings and testing

---

## 🎯 PRIORITY ORDER

1. **High Priority:**
   - Hard/Soft delete (Critical for data management)
   - User profile basics (Change password, basic info)
   - Theme system (User experience)

2. **Medium Priority:**
   - Billing workflow enhancements
   - Role-specific settings
   - Admin policies

3. **Nice to Have:**
   - Advanced billing features
   - 2FA implementation
   - Detailed audit log review UI

---

## 📊 ESTIMATED TIME

- **Hard/Soft Delete:** 40 hours
- **Billing Management:** 50 hours
- **User Profile & Settings:** 45 hours
- **Testing & QA:** 15 hours

**Total:** ~150 hours (3.5-4 weeks)

---

## 🧪 TESTING REQUIREMENTS

### Feature 1: Delete System
- [ ] Soft delete works and hides items
- [ ] Hard delete requires admin permission
- [ ] Audit logs shown before hard delete
- [ ] Restore functionality works
- [ ] Dependencies checked before delete

### Feature 2: Billing
- [ ] Workflow progresses correctly
- [ ] Approvals tracked properly
- [ ] Adjustments calculate correctly
- [ ] Invoice exports properly
- [ ] Payment tracking works

### Feature 3: Profile & Settings
- [ ] Profile updates save correctly
- [ ] Password change works with validation
- [ ] Theme switches smoothly
- [ ] Settings persist across sessions
- [ ] Role-specific settings apply correctly

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] API routes tested
- [ ] Frontend components tested
- [ ] Theme CSS loaded correctly
- [ ] Permissions verified
- [ ] Audit logging working
- [ ] Documentation updated

---

This plan provides a comprehensive roadmap for implementing all three feature sets with clear deliverables, timelines, and testing requirements.
