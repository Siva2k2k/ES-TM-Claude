# Team Review Project-Week UI Plan - Detailed Design

## Overview
This document defines the **Project-Week based Team Review interface** for Lead, Manager, and Management roles with the flexibility for Manager to directly approve Employee timesheets when needed.

---

## Updated Requirements

### Key Changes:
1. **Manager Flexibility**: Manager CAN approve Employee timesheets directly (bypassing Lead) when needed
2. **Team Review Tab**: Project-Week view for ALL roles (Lead, Manager, Management)
3. **Manager View**: Shows BOTH lead-approved AND submitted employees (can approve either)
4. **Management View**: Shows BOTH manager-approved AND manager's own timesheets

---

## Approval Flow - Updated

### Flow 1: Standard Path (Employee → Lead → Manager → Management)
```
Employee submits → submitted
  ↓
Lead approves → lead_approved (RECOMMENDED path)
  ↓
Manager approves lead-approved → manager_approved
  ↓
Management verifies → frozen
```

### Flow 2: Direct Manager Approval (Employee → Manager → Management)
```
Employee submits → submitted
  ↓
Manager approves directly → manager_approved (OPTIONAL path)
  ↓
Management verifies → frozen
```

**Note**: Manager can choose EITHER path:
- **Path A**: Wait for Lead approval, then approve lead-approved timesheets
- **Path B**: Directly approve Employee timesheets if needed (urgency, lead unavailable, etc.)

---

## Project-Week View Structure

### Common Structure (All Roles)
```
Team Review Page
├── Header (Role-specific title)
├── Filters (Week selector, Project filter, Status filter)
└── Project-Week Cards (List)
    ├── Project-Week Card 1
    │   ├── Project Header (Name, Week, Stats)
    │   ├── Action Buttons (Role-specific)
    │   └── User List (Expandable)
    │       ├── User Row 1 (Name, Hours, Status, Individual Actions)
    │       ├── User Row 2
    │       └── User Row N
    ├── Project-Week Card 2
    └── Project-Week Card N
```

---

## Lead View (Tier 1) - Team Review

### What Lead Sees:
**Project-Week Cards** with:
- **Project**: Projects where user is assigned as Lead
- **Users**: ONLY Employee role users
- **Statuses**: `submitted`, `lead_approved`, `lead_rejected`

### Lead's Project-Week Card

```
┌────────────────────────────────────────────────────────────────┐
│ 📁 Website Redesign - Oct 14-20, 2025                          │
│ Manager: John Smith  •  Lead: You (Bob)                        │
│                                                          [Expand ▼] │
├────────────────────────────────────────────────────────────────┤
│ 📊 Stats:                                                       │
│ • 5 Employees  • 3 Pending  • 180 Total Hours                  │
├────────────────────────────────────────────────────────────────┤
│ ⚡ Actions (Show only if pending):                              │
│ [✓ Approve All Employees] [✗ Reject All]                       │
├────────────────────────────────────────────────────────────────┤
│ 👥 Team Members:                                                │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Alice Johnson (Employee) • 40h                          │   │
│ │ Status: [🟡 Pending] Lead Approval                       │   │
│ │ [✓ Approve] [✗ Reject]                          [View >] │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Charlie Davis (Employee) • 38h                          │   │
│ │ Status: [✅ Approved] by You                             │   │
│ │ Approved: Oct 18, 2025 2:30 PM                 [View >] │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Eve Wilson (Employee) • 42h                             │   │
│ │ Status: [🔴 Rejected] by You                             │   │
│ │ Reason: Missing task descriptions           [View >]    │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ❗ Note: Lead (You) does NOT see:                               │
│    • Manager timesheets                                         │
│    • Management timesheets                                      │
│    • Other Lead's timesheets                                    │
└────────────────────────────────────────────────────────────────┘
```

### Lead View Business Rules:
- ✅ Shows: Employee timesheets in Lead's projects
- ❌ Hides: Lead, Manager, Management timesheets
- 🎯 Actions: Approve/Reject Employee timesheets only
- 📍 Scope: Only projects where user is assigned as Lead

---

## Manager View (Tier 2) - Team Review

### What Manager Sees:
**Project-Week Cards** with:
- **Project**: Projects where user is assigned as Manager
- **Users**:
  - **Employees with status**: `submitted` (can approve directly) OR `lead_approved` (lead has approved)
  - **Leads**: Submitted timesheets (Lead's own timesheets)
- **Statuses**: `submitted`, `lead_approved`, `manager_approved`, `manager_rejected`, `lead_rejected`

### Manager's Project-Week Card

```
┌────────────────────────────────────────────────────────────────┐
│ 📁 Website Redesign - Oct 14-20, 2025                          │
│ Manager: You (John)  •  Lead: Bob Smith                 [Expand ▼] │
├────────────────────────────────────────────────────────────────┤
│ 📊 Stats:                                                       │
│ • 6 Team Members  • 4 Pending Manager Approval  • 220h Total    │
│ • Lead-Approved: 3  • Submitted (Direct): 1                     │
├────────────────────────────────────────────────────────────────┤
│ ⚡ Actions (Show only if pending):                              │
│ [✓ Approve All] [✗ Reject All]                                 │
│ ℹ️  "Approve All" will approve both lead-approved AND submitted │
├────────────────────────────────────────────────────────────────┤
│ 👥 Team Members:                                                │
│                                                                 │
│ ═══════════════════════════════════════════════════════════   │
│ EMPLOYEES - Lead Approved (Recommended Path)                    │
│ ═══════════════════════════════════════════════════════════   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Alice Johnson (Employee) • 40h                          │   │
│ │ Lead Status: [✅ Approved] by Bob (Oct 18, 2:30 PM)     │   │
│ │ Manager Status: [🟡 Pending] Your Approval               │   │
│ │ [✓ Approve] [✗ Reject]                          [View >] │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Charlie Davis (Employee) • 38h                          │   │
│ │ Lead Status: [✅ Approved] by Bob (Oct 17, 5:00 PM)     │   │
│ │ Manager Status: [✅ Approved] by You                     │   │
│ │ Approved: Oct 18, 2025 3:15 PM                 [View >] │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ═══════════════════════════════════════════════════════════   │
│ EMPLOYEES - Submitted (Direct Approval Path)                    │
│ ═══════════════════════════════════════════════════════════   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Eve Wilson (Employee) • 42h                             │   │
│ │ Lead Status: [🟡 Pending] (Not yet reviewed by Lead)    │   │
│ │ Manager Status: [🟡 Pending] Your Approval               │   │
│ │ ⚠️  Direct approval bypasses Lead review                 │   │
│ │ [✓ Approve Directly] [✗ Reject]                [View >] │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ═══════════════════════════════════════════════════════════   │
│ LEAD'S TIMESHEET                                                │
│ ═══════════════════════════════════════════════════════════   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Bob Smith (Lead) • 40h                                  │   │
│ │ Lead Status: [N/A] (Own timesheet)                      │   │
│ │ Manager Status: [🟡 Pending] Your Approval               │   │
│ │ [✓ Approve] [✗ Reject]                          [View >] │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ❗ Manager (You) sees:                                           │
│    ✅ Employees: lead-approved OR submitted (both paths)        │
│    ✅ Lead's own timesheets                                     │
│    ❌ Other Manager's timesheets (goes directly to Management)  │
└────────────────────────────────────────────────────────────────┘
```

### Manager View Business Rules:
- ✅ Shows:
  - **Employees with `lead_approved`** status (recommended path)
  - **Employees with `submitted`** status (direct approval path)
  - **Leads with `submitted`** status (Lead's own timesheets)
- ❌ Hides:
  - Other Manager's timesheets
  - Management timesheets
- 🎯 Actions:
  - Approve lead-approved employees
  - Approve submitted employees directly (bypasses Lead)
  - Approve Lead's timesheets
- 📍 Scope: Only projects where user is assigned as Manager

### Manager's Decision Points:
```
When Employee timesheet is submitted:

OPTION 1: Wait for Lead Approval (Recommended)
  → Lead approves → status = lead_approved
  → Manager sees in "Lead Approved" section
  → Manager approves → status = manager_approved

OPTION 2: Direct Approval (When needed)
  → Manager sees in "Submitted" section
  → Manager approves directly → status = manager_approved
  → Lead review is bypassed
```

### UI Indicators for Manager:

**Lead-Approved Employee (Green indicator)**:
```
┌───────────────────────────────────────────────────┐
│ ✅ Alice Johnson (Employee) • 40h                │
│ Lead: ✅ Approved by Bob Smith                   │
│ Manager: 🟡 Pending your approval                │
│ [Approve] [Reject]                       [View >] │
└───────────────────────────────────────────────────┘
```

**Submitted Employee (Yellow warning)**:
```
┌───────────────────────────────────────────────────┐
│ ⚠️  Eve Wilson (Employee) • 42h                   │
│ Lead: 🟡 Not yet reviewed                        │
│ Manager: 🟡 Pending your approval                │
│ ⚠️  Approving now will bypass Lead review        │
│ [Approve Directly] [Reject]              [View >] │
└───────────────────────────────────────────────────┘
```

**Lead's Timesheet (Blue indicator)**:
```
┌───────────────────────────────────────────────────┐
│ 👤 Bob Smith (Lead) • 40h                        │
│ Lead: N/A (Own timesheet)                        │
│ Manager: 🟡 Pending your approval                │
│ [Approve] [Reject]                       [View >] │
└───────────────────────────────────────────────────┘
```

---

## Management View (Tier 3) - Team Review

### What Management Sees:
**Project-Week Cards** with:
- **Project**: ALL projects (Management sees everything)
- **Users**:
  - **Employees/Leads with status**: `manager_approved` (Manager has approved)
  - **Managers**: Submitted timesheets (Manager's own timesheets with status `management_pending`)
- **Statuses**: `manager_approved`, `management_pending`, `frozen`, `management_rejected`

### Management's Project-Week Card

```
┌────────────────────────────────────────────────────────────────┐
│ 📁 Website Redesign - Oct 14-20, 2025                          │
│ Manager: John Smith  •  Lead: Bob Smith              [Expand ▼] │
├────────────────────────────────────────────────────────────────┤
│ 📊 Stats:                                                       │
│ • 7 Team Members  • 5 Manager-Approved  • 2 Pending  • 260h    │
│ • Ready to Freeze: 5  • Manager's Timesheet: 1 Pending         │
├────────────────────────────────────────────────────────────────┤
│ ⚡ Actions (Show only if all manager-approved):                 │
│ [❄️  Freeze All] [✗ Reject All]                                │
│ ℹ️  Freeze = Verify and lock all manager-approved timesheets   │
├────────────────────────────────────────────────────────────────┤
│ 👥 Team Members:                                                │
│                                                                 │
│ ═══════════════════════════════════════════════════════════   │
│ EMPLOYEES & LEADS - Manager Approved (Ready to Freeze)          │
│ ═══════════════════════════════════════════════════════════   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Alice Johnson (Employee) • 40h                          │   │
│ │ Lead: ✅ Approved by Bob (Oct 18, 2:30 PM)              │   │
│ │ Manager: ✅ Approved by John (Oct 18, 3:15 PM)          │   │
│ │ Management: [🟡 Pending] Your Verification               │   │
│ │ [❄️  Verify & Freeze] [✗ Reject]                [View >] │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Charlie Davis (Employee) • 38h                          │   │
│ │ Lead: ✅ Approved by Bob (Oct 17, 5:00 PM)              │   │
│ │ Manager: ✅ Approved by John (Oct 18, 3:20 PM)          │   │
│ │ Management: [❄️  Frozen] by You                          │   │
│ │ Frozen: Oct 18, 2025 4:00 PM                   [View >] │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Eve Wilson (Employee) • 42h                             │   │
│ │ Lead: ⚠️  Bypassed (Direct Manager approval)            │   │
│ │ Manager: ✅ Approved by John (Oct 18, 4:00 PM)          │   │
│ │ Management: [🟡 Pending] Your Verification               │   │
│ │ [❄️  Verify & Freeze] [✗ Reject]                [View >] │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Bob Smith (Lead) • 40h                                  │   │
│ │ Lead: N/A (Own timesheet)                               │   │
│ │ Manager: ✅ Approved by John (Oct 18, 3:25 PM)          │   │
│ │ Management: [🟡 Pending] Your Verification               │   │
│ │ [❄️  Verify & Freeze] [✗ Reject]                [View >] │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ═══════════════════════════════════════════════════════════   │
│ MANAGER'S TIMESHEET (Direct to Management)                      │
│ ═══════════════════════════════════════════════════════════   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ John Smith (Manager) • 40h                              │   │
│ │ Lead: N/A (Manager role)                                │   │
│ │ Manager: N/A (Own timesheet)                            │   │
│ │ Management: [🟡 Pending] Your Verification               │   │
│ │ [❄️  Verify & Freeze] [✗ Reject]                [View >] │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ❗ Management (You) sees:                                        │
│    ✅ ALL manager-approved timesheets (Employees & Leads)       │
│    ✅ Manager's own timesheets (management_pending)             │
│    ✅ Can freeze entire project-week at once                    │
└────────────────────────────────────────────────────────────────┘
```

### Management View Business Rules:
- ✅ Shows:
  - **Employees/Leads with `manager_approved`** status
  - **Managers with `management_pending`** status (Manager's own timesheets)
  - **All frozen timesheets** (for reference)
- ❌ Hides:
  - Submitted timesheets (not yet manager-approved)
  - Lead-approved timesheets (not yet manager-approved)
- 🎯 Actions:
  - Verify & Freeze manager-approved timesheets
  - Verify & Freeze manager's timesheets
  - Bulk freeze entire project-week
- 📍 Scope: ALL projects across organization

### UI Indicators for Management:

**Manager-Approved Employee (Ready to freeze)**:
```
┌───────────────────────────────────────────────────┐
│ ✅ Alice Johnson (Employee) • 40h                │
│ Lead: ✅ Bob Smith                               │
│ Manager: ✅ John Smith                           │
│ Management: 🟡 Pending verification              │
│ [Freeze] [Reject]                        [View >] │
└───────────────────────────────────────────────────┘
```

**Manager-Approved (Direct path - bypassed Lead)**:
```
┌───────────────────────────────────────────────────┐
│ ⚠️  Eve Wilson (Employee) • 42h                   │
│ Lead: ⚠️  Bypassed                               │
│ Manager: ✅ John Smith (Direct approval)         │
│ Management: 🟡 Pending verification              │
│ [Freeze] [Reject]                        [View >] │
└───────────────────────────────────────────────────┘
```

**Manager's Timesheet (Direct to Management)**:
```
┌───────────────────────────────────────────────────┐
│ 👤 John Smith (Manager) • 40h                    │
│ Lead: N/A                                        │
│ Manager: N/A (Own timesheet)                     │
│ Management: 🟡 Pending verification              │
│ [Freeze] [Reject]                        [View >] │
└───────────────────────────────────────────────────┘
```

**Frozen Timesheet (Already verified)**:
```
┌───────────────────────────────────────────────────┐
│ ❄️  Charlie Davis (Employee) • 38h               │
│ Lead: ✅ Bob Smith                               │
│ Manager: ✅ John Smith                           │
│ Management: ❄️  Frozen by Diana (Oct 18, 4:00 PM) │
│ [View Details]                                    │
└───────────────────────────────────────────────────┘
```

---

## Filter Options

### Common Filters (All Roles):
```
┌────────────────────────────────────────────────────────────┐
│ Filters                                                     │
├────────────────────────────────────────────────────────────┤
│ Week: [Oct 14-20, 2025 ▼] [< Prev Week] [Next Week >]     │
│ Project: [All Projects ▼] or [Select specific project]     │
│ Status: [Pending ▼] [Approved] [Rejected] [All]           │
│ Search: [🔍 Search by name...]                              │
│                                                             │
│ [Clear Filters] [Apply]                                    │
└────────────────────────────────────────────────────────────┘
```

### Lead-Specific Filters:
- Status: `Submitted`, `Lead Approved`, `Lead Rejected`, `All`

### Manager-Specific Filters:
- Status: `Pending Manager`, `Lead Approved`, `Manager Approved`, `Rejected`, `All`
- Path: `All`, `Lead Approved` (recommended), `Submitted` (direct)

### Management-Specific Filters:
- Status: `Manager Approved`, `Frozen`, `Rejected`, `All`
- Type: `All`, `Employees/Leads`, `Managers Only`

---

## Approval Status Badge System

### Status Badges (Color-coded):

| Status | Badge | Description |
|--------|-------|-------------|
| 🟡 Pending | `[🟡 Pending]` | Awaiting approval at current tier |
| ✅ Approved | `[✅ Approved]` | Approved by this tier |
| 🔴 Rejected | `[🔴 Rejected]` | Rejected by this tier |
| ❄️ Frozen | `[❄️ Frozen]` | Verified and frozen by Management |
| ⚠️ Bypassed | `[⚠️ Bypassed]` | Lead review was bypassed (direct Manager approval) |
| N/A | `[N/A]` | Not applicable (own timesheet) |

---

## Backend Updates Needed

### 1. Update TeamReviewApprovalService
**File**: `backend/src/services/TeamReviewApprovalService.ts`

**Change in `approveTimesheetForProject()` method**:

```typescript
// CURRENT: Manager can only approve lead_approved
else if (approverRole === 'manager' || approverRole === 'super_admin') {
  const canApprove = (
    timesheet.status === 'lead_approved' ||
    (timesheet.status === 'submitted' && ['lead', 'manager'].includes(timesheetUserRole)) ||
    timesheet.status === 'management_rejected'
  );
  // ...
}

// UPDATED: Manager can also approve submitted employees
else if (approverRole === 'manager' || approverRole === 'super_admin') {
  const canApprove = (
    timesheet.status === 'lead_approved' ||  // Lead has approved
    (timesheet.status === 'submitted' && ['employee', 'lead', 'manager'].includes(timesheetUserRole)) || // Direct approval
    timesheet.status === 'management_rejected'
  );

  if (!canApprove) {
    throw new Error(`Cannot approve timesheet with status ${timesheet.status}`);
  }

  // Mark manager approval
  projectApproval.manager_status = 'approved';
  projectApproval.manager_approved_at = new Date();
  projectApproval.manager_rejection_reason = undefined;

  // If approving submitted employee, mark that lead was bypassed
  if (timesheet.status === 'submitted' && timesheetUserRole === 'employee') {
    projectApproval.lead_status = 'not_required'; // Indicate lead review was bypassed
  }

  await projectApproval.save(queryOpts);
  // ... rest of logic
}
```

### 2. Update TeamReviewServiceV2
**File**: `backend/src/services/TeamReviewServiceV2.ts`

**Add method**: `getProjectWeekGroups()` with role-based filtering:

```typescript
static async getProjectWeekGroups(
  userId: string,
  userRole: string,
  filters: ProjectWeekFilters
): Promise<ProjectWeekResponse> {

  if (userRole === 'lead') {
    // Lead View: Show only Employee timesheets in Lead's projects
    return this.getProjectWeekGroupsForLead(userId, filters);
  }

  else if (userRole === 'manager') {
    // Manager View: Show lead-approved + submitted employees + lead's timesheets
    return this.getProjectWeekGroupsForManager(userId, filters);
  }

  else if (userRole === 'management') {
    // Management View: Show manager-approved + manager's timesheets
    return this.getProjectWeekGroupsForManagement(filters);
  }
}

// Lead View
private static async getProjectWeekGroupsForLead(...) {
  // Filter: user_role = 'employee' AND status IN ('submitted', 'lead_approved', 'lead_rejected')
  // Filter: projects where userId is Lead
}

// Manager View
private static async getProjectWeekGroupsForManager(...) {
  // Filter:
  //   (user_role = 'employee' AND status IN ('submitted', 'lead_approved', 'manager_approved'))
  //   OR
  //   (user_role = 'lead' AND status = 'submitted')
  // Filter: projects where userId is Manager
}

// Management View
private static async getProjectWeekGroupsForManagement(...) {
  // Filter:
  //   (user_role IN ('employee', 'lead') AND status = 'manager_approved')
  //   OR
  //   (user_role = 'manager' AND status = 'management_pending')
  // Filter: ALL projects
}
```

---

## Frontend Component Structure

### Component Hierarchy:
```
TeamReviewPageV2.tsx
├── TeamReviewHeader (Role-based title, stats)
├── TeamReviewFilters (Week, Project, Status, Search)
└── ProjectWeekList
    └── ProjectWeekCard (repeated)
        ├── ProjectWeekHeader (Project name, manager, lead, stats)
        ├── ProjectWeekActions (Bulk approve, reject, freeze)
        └── UserTimesheetList
            └── UserTimesheetRow (repeated)
                ├── UserInfo (Name, role, hours)
                ├── ApprovalStatusBadges (Lead, Manager, Management)
                └── UserActions (Approve, Reject, View)
```

### Key Components:

#### 1. `ApprovalStatusBadges.tsx` (NEW)
```typescript
interface ApprovalStatusBadgesProps {
  userRole: UserRole;
  leadStatus: ApprovalStatus;
  managerStatus: ApprovalStatus;
  managementStatus: ApprovalStatus;
  viewerRole: 'lead' | 'manager' | 'management';
}

// Shows 1-3 badges depending on viewer role
// Lead view: Shows only Lead status
// Manager view: Shows Lead + Manager status
// Management view: Shows Manager + Management status
```

#### 2. `UserTimesheetRow.tsx` (UPDATED)
```typescript
interface UserTimesheetRowProps {
  user: ProjectWeekUser;
  viewerRole: 'lead' | 'manager' | 'management';
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onView: (userId: string) => void;
}

// Renders different UI based on viewerRole
// Shows appropriate status badges
// Shows role-appropriate action buttons
```

#### 3. `ProjectWeekCard.tsx` (UPDATED)
```typescript
// Already exists, needs updates:
// - Add viewerRole prop
// - Show different user groupings based on role:
//   - Manager: Group by "Lead Approved" and "Submitted"
//   - Management: Group by "Ready to Freeze" and "Frozen"
// - Show appropriate bulk action buttons
```

---

## Summary of Key Differences

### Manager View - Two Paths:

**Path A: Lead Approved (Recommended)**
```
Employee → Lead → Manager
Shows: lead_approved status
Badge: ✅ Lead Approved
Action: [Approve] [Reject]
```

**Path B: Direct Approval (When needed)**
```
Employee → Manager (bypasses Lead)
Shows: submitted status
Badge: ⚠️ Direct Approval (bypasses Lead)
Action: [Approve Directly] [Reject]
```

### Management View - Two Types:

**Type A: Manager-Approved (Employees/Leads)**
```
Employee/Lead → Manager → Management
Shows: manager_approved status
Badge: ✅ Manager Approved
Action: [Freeze] [Reject]
```

**Type B: Manager's Own Timesheet**
```
Manager → Management (skips Tier 1 & 2)
Shows: management_pending status
Badge: 👤 Manager's Timesheet
Action: [Freeze] [Reject]
```

---

## Implementation Steps

1. ✅ Update `TeamReviewApprovalService.approveTimesheetForProject()` - Allow Manager to approve submitted employees
2. ⏭️ Create `TeamReviewServiceV2` role-based filtering methods
3. ⏭️ Create `ApprovalStatusBadges.tsx` component
4. ⏭️ Update `UserTimesheetRow.tsx` with role-based rendering
5. ⏭️ Update `ProjectWeekCard.tsx` with role-based grouping
6. ⏭️ Update `TeamReviewPageV2.tsx` with role detection and filters
7. ⏭️ Test all three role views with sample data

---

This plan ensures:
- ✅ Manager has flexibility to approve employees directly when needed
- ✅ Project-Week view for all roles
- ✅ Clear visual indicators for approval paths
- ✅ Proper grouping and organization per role
- ✅ Consistent UI patterns across all roles
