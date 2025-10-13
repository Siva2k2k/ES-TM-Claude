# Role Hierarchy & Permissions System (CORRECTED)

## Overview

This document defines the **ACTUAL** hierarchical access control system based on the previous implementation in TimesheetApprovalService.txt.

**Important:** This reflects the **existing** system, not the new Phase 7 enhancements.

**Last Updated:** January 2025
**Phase:** 7 - Corrected based on actual implementation

---

## Role Hierarchy Pyramid (ACTUAL)

```
┌─────────────────────────────────────┐
│         SUPER ADMIN (Tier 5)        │  ← Full System Control
├─────────────────────────────────────┤
│         MANAGEMENT (Tier 4)         │  ← Business Oversight, Final Approval
├─────────────────────────────────────┤
│          MANAGER (Tier 3)           │  ← Approve ALL Timesheets
├─────────────────────────────────────┤
│            LEAD (Tier 2)            │  ← Team Coordination (NO APPROVAL RIGHTS)
├─────────────────────────────────────┤
│         EMPLOYEE (Tier 1)           │  ← Individual Contributor
└─────────────────────────────────────┘
```

---

## ACTUAL Timesheet Approval Workflow

### From TimesheetApprovalService.txt Analysis

```typescript
// Lines 48-105: getStatusFlow() defines the ACTUAL workflow
case 'submitted':
  if (userRole === 'manager') {
    permissions.canApprove = true;
    permissions.canReject = true;
  }
  break;

case 'management_pending':
  if (userRole === 'management') {
    permissions.canApprove = true;
    permissions.canReject = true;
  }
  break;
```

**Key Finding:** Only `manager` can approve `submitted` timesheets. Lead is NOT in the approval flow.

---

## CORRECTED Approval Flow

### Employee/Lead/Manager Timesheet
```
Employee/Lead/Manager submits → status: submitted
    ↓
Manager reviews and approves → status: manager_approved
    ↓ (Automatically transitions)
Management Pending → status: management_pending
    ↓
Management approves → status: frozen
    ↓
(Management marks as billed) → status: billed
```

### Key Statuses (from implementation)

| Status | Who Can Act | Action Available |
|--------|-------------|------------------|
| `draft` | Employee/Lead/Manager | Can edit, can submit |
| `submitted` | **Manager only** | Can approve, can reject |
| `manager_approved` | System | Auto-transitions to management_pending |
| `management_pending` | **Management only** | Can approve, can reject |
| `manager_rejected` | Employee/Lead/Manager | Can edit, can resubmit |
| `management_rejected` | Manager (review), Employee/Lead (edit) | Manager can approve, others can edit |
| `frozen` | None | Final state (included in billing) |
| `billed` | None | Invoice generated |

---

## CORRECTED Role Permissions

### 1. EMPLOYEE (Tier 1) - Individual Contributor

#### ✅ CAN DO
- Create/edit own timesheet (draft status)
- Submit timesheet for Manager approval
- View own timesheet history
- View own project assignments
- Add time entries
- Resubmit after rejection

#### ❌ CANNOT DO
- **Cannot approve any timesheets** (including own)
- Cannot view other employees' timesheets
- Cannot create/edit projects
- Cannot add/remove project members
- Cannot assign tasks
- Cannot access billing
- Cannot access user management

---

### 2. LEAD (Tier 2) - Team Coordinator (NO APPROVAL RIGHTS)

#### ✅ CAN DO

**Personal Management:**
- Create/edit own timesheet
- Submit own timesheet for Manager approval
- View own timesheet history

**Team Coordination:**
- View team members in their projects
- Assign tasks to employees
- Guide and mentor team members
- View project progress
- Create/edit tasks in assigned projects

**Read-Only Timesheet Access:**
- **View team timesheets (READ-ONLY)**
- Monitor team hours
- Track project time allocation

#### ❌ CANNOT DO (IMPORTANT)

**Timesheet Restrictions:**
- **CANNOT approve employee timesheets** ← KEY DIFFERENCE
- **CANNOT reject timesheets**
- **CANNOT modify other users' timesheets**
- Role is "View only - no approval authority" (line 279)

**Project Restrictions:**
- Cannot create/delete projects
- Cannot add/remove project members
- Cannot change project status
- Cannot access billing
- Cannot access user management

**Navigation:**
- Access: Dashboard (lead view - monitoring only)
- Access: My Timesheets
- Access: Team Timesheets (view-only)
- Access: My Projects
- Access: Task Management
- **NO ACCESS:** Team Review (approval interface) ← Not in their permissions

---

### 3. MANAGER (Tier 3) - Department Manager (PRIMARY APPROVER)

#### Core Responsibilities
- **PRIMARY TIMESHEET APPROVER** for ALL employees, leads, and other managers
- Create and manage projects
- Manage project team members
- Department-level oversight

#### ✅ CAN DO

**Timesheet Management (PRIMARY ROLE):**
- **Approve timesheets with status 'submitted'** (lines 58-62)
- **Reject timesheets with reasons**
- **Review management-rejected timesheets** (lines 89-92)
- View all timesheets in their managed projects
- Submit own timesheet to Management

**Project Management:**
- **Create new projects** ← KEY: Management creates, assigns to Manager
- Edit project details (name, dates, budget, status)
- Add/remove project members
- Assign Leads and Employees to projects
- Promote Employees to Leads
- Archive/activate projects

**Team Management:**
- View all team members
- Create tasks
- Assign tasks
- Monitor team performance

**Navigation:**
- Access: Dashboard (manager view)
- Access: My Timesheets
- Access: **Team Review** (approval interface)
- Access: Project Management (full CRUD)
- Access: Team Timesheets (all members)
- Access: Reports (project-level)

#### ❌ CANNOT DO

**Restrictions:**
- Cannot approve Management/Super Admin timesheets
- Cannot create/edit/delete users
- Cannot approve user registrations
- Cannot change user system roles
- **Cannot access billing features** ← Only Management+
- Cannot access system-wide configuration
- Cannot hard delete data

---

### 4. MANAGEMENT (Tier 4) - Business Oversight (FINAL APPROVER)

#### Core Responsibilities
- **Final approval** for manager-approved timesheets
- Verify frozen timesheets
- Mark timesheets as billed
- **Create projects and assign managers**
- Business-level oversight
- Financial approvals

#### ✅ CAN DO

**Timesheet Management:**
- **Approve timesheets with status 'management_pending'** (lines 71-77)
- **Approve manager-approved timesheets** (line 296)
- **Reject timesheets back to manager** (lines 88-98)
- **Verify frozen timesheets**
- **Mark timesheets as billed**
- View all timesheets organization-wide

**Project Management:**
- **Create new projects** ← PRIMARY RESPONSIBILITY
- **Assign managers to projects**
- View all projects
- Access project analytics
- Monitor project budgets

**Billing & Finance:**
- Access billing dashboard
- Generate invoices
- Approve billing rates
- View revenue reports
- Create weekly billing snapshots (line 638)

**User Oversight:**
- View all users
- View user performance metrics
- Approve user registrations

**Reports:**
- Access system-wide reports
- Generate custom reports
- Export data
- View audit logs (read-only)

#### ❌ CANNOT DO

**Restrictions:**
- Cannot create/edit/delete users (only Super Admin)
- Cannot change user system roles (only Super Admin)
- Cannot hard delete projects
- Cannot access system configuration
- Cannot modify audit logs
- Cannot edit project members directly (delegates to managers)

---

### 5. SUPER ADMIN (Tier 5) - System Administrator

#### ✅ CAN DO (EVERYTHING)

**User Management:**
- Create/edit/delete users
- Change user system roles
- Approve user registrations
- Reset passwords
- Manage permissions

**Project Management:**
- Full project CRUD
- Hard delete projects
- Override any project setting

**Timesheet Management:**
- View all timesheets
- Override any approval
- Manual approval/rejection

**Billing Management:**
- Full billing access
- Edit billing rates
- Modify invoices

**System Administration:**
- System configuration
- Database maintenance
- Audit logs (full access)
- Security settings

---

## CORRECTED Approval Rules

```typescript
// Based on TimesheetApprovalService.txt lines 31-106
const APPROVAL_RULES = {
  employee: {
    submitsTo: ['manager'],        // Direct to Manager (NOT Lead)
    canApprove: [],                // Cannot approve
  },

  lead: {
    submitsTo: ['manager'],        // Lead submits to Manager
    canApprove: [],                // CANNOT approve (view-only)
    canView: ['employee'],         // Can VIEW employee timesheets
  },

  manager: {
    submitsTo: ['management'],     // Manager submits to Management
    canApprove: ['employee', 'lead', 'manager'], // Approves ALL non-management
    requiresStatus: 'submitted',   // Only when status is 'submitted'
  },

  management: {
    submitsTo: null,               // Self-approval or Super Admin
    canApprove: ['manager'],       // Final approval after manager approval
    requiresStatus: ['management_pending', 'manager_approved'],
    canVerify: ['all'],            // Can verify frozen
    canBill: true,                 // Can mark as billed
  },

  super_admin: {
    submitsTo: null,
    canApprove: ['all'],           // Override any approval
    canUnfreeze: true,
  },
};
```

---

## Project Creation Hierarchy (CORRECTED)

### Who Creates Projects

**Based on user clarification:**

1. **Management Creates Projects**
   - Management role creates new projects
   - Defines project scope, budget, timeline
   - Assigns Manager to project

2. **Manager Manages Project**
   - Receives project assignment from Management
   - Adds/removes team members
   - Assigns Leads and Employees
   - Manages day-to-day operations

3. **Manager Can Edit (NOT Create)**
   - Can edit existing project details
   - Can update timeline, budget (within limits)
   - Cannot create new projects independently

### Corrected Project Permissions

| Role | Create | Edit | Delete | Assign Manager | Add Members |
|------|--------|------|--------|----------------|-------------|
| Employee | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lead | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Manager** | **❌** | **✅** | **❌** | **❌** | **✅** |
| **Management** | **✅** | **✅** | **❌** | **✅** | **✅** |
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Permission Helper Functions (CORRECTED)

```typescript
// Get role hierarchy level
export function getRoleLevel(role: SystemRole): number {
  const levels = {
    employee: 1,
    lead: 2,      // Same level but NO approval rights
    manager: 3,   // PRIMARY approver
    management: 4, // FINAL approver
    super_admin: 5,
  };
  return levels[role] || 0;
}

// Check if role can approve timesheets
export function canApproveTimesheets(role: SystemRole): boolean {
  // Only Manager, Management, Super Admin can approve
  return ['manager', 'management', 'super_admin'].includes(role);
}

// Check if role can approve specific status
export function canApproveStatus(
  approverRole: SystemRole,
  timesheetStatus: TimesheetStatus
): boolean {
  if (approverRole === 'manager') {
    return timesheetStatus === 'submitted';
  }

  if (approverRole === 'management') {
    return ['management_pending', 'manager_approved'].includes(timesheetStatus);
  }

  if (approverRole === 'super_admin') {
    return true; // Can approve any status
  }

  return false; // Lead, Employee cannot approve
}

// Check if role can view team timesheets
export function canViewTeamTimesheets(role: SystemRole): boolean {
  // Lead can VIEW (read-only), Manager+ can VIEW and APPROVE
  return ['lead', 'manager', 'management', 'super_admin'].includes(role);
}

// Check if role can create projects
export function canCreateProjects(role: SystemRole): boolean {
  // ONLY Management and Super Admin can create projects
  return ['management', 'super_admin'].includes(role);
}

// Check if role can manage project members
export function canManageProjectMembers(role: SystemRole): boolean {
  // Manager+ can manage members
  return ['manager', 'management', 'super_admin'].includes(role);
}
```

---

## Navigation & Feature Access Matrix (CORRECTED)

| Feature | Employee | Lead | Manager | Management | Super Admin |
|---------|----------|------|---------|------------|-------------|
| **Dashboard** | Employee View | Lead View | Manager View | Management View | Admin View |
| **My Timesheets** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Team Timesheets** | ❌ | ✅ (View-only) | ✅ (Full) | ✅ (Full) | ✅ (Full) |
| **Team Review (Approvals)** | ❌ | **❌** | ✅ | ✅ | ✅ |
| **My Projects** | ✅ (Assigned) | ✅ (Assigned) | ✅ (Managed) | ✅ (All) | ✅ (All) |
| **Project Management (Create)** | ❌ | ❌ | **❌** | **✅** | ✅ |
| **Project Management (Edit)** | ❌ | ❌ | **✅** | **✅** | ✅ |
| **Project Members** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **User Management** | ❌ | ❌ | ❌ | ✅ (View) | ✅ (Full) |
| **Client Management** | ❌ | ❌ | ✅ (View) | ✅ | ✅ (Full) |
| **Billing** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Reports** | ❌ | ❌ | ✅ (Project) | ✅ (All) | ✅ (All) |
| **Audit Logs** | ❌ | ❌ | ❌ | ✅ (Read) | ✅ (Full) |
| **System Config** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Summary of Corrections

### What Was Wrong in Previous Documentation

1. ❌ **Lead Approval Rights:** Incorrectly stated Leads can approve employee timesheets
2. ❌ **Manager Project Creation:** Incorrectly stated Managers can create projects
3. ❌ **Approval Flow:** Had Lead in approval chain (not in actual implementation)

### What Is Actually Correct

1. ✅ **Lead has NO approval rights** - View-only access to team timesheets
2. ✅ **Only Management creates projects** - Managers can only edit
3. ✅ **Two-tier approval:** Manager → Management (no Lead involvement)
4. ✅ **Manager is PRIMARY approver** for all employees, leads, and managers
5. ✅ **Management is FINAL approver** and handles billing

---

## Implementation Notes

### Backend API Endpoints (As Implemented)

```javascript
// Current endpoints (from TimesheetService.txt)
POST /api/timesheets/:id/submit              // All roles submit
POST /api/timesheets/:id/manager-approve     // Manager approves
POST /api/timesheets/:id/manager-reject      // Manager rejects
POST /api/timesheets/:id/management-approve  // Management approves
POST /api/timesheets/:id/management-reject   // Management rejects
POST /api/timesheets/:id/mark-billed         // Management marks billed
GET  /api/timesheets/for-approval            // Get pending approvals

// NO Lead approval endpoints (because Lead can't approve)
```

### Frontend Components Behavior

```typescript
// TeamReview component should show:
// - For Manager: Timesheets with status 'submitted'
// - For Management: Timesheets with status 'management_pending' or 'manager_approved'
// - For Lead: VIEW ONLY - no approve/reject buttons

// getStatusFlow() returns:
// - Lead: canApprove = false (always)
// - Manager: canApprove = true (only for 'submitted')
// - Management: canApprove = true (only for 'management_pending')
```

---

**End of Corrected Role Hierarchy Documentation**

**Key Takeaway:** Leads are team coordinators with VIEW-ONLY access to team timesheets. They CANNOT approve or reject timesheets. Only Manager and Management have approval authority.
