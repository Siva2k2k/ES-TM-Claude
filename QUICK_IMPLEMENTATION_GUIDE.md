# Quick Implementation Guide - 3-Tier Approval Hierarchy

## What You Have Now vs What You Need

### Current System (INCORRECT)
- Lead and Manager have same view
- No clear tier-based approval
- Auto-escalation bypasses Manager entirely

### Required System (CORRECT)
**Tier 1: Lead** → Approves Employee timesheets only
**Tier 2: Manager** → Approves Lead-approved + Lead's timesheets
**Tier 3: Management** → Verifies Manager-approved + Manager's timesheets

---

## Critical Changes Needed

### 1. Status Enum Update
**Location**: `backend/src/models/Timesheet.ts`

Add these statuses:
- `lead_approved` - After Lead approves Employee
- `lead_rejected` - When Lead rejects Employee

### 2. Approval Logic Fix
**Location**: `backend/src/services/TeamReviewApprovalService.ts`

Current `approveTimesheetForProject()` method needs:

```typescript
// BEFORE: Lead and Manager treated same
if (approverRole === 'lead' || approverRole === 'manager') {
  // Both do same thing - WRONG!
}

// AFTER: Separate logic per tier
if (approverRole === 'lead') {
  // Check: Can only approve Employee timesheets
  if (timesheetUser.role !== 'employee') {
    throw new Error('Lead can only approve Employee timesheets');
  }

  // Set lead approval
  projectApproval.lead_status = 'approved';

  // Move to 'lead_approved' status
  timesheet.status = 'lead_approved';
}

else if (approverRole === 'manager') {
  // Check: Can approve lead-approved OR lead's timesheets
  if (timesheet.status === 'lead_approved' ||
      (timesheet.status === 'submitted' && timesheetUser.role === 'lead')) {

    projectApproval.manager_status = 'approved';

    // Move to 'manager_approved' status
    timesheet.status = 'manager_approved';
  }
}

else if (approverRole === 'management') {
  // Verify manager-approved timesheets
  if (timesheet.status === 'manager_approved' ||
      timesheet.status === 'management_pending') {

    projectApproval.management_status = 'approved';

    // Freeze timesheet
    timesheet.status = 'frozen';
    timesheet.is_frozen = true;
  }
}
```

### 3. Role-Based Filtering
**Location**: `backend/src/services/TeamReviewServiceV2.ts`

Add these methods:

```typescript
// Lead View: Show only Employee timesheets in Lead's projects
static async getProjectWeekGroupsForLead(leadId: string) {
  // 1. Find projects where user is Lead
  const leadProjects = await ProjectMember.find({
    user_id: leadId,
    project_role: 'lead'
  });

  // 2. Get timesheets for those projects
  const timesheets = await Timesheet.find({
    // ... project filter ...
    status: { $in: ['submitted', 'lead_approved', 'lead_rejected'] }
  }).populate('user_id');

  // 3. Filter: ONLY Employee timesheets
  return timesheets.filter(ts => ts.user_id.role === 'employee');
}

// Manager View: Show Lead-approved + Lead's timesheets
static async getProjectWeekGroupsForManager(managerId: string) {
  // 1. Find projects where user is Manager
  // 2. Get timesheets with status: lead_approved or (submitted + role=lead)
  // 3. Return filtered list
}

// Management View: Show Manager-approved timesheets
static async getProjectWeekGroupsForManagement() {
  // 1. Get ALL timesheets with status: manager_approved, management_pending
  // 2. Return grouped by project-week
}
```

### 4. Frontend Role Detection
**Location**: `frontend/src/pages/team-review/TeamReviewPageV2.tsx`

```typescript
const TeamReviewPageV2 = () => {
  const { user } = useAuth();

  // Detect approval role
  const approvalRole = user?.role === 'lead' ? 'lead'
                     : user?.role === 'manager' ? 'manager'
                     : user?.role === 'management' ? 'management'
                     : null;

  // Load data based on role
  const loadData = async () => {
    if (approvalRole === 'lead') {
      // Fetch Lead view: Employee timesheets only
      const data = await TeamReviewService.getProjectWeekGroups({
        role: 'lead',
        status: 'pending'
      });
    }
    else if (approvalRole === 'manager') {
      // Fetch Manager view: Lead-approved + Lead timesheets
      const data = await TeamReviewService.getProjectWeekGroups({
        role: 'manager',
        status: 'pending'
      });
    }
    else if (approvalRole === 'management') {
      // Fetch Management view: Manager-approved timesheets
      const data = await TeamReviewService.getProjectWeekGroups({
        role: 'management',
        status: 'pending'
      });
    }
  };

  return (
    <div>
      <h1>
        {approvalRole === 'lead' && 'Lead - Team Review'}
        {approvalRole === 'manager' && 'Manager - Team Review'}
        {approvalRole === 'management' && 'Management - Verification'}
      </h1>

      {/* Show role-specific instructions */}
      <p>
        {approvalRole === 'lead' && 'Review and approve employee timesheets'}
        {approvalRole === 'manager' && 'Review lead-approved and lead timesheets'}
        {approvalRole === 'management' && 'Verify and freeze manager-approved timesheets'}
      </p>

      {/* Project-Week Cards */}
      {projectWeeks.map(pw => (
        <ProjectWeekCard
          projectWeek={pw}
          approvalRole={approvalRole}
          canApprove={true}
        />
      ))}
    </div>
  );
};
```

---

## Files to Modify (Priority Order)

### High Priority - Core Logic
1. ✅ `backend/src/models/Timesheet.ts` - Add lead_approved, lead_rejected status
2. ✅ `backend/src/services/TeamReviewApprovalService.ts` - Fix approval logic per tier
3. ✅ `backend/src/services/TeamReviewServiceV2.ts` - Add role-based filtering
4. ⏭️ `frontend/src/types/index.ts` - Update TimesheetStatus enum
5. ⏭️ `frontend/src/pages/team-review/TeamReviewPageV2.tsx` - Add role-based views

### Medium Priority - UI/UX
6. ⏭️ `frontend/src/pages/team-review/components/ProjectWeekCard.tsx` - Show tier status
7. ⏭️ `frontend/src/services/TeamReviewService.ts` - Update API calls
8. ⏭️ `frontend/src/types/timesheetApprovals.ts` - Update ProjectWeekUser type

### Low Priority - Nice to Have
9. ⏭️ Project Settings page - Add auto-escalation toggle
10. ⏭️ User guide/documentation
11. ⏭️ Migration scripts

---

## Testing Checklist

Once implemented, test these flows:

### ✅ Flow 1: Employee → Lead → Manager → Management
```
1. Employee (Alice) submits → status: 'submitted'
2. Lead (Bob) approves → status: 'lead_approved'
3. Manager (Charlie) approves → status: 'manager_approved'
4. Management (Diana) verifies → status: 'frozen'
```

### ✅ Flow 2: Lead Submission → Manager → Management
```
1. Lead (Bob) submits own timesheet → status: 'submitted'
2. Manager (Charlie) approves → status: 'manager_approved'
3. Management (Diana) verifies → status: 'frozen'
```

### ✅ Flow 3: Manager Submission → Management
```
1. Manager (Charlie) submits → status: 'management_pending'
2. Management (Diana) verifies → status: 'frozen'
```

### ✅ Flow 4: Lead Rejection
```
1. Employee submits → status: 'submitted'
2. Lead rejects → status: 'lead_rejected'
3. Employee fixes → status: 'draft'
4. Employee resubmits → status: 'submitted'
5. Lead approves → status: 'lead_approved'
```

---

## Quick Win: Minimal Changes

If you want the FASTEST implementation, do these 3 things:

### 1. Add Status Values
```typescript
// backend/src/models/Timesheet.ts
export const TimesheetStatusEnum = [
  // ... existing ...
  'lead_approved',  // ADD THIS
  'lead_rejected'   // ADD THIS
];
```

### 2. Fix Approval Logic
```typescript
// backend/src/services/TeamReviewApprovalService.ts
// In approveTimesheetForProject():

if (approverRole === 'lead') {
  // NEW: Lead-specific logic
  projectApproval.lead_status = 'approved';
  timesheet.status = 'lead_approved';
}
else if (approverRole === 'manager') {
  // NEW: Manager reviews lead-approved
  if (timesheet.status === 'lead_approved' || timesheet.status === 'submitted') {
    projectApproval.manager_status = 'approved';
    timesheet.status = 'manager_approved';
  }
}
```

### 3. Filter by Role
```typescript
// backend/src/services/TeamReviewServiceV2.ts
// In getProjectWeekGroups():

if (userRole === 'lead') {
  // Filter: Show only Employee timesheets
  timesheets = timesheets.filter(ts => ts.user_id.role === 'employee');
}
else if (userRole === 'manager') {
  // Filter: Show lead-approved + lead's timesheets
  timesheets = timesheets.filter(ts =>
    ts.status === 'lead_approved' ||
    (ts.status === 'submitted' && ts.user_id.role === 'lead')
  );
}
else if (userRole === 'management') {
  // Filter: Show manager-approved
  timesheets = timesheets.filter(ts => ts.status === 'manager_approved');
}
```

---

## Summary

**Current Issue**: Lead and Manager see the same view and do the same action.

**Solution**: Each tier has distinct:
- **View**: What timesheets they see
- **Action**: What they can approve
- **Status**: What status change they trigger

**Key Principle**:
- Lead → Employees only → `lead_approved`
- Manager → Lead-approved + Leads → `manager_approved`
- Management → Manager-approved + Managers → `frozen`

---

Refer to `TIMESHEET_APPROVAL_HIERARCHY_PLAN.md` for complete implementation details!
