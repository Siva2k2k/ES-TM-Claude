    # Timesheet Approval System Enhancements
**Phase 7 - Team Review Logic Improvements**

## Overview
This document outlines the enhancements to the timesheet approval system to address three key requirements:
1. Management bulk freeze for project-week timesheets
2. Configurable Manager approval behavior (review lead-approved or auto-escalate)
3. Enhanced Lead approval workflow

## Current System Analysis

### Current Approval Flow:
```
Employee → submitted → Lead Review → Manager Review → Management Verification → frozen
```

### Current Issues:
1. **Management View**: Currently has same restrictions as Manager - cannot bulk freeze project-week timesheets if any user hasn't submitted
2. **Manager Approval**: Always must review lead-approved timesheets - no option to auto-escalate
3. **Lead Approval**: Workflow exists but not fully integrated with settings

## Proposed Changes

### 1. Management Bulk Freeze (Project-Week Wise)

**Requirement**: Management should be able to bulk freeze ALL timesheets under a project-week, even if some users haven't submitted (but NOT if any submitted timesheet is still pending).

**Implementation**:

#### Backend Changes:
- **New Endpoint**: `POST /api/team-review/freeze-project-week`
- **Service Method**: `TeamReviewApprovalService.bulkFreezeProjectWeek()`

**Validation Logic**:
```typescript
Can Freeze IF:
  - ALL submitted timesheets are in 'manager_approved' status
  - NO timesheet is in 'submitted', 'manager_rejected', or 'management_rejected' status

Cannot Freeze IF:
  - ANY user has a timesheet in 'submitted' status (pending approval)
  - ANY user has 'draft' timesheet with entries (must submit first)
```

**Behavior**:
- Users with no timesheet: Skipped (no action needed)
- Users with draft timesheet (0 hours): Skipped
- Users with 'manager_approved' timesheet: Changed to 'frozen'

#### Frontend Changes:
- **File**: `TeamReviewPageV2.tsx`
- **Change**: Add "Bulk Freeze Project-Week" button visible only to Management role
- **Validation**: Show warning if any timesheet is not manager_approved

---

### 2. Manager Approval Settings Toggle

**Requirement**: Manager should have a setting to control whether they:
- Option A: Must review all lead-approved timesheets before final approval
- Option B: Lead-approved timesheets auto-escalate to 'manager_approved'

**Implementation**:

#### Database Schema:
Add to `Project` model:
```typescript
approval_settings: {
  lead_approval_auto_escalates: boolean  // default: false
}
```

**Settings Behavior**:
- `false` (default): Manager must explicitly approve lead-approved timesheets
- `true`: Lead approval automatically sets timesheet to 'manager_approved'

#### Backend Changes:
- **File**: `backend/src/models/Project.ts`
- **Addition**: Add `approval_settings` field
- **File**: `TeamReviewApprovalService.ts`
- **Logic**: Check project settings when Lead approves

**Approval Logic**:
```typescript
if (approverRole === 'lead') {
  const project = await Project.findById(projectId);
  const autoEscalate = project.approval_settings?.lead_approval_auto_escalates || false;

  if (autoEscalate && allProjectLeadsApproved) {
    // Directly set to manager_approved
    timesheet.status = 'manager_approved';
  } else {
    // Keep in submitted, waiting for manager review
    timesheet.status = 'submitted';  // or 'lead_approved' status
  }
}
```

#### Frontend Changes:
- **File**: `ProjectSettings.tsx` (new or existing)
- **UI**: Toggle switch for "Lead approvals bypass manager review"
- **File**: `TeamReviewPageV2.tsx`
- **Display**: Show indicator when a project uses auto-escalation

---

### 3. Enhanced Lead Approval Workflow

**Requirement**: Lead should be able to approve/reject employee timesheets within their project scope.

**Implementation**:

#### Current System:
- `TimesheetProjectApproval` model tracks lead_status ('pending', 'approved', 'rejected')
- Lead approvals are tracked but workflow isn't complete

#### Enhancements:

**Approval Flow**:
```
Employee submits → submitted

Lead approves:
  IF (lead_approval_auto_escalates = true):
    → manager_approved (skip manager review)
  ELSE:
    → submitted (waiting for manager)

Lead rejects:
  → manager_rejected (employee must fix)
```

**Backend Changes**:
- **File**: `TeamReviewApprovalService.approveTimesheetForProject()`
- **Logic**: Check project settings when lead approves
- **File**: `TeamReviewApprovalService.rejectTimesheetForProject()`
- **Logic**: Handle lead rejections properly

**Frontend Changes**:
- **File**: `TeamReviewPageV2.tsx`
- **Display**: Show lead approval status clearly
- **Actions**: Enable approve/reject for Leads on employee timesheets

---

## API Endpoints

### New Endpoints:

#### 1. Bulk Freeze Project-Week
```typescript
POST /api/team-review/freeze-project-week
Authorization: Management only

Request Body:
{
  project_id: string;
  week_start: string;  // ISO date
  week_end: string;    // ISO date
}

Response:
{
  success: boolean;
  message: string;
  frozen_count: number;
  skipped_count: number;
  failed: Array<{
    user_id: string;
    user_name: string;
    reason: string;
  }>;
}
```

#### 2. Update Project Approval Settings
```typescript
PATCH /api/projects/:projectId/approval-settings
Authorization: Manager, Management

Request Body:
{
  lead_approval_auto_escalates: boolean;
}

Response:
{
  success: boolean;
  message: string;
  settings: {
    lead_approval_auto_escalates: boolean;
  };
}
```

#### 3. Get Project Approval Settings
```typescript
GET /api/projects/:projectId/approval-settings
Authorization: Manager, Management, Lead

Response:
{
  success: boolean;
  settings: {
    lead_approval_auto_escalates: boolean;
  };
}
```

---

## Database Schema Changes

### Project Model Addition:
```typescript
// backend/src/models/Project.ts

interface IProject extends Document {
  // ... existing fields ...

  // NEW: Approval workflow settings
  approval_settings?: {
    lead_approval_auto_escalates: boolean;  // default: false
  };
}

const ProjectSchema = new Schema({
  // ... existing fields ...

  approval_settings: {
    type: {
      lead_approval_auto_escalates: {
        type: Boolean,
        default: false
      }
    },
    required: false,
    default: () => ({ lead_approval_auto_escalates: false })
  }
});
```

---

## Frontend Type Changes

### Updated Types:
```typescript
// frontend/src/types/index.ts

export type TimesheetStatus =
  | 'draft'
  | 'submitted'
  | 'manager_approved'
  | 'manager_rejected'
  | 'management_pending'
  | 'management_rejected'
  | 'frozen'
  | 'billed';

// NEW: Project approval settings
export interface ProjectApprovalSettings {
  lead_approval_auto_escalates: boolean;
}

export interface Project {
  // ... existing fields ...
  approval_settings?: ProjectApprovalSettings;
}
```

---

## Implementation Checklist

### Backend:
- [ ] Add `approval_settings` field to Project model
- [ ] Update `TeamReviewApprovalService.approveTimesheetForProject()` to check settings
- [ ] Add `TeamReviewApprovalService.bulkFreezeProjectWeek()` method
- [ ] Add `TeamReviewController.freezeProjectWeek()` endpoint
- [ ] Add `ProjectController.updateApprovalSettings()` endpoint
- [ ] Add `ProjectController.getApprovalSettings()` endpoint
- [ ] Add validation for bulk freeze (check no pending timesheets)
- [ ] Add tests for new endpoints

### Frontend:
- [ ] Update type definitions in `types/index.ts`
- [ ] Add "Bulk Freeze" button in `TeamReviewPageV2.tsx` (Management only)
- [ ] Add validation warning before bulk freeze
- [ ] Create `ProjectApprovalSettings.tsx` component
- [ ] Add settings toggle to project settings page
- [ ] Update `TeamReviewService.ts` to call new endpoints
- [ ] Add UI indicators for auto-escalation projects
- [ ] Test all approval flows

### Testing:
- [ ] Test Management bulk freeze with various scenarios
- [ ] Test Manager approval with auto-escalation enabled
- [ ] Test Manager approval with auto-escalation disabled
- [ ] Test Lead approval workflow
- [ ] Test rejection flows
- [ ] Test edge cases (no timesheets, all draft, mixed states)

---

## Migration Notes

### Database Migration:
```mongodb
// Add approval_settings to all existing projects
db.projects.updateMany(
  { approval_settings: { $exists: false } },
  {
    $set: {
      approval_settings: {
        lead_approval_auto_escalates: false
      }
    }
  }
);
```

### Backward Compatibility:
- Default value for `lead_approval_auto_escalates` is `false` to maintain current behavior
- Existing projects without settings will use defaults
- No breaking changes to existing API endpoints

---

## Security Considerations

### Authorization:
- **Bulk Freeze**: Management role only
- **Update Settings**: Manager, Management roles only
- **View Settings**: All project members

### Validation:
- Verify user has permission to freeze project-week
- Verify all timesheets are in valid state before freezing
- Verify project exists and user has access
- Validate date ranges for project-week

---

## Testing Scenarios

### Scenario 1: Management Bulk Freeze
```
Given: Project-week with 5 users
- User1: manager_approved (40 hours)
- User2: manager_approved (38 hours)
- User3: no timesheet (0 hours)
- User4: draft (0 hours)
- User5: manager_approved (42 hours)

When: Management clicks "Bulk Freeze"

Then:
- User1, User2, User5: Changed to 'frozen'
- User3, User4: Skipped (no action)
- Success message: "Frozen 3 timesheets for Project X - Oct 6-12"
```

### Scenario 2: Management Bulk Freeze (Pending Timesheet)
```
Given: Project-week with 3 users
- User1: manager_approved (40 hours)
- User2: submitted (pending approval)
- User3: manager_approved (38 hours)

When: Management clicks "Bulk Freeze"

Then:
- Error: "Cannot freeze - User2's timesheet is still pending approval"
- No timesheets changed
```

### Scenario 3: Auto-Escalation Enabled
```
Given:
- Project has lead_approval_auto_escalates = true
- Employee submits timesheet

When: Lead approves timesheet

Then:
- Timesheet status changes directly to 'manager_approved'
- Manager does not need to review
- Management can now freeze
```

### Scenario 4: Auto-Escalation Disabled (Default)
```
Given:
- Project has lead_approval_auto_escalates = false (default)
- Employee submits timesheet

When: Lead approves timesheet

Then:
- Timesheet status remains 'submitted'
- Manager must explicitly approve
- Only then can Management freeze
```

---

## Success Criteria

1. ✅ Management can bulk freeze project-week timesheets when all are manager_approved
2. ✅ Management cannot freeze if any timesheet is pending
3. ✅ Manager can toggle auto-escalation setting per project
4. ✅ Lead approvals respect the auto-escalation setting
5. ✅ UI clearly shows approval status and workflow stage
6. ✅ All approval flows work correctly with new logic
7. ✅ No breaking changes to existing functionality

---

## Future Enhancements

1. **Notification System**: Notify users when timesheets are bulk frozen
2. **Audit Trail**: Log all bulk freeze operations
3. **Partial Freeze**: Allow freezing individual users within project-week
4. **Approval Deadlines**: Set deadlines for timesheet submissions
5. **Auto-Escalation by Project Type**: Different settings for different project types
