# Comprehensive Notification System Plan

## Executive Summary

This document outlines the complete notification system for the Timesheet Management application, covering all user roles (Employee, Lead, Manager, Management, Super Admin) with detailed notification triggers, message templates, and future extensibility for notification settings.

---

## Table of Contents

1. [Current System Analysis](#current-system-analysis)
2. [Notification Requirements by Role](#notification-requirements-by-role)
3. [Notification Type Definitions](#notification-type-definitions)
4. [Implementation Architecture](#implementation-architecture)
5. [Integration Points](#integration-points)
6. [Message Templates](#message-templates)
7. [Notification Settings (Future Phase)](#notification-settings-future-phase)
8. [Technical Implementation Plan](#technical-implementation-plan)
9. [Testing Strategy](#testing-strategy)

---

## Current System Analysis

### ✅ Existing Infrastructure

**Models:**

- `Notification.ts` - Core notification model with:
  - recipient_id, sender_id
  - type (enum), priority (enum)
  - title, message, data, action_url
  - read, clicked, read_at, clicked_at
  - expires_at (TTL support)
- `NotificationSettings.ts` - User preferences:
  - email_notifications, push_notifications
  - notification_types (Map<type, {enabled, email, push}>)
  - quiet_hours {enabled, start_time, end_time, timezone}

**Services:**

- `NotificationService.ts` - Basic CRUD operations:
  - create(), getNotifications()
  - markAsRead(), markAsClicked(), markAllAsRead()
  - Helper methods for user approval, timesheet, project, task notifications
  - Bulk notification support via `createForRecipients()`

**Controllers:**

- `NotificationController.ts` - API endpoints:
  - GET /api/notifications (with filtering)
  - POST /api/notifications/:id/read
  - POST /api/notifications/:id/clicked
  - POST /api/notifications/mark-all-read
  - POST /api/notifications/create (admin only)

### ⚠️ Current Limitations

1. **Limited notification types** - Only 17 types defined, missing many workflow events
2. **No automatic triggers** - Notifications not integrated into workflow services
3. **No role-specific logic** - Notification recipients not dynamically determined
4. **No notification settings UI** - Settings exist but no user interface
5. **No real-time delivery** - No WebSocket/SSE implementation
6. **Limited filtering** - No notification center with advanced filtering

---

## Notification Requirements by Role

### 1. Employee Notifications

#### A. Timesheet Status Changes (Priority: HIGH)

| Event                                  | Trigger                                         | Action URL         | Priority |
| -------------------------------------- | ----------------------------------------------- | ------------------ | -------- |
| Timesheet Lead Approved                | `lead_status='approved'`                        | `/timesheets/{id}` | MEDIUM   |
| Timesheet Lead Rejected                | `lead_status='rejected'`                        | `/timesheets/{id}` | HIGH     |
| Timesheet Manager Approved             | `manager_status='approved'`                     | `/timesheets/{id}` | MEDIUM   |
| Timesheet Manager Rejected             | `manager_status='rejected'`                     | `/timesheets/{id}` | HIGH     |
| Timesheet Management Approved (Frozen) | `management_status='approved'`, status='frozen' | `/timesheets/{id}` | MEDIUM   |
| Timesheet Management Rejected          | `management_status='rejected'`                  | `/timesheets/{id}` | HIGH     |
| Timesheet Billed                       | status='billed'                                 | `/timesheets/{id}` | MEDIUM   |

#### B. Project & Task Assignment (Priority: MEDIUM)

| Event                   | Trigger                    | Action URL       | Priority |
| ----------------------- | -------------------------- | ---------------- | -------- |
| Assigned to Project     | ProjectMember created      | `/projects/{id}` | MEDIUM   |
| Removed from Project    | ProjectMember soft-deleted | `/projects`      | MEDIUM   |
| Project Details Updated | Project fields changed     | `/projects/{id}` | LOW      |
| Assigned to Task        | Task assigned_to updated   | `/tasks/{id}`    | MEDIUM   |
| Task Updated            | Task details changed       | `/tasks/{id}`    | LOW      |
| Task Deadline Changed   | Task due_date updated      | `/tasks/{id}`    | MEDIUM   |

---

### 2. Lead Notifications

#### A. Own Timesheet & Task Notifications (Same as Employee)

Leads receive the same employee-level notifications **only for their own timesheets and tasks**, not for their team members' activities.

**Included Notifications:**

- Their own timesheet approval/rejection at each tier (Lead, Manager, Management)
- Their own timesheet frozen/billed status
- Their own project/task assignments
- Their own project/task updates

#### B. Manager/Management Approvals on Lead-Approved Items (Priority: HIGH)

| Event                                  | Trigger                                                    | Action URL                    | Priority |
| -------------------------------------- | ---------------------------------------------------------- | ----------------------------- | -------- |
| Manager Approved Lead's Approval       | Manager approves project-group with lead_status='approved' | `/team-review/{timesheet_id}` | MEDIUM   |
| Manager Rejected Lead's Approval       | Manager rejects project-group with lead_status='approved'  | `/team-review/{timesheet_id}` | HIGH     |
| Management Approved Manager's Approval | Management approves after manager                          | `/team-review/{timesheet_id}` | MEDIUM   |
| Management Rejected Manager's Approval | Management rejects after manager                           | `/team-review/{timesheet_id}` | HIGH     |

#### C. Project Group Ready for Lead Review (Priority: HIGH)

| Event                        | Trigger                               | Action URL     | Priority |
| ---------------------------- | ------------------------------------- | -------------- | -------- |
| Employee Submitted Timesheet | All employees in project submitted    | `/team-review` | HIGH     |
| Project Group Ready          | All project members submitted entries | `/team-review` | HIGH     |

---

### 3. Manager Notifications

#### A. Own Timesheet & Task Notifications (Same as Employee)

Managers receive the same employee-level notifications **only for their own timesheets and tasks**, not for their team members' activities.

**Included Notifications:**

- Their own timesheet approval/rejection at each tier (Lead, Manager, Management)
- Their own timesheet frozen/billed status
- Their own project/task assignments
- Their own project/task updates

#### B. Management Approval/Rejection (Priority: HIGH)

| Event                                  | Trigger                                                | Action URL                    | Priority |
| -------------------------------------- | ------------------------------------------------------ | ----------------------------- | -------- |
| Management Approved Manager's Approval | management_status='approved' on manager-approved group | `/team-review/{timesheet_id}` | MEDIUM   |
| Management Rejected Manager's Approval | management_status='rejected'                           | `/team-review/{timesheet_id}` | HIGH     |

#### C. Project Group Ready for Manager Review (Priority: HIGH)

| Event                             | Trigger                                                 | Action URL     | Priority |
| --------------------------------- | ------------------------------------------------------- | -------------- | -------- |
| Lead Approved All Project Entries | lead_status='approved' for all entries + lead submitted | `/team-review` | HIGH     |
| Employee Submitted (No Lead)      | Employee in project without lead submitted              | `/team-review` | HIGH     |
| Lead Submitted Own Timesheet      | Lead submitted + project entries exist                  | `/team-review` | HIGH     |

#### D. Project Management Events (Priority: MEDIUM)

| Event                       | Trigger                    | Action URL       | Priority |
| --------------------------- | -------------------------- | ---------------- | -------- |
| Assigned as Primary Manager | Project.manager_id updated | `/projects/{id}` | MEDIUM   |
| Removed as Primary Manager  | Project.manager_id changed | `/projects`      | MEDIUM   |

#### E. Admin Actions on Entities (Priority: LOW)

| Event                    | Trigger                | Action URL       | Priority |
| ------------------------ | ---------------------- | ---------------- | -------- |
| User Created by Admin    | User created           | `/users/{id}`    | LOW      |
| User Updated by Admin    | User fields changed    | `/users/{id}`    | LOW      |
| User Deleted by Admin    | User soft-deleted      | `/users`         | MEDIUM   |
| Project Created by Admin | Project created        | `/projects/{id}` | LOW      |
| Project Updated by Admin | Project fields changed | `/projects/{id}` | LOW      |
| Project Deleted by Admin | Project soft-deleted   | `/projects`      | MEDIUM   |
| Client Created by Admin  | Client created         | `/clients/{id}`  | LOW      |
| Client Updated by Admin  | Client fields changed  | `/clients/{id}`  | LOW      |
| Client Deleted by Admin  | Client soft-deleted    | `/clients`       | MEDIUM   |

---

### 4. Management Notifications

#### A. Project Group Ready for Management Verification (Priority: HIGH)

| Event                           | Trigger                                                   | Action URL     | Priority |
| ------------------------------- | --------------------------------------------------------- | -------------- | -------- |
| Manager Approved All Entries    | manager_status='approved' for all + manager submitted own | `/team-review` | HIGH     |
| Manager Submitted Own Timesheet | Manager submitted + status='management_pending'           | `/team-review` | HIGH     |

#### B. User Registration Events (Priority: MEDIUM)

| Event                          | Trigger                                            | Action URL    | Priority |
| ------------------------------ | -------------------------------------------------- | ------------- | -------- |
| User Registration for Approval | User created with is_approved_by_super_admin=false | `/users/{id}` | HIGH     |
| User Approved by Admin         | Admin approved user                                | `/users/{id}` | MEDIUM   |

#### C. Admin Actions on Entities (Priority: LOW)

Same as Manager notifications (Section 3.E)

#### D. Admin Item Restoration (Priority: MEDIUM)

| Event            | Trigger                        | Action URL       | Priority |
| ---------------- | ------------------------------ | ---------------- | -------- |
| User Restored    | User.deleted_at set to null    | `/users/{id}`    | MEDIUM   |
| Project Restored | Project.deleted_at set to null | `/projects/{id}` | MEDIUM   |
| Client Restored  | Client.deleted_at set to null  | `/clients/{id}`  | MEDIUM   |

#### E. Project Member Changes (Priority: MEDIUM)

| Event                  | Trigger                                | Action URL               | Priority |
| ---------------------- | -------------------------------------- | ------------------------ | -------- |
| Project Member Added   | ProjectMember created by admin/manager | `/projects/{id}/members` | MEDIUM   |
| Project Member Updated | ProjectMember role changed             | `/projects/{id}/members` | MEDIUM   |
| Project Member Removed | ProjectMember soft-deleted             | `/projects/{id}/members` | MEDIUM   |

---

### 5. Super Admin Notifications

#### A. User Registration for Approval (Priority: HIGH)

| Event                 | Trigger                                            | Action URL    | Priority |
| --------------------- | -------------------------------------------------- | ------------- | -------- |
| New User Registration | User created with is_approved_by_super_admin=false | `/users/{id}` | HIGH     |

#### B. Management Actions on Entities (Priority: LOW)

| Event                         | Trigger                | Action URL       | Priority |
| ----------------------------- | ---------------------- | ---------------- | -------- |
| User Created by Management    | User created           | `/users/{id}`    | LOW      |
| User Updated by Management    | User fields changed    | `/users/{id}`    | LOW      |
| User Deleted by Management    | User soft-deleted      | `/users`         | MEDIUM   |
| Project Created by Management | Project created        | `/projects/{id}` | LOW      |
| Project Updated by Management | Project fields changed | `/projects/{id}` | LOW      |
| Project Deleted by Management | Project soft-deleted   | `/projects`      | MEDIUM   |
| Client Created by Management  | Client created         | `/clients/{id}`  | LOW      |
| Client Updated by Management  | Client fields changed  | `/clients/{id}`  | LOW      |
| Client Deleted by Management  | Client soft-deleted    | `/clients`       | MEDIUM   |

#### C. Project Member Changes (Priority: LOW)

Same as Management notifications (Section 4.E)

#### D. Billing Events (Priority: HIGH)

| Event                   | Trigger                           | Action URL                  | Priority |
| ----------------------- | --------------------------------- | --------------------------- | -------- |
| Billing Generated       | Management created billing report | `/billing/reports/{id}`     | HIGH     |
| Billing Adjustment Made | BillingAdjustment created/updated | `/billing/adjustments/{id}` | MEDIUM   |

---

## Notification Type Definitions

### New Notification Types to Add

```typescript
export enum NotificationType {
  // Existing types (keep)
  USER_APPROVAL = "user_approval",
  USER_REJECTION = "user_rejection",
  TIMESHEET_SUBMISSION = "timesheet_submission",
  TIMESHEET_APPROVAL = "timesheet_approval",
  TIMESHEET_REJECTION = "timesheet_rejection",
  PROJECT_CREATED = "project_created",
  PROJECT_UPDATED = "project_updated",
  PROJECT_COMPLETED = "project_completed",
  PROJECT_ALLOCATED = "project_allocated",
  TASK_ALLOCATED = "task_allocated",
  TASK_RECEIVED = "task_received",
  TASK_COMPLETED = "task_completed",
  TASK_PENDING = "task_pending",
  TASK_OVERDUE = "task_overdue",
  SYSTEM_ANNOUNCEMENT = "system_announcement",
  BILLING_UPDATE = "billing_update",
  PROFILE_UPDATE = "profile_update",

  // NEW: Timesheet Tier-specific approvals
  TIMESHEET_LEAD_APPROVED = "timesheet_lead_approved",
  TIMESHEET_LEAD_REJECTED = "timesheet_lead_rejected",
  TIMESHEET_MANAGER_APPROVED = "timesheet_manager_approved",
  TIMESHEET_MANAGER_REJECTED = "timesheet_manager_rejected",
  TIMESHEET_MANAGEMENT_APPROVED = "timesheet_management_approved",
  TIMESHEET_MANAGEMENT_REJECTED = "timesheet_management_rejected",
  TIMESHEET_FROZEN = "timesheet_frozen",
  TIMESHEET_BILLED = "timesheet_billed",

  // NEW: Project group readiness
  PROJECT_GROUP_READY_LEAD = "project_group_ready_lead",
  PROJECT_GROUP_READY_MANAGER = "project_group_ready_manager",
  PROJECT_GROUP_READY_MANAGEMENT = "project_group_ready_management",

  // NEW: Project member management
  PROJECT_MEMBER_ADDED = "project_member_added",
  PROJECT_MEMBER_REMOVED = "project_member_removed",
  PROJECT_MEMBER_UPDATED = "project_member_updated",
  PROJECT_MEMBER_ROLE_CHANGED = "project_member_role_changed",

  // NEW: Project management
  PROJECT_MANAGER_ASSIGNED = "project_manager_assigned",
  PROJECT_MANAGER_REMOVED = "project_manager_removed",
  PROJECT_DELETED = "project_deleted",
  PROJECT_RESTORED = "project_restored",

  // NEW: User management
  USER_REGISTRATION_PENDING = "user_registration_pending",
  USER_CREATED = "user_created",
  USER_UPDATED = "user_updated",
  USER_DELETED = "user_deleted",
  USER_RESTORED = "user_restored",
  USER_ROLE_CHANGED = "user_role_changed",

  // NEW: Client management
  CLIENT_CREATED = "client_created",
  CLIENT_UPDATED = "client_updated",
  CLIENT_DELETED = "client_deleted",
  CLIENT_RESTORED = "client_restored",

  // NEW: Task management
  TASK_CREATED = "task_created",
  TASK_UPDATED = "task_updated",
  TASK_DELETED = "task_deleted",
  TASK_DEADLINE_CHANGED = "task_deadline_changed",
  TASK_ASSIGNED = "task_assigned",
  TASK_UNASSIGNED = "task_unassigned",

  // NEW: Billing events
  BILLING_GENERATED = "billing_generated",
  BILLING_ADJUSTMENT_CREATED = "billing_adjustment_created",
  BILLING_ADJUSTMENT_UPDATED = "billing_adjustment_updated",
}
```

---

## Implementation Architecture

### A. Service Layer Enhancements

**New Methods in NotificationService.ts:**

```typescript
// Timesheet tier-specific notifications
static async notifyTimesheetLeadApproved(params: TimesheetApprovalParams)
static async notifyTimesheetLeadRejected(params: TimesheetRejectionParams)
static async notifyTimesheetManagerApproved(params: TimesheetApprovalParams)
static async notifyTimesheetManagerRejected(params: TimesheetRejectionParams)
static async notifyTimesheetManagementApproved(params: TimesheetApprovalParams)
static async notifyTimesheetManagementRejected(params: TimesheetRejectionParams)
static async notifyTimesheetFrozen(params: TimesheetStatusParams)
static async notifyTimesheetBilled(params: TimesheetStatusParams)

// Project group readiness
static async notifyProjectGroupReadyForLead(params: GroupReadinessParams)
static async notifyProjectGroupReadyForManager(params: GroupReadinessParams)
static async notifyProjectGroupReadyForManagement(params: GroupReadinessParams)

// Project member management
static async notifyProjectMemberAdded(params: ProjectMemberParams)
static async notifyProjectMemberRemoved(params: ProjectMemberParams)
static async notifyProjectMemberUpdated(params: ProjectMemberParams)

// Project management
static async notifyProjectManagerAssigned(params: ProjectManagerParams)
static async notifyProjectManagerRemoved(params: ProjectManagerParams)
static async notifyProjectDeleted(params: ProjectEntityParams)
static async notifyProjectRestored(params: ProjectEntityParams)

// User management
static async notifyUserRegistrationPending(params: UserRegistrationParams)
static async notifyUserCreated(params: UserEntityParams)
static async notifyUserUpdated(params: UserEntityParams)
static async notifyUserDeleted(params: UserEntityParams)
static async notifyUserRestored(params: UserEntityParams)

// Client management
static async notifyClientCreated(params: ClientEntityParams)
static async notifyClientUpdated(params: ClientEntityParams)
static async notifyClientDeleted(params: ClientEntityParams)
static async notifyClientRestored(params: ClientEntityParams)

// Task management
static async notifyTaskAssigned(params: TaskAssignmentParams)
static async notifyTaskUpdated(params: TaskEntityParams)
static async notifyTaskDeadlineChanged(params: TaskDeadlineParams)

// Billing events
static async notifyBillingGenerated(params: BillingEventParams)
static async notifyBillingAdjustmentCreated(params: BillingAdjustmentParams)
```

### B. Helper Service: NotificationRecipientResolver

Create a new service to determine notification recipients based on role hierarchy:

```typescript
export class NotificationRecipientResolver {
  /**
   * Get all users who should be notified about a timesheet approval
   */
  static async getTimesheetApprovalRecipients(
    timesheetId: string,
    approvalTier: "lead" | "manager" | "management",
    action: "approved" | "rejected"
  ): Promise<string[]>;

  /**
   * Get all leads who should be notified about project group readiness
   */
  static async getLeadsForProjectGroup(
    projectId: string,
    weekStartDate: Date
  ): Promise<string[]>;

  /**
   * Get all managers who should be notified about project group readiness
   */
  static async getManagersForProjectGroup(
    projectId: string,
    weekStartDate: Date
  ): Promise<string[]>;

  /**
   * Get all management users
   */
  static async getManagementUsers(): Promise<string[]>;

  /**
   * Get all super admins
   */
  static async getSuperAdmins(): Promise<string[]>;

  /**
   * Get project manager(s) for a project
   */
  static async getProjectManagers(projectId: string): Promise<string[]>;

  /**
   * Get project members by role
   */
  static async getProjectMembersByRole(
    projectId: string,
    role?: "lead" | "employee"
  ): Promise<string[]>;
}
```

---

## Integration Points

### 1. TeamReviewApprovalService Integration

**File:** `backend/src/services/TeamReviewApprovalService.ts`

**Integration Points:**

```typescript
// After successful approval
static async approveTimesheetForProject() {
  // ... existing approval logic ...

  // ✅ ADD: Notification trigger
  await NotificationService.notifyTimesheetLeadApproved({
    timesheetId,
    projectId,
    approvedBy: approverId,
    recipientId: timesheet.user_id
  });

  // If project group is now ready for next tier
  const isGroupReady = await this.checkProjectGroupReadiness(...);
  if (isGroupReady) {
    await NotificationService.notifyProjectGroupReadyForManager({
      projectId,
      weekStartDate,
      recipientIds: await NotificationRecipientResolver.getManagersForProjectGroup(...)
    });
  }
}

// After rejection
static async rejectTimesheetForProject() {
  // ... existing rejection logic ...

  // ✅ ADD: Notification trigger
  await NotificationService.notifyTimesheetLeadRejected({
    timesheetId,
    projectId,
    rejectedBy: approverId,
    reason,
    recipientId: timesheet.user_id
  });
}
```

### 2. TimesheetService Integration

**File:** `backend/src/services/TimesheetService.ts`

**Integration Points:**

```typescript
// After submission
static async submitTimesheet() {
  // ... existing submission logic ...

  // ✅ ADD: Notification to approvers
  const leads = await NotificationRecipientResolver.getLeadsForProjectGroup(...);
  await NotificationService.notifyTimesheetSubmission({
    timesheetId,
    submittedBy: currentUser.id,
    recipientIds: leads
  });
}

// After freeze (management approval)
static async freezeTimesheet() {
  // ... existing freeze logic ...

  // ✅ ADD: Notification to timesheet owner
  await NotificationService.notifyTimesheetFrozen({
    timesheetId,
    frozenBy: currentUser.id,
    recipientId: timesheet.user_id
  });
}
```

### 3. ProjectService Integration

**File:** `backend/src/services/ProjectService.ts`

**Integration Points:**

```typescript
// After project creation
static async createProject() {
  // ... existing creation logic ...

  // ✅ ADD: Notification to managers/management
  const managers = await NotificationRecipientResolver.getManagementUsers();
  await NotificationService.notifyProjectCreated({
    projectId: newProject._id,
    projectName: newProject.name,
    createdBy: currentUser.id,
    recipientIds: managers
  });
}

// After manager assignment
static async updateProjectManager() {
  // ... existing update logic ...

  // ✅ ADD: Notification to new and old manager
  await NotificationService.notifyProjectManagerAssigned({
    projectId,
    projectName,
    newManagerId,
    oldManagerId,
    assignedBy: currentUser.id
  });
}
```

### 4. ProjectMemberService Integration

**File:** `backend/src/services/ProjectMemberService.ts`

**Integration Points:**

```typescript
// After member addition
static async addProjectMember() {
  // ... existing addition logic ...

  // ✅ ADD: Notification to member and manager
  await NotificationService.notifyProjectMemberAdded({
    projectId,
    projectName,
    userId: memberId,
    role: memberRole,
    addedBy: currentUser.id,
    recipientIds: [memberId, ...projectManagers]
  });
}

// After member removal
static async removeProjectMember() {
  // ... existing removal logic ...

  // ✅ ADD: Notification to member and manager
  await NotificationService.notifyProjectMemberRemoved({
    projectId,
    projectName,
    userId: memberId,
    removedBy: currentUser.id,
    recipientIds: [memberId, ...projectManagers]
  });
}
```

### 5. UserService Integration

**File:** `backend/src/services/UserService.ts`

**Integration Points:**

```typescript
// After user registration
static async registerUser() {
  // ... existing registration logic ...

  // ✅ ADD: Notification to super admins
  const admins = await NotificationRecipientResolver.getSuperAdmins();
  await NotificationService.notifyUserRegistrationPending({
    userId: newUser._id,
    userName: newUser.full_name,
    userEmail: newUser.email,
    recipientIds: admins
  });
}

// After user approval
static async approveUser() {
  // ... existing approval logic ...

  // ✅ ADD: Notification to user and management
  await NotificationService.notifyUserApproval(
    userId,
    currentUser.id
  );

  const management = await NotificationRecipientResolver.getManagementUsers();
  await NotificationService.notifyUserCreated({
    userId,
    userName: user.full_name,
    createdBy: currentUser.id,
    recipientIds: management
  });
}
```

### 6. BillingService Integration

**File:** `backend/src/services/BillingService.ts` (if exists)

**Integration Points:**

```typescript
// After billing generation
static async generateBilling() {
  // ... existing generation logic ...

  // ✅ ADD: Notification to super admins
  const admins = await NotificationRecipientResolver.getSuperAdmins();
  await NotificationService.notifyBillingGenerated({
    billingId,
    periodStart,
    periodEnd,
    totalAmount,
    generatedBy: currentUser.id,
    recipientIds: admins
  });
}

// After billing adjustment
static async createBillingAdjustment() {
  // ... existing adjustment logic ...

  // ✅ ADD: Notification to management
  const management = await NotificationRecipientResolver.getManagementUsers();
  await NotificationService.notifyBillingAdjustmentCreated({
    adjustmentId,
    projectId,
    userId,
    adjustmentAmount,
    adjustedBy: currentUser.id,
    recipientIds: management
  });
}
```

---

## Message Templates

### Template Structure

```typescript
interface NotificationTemplate {
  type: NotificationType;
  title: (data: any) => string;
  message: (data: any) => string;
  action_url: (data: any) => string;
  priority: NotificationPriority;
}
```

### Example Templates

```typescript
const templates: Record<NotificationType, NotificationTemplate> = {
  TIMESHEET_LEAD_APPROVED: {
    type: NotificationType.TIMESHEET_LEAD_APPROVED,
    title: (data) => "Timesheet Approved by Lead",
    message: (data) =>
      `${data.leadName} approved your timesheet for week of ${data.weekStart}. ` +
      `It's now pending manager review.`,
    action_url: (data) => `/timesheets/${data.timesheetId}`,
    priority: NotificationPriority.MEDIUM,
  },

  TIMESHEET_LEAD_REJECTED: {
    type: NotificationType.TIMESHEET_LEAD_REJECTED,
    title: (data) => "Timesheet Rejected by Lead",
    message: (data) =>
      `${data.leadName} rejected your timesheet for week of ${data.weekStart}. ` +
      `Reason: ${data.reason}. Please revise and resubmit.`,
    action_url: (data) => `/timesheets/${data.timesheetId}`,
    priority: NotificationPriority.HIGH,
  },

  PROJECT_GROUP_READY_MANAGER: {
    type: NotificationType.PROJECT_GROUP_READY_MANAGER,
    title: (data) => "Project Group Ready for Review",
    message: (data) =>
      `Project "${data.projectName}" for week of ${data.weekStart} is ready for ` +
      `your review. ${data.memberCount} members have submitted their timesheets.`,
    action_url: (data) =>
      `/team-review?project=${data.projectId}&week=${data.weekStart}`,
    priority: NotificationPriority.HIGH,
  },

  PROJECT_MEMBER_ADDED: {
    type: NotificationType.PROJECT_MEMBER_ADDED,
    title: (data) => "Added to Project",
    message: (data) =>
      `You have been added to project "${data.projectName}" as ${data.role}. ` +
      `Added by ${data.addedByName}.`,
    action_url: (data) => `/projects/${data.projectId}`,
    priority: NotificationPriority.MEDIUM,
  },

  USER_REGISTRATION_PENDING: {
    type: NotificationType.USER_REGISTRATION_PENDING,
    title: (data) => "New User Registration",
    message: (data) =>
      `${data.userName} (${data.userEmail}) has registered and is awaiting approval.`,
    action_url: (data) => `/users/${data.userId}/approve`,
    priority: NotificationPriority.HIGH,
  },

  // ... more templates
};
```

---

## Notification Settings (Future Phase)

### User Interface Design

**Settings Page:** `/settings/notifications`

**Sections:**

1. **General Settings**

   - Enable/Disable all notifications
   - Enable/Disable email notifications
   - Enable/Disable push notifications (future)

2. **Notification Types**

   - Group by category (Timesheet, Project, User, Billing)
   - Toggle each notification type
   - Configure delivery method (in-app, email, push)

3. **Quiet Hours**

   - Enable/Disable quiet hours
   - Set start time (e.g., 22:00)
   - Set end time (e.g., 08:00)
   - Select timezone

4. **Frequency Settings** (Future)
   - Immediate vs Digest (daily summary)
   - Digest delivery time

### Settings Schema Enhancement

```typescript
interface INotificationSettings {
  user_id: mongoose.Types.ObjectId;

  // Global toggles
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;

  // Per-type settings
  notification_types: Map<
    NotificationType,
    {
      enabled: boolean;
      email: boolean;
      push: boolean;
      frequency: "immediate" | "digest";
    }
  >;

  // Quiet hours
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    timezone: string;
  };

  // Digest settings
  digest: {
    enabled: boolean;
    frequency: "daily" | "weekly";
    delivery_time: string; // "09:00"
    days: number[]; // [1,2,3,4,5] for weekdays
  };

  created_at: Date;
  updated_at: Date;
}
```

### Settings API Endpoints

```typescript
// Get user notification settings
GET /api/notification-settings

// Update notification settings
PUT /api/notification-settings

// Reset to defaults
POST /api/notification-settings/reset

// Update specific type
PATCH /api/notification-settings/types/:type

// Update quiet hours
PATCH /api/notification-settings/quiet-hours
```

---

## Technical Implementation Plan

### Phase 1: Core Notification Types & Service Methods (Week 1-2)

**Tasks:**

1. ✅ Update `Notification.ts` model with new notification types
2. ✅ Create `NotificationRecipientResolver` service
3. ✅ Add new notification methods to `NotificationService`
4. ✅ Create message template system
5. ✅ Write unit tests for new services

**Deliverables:**

- Updated models
- New service methods
- Test coverage >80%

### Phase 2: Workflow Integration - Timesheet Approvals (Week 2-3)

**Tasks:**

1. ✅ Integrate notifications into `TeamReviewApprovalService`
2. ✅ Integrate notifications into `TimesheetService`
3. ✅ Add project group readiness detection
4. ✅ Test all timesheet approval notification flows
5. ✅ Update API documentation

**Deliverables:**

- Timesheet approval notifications working
- All 3-tier notifications triggered correctly
- Integration tests passing

### Phase 3: Workflow Integration - Project & User Management (Week 3-4)

**Tasks:**

1. ✅ Integrate notifications into `ProjectService`
2. ✅ Integrate notifications into `ProjectMemberService`
3. ✅ Integrate notifications into `UserService`
4. ✅ Integrate notifications into `ClientService`
5. ✅ Test all entity management notification flows

**Deliverables:**

- Project/User/Client notifications working
- Manager assignment notifications
- Member management notifications

### Phase 4: Frontend Notification Center (Week 4-5)

**Tasks:**

1. ✅ Create NotificationBell component
2. ✅ Create NotificationList component
3. ✅ Create NotificationItem component
4. ✅ Add real-time polling (or WebSocket prep)
5. ✅ Add mark as read/unread functionality
6. ✅ Add filtering by type, priority
7. ✅ Add notification sound/visual indicator

**Deliverables:**

- Notification bell with unread count
- Dropdown notification list
- Mark as read/clicked working
- Filter and sort working

### Phase 5: Notification Settings UI (Week 5-6)

**Tasks:**

1. ✅ Create NotificationSettings page
2. ✅ Create settings form with all options
3. ✅ Add quiet hours configuration
4. ✅ Add per-type toggle controls
5. ✅ Connect to backend settings API
6. ✅ Add reset to defaults functionality

**Deliverables:**

- Settings page fully functional
- Per-type configuration working
- Quiet hours enforced
- Settings persist across sessions

### Phase 6: Testing & Refinement (Week 6-7)

**Tasks:**

1. ✅ End-to-end testing of all notification flows
2. ✅ Performance testing (notification creation speed)
3. ✅ User acceptance testing
4. ✅ Bug fixes and refinements
5. ✅ Documentation updates

**Deliverables:**

- All tests passing
- Performance benchmarks met
- User feedback incorporated
- Complete documentation

### Phase 7: Real-time Delivery (Future)

**Tasks:**

1. 📅 Evaluate WebSocket vs SSE
2. 📅 Implement real-time push
3. 📅 Add connection management
4. 📅 Add offline queue
5. 📅 Test real-time delivery

**Deliverables:**

- Real-time notifications working
- Connection resilience
- Offline support

---

## Testing Strategy

### Unit Tests

**NotificationService.ts:**

- Test each notification method creates correct notification
- Test recipient resolution logic
- Test message template rendering
- Test priority assignment

**NotificationRecipientResolver.ts:**

- Test recipient queries for each scenario
- Test role-based filtering
- Test project-based filtering
- Test edge cases (no leads, no managers, etc.)

### Integration Tests

**TeamReviewApprovalService:**

- Test notifications triggered on approval
- Test notifications triggered on rejection
- Test group readiness notifications
- Test multi-manager scenarios

**TimesheetService:**

- Test submission notifications
- Test freeze notifications
- Test billed notifications

**ProjectService:**

- Test project creation notifications
- Test project update notifications
- Test manager assignment notifications

### End-to-End Tests

**Timesheet Approval Flow:**

1. Employee submits → Lead notified
2. Lead approves → Employee notified, Manager notified
3. Manager approves → Employee notified, Management notified
4. Management approves → Employee notified, timesheet frozen

**Project Member Management:**

1. Admin adds member → Member and manager notified
2. Admin removes member → Member and manager notified
3. Manager changed → Old and new manager notified

**User Registration:**

1. User registers → Super admin notified
2. Admin approves → User notified, Management notified

### Performance Tests

**Metrics:**

- Notification creation time: <100ms
- Recipient resolution time: <50ms
- Batch notification creation: <500ms for 100 notifications
- Database query optimization: Indexes on recipient_id, type, read, created_at

---

## Database Indexes

### Existing Indexes (Keep)

```typescript
// Notification model
NotificationSchema.index({ recipient_id: 1, read: 1, created_at: -1 });
NotificationSchema.index({ recipient_id: 1, type: 1, created_at: -1 });
NotificationSchema.index({ created_at: -1 });
```

### New Indexes (Add)

```typescript
// For filtering by priority
NotificationSchema.index({ recipient_id: 1, priority: 1, created_at: -1 });

// For unread count queries
NotificationSchema.index({ recipient_id: 1, read: 1 });

// For cleanup jobs
NotificationSchema.index({ created_at: 1, priority: 1 });
```

---

## Success Metrics

### Functional Metrics

- ✅ 100% of notification triggers implemented
- ✅ 100% of notification types covered
- ✅ 100% of roles receiving correct notifications
- ✅ 0 missed critical notifications (approval/rejection)

### Performance Metrics

- ✅ Notification creation: <100ms
- ✅ Notification retrieval: <50ms
- ✅ Mark as read: <20ms
- ✅ Database queries optimized with indexes

### User Experience Metrics

- ✅ Unread count visible in UI
- ✅ Notifications grouped by type
- ✅ Action URLs navigate to correct pages
- ✅ Settings allow granular control

---

## Risks & Mitigations

### Risk 1: Notification Spam

**Mitigation:**

- Implement quiet hours
- Add digest mode (future)
- Allow per-type disabling
- Set expiration on low-priority notifications

### Risk 2: Performance Degradation

**Mitigation:**

- Use indexes extensively
- Implement notification batching
- Archive old notifications
- Add pagination to notification list

### Risk 3: Missing Notifications

**Mitigation:**

- Add comprehensive logging
- Add notification audit trail
- Add retry mechanism for failed sends
- Add monitoring/alerting

### Risk 4: Incorrect Recipient Resolution

**Mitigation:**

- Write extensive unit tests
- Test edge cases (no lead, no manager, etc.)
- Add validation in recipient resolver
- Log all recipient resolutions

---

## Future Enhancements

### Phase 8: Email Notifications (Future)

- Send email for high-priority notifications
- HTML email templates
- Unsubscribe links
- Email delivery tracking

### Phase 9: Push Notifications (Future)

- Web push notifications
- Mobile app push (if applicable)
- Service worker integration
- Push notification preferences

### Phase 10: Advanced Features (Future)

- Notification grouping/threading
- Notification snoozing
- Notification forwarding
- Notification analytics dashboard
- Notification search
- Notification export

---

## Appendices

### Appendix A: Notification Flow Diagrams

**Employee Timesheet Submission Flow:**

```
Employee submits timesheet
    ↓
Notification to Lead (PROJECT_GROUP_READY_LEAD)
    ↓
Lead approves
    ↓
Notification to Employee (TIMESHEET_LEAD_APPROVED)
Notification to Manager (PROJECT_GROUP_READY_MANAGER)
    ↓
Manager approves
    ↓
Notification to Employee (TIMESHEET_MANAGER_APPROVED)
Notification to Management (PROJECT_GROUP_READY_MANAGEMENT)
    ↓
Management approves (Freeze)
    ↓
Notification to Employee (TIMESHEET_FROZEN)
```

### Appendix B: API Endpoints Summary

**Notification Endpoints:**

- GET /api/notifications - Get notifications for user
- POST /api/notifications/:id/read - Mark as read
- POST /api/notifications/:id/clicked - Mark as clicked
- POST /api/notifications/mark-all-read - Mark all as read
- DELETE /api/notifications/:id - Delete notification

**Settings Endpoints:**

- GET /api/notification-settings - Get settings
- PUT /api/notification-settings - Update settings
- POST /api/notification-settings/reset - Reset to defaults
- PATCH /api/notification-settings/types/:type - Update type
- PATCH /api/notification-settings/quiet-hours - Update quiet hours

### Appendix C: Code Examples

**Creating a Notification:**

```typescript
await NotificationService.notifyTimesheetLeadApproved({
  timesheetId: "123",
  projectId: "456",
  approvedBy: "lead-user-id",
  approvedByName: "John Lead",
  recipientId: "employee-user-id",
  weekStart: "2025-10-20",
  totalHours: 40,
});
```

**Resolving Recipients:**

```typescript
const managers = await NotificationRecipientResolver.getManagersForProjectGroup(
  projectId,
  weekStartDate
);
```

**Checking Settings:**

```typescript
const settings = await NotificationSettings.findOne({ user_id: userId });
if (
  !settings.notification_types.get(NotificationType.TIMESHEET_LEAD_APPROVED)
    ?.enabled
) {
  return; // Skip notification
}
```

---

## Conclusion

This comprehensive notification system plan provides:

1. **Complete coverage** of all user roles and notification triggers
2. **Scalable architecture** with service layers and recipient resolution
3. **Future-proof design** with settings infrastructure ready
4. **Clear implementation roadmap** with phased approach
5. **Testing strategy** ensuring quality and reliability
6. **Performance considerations** with indexing and optimization
7. **Risk mitigation** strategies for common issues

The system is designed to integrate seamlessly with the existing 3-tier timesheet approval workflow while providing extensibility for future enhancements like email and push notifications.

**Next Steps:**

1. Review and approve this plan
2. Begin Phase 1 implementation
3. Set up monitoring and logging infrastructure
4. Create frontend components
5. User acceptance testing
6. Production rollout

---

**Document Version:** 1.0  
**Last Updated:** October 23, 2025  
**Author:** Development Team  
**Status:** Draft for Review
