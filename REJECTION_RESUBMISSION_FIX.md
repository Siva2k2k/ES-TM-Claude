# Rejection and Resubmission Fix - Complete Summary

## Issue Overview

When a Lead/Manager rejected ANY project in a multi-project timesheet, the system needed to:

1. Set overall timesheet status to 'rejected' (to enable resubmission)
2. Preserve individual project approval states (approved projects stay approved)

The previous fix prevented status change when only SOME projects were rejected, which blocked resubmission functionality.

## Root Cause

The intermediate fix used conditional logic:

```typescript
// WRONG: Only set status if ALL projects rejected
const allLeadsRejected = await this.checkAllLeadsRejected(
  timesheet._id,
  session
);
if (allLeadsRejected) {
  timesheet.status = "lead_rejected";
}
```

This meant:

- Rejecting TimesheetChecker alone → status stayed 'submitted' → resubmission blocked
- ProjectChecker stayed approved → correct behavior ✓
- BUT user couldn't resubmit to fix TimesheetChecker → broken workflow ✗

## Solution Implemented

### Architecture Decision

**Overall Status vs Per-Project Status:**

- **Overall Status**: Reflects worst-case scenario (ANY rejection = rejected status)
  - Purpose: Enable workflow actions (resubmission)
  - Behavior: ANY project rejection → overall status becomes 'rejected'
- **Per-Project Status**: Independent approval state
  - Purpose: Track actual approval state per project
  - Behavior: Preserved through rejections, reset only on resubmission of that specific project

### Code Changes

#### 1. TeamReviewApprovalService.ts - Lead Rejection (Lines 367-391)

```typescript
// BEFORE: Checked if ALL projects rejected
const allLeadsRejected = await this.checkAllLeadsRejected(
  timesheet._id,
  session
);
if (allLeadsRejected) {
  timesheet.status = "lead_rejected";
}

// AFTER: ALWAYS set status when ANY project rejected
timesheet.status = "lead_rejected";
timesheet.lead_rejection_reason = reason;
timesheet.lead_rejected_at = new Date();
```

**Rationale**: Rejecting ANY project should set overall status to 'rejected' to allow resubmission

#### 2. TeamReviewApprovalService.ts - Manager Rejection (Lines 411-431)

```typescript
// AFTER: ALWAYS set status when ANY project rejected
timesheet.status = "manager_rejected";
timesheet.manager_rejection_reason = reason;
timesheet.manager_rejected_at = new Date();
```

**Same logic applied to Manager tier for consistency**

#### 3. TeamReviewApprovalService.ts - Bulk Rejection (Lines 1130-1171)

```typescript
// BEFORE: Conditional logic
const allLeadsRejected = await this.checkAllLeadsRejected(
  timesheet._id,
  session
);
const statusChanged = allLeadsRejected;

if (approverRole === "lead" && allLeadsRejected) {
  newStatus = "lead_rejected";
  timesheet.status = newStatus;
}

// AFTER: ALWAYS set status
if (approverRole === "lead") {
  newStatus = "lead_rejected";
  timesheet.status = newStatus;
  timesheet.lead_rejection_reason = reason;
  timesheet.lead_rejected_at = new Date();
} else {
  newStatus = "manager_rejected";
  timesheet.status = newStatus;
  timesheet.manager_rejection_reason = reason;
  timesheet.manager_rejected_at = new Date();
}
```

**Also updated history notes:**

```typescript
notes: "Project-week rejection - timesheet status set to rejected (other approved projects maintain approval)";
```

## Workflow Impact

### Scenario: Multi-Project Timesheet

Employee has:

- **ProjectChecker**: Lead approved ✓
- **TimesheetChecker**: Lead rejected ✗

### Before Fix

```
Overall Status: 'submitted' (unchanged)
ProjectChecker approval.lead_status: 'approved' ✓
TimesheetChecker approval.lead_status: 'rejected' ✓
Result: Employee CANNOT resubmit (status not 'rejected') ✗
```

### After Fix

```
Overall Status: 'lead_rejected' ✓
ProjectChecker approval.lead_status: 'approved' ✓
TimesheetChecker approval.lead_status: 'rejected' ✓
Result: Employee CAN resubmit ✓
```

### On Resubmission

When employee resubmits after fixing TimesheetChecker:

```typescript
// TimesheetService.ts resubmission logic should:
1. Reset overall status to 'submitted'
2. Reset ONLY rejected projects to 'pending'
3. Keep approved projects as 'approved'
```

**Expected behavior:**

- TimesheetChecker: 'rejected' → 'pending' (needs new Lead review)
- ProjectChecker: 'approved' → 'approved' (unchanged, already approved)

## Testing Checklist

### ✓ Compilation

- [x] Backend compiles without errors
- [x] No TypeScript errors

### ⏳ Functional Testing Required

#### Test 1: Single Project Rejection Enables Resubmission

1. Employee submits timesheet with 2 projects
2. Lead approves ProjectChecker
3. Lead rejects TimesheetChecker
4. **Expected**: Overall status → 'lead_rejected'
5. **Expected**: Employee sees "Resubmit" button
6. **Expected**: ProjectChecker still shows approved

#### Test 2: Approved Projects Preserve State

1. Continue from Test 1
2. Check ProjectChecker approval.lead_status
3. **Expected**: Still 'approved' (not reset to 'pending')

#### Test 3: Manager Visibility

1. Continue from Test 1
2. Manager logs in
3. **Expected**: Manager sees ProjectChecker (approved project)
4. **Expected**: Manager does NOT see TimesheetChecker (rejected)

#### Test 4: Resubmission Behavior

1. Employee fixes TimesheetChecker hours
2. Employee clicks "Resubmit"
3. **Expected**: Overall status → 'submitted'
4. **Expected**: TimesheetChecker approval.lead_status → 'pending'
5. **Expected**: ProjectChecker approval.lead_status → 'approved' (unchanged)

#### Test 5: Bulk Rejection

1. Lead has multiple employees to review
2. Lead uses bulk reject for TimesheetChecker project-week
3. **Expected**: All affected timesheets → 'lead_rejected'
4. **Expected**: All employees can resubmit
5. **Expected**: Other approved projects unchanged

## Key Principles Established

1. **Overall Status = Workflow Enabler**

   - Determines what actions user can take (submit, resubmit, edit)
   - ANY rejection → rejected status (enables resubmission)

2. **Per-Project Status = Approval State**

   - Tracks actual approval state per project
   - Independent from overall status
   - Preserved through rejections
   - Reset only on resubmission of that specific project

3. **Visibility Logic**

   - Based on per-project approval status
   - Manager sees approved projects even if overall status 'rejected'
   - Uses both overall and per-project checks for robustness

4. **Resubmission Logic**
   - Triggered by overall 'rejected' status
   - Resets overall status to 'submitted'
   - Resets ONLY rejected projects to 'pending'
   - Preserves approved projects

## Files Modified

1. `backend/src/services/TeamReviewApprovalService.ts`
   - rejectTimesheetForProject() - Lead rejection (lines 367-391)
   - rejectTimesheetForProject() - Manager rejection (lines 411-431)
   - rejectProjectWeek() - Bulk rejection (lines 1130-1171)

## Related Documentation

- `TIMESHEET_3TIER_IMPLEMENTATION_COMPLETE.md` - Multi-project approval architecture
- `TIMESHEET_APPROVAL_HIERARCHY_PLAN.md` - Original approval hierarchy design
- `PHASE7_TEAM_REVIEW_FIX.md` - Previous fixes for multi-project handling

## Next Steps

1. Restart backend server
2. Run functional tests (checklist above)
3. Verify resubmission flow works correctly
4. Verify approved projects are NOT reset during resubmission
5. Document any edge cases discovered during testing

---

**Implementation Date**: January 2025  
**Issue**: Rejection of ANY project must enable resubmission while preserving per-project approval independence  
**Status**: ✅ Code Complete | ⏳ Testing Pending
