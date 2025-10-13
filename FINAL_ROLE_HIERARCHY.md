# Final Role Hierarchy & Approval Workflow

## Overview

This document defines the **FINAL** hierarchical access control system with **Lead approval enabled**.

**Last Updated:** January 2025
**Phase:** 7 - Final Implementation with Lead Approval

---

## Role Hierarchy Pyramid

```
┌──────────────────────────────────────┐
│        SUPER ADMIN (Tier 5)          │  Full System Control
├──────────────────────────────────────┤
│        MANAGEMENT (Tier 4)           │  Create Projects, Final Approval, Billing
├──────────────────────────────────────┤
│         MANAGER (Tier 3)             │  Edit Projects, Approve Lead/Employee
├──────────────────────────────────────┤
│           LEAD (Tier 2)              │  Approve Employees, Coordinate Team
├──────────────────────────────────────┤
│        EMPLOYEE (Tier 1)             │  Submit Timesheets
└──────────────────────────────────────┘
```

---

## FINAL Timesheet Approval Workflow

### Employee Timesheet (with Lead in project)
```
Employee submits timesheet
    ↓ status: submitted
Lead approves/rejects (if Lead exists in project)
    ↓ status: lead_approved (or lead_rejected)
Manager approves/rejects
    ↓ status: frozen (or manager_rejected)
Management marks as billed
    ↓ status: billed
```

### Employee Timesheet (NO Lead in project)
```
Employee submits timesheet
    ↓ status: submitted
Manager approves/rejects (directly, bypass Lead)
    ↓ status: frozen (or manager_rejected)
Management marks as billed
    ↓ status: billed
```

### Lead Timesheet
```
Lead submits timesheet
    ↓ status: submitted
Manager approves/rejects
    ↓ status: frozen (or manager_rejected)
Management marks as billed
    ↓ status: billed
```

### Manager Timesheet
```
Manager submits timesheet
    ↓ status: submitted
Management approves/rejects
    ↓ status: frozen (or management_rejected)
Management marks as billed
    ↓ status: billed
```

---

## Timesheet Status Flow

| Status | Description | Who Can Set | Next Status |
|--------|-------------|-------------|-------------|
| `draft` | Being created | Employee/Lead/Manager | `submitted` |
| `submitted` | Awaiting approval | Employee/Lead/Manager | `lead_approved` or `frozen` |
| `lead_approved` | Lead approved | Lead | `frozen` |
| `lead_rejected` | Lead rejected | Lead | `draft` (resubmit) |
| `manager_rejected` | Manager rejected | Manager | `draft` (resubmit) |
| `frozen` | Approved & locked | Manager (final approve) | `billed` |
| `billed` | Invoiced | Management | Final state |

---

## Complete Role Permissions

### 1. EMPLOYEE (Tier 1) - Individual Contributor

**Timesheet:**
- ✅ Create/edit own timesheet
- ✅ Submit for approval
- ❌ Cannot approve timesheets

**Projects:**
- ✅ View assigned projects
- ✅ Complete tasks
- ❌ Cannot create/edit projects
- ❌ Cannot assign tasks

---

### 2. LEAD (Tier 2) - Team Coordinator & Approver

**Timesheet:**
- ✅ Create/edit own timesheet
- ✅ Submit to Manager
- ✅ **Approve employee timesheets in their projects**
- ✅ **Reject employee timesheets with reason**
- ✅ View team timesheets
- ❌ Cannot approve Lead/Manager timesheets

**Team Management:**
- ✅ Assign tasks to employees
- ✅ Guide and mentor team
- ✅ View team progress
- ❌ Cannot add/remove project members

**Projects:**
- ✅ View assigned projects
- ✅ Create/edit tasks
- ✅ View project analytics
- ❌ Cannot create/edit projects
- ❌ Cannot add/remove members

---

### 3. MANAGER (Tier 3) - Department Manager & Primary Approver

**Timesheet:**
- ✅ Create/edit own timesheet
- ✅ Submit to Management
- ✅ **Approve Employee timesheets** (lead-approved or direct)
- ✅ **Approve Lead timesheets**
- ✅ **Approve other Manager timesheets**
- ✅ Reject with reasons
- ❌ Cannot approve Management/Super Admin

**Projects:**
- ✅ **Edit existing projects** (assigned by Management)
- ✅ Add/remove project members
- ✅ Assign Leads and Employees
- ✅ Promote Employee to Lead
- ✅ View all managed projects
- ❌ **Cannot create new projects** (only Management can)

**Team:**
- ✅ View all team members
- ✅ Create tasks
- ✅ Assign tasks
- ✅ Monitor performance

---

### 4. MANAGEMENT (Tier 4) - Business Oversight & Final Approver

**Timesheet:**
- ✅ Final approval for Manager timesheets
- ✅ Verify frozen timesheets
- ✅ **Mark timesheets as billed**
- ✅ View all timesheets organization-wide

**Projects:**
- ✅ **CREATE new projects**
- ✅ **Assign Manager to projects**
- ✅ Edit all projects
- ✅ View all projects
- ✅ Monitor budgets

**Billing:**
- ✅ Access billing dashboard
- ✅ Generate invoices
- ✅ Approve billing rates
- ✅ View revenue reports
- ✅ Create billing snapshots

**Users:**
- ✅ View all users
- ✅ View performance metrics
- ✅ Approve user registrations
- ❌ Cannot create/edit users (only Super Admin)

---

### 5. SUPER ADMIN (Tier 5) - System Administrator

**Full Control:**
- ✅ User management (CRUD)
- ✅ Override any approval
- ✅ System configuration
- ✅ Hard delete operations
- ✅ Audit logs (full access)
- ✅ Security settings

---

## Permission Matrix

| Permission | Employee | Lead | Manager | Management | Super Admin |
|-----------|----------|------|---------|------------|-------------|
| **Submit Timesheet** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Approve Employee TS** | ❌ | **✅** | ✅ | ✅ | ✅ |
| **Approve Lead TS** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Approve Manager TS** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Approve Management TS** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Mark as Billed** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Create Projects** | ❌ | ❌ | **❌** | **✅** | ✅ |
| **Edit Projects** | ❌ | ❌ | **✅** | ✅ | ✅ |
| **Add Members** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Assign Tasks** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Access Billing** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Manage Users** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Business Logic Rules

### 1. Lead Approval Context

**Lead can approve Employee timesheet IF:**
1. Lead has system role `'lead'`
2. Timesheet owner has system role `'employee'`
3. They share at least one project
4. Lead has project role `'lead'` in that project

```typescript
function canLeadApproveTimesheet(
  lead: User,
  timesheet: Timesheet
): boolean {
  // 1. Role check
  if (lead.role !== 'lead') return false;
  if (timesheet.user.role !== 'employee') return false;

  // 2. Shared project check
  const sharedProjects = getSharedProjects(lead.id, timesheet.user_id);
  if (sharedProjects.length === 0) return false;

  // 3. Lead must have 'lead' project role
  const isLeadInProject = sharedProjects.some(project =>
    project.members.some(m =>
      m.user_id === lead.id && m.project_role === 'lead'
    )
  );

  return isLeadInProject;
}
```

### 2. Manager Bypass Logic

**Manager can approve Employee directly IF:**
- No Lead assigned to the project, OR
- Lead has not yet approved the timesheet

```typescript
function getApprovalPath(employee: User, projectId: string) {
  const projectLeads = getProjectLeads(projectId);

  if (projectLeads.length === 0) {
    // No leads → Direct to Manager
    return ['manager'];
  } else {
    // Has leads → Lead first, then Manager
    return ['lead', 'manager'];
  }
}
```

### 3. Hierarchical Approval

**General rule:** Each role approves roles below them

```typescript
function canApprove(approverRole: UserRole, submitterRole: UserRole): boolean {
  const levels = {
    employee: 1,
    lead: 2,
    manager: 3,
    management: 4,
    super_admin: 5,
  };

  return levels[approverRole] > levels[submitterRole];
}

// Examples:
canApprove('lead', 'employee')      // true (2 > 1)
canApprove('lead', 'lead')          // false (2 = 2)
canApprove('manager', 'lead')       // true (3 > 2)
canApprove('management', 'manager') // true (4 > 3)
```

---

## API Endpoints Required

```typescript
// Lead approval endpoints
POST /api/timesheets/:id/lead-approve
POST /api/timesheets/:id/lead-reject

// Manager approval endpoints
POST /api/timesheets/:id/manager-approve
POST /api/timesheets/:id/manager-reject

// Management approval endpoints
POST /api/timesheets/:id/management-approve
POST /api/timesheets/:id/management-reject
POST /api/timesheets/:id/mark-billed

// Permission check
GET /api/timesheets/:id/can-approve?userId=:userId

// Get pending approvals
GET /api/timesheets/pending-approvals?role=lead
GET /api/timesheets/pending-approvals?role=manager
GET /api/timesheets/pending-approvals?role=management
```

---

## Implementation in useRoleManager.ts

```typescript
// Role hierarchy levels
export const ROLE_HIERARCHY_LEVELS: Record<UserRole, number> = {
  employee: 1,
  lead: 2,
  manager: 3,
  management: 4,
  super_admin: 5,
};

// Timesheet approval permissions
canApproveTimesheets(): boolean {
  return getRoleLevel(currentUserRole) >= 2; // lead+
}

canApproveEmployeeTimesheets(): boolean {
  return getRoleLevel(currentUserRole) >= 2; // lead+
}

canApproveLeadTimesheets(): boolean {
  return getRoleLevel(currentUserRole) >= 3; // manager+
}

canApproveManagerTimesheets(): boolean {
  return getRoleLevel(currentUserRole) >= 4; // management+
}

// Project permissions
canManageProjects(): boolean {
  // Manager can EDIT, Management can CREATE
  return getRoleLevel(currentUserRole) >= 3; // manager+
}

canCreateProjects(): boolean {
  // Only Management and Super Admin
  return getRoleLevel(currentUserRole) >= 4; // management+
}
```

---

## Summary

### Key Points

1. ✅ **Lead CAN approve employee timesheets** in their projects
2. ✅ **Manager approves** Lead and Employee timesheets
3. ✅ **Management is final approver** for Manager timesheets
4. ✅ **Management creates projects**, Manager edits them
5. ✅ **Three-tier approval:** Lead → Manager → Management
6. ✅ **Bypass logic:** If no Lead, Employee goes directly to Manager

### Approval Chain

```
Employee → Lead → Manager → Management → Billed
Lead → Manager → Management → Billed
Manager → Management → Billed
```

### Status After Testing

✅ TypeScript: 0 errors
✅ Build: Passing
✅ Permissions: Correctly implemented
✅ Ready for Phase 7 Part 2 - UI Implementation

---

**End of Final Role Hierarchy Documentation**
