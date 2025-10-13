# Role Hierarchy & Permissions System

## Overview

This document defines the complete hierarchical access control system for the Employee Timesheet Management application with **5 system roles** and clear approval workflows.

**Last Updated:** January 2025
**Phase:** 7 - Timesheet Management with Hierarchical Approvals

---

## Role Hierarchy Pyramid

```
┌─────────────────────────────────────┐
│         SUPER ADMIN (Tier 5)        │  ← Full System Control
├─────────────────────────────────────┤
│         MANAGEMENT (Tier 4)         │  ← Business Oversight
├─────────────────────────────────────┤
│          MANAGER (Tier 3)           │  ← Department Management
├─────────────────────────────────────┤
│            LEAD (Tier 2)            │  ← Team Coordination
├─────────────────────────────────────┤
│         EMPLOYEE (Tier 1)           │  ← Individual Contributor
└─────────────────────────────────────┘
```

---

## 1. EMPLOYEE (Tier 1) - Individual Contributor

### System Role: `employee`
### Project Roles: `employee` (can be elevated to `lead` in specific projects)

### Core Responsibilities
- Work on assigned tasks
- Submit weekly timesheets
- Track own time entries
- View own project assignments

### Permissions Matrix

#### ✅ CAN DO

**Personal Management:**
- Create/edit own timesheet (draft status)
- Submit timesheet for approval
- View own timesheet history
- View own project assignments
- View own tasks
- Add time entries to assigned projects/tasks

**Project Participation:**
- View projects they are assigned to
- View tasks assigned to them
- Update task progress/status
- Add comments to own tasks

**Navigation:**
- Access: Dashboard (employee view)
- Access: My Timesheets
- Access: My Projects (read-only)
- Access: My Profile

#### ❌ CANNOT DO

**Restrictions:**
- Cannot approve timesheets
- Cannot view other employees' timesheets
- Cannot create/edit projects
- Cannot add/remove project members
- Cannot create tasks
- Cannot assign tasks to others
- Cannot access billing information
- Cannot access user management
- Cannot access admin features
- Cannot view audit logs
- Cannot access system reports

### Timesheet Approval Flow for Employee

```
Employee (Tier 1)
    ↓ Submit Timesheet
    ↓
Lead (Tier 2) - IF project has Lead
    ↓ Approve/Reject
    ↓
Manager (Tier 3) - Final Approval
    ↓ Approve/Reject → Frozen
    ↓
Management (Tier 4) - Can verify and mark as Billed
```

---

## 2. LEAD (Tier 2) - Team Coordinator

### System Role: `lead`
### Project Roles: `lead`, `employee`

### Core Responsibilities
- Coordinate team members within assigned projects
- **NEW: Approve employee timesheets within their projects**
- Assign tasks to employees
- Guide and mentor team members
- Submit own timesheets

### Permissions Matrix

#### ✅ CAN DO

**Timesheet Management (NEW):**
- **Approve timesheets of employees in their projects**
- **View timesheets of all employees in their projects**
- **Reject timesheets with reasons (employees in their projects)**
- View pending approvals dashboard
- Submit own timesheet for Manager approval

**Team Coordination:**
- View all team members in their projects
- Assign tasks to employees in their projects
- Update task assignments
- Monitor team progress within projects
- Guide and mentor employees

**Project Access:**
- View all tasks in assigned projects
- Create new tasks in assigned projects
- Edit tasks in assigned projects
- View project analytics (assigned projects only)
- View project timeline and milestones

**Navigation:**
- Access: Dashboard (lead view with approval queue)
- Access: My Timesheets
- Access: Team Timesheets (employees in their projects)
- Access: Team Review (approval interface)
- Access: My Projects
- Access: Task Management (assigned projects)
- Access: My Profile

#### ❌ CANNOT DO

**Restrictions:**
- Cannot approve Manager/Lead/Management timesheets
- Cannot approve timesheets outside their projects
- Cannot create/delete projects
- Cannot add/remove project members (only Manager+)
- Cannot change project status
- Cannot access billing data
- Cannot create/edit/delete users
- Cannot access user management
- Cannot access system configuration
- Cannot view audit logs (system level)
- Cannot access admin features

### Timesheet Approval Hierarchy

**As Lead, can approve:**
- ✅ Employees in their assigned projects

**As Lead, submits to:**
- Manager for their own timesheet approval

### Business Logic

```typescript
// Lead can approve timesheet if:
function canLeadApproveTimesheet(lead: User, timesheet: Timesheet): boolean {
  // 1. Lead role check
  if (lead.role !== 'lead') return false;

  // 2. Timesheet owner must be an employee
  if (timesheet.user.role !== 'employee') return false;

  // 3. Must share at least one project
  const sharedProjects = getSharedProjects(lead.id, timesheet.user_id);
  if (sharedProjects.length === 0) return false;

  // 4. Lead must be assigned as 'lead' role in that project
  const isLeadInProject = sharedProjects.some(project =>
    project.members.some(m =>
      m.user_id === lead.id && m.project_role === 'lead'
    )
  );

  return isLeadInProject;
}
```

---

## 3. MANAGER (Tier 3) - Department Manager

### System Role: `manager`
### Project Roles: `primary_manager` (automatically), can also be `lead` or `employee` in other projects

### Core Responsibilities
- Create and manage projects
- Manage project team members
- **Approve timesheets from Leads and Employees**
- Department-level oversight
- Escalate to Management when needed

### Permissions Matrix

#### ✅ CAN DO

**Timesheet Management:**
- **Approve timesheets already approved by Lead**
- **Approve employee timesheets directly (if no Lead in project)**
- Approve Lead timesheets
- Reject timesheets with reasons
- View all timesheets in their managed projects
- Submit own timesheet to Management

**Project Management:**
- Create new projects
- Edit project details (name, dates, budget, status)
- Add/remove project members
- Assign Leads and Employees to projects
- Promote Employees to Leads
- Archive/activate projects
- View project analytics and reports

**Team Management:**
- View all team members in their projects
- Assign primary manager to projects
- Create tasks
- Assign tasks to any project member
- Monitor team performance
- View team capacity and utilization

**Client Management:**
- View all clients
- Add new clients (if permitted)
- Edit client information

**Navigation:**
- Access: Dashboard (manager view)
- Access: My Timesheets
- Access: Team Review (all employees + leads in their projects)
- Access: Project Management (full CRUD)
- Access: Team Timesheets (all members)
- Access: Reports (project-level)
- Access: Client Management
- Access: My Profile

#### ❌ CANNOT DO

**Restrictions:**
- Cannot approve Management/Super Admin timesheets
- Cannot create/edit/delete users (except project assignment)
- Cannot approve user registrations
- Cannot change user system roles
- Cannot access billing features (invoice generation, billing rates)
- Cannot access system-wide configuration
- Cannot view full audit logs
- Cannot hard delete data (only Management+)
- Cannot access super admin features

### Timesheet Approval Hierarchy

**As Manager, can approve:**
- ✅ Employees in their projects (direct or after Lead approval)
- ✅ Leads in their projects
- ✅ Other Managers in their projects (if applicable)

**As Manager, submits to:**
- Management for their own timesheet approval

---

## 4. MANAGEMENT (Tier 4) - Business Oversight

### System Role: `management`
### Project Roles: None (system-level access overrides)

### Core Responsibilities
- Approve manager timesheets
- Verify frozen timesheets
- Mark timesheets as billed
- Business-level oversight
- Financial approvals
- Strategic planning

### Permissions Matrix

#### ✅ CAN DO

**Timesheet Management:**
- **Approve Manager timesheets (final approval)**
- **Verify all frozen timesheets**
- **Mark timesheets as BILLED**
- View all timesheets across the organization
- View timesheet analytics and trends
- Access billing snapshots

**Billing & Finance:**
- Access billing dashboard
- View billing analytics
- Approve billing rates
- Generate invoices
- View revenue reports
- Access project billing breakdowns

**Project Oversight:**
- View all projects
- View project analytics (all projects)
- Access project reports
- Monitor project budgets
- View resource utilization

**User Oversight:**
- View all users
- View user performance metrics
- Approve user registrations (if workflow enabled)
- View user timesheets

**Reports & Analytics:**
- Access system-wide reports
- Generate custom reports
- Export data
- View audit logs (read-only)

**Navigation:**
- Access: Dashboard (management view)
- Access: All Timesheets (organization-wide)
- Access: Billing Management (full access)
- Access: All Projects (read-only)
- Access: Reports & Analytics
- Access: User Overview (read-only)
- Access: Audit Logs (read-only)
- Access: My Profile

#### ❌ CANNOT DO

**Restrictions:**
- Cannot create/edit/delete users (only Super Admin)
- Cannot change user system roles (only Super Admin)
- Cannot hard delete projects (only Super Admin)
- Cannot access system configuration (only Super Admin)
- Cannot modify audit logs
- Cannot create clients (can view only)
- Cannot edit project members (can view only)

### Timesheet Approval Hierarchy

**As Management, can approve:**
- ✅ Managers (final approval → Frozen)
- ✅ Can verify any frozen timesheet
- ✅ Can mark frozen timesheets as BILLED

**As Management, submits to:**
- No one (self-approval or Super Admin verification if needed)

---

## 5. SUPER ADMIN (Tier 5) - System Administrator

### System Role: `super_admin`
### Project Roles: None (system-level access overrides)

### Core Responsibilities
- Full system control
- User management (CRUD)
- System configuration
- Data integrity
- Security management
- Hard delete capabilities

### Permissions Matrix

#### ✅ CAN DO (EVERYTHING)

**User Management:**
- Create new users
- Edit user profiles
- Change user system roles
- Activate/deactivate users
- Approve user registrations
- Delete users (hard delete)
- Reset user passwords
- Manage user permissions

**Project Management:**
- Create/edit/delete projects
- Manage project members (all projects)
- Hard delete projects
- Restore deleted projects
- Archive/unarchive projects

**Client Management:**
- Create/edit/delete clients
- Manage client data

**Timesheet Management:**
- View all timesheets
- Override any approval
- Unfreeze timesheets (if needed)
- Manual approval/rejection
- Bulk operations on timesheets

**Billing Management:**
- Full billing access
- Edit billing rates
- Modify invoices
- Access financial data
- Generate billing reports

**System Administration:**
- Access system configuration
- Manage system settings
- View/export audit logs
- Database maintenance
- Backup/restore operations
- Security settings

**Navigation:**
- Access: All features and pages
- Access: System Configuration
- Access: User Management (full CRUD)
- Access: Deleted Items Management
- Access: Audit Logs (full access)
- Access: System Settings

#### ❌ CANNOT DO

**Limitations:**
- None within the system scope
- (Best practice: avoid regular operational tasks, delegate to appropriate roles)

---

## Timesheet Approval Workflow (Complete)

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    EMPLOYEE SUBMITS TIMESHEET                    │
│                         Status: SUBMITTED                        │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
              ┌──────────────┴──────────────┐
              │  Does project have a Lead?   │
              └──────────────┬──────────────┘
                    ↙                ↘
                 YES                 NO
                  ↓                   ↓
    ┌─────────────────────┐    ┌──────────────────┐
    │   LEAD APPROVAL     │    │  MANAGER APPROVAL│
    │  Status: SUBMITTED  │    │  Status: SUBMITTED│
    └──────────┬──────────┘    └────────┬─────────┘
               ↓                         ↓
    ┌─────────────────────┐             │
    │ Lead Approves?      │             │
    └──────────┬──────────┘             │
         ↙           ↘                  │
      YES            NO                 │
       ↓              ↓                 │
    APPROVED       REJECTED             │
       ↓          (back to              │
       │           Employee)            │
       └────────────┬──────────────────┘
                    ↓
       ┌────────────────────────┐
       │   MANAGER APPROVAL      │
       │ Status: MANAGER_PENDING │
       └────────────┬────────────┘
                    ↓
         ┌──────────────────┐
         │ Manager Approves? │
         └──────────┬─────────┘
              ↙           ↘
           YES            NO
            ↓              ↓
         APPROVED       REJECTED
            ↓          (back to Employee/Lead)
            ↓
    ┌───────────────────────────┐
    │   MANAGEMENT VERIFICATION  │
    │   Status: FROZEN           │
    └────────────┬───────────────┘
                 ↓
      ┌──────────────────────┐
      │  Management Verifies  │
      │  & Marks as BILLED    │
      └──────────┬─────────────┘
                 ↓
         ┌──────────────┐
         │   BILLED     │
         │ (COMPLETE)   │
         └──────────────┘
```

### Status Definitions

| Status | Description | Who Can Set | Next Actions |
|--------|-------------|-------------|--------------|
| **draft** | Timesheet being created | Employee | Submit |
| **submitted** | Submitted for approval | Employee | Lead/Manager approve |
| **lead_approved** | Approved by Lead | Lead | Manager approve |
| **lead_rejected** | Rejected by Lead | Lead | Employee resubmit |
| **manager_approved** | Approved by Manager → Frozen | Manager | Management verify |
| **manager_rejected** | Rejected by Manager | Manager | Employee/Lead resubmit |
| **frozen** | Locked for billing | Manager (on approve) | Management mark as billed |
| **billed** | Included in invoice | Management | None (final) |

### Approval Rules

```typescript
// Approval hierarchy rules
const APPROVAL_RULES = {
  employee: {
    submitsTo: ['lead', 'manager'], // Lead first if exists, else Manager
    canApprove: [], // Employees cannot approve timesheets
  },

  lead: {
    submitsTo: ['manager'], // Lead's own timesheet goes to Manager
    canApprove: ['employee'], // Can approve employees in their projects
    requiresProject: true, // Must share project with employee
  },

  manager: {
    submitsTo: ['management'], // Manager's own timesheet goes to Management
    canApprove: ['employee', 'lead'], // Can approve employees and leads
    bypassLead: true, // Can approve employee directly if no lead
  },

  management: {
    submitsTo: null, // Self-approval or Super Admin verification
    canApprove: ['manager'], // Final approval for managers
    canVerify: ['all'], // Can verify all frozen timesheets
    canBill: true, // Can mark as billed
  },

  super_admin: {
    submitsTo: null, // No approval needed
    canApprove: ['all'], // Override any approval
    canUnfreeze: true, // Can unfreeze if needed
  },
};
```

---

## Permission Helper Functions

### TypeScript Interfaces

```typescript
// Role definitions
export type SystemRole = 'super_admin' | 'management' | 'manager' | 'lead' | 'employee';
export type ProjectRole = 'lead' | 'employee';
export type TimesheetStatus =
  | 'draft'
  | 'submitted'
  | 'lead_approved'
  | 'lead_rejected'
  | 'manager_approved'
  | 'manager_rejected'
  | 'frozen'
  | 'billed';

// Hierarchical permissions
export interface RolePermissions {
  // Timesheet permissions
  canSubmitTimesheet: boolean;
  canApproveTimesheets: boolean;
  canApproveLeadTimesheets: boolean;
  canApproveManagerTimesheets: boolean;
  canVerifyTimesheets: boolean;
  canMarkAsBilled: boolean;
  canViewOwnTimesheets: boolean;
  canViewTeamTimesheets: boolean;
  canViewAllTimesheets: boolean;

  // Project permissions
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canManageProjectMembers: boolean;
  canViewAllProjects: boolean;

  // User permissions
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canChangeUserRoles: boolean;
  canViewAllUsers: boolean;

  // Billing permissions
  canAccessBilling: boolean;
  canEditBillingRates: boolean;
  canGenerateInvoices: boolean;

  // Admin permissions
  canAccessAuditLogs: boolean;
  canAccessSystemConfig: boolean;
  canHardDelete: boolean;
}

// Get role hierarchy level
export function getRoleLevel(role: SystemRole): number {
  const levels = {
    employee: 1,
    lead: 2,
    manager: 3,
    management: 4,
    super_admin: 5,
  };
  return levels[role] || 0;
}

// Check if role A can approve role B's timesheet
export function canApproveRole(approverRole: SystemRole, submitterRole: SystemRole): boolean {
  const approverLevel = getRoleLevel(approverRole);
  const submitterLevel = getRoleLevel(submitterRole);

  // Can approve if at least one level higher
  return approverLevel > submitterLevel;
}

// Get permissions for role
export function getRolePermissions(role: SystemRole): RolePermissions {
  const level = getRoleLevel(role);

  return {
    // Timesheet permissions
    canSubmitTimesheet: level >= 1, // All roles
    canApproveTimesheets: level >= 2, // Lead+
    canApproveLeadTimesheets: level >= 3, // Manager+
    canApproveManagerTimesheets: level >= 4, // Management+
    canVerifyTimesheets: level >= 4, // Management+
    canMarkAsBilled: level >= 4, // Management+
    canViewOwnTimesheets: level >= 1, // All roles
    canViewTeamTimesheets: level >= 2, // Lead+
    canViewAllTimesheets: level >= 4, // Management+

    // Project permissions
    canCreateProjects: level >= 3, // Manager+
    canEditProjects: level >= 3, // Manager+
    canDeleteProjects: level >= 5, // Super Admin only
    canManageProjectMembers: level >= 3, // Manager+
    canViewAllProjects: level >= 3, // Manager+

    // User permissions
    canCreateUsers: level >= 5, // Super Admin only
    canEditUsers: level >= 5, // Super Admin only
    canDeleteUsers: level >= 5, // Super Admin only
    canChangeUserRoles: level >= 5, // Super Admin only
    canViewAllUsers: level >= 3, // Manager+

    // Billing permissions
    canAccessBilling: level >= 4, // Management+
    canEditBillingRates: level >= 4, // Management+
    canGenerateInvoices: level >= 4, // Management+

    // Admin permissions
    canAccessAuditLogs: level >= 4, // Management+ (read), Super Admin (write)
    canAccessSystemConfig: level >= 5, // Super Admin only
    canHardDelete: level >= 5, // Super Admin only
  };
}
```

---

## Navigation & Feature Access Matrix

| Feature | Employee | Lead | Manager | Management | Super Admin |
|---------|----------|------|---------|------------|-------------|
| **Dashboard** | Employee View | Lead View | Manager View | Management View | Admin View |
| **My Timesheets** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Team Timesheets** | ❌ | ✅ (Project) | ✅ (All) | ✅ (All) | ✅ (All) |
| **Team Review (Approvals)** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **My Projects** | ✅ (Assigned) | ✅ (Assigned) | ✅ (All) | ✅ (All) | ✅ (All) |
| **Project Management** | ❌ | ❌ | ✅ | ✅ (View) | ✅ |
| **User Management** | ❌ | ❌ | ❌ | ✅ (View) | ✅ (Full) |
| **Client Management** | ❌ | ❌ | ✅ (View/Add) | ✅ (View) | ✅ (Full) |
| **Billing** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Reports** | ❌ | ❌ | ✅ (Project) | ✅ (All) | ✅ (All) |
| **Audit Logs** | ❌ | ❌ | ❌ | ✅ (Read) | ✅ (Full) |
| **System Config** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Deleted Items** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Implementation Notes

### Backend API Endpoints

```javascript
// Timesheet approval endpoints
POST /api/timesheets/:id/submit              // Employee submits
POST /api/timesheets/:id/lead-approve        // Lead approves (NEW)
POST /api/timesheets/:id/lead-reject         // Lead rejects (NEW)
POST /api/timesheets/:id/manager-approve     // Manager approves → Frozen
POST /api/timesheets/:id/manager-reject      // Manager rejects
POST /api/timesheets/:id/verify              // Management verifies
POST /api/timesheets/:id/mark-billed         // Management marks as billed

// Permission check endpoint
GET /api/timesheets/:id/permissions          // Get user's permissions for timesheet
GET /api/users/:id/can-approve/:timesheetId  // Check if user can approve
```

### Frontend Route Guards

```typescript
// Protect routes based on hierarchy
<Route path="team-review" element={
  <ProtectedRoute requiredRoles={['lead', 'manager', 'management', 'super_admin']}>
    <TeamReviewPage />
  </ProtectedRoute>
} />

<Route path="billing" element={
  <ProtectedRoute requiredRoles={['management', 'super_admin']}>
    <BillingDashboard />
  </ProtectedRoute>
} />
```

---

## Testing Scenarios

### Scenario 1: Employee Timesheet with Lead

1. Employee creates timesheet (draft)
2. Employee submits → status: submitted
3. Lead views pending approvals
4. Lead approves → status: lead_approved
5. Manager views pending approvals
6. Manager approves → status: frozen
7. Management verifies
8. Management marks as billed → status: billed

### Scenario 2: Employee Timesheet without Lead

1. Employee creates timesheet (draft)
2. Employee submits → status: submitted
3. Manager views pending approvals (no Lead step)
4. Manager approves → status: frozen
5. Management marks as billed → status: billed

### Scenario 3: Lead Timesheet

1. Lead creates timesheet (draft)
2. Lead submits → status: submitted
3. Manager approves → status: frozen
4. Management marks as billed → status: billed

### Scenario 4: Manager Timesheet

1. Manager creates timesheet (draft)
2. Manager submits → status: submitted
3. Management approves → status: frozen
4. Management marks as billed → status: billed

---

## Summary

### Key Principles

1. **Hierarchical Approval**: Each role approves roles below them
2. **Lead Authority**: Leads can now approve employee timesheets in their projects
3. **Project Context**: Lead approvals are project-scoped
4. **Separation of Duties**: Financial tasks (billing) reserved for Management+
5. **Clear Escalation**: Defined path from Employee → Lead → Manager → Management
6. **Immutable Audit Trail**: All approvals tracked with timestamps

### Benefits

- ✅ Clear chain of command
- ✅ Distributed approval workload (Leads help Managers)
- ✅ Faster approval process (parallel Lead approvals)
- ✅ Better team coordination (Leads engaged in team management)
- ✅ Reduced Manager bottleneck
- ✅ Scalable as teams grow

---

**End of Role Hierarchy Documentation**
