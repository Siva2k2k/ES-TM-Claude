# Timesheet Approval Hierarchy - Complete Implementation Plan

## Overview
This document defines the **CORRECT** 3-tier approval hierarchy for the timesheet system:
- **Tier 1**: Lead approves Employee timesheets
- **Tier 2**: Manager reviews Lead-approved + own timesheets
- **Tier 3**: Management verifies Manager-approved timesheets

---

## Requirement Analysis

### 1. Submission Flow
- **Employee/Lead/Manager** → Submit own timesheet for week on assigned projects/tasks
- Timesheet is **Project-Week based**: Team members listed with time entries per project

### 2. Lead Approval (Tier 1)
- **Lead** can review **Employee** timesheets within their project
- **Lead** can **Approve** or **Reject** employee timesheets
- **Lead** CANNOT approve Manager/Management timesheets
- Lead-approved timesheets → Move to Manager review

### 3. Manager Approval (Tier 2)
- **Manager** reviews:
  - **Lead-approved employee timesheets**
  - **Lead's own timesheets** (Lead submits as employee to Manager)
  - **Manager's own timesheets** (if multiple managers, or direct to Management)

- **Manager** has 2 options for Lead-approved timesheets:
  - **Option A**: Review and approve/reject each Lead-approved timesheet
  - **Option B**: Auto-escalate Lead-approved to Management (configurable setting)

- **Manager-approved timesheets** → Move to Management verification

### 4. Management Verification (Tier 3)
- **Management** verifies **Manager-approved** timesheets
- **Management** approves **Manager's own timesheets**
- On **Verify** → Timesheet status changes to **frozen**
- **Manager timesheets** are approved and escalated to **frozen** directly

### 5. Project-Week Views
- **Lead**: Sees project-week view with Employee timesheets (can approve/reject)
- **Manager**: Sees project-week view with Lead-approved + Lead's timesheets (can approve/reject)
- **Management**: Sees project-week view with Manager-approved timesheets (can verify/freeze)

---

## Status Flow Diagram

```
EMPLOYEE SUBMISSION:
━━━━━━━━━━━━━━━━━━
Employee → draft → submitted
                    ↓
           [Lead Reviews]
                    ↓
         ┌──────────┴──────────┐
         ↓                     ↓
    lead_approved       lead_rejected
         ↓                     ↓
   [Manager Reviews]      [Employee Fixes]
         ↓                     ↓
┌────────┴────────┐         draft
↓                 ↓
manager_approved  manager_rejected → [Employee Fixes] → draft
   ↓
[Management Reviews]
   ↓
frozen (verified)
   ↓
billed


LEAD SUBMISSION:
━━━━━━━━━━━━━━━━
Lead → draft → submitted → [Manager Reviews] → manager_approved → frozen


MANAGER SUBMISSION:
━━━━━━━━━━━━━━━━━━
Manager → draft → submitted → management_pending → [Management Reviews] → frozen
```

---

## Database Schema Updates

### 1. Timesheet Model - Status Enum
```typescript
export type TimesheetStatus =
  | 'draft'                // Creating/editing timesheet
  | 'submitted'            // Submitted, awaiting Lead/Manager review
  | 'lead_approved'        // Lead approved (Employee timesheets only)
  | 'lead_rejected'        // Lead rejected (Employee must fix)
  | 'manager_approved'     // Manager approved, awaiting Management verification
  | 'manager_rejected'     // Manager rejected
  | 'management_pending'   // Manager's own timesheet waiting for Management
  | 'management_rejected'  // Management rejected
  | 'frozen'               // Management verified and frozen
  | 'billed';              // Included in billing
```

### 2. TimesheetProjectApproval Model
```typescript
export interface ITimesheetProjectApproval extends Document {
  _id: mongoose.Types.ObjectId;
  timesheet_id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;

  // Lead Approval (Tier 1) - For Employee timesheets only
  lead_id?: mongoose.Types.ObjectId;
  lead_status: 'pending' | 'approved' | 'rejected' | 'not_required';
  lead_approved_at?: Date;
  lead_rejection_reason?: string;

  // Manager Approval (Tier 2) - For Lead-approved + Lead timesheets
  manager_id: mongoose.Types.ObjectId;
  manager_status: 'pending' | 'approved' | 'rejected';
  manager_approved_at?: Date;
  manager_rejection_reason?: string;

  // Management Verification (Tier 3) - For Manager-approved timesheets
  management_status: 'pending' | 'approved' | 'rejected';
  management_approved_at?: Date;
  management_rejection_reason?: string;

  // Metadata
  entries_count: number;
  total_hours: number;
  created_at: Date;
  updated_at: Date;
}
```

### 3. Project Approval Settings
```typescript
export interface IProjectApprovalSettings {
  // If true: Lead-approved timesheets skip Manager review and go directly to Management
  // If false (default): Manager must review Lead-approved timesheets
  lead_approval_auto_escalates: boolean;
}

// Added to Project model
approval_settings?: IProjectApprovalSettings;
```

---

## Implementation Steps

### Phase 1: Backend Model Updates

#### 1.1 Update Timesheet Model
**File**: `backend/src/models/Timesheet.ts`

```typescript
// Add new statuses to enum
export const TimesheetStatusEnum = [
  'draft',
  'submitted',
  'lead_approved',        // NEW
  'lead_rejected',        // NEW
  'manager_approved',
  'manager_rejected',
  'management_pending',
  'management_rejected',
  'frozen',
  'billed'
] as const;

export type TimesheetStatus = typeof TimesheetStatusEnum[number];
```

#### 1.2 Update TimesheetProjectApproval Model
**File**: `backend/src/models/TimesheetProjectApproval.ts`

```typescript
// Add management_status field
const TimesheetProjectApprovalSchema = new Schema({
  // ... existing fields ...

  // NEW: Management verification (Tier 3)
  management_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  management_approved_at: {
    type: Date,
    required: false
  },
  management_rejection_reason: {
    type: String,
    required: false
  }
});
```

---

### Phase 2: Backend Service Logic

#### 2.1 Update TeamReviewApprovalService

**File**: `backend/src/services/TeamReviewApprovalService.ts`

**Key Changes**:

1. **Lead Approval Logic**:
```typescript
static async approveTimesheetForProject(
  timesheetId: string,
  projectId: string,
  approverId: string,
  approverRole: string
): Promise<ApprovalResponse> {
  // ... existing code ...

  if (approverRole === 'lead') {
    // Check: Lead can only approve Employee timesheets
    const timesheetUser = await User.findById(timesheet.user_id);
    if (timesheetUser.role !== 'employee') {
      throw new Error('Lead can only approve Employee timesheets');
    }

    // Mark lead approval
    projectApproval.lead_status = 'approved';
    projectApproval.lead_approved_at = new Date();
    await projectApproval.save();

    // Check project settings
    const project = await Project.findById(projectId);
    const autoEscalate = project.approval_settings?.lead_approval_auto_escalates || false;

    // Check if ALL project leads have approved
    const allLeadsApproved = await this.checkAllLeadsApproved(timesheetId);

    if (allLeadsApproved) {
      if (autoEscalate) {
        // Skip manager review, go directly to management
        timesheet.status = 'manager_approved';
        // Auto-mark manager approval
        projectApproval.manager_status = 'approved';
        projectApproval.manager_approved_at = new Date();
      } else {
        // Move to manager review
        timesheet.status = 'lead_approved';
      }
      await timesheet.save();
    }
  }

  else if (approverRole === 'manager') {
    // Manager approves Lead-approved or Lead's timesheets
    if (timesheet.status === 'submitted' || timesheet.status === 'lead_approved') {
      projectApproval.manager_status = 'approved';
      projectApproval.manager_approved_at = new Date();
      await projectApproval.save();

      // Check if ALL managers have approved
      const allManagersApproved = await this.checkAllManagersApproved(timesheetId);

      if (allManagersApproved) {
        timesheet.status = 'manager_approved';
        await timesheet.save();
      }
    }
  }

  else if (approverRole === 'management') {
    // Management verifies Manager-approved timesheets
    if (timesheet.status === 'manager_approved' || timesheet.status === 'management_pending') {
      projectApproval.management_status = 'approved';
      projectApproval.management_approved_at = new Date();
      await projectApproval.save();

      // Freeze timesheet
      timesheet.status = 'frozen';
      timesheet.is_frozen = true;
      timesheet.verified_by_id = approverId;
      timesheet.verified_at = new Date();
      await timesheet.save();
    }
  }
}
```

2. **Lead Rejection Logic**:
```typescript
static async rejectTimesheetForProject(
  timesheetId: string,
  projectId: string,
  approverId: string,
  approverRole: string,
  reason: string
): Promise<ApprovalResponse> {
  // ... existing code ...

  if (approverRole === 'lead') {
    projectApproval.lead_status = 'rejected';
    projectApproval.lead_rejection_reason = reason;
    await projectApproval.save();

    // Reset ALL approvals for this timesheet
    await this.resetAllApprovals(timesheetId);

    // Set timesheet to lead_rejected
    timesheet.status = 'lead_rejected';
    await timesheet.save();
  }

  else if (approverRole === 'manager') {
    projectApproval.manager_status = 'rejected';
    projectApproval.manager_rejection_reason = reason;
    await projectApproval.save();

    // Reset ALL approvals
    await this.resetAllApprovals(timesheetId);

    // Set timesheet to manager_rejected
    timesheet.status = 'manager_rejected';
    await timesheet.save();
  }

  else if (approverRole === 'management') {
    projectApproval.management_status = 'rejected';
    projectApproval.management_rejection_reason = reason;
    await projectApproval.save();

    // Reset ALL approvals
    await this.resetAllApprovals(timesheetId);

    // Set timesheet to management_rejected
    timesheet.status = 'management_rejected';
    await timesheet.save();
  }
}
```

#### 2.2 Update TeamReviewServiceV2 - Project-Week Views

**File**: `backend/src/services/TeamReviewServiceV2.ts`

**Key Changes**:

1. **Lead View** - Filter by Lead projects, show Employee timesheets:
```typescript
static async getProjectWeekGroupsForLead(
  leadId: string,
  filters: ProjectWeekFilters
): Promise<ProjectWeekResponse> {
  // Find projects where user is Lead
  const leadProjects = await ProjectMember.find({
    user_id: leadId,
    project_role: 'lead',
    deleted_at: null
  });

  const projectIds = leadProjects.map(pm => pm.project_id);

  // Get timesheets for these projects where user is Employee
  const timesheets = await Timesheet.find({
    week_start_date: { $gte: weekStart, $lte: weekEnd },
    deleted_at: null,
    status: { $in: ['submitted', 'lead_approved', 'lead_rejected'] }
  }).populate('user_id');

  // Filter: Only Employee timesheets
  const employeeTimesheets = timesheets.filter(ts =>
    ts.user_id.role === 'employee'
  );

  // Group by project-week
  // ...
}
```

2. **Manager View** - Show Lead-approved + Lead timesheets:
```typescript
static async getProjectWeekGroupsForManager(
  managerId: string,
  filters: ProjectWeekFilters
): Promise<ProjectWeekResponse> {
  // Find projects where user is Manager
  const managerProjects = await ProjectMember.find({
    user_id: managerId,
    project_role: 'manager',
    deleted_at: null
  });

  const projectIds = managerProjects.map(pm => pm.project_id);

  // Get timesheets for these projects
  const timesheets = await Timesheet.find({
    week_start_date: { $gte: weekStart, $lte: weekEnd },
    deleted_at: null,
    status: { $in: ['lead_approved', 'submitted', 'manager_approved', 'manager_rejected'] }
  }).populate('user_id');

  // Filter: Lead-approved Employee timesheets + Lead's own timesheets
  const relevantTimesheets = timesheets.filter(ts => {
    const isLeadApproved = ts.status === 'lead_approved' && ts.user_id.role === 'employee';
    const isLeadTimesheet = ts.user_id.role === 'lead';
    return isLeadApproved || isLeadTimesheet;
  });

  // Group by project-week
  // ...
}
```

3. **Management View** - Show Manager-approved timesheets:
```typescript
static async getProjectWeekGroupsForManagement(
  filters: ProjectWeekFilters
): Promise<ProjectWeekResponse> {
  // Get ALL manager-approved timesheets across all projects
  const timesheets = await Timesheet.find({
    week_start_date: { $gte: weekStart, $lte: weekEnd },
    deleted_at: null,
    status: { $in: ['manager_approved', 'management_pending', 'frozen'] }
  }).populate('user_id');

  // Group by project-week
  // ...
}
```

---

### Phase 3: Frontend Updates

#### 3.1 Update Frontend Types

**File**: `frontend/src/types/index.ts`

```typescript
// Update TimesheetStatus enum
export type TimesheetStatus =
  | 'draft'
  | 'submitted'
  | 'lead_approved'        // NEW
  | 'lead_rejected'        // NEW
  | 'manager_approved'
  | 'manager_rejected'
  | 'management_pending'
  | 'management_rejected'
  | 'frozen'
  | 'billed';
```

**File**: `frontend/src/types/timesheetApprovals.ts`

```typescript
// Update ProjectWeekUser to show approval tier
export interface ProjectWeekUser {
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  project_role: string;
  timesheet_id: string;
  timesheet_status: TimesheetStatus;
  total_hours_for_project: number;
  entries: TimeEntryDetail[];

  // Approval status per tier
  lead_approval_status: 'pending' | 'approved' | 'rejected' | 'not_required';
  manager_approval_status: 'pending' | 'approved' | 'rejected';
  management_approval_status: 'pending' | 'approved' | 'rejected';

  // Rejection reasons
  lead_rejection_reason?: string;
  manager_rejection_reason?: string;
  management_rejection_reason?: string;
}
```

#### 3.2 Update TeamReviewPageV2 Component

**File**: `frontend/src/pages/team-review/TeamReviewPageV2.tsx`

**Key Changes**:

1. **Role-Based Views**:
```typescript
const TeamReviewPageV2: React.FC = () => {
  const { user } = useAuth();
  const [projectWeeks, setProjectWeeks] = useState<ProjectWeekGroup[]>([]);
  const [filters, setFilters] = useState<ProjectWeekFilters>({
    status: 'pending'
  });

  // Determine user's approval role
  const approvalRole = user?.role === 'lead' ? 'lead'
                     : user?.role === 'manager' ? 'manager'
                     : user?.role === 'management' ? 'management'
                     : null;

  // Fetch project-weeks based on role
  const loadProjectWeeks = async () => {
    if (!approvalRole) return;

    try {
      const result = await TeamReviewService.getProjectWeekGroups(filters);
      setProjectWeeks(result.project_weeks);
    } catch (error) {
      console.error('Error loading project-weeks:', error);
    }
  };

  // Approve project-week (all users)
  const handleApproveProjectWeek = async (projectWeek: ProjectWeekGroup) => {
    if (!approvalRole) return;

    try {
      const result = await TeamReviewService.approveProjectWeek(
        projectWeek.project_id,
        projectWeek.week_start,
        projectWeek.week_end
      );

      if (result.success) {
        toast.success(result.message);
        await loadProjectWeeks();
      }
    } catch (error) {
      toast.error('Failed to approve project-week');
    }
  };

  // ... similar for reject, freeze, etc.

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {approvalRole === 'lead' && 'Lead - Team Review'}
          {approvalRole === 'manager' && 'Manager - Team Review'}
          {approvalRole === 'management' && 'Management - Verification'}
        </h1>
        <p className="text-gray-600 mt-2">
          {approvalRole === 'lead' && 'Review and approve employee timesheets'}
          {approvalRole === 'manager' && 'Review lead-approved and lead timesheets'}
          {approvalRole === 'management' && 'Verify and freeze manager-approved timesheets'}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        {/* ... filter UI ... */}
      </div>

      {/* Project-Week Cards */}
      <div className="space-y-4">
        {projectWeeks.map(projectWeek => (
          <ProjectWeekCard
            key={`${projectWeek.project_id}-${projectWeek.week_start}`}
            projectWeek={projectWeek}
            onApprove={handleApproveProjectWeek}
            onReject={handleRejectProjectWeek}
            canApprove={true}
            approvalRole={approvalRole}
          />
        ))}
      </div>
    </div>
  );
};
```

2. **ProjectWeekCard Updates**:
```typescript
export const ProjectWeekCard: React.FC<ProjectWeekCardProps> = ({
  projectWeek,
  onApprove,
  onReject,
  approvalRole,
  canApprove
}) => {
  // Determine button labels based on role
  const approveButtonLabel = approvalRole === 'lead' ? 'Approve All (Lead)'
                           : approvalRole === 'manager' ? 'Approve All (Manager)'
                           : approvalRole === 'management' ? 'Verify & Freeze All'
                           : 'Approve All';

  // Determine if can approve based on status
  const canApproveNow = approvalRole === 'lead'
    ? projectWeek.users.some(u => u.timesheet_status === 'submitted' && u.user_role === 'employee')
    : approvalRole === 'manager'
    ? projectWeek.users.some(u =>
        u.timesheet_status === 'lead_approved' ||
        (u.timesheet_status === 'submitted' && u.user_role === 'lead')
      )
    : approvalRole === 'management'
    ? projectWeek.users.some(u => u.timesheet_status === 'manager_approved')
    : false;

  return (
    <div className="project-week-card">
      {/* ... card UI ... */}

      {canApproveNow && (
        <div className="actions">
          <button onClick={() => onApprove(projectWeek)}>
            {approveButtonLabel}
          </button>
          <button onClick={() => onReject(projectWeek)}>
            Reject All
          </button>
        </div>
      )}

      {/* User list with approval status per tier */}
      {projectWeek.users.map(user => (
        <div key={user.user_id} className="user-row">
          <span>{user.user_name}</span>
          <span>{user.total_hours_for_project}h</span>

          {/* Show approval status based on role */}
          {approvalRole === 'lead' && (
            <span className={`badge ${user.lead_approval_status}`}>
              Lead: {user.lead_approval_status}
            </span>
          )}
          {approvalRole === 'manager' && (
            <>
              <span className={`badge ${user.lead_approval_status}`}>
                Lead: {user.lead_approval_status}
              </span>
              <span className={`badge ${user.manager_approval_status}`}>
                Manager: {user.manager_approval_status}
              </span>
            </>
          )}
          {approvalRole === 'management' && (
            <>
              <span className={`badge ${user.manager_approval_status}`}>
                Manager: {user.manager_approval_status}
              </span>
              <span className={`badge ${user.management_approval_status}`}>
                Management: {user.management_approval_status}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

## Testing Scenarios

### Scenario 1: Employee → Lead → Manager → Management (Standard Flow)

**Setup**:
- Employee: Alice (role: employee)
- Lead: Bob (role: lead)
- Manager: Charlie (role: manager)
- Management: Diana (role: management)
- Project: "Website Redesign"
- Week: Oct 16-22, 2025

**Flow**:
1. **Alice submits** 40 hours for Website Redesign
   - Status: `draft` → `submitted`

2. **Bob (Lead) reviews** Alice's timesheet in Team Review page
   - Sees Alice's timesheet in "Pending Lead Approval"
   - Approves Alice's timesheet
   - Status: `submitted` → `lead_approved`

3. **Charlie (Manager) reviews** in Team Review page
   - Sees Alice's timesheet in "Lead Approved - Pending Manager Review"
   - Approves Alice's timesheet
   - Status: `lead_approved` → `manager_approved`

4. **Diana (Management) verifies** in Verification page
   - Sees Alice's timesheet in "Manager Approved - Pending Verification"
   - Clicks "Verify & Freeze"
   - Status: `manager_approved` → `frozen`

**Expected Result**: ✅ Alice's timesheet is frozen and ready for billing

---

### Scenario 2: Lead Submission → Manager → Management

**Setup**:
- Lead: Bob (role: lead)
- Manager: Charlie (role: manager)
- Management: Diana (role: management)

**Flow**:
1. **Bob (Lead) submits** own timesheet
   - Status: `draft` → `submitted`

2. **Charlie (Manager) reviews** Bob's timesheet
   - Sees Bob's timesheet in "Pending Manager Approval"
   - Approves Bob's timesheet
   - Status: `submitted` → `manager_approved`

3. **Diana (Management) verifies**
   - Sees Bob's timesheet in "Manager Approved"
   - Verifies and freezes
   - Status: `manager_approved` → `frozen`

**Expected Result**: ✅ Bob's timesheet bypasses Lead review and goes straight to Manager

---

### Scenario 3: Manager Submission → Management

**Setup**:
- Manager: Charlie (role: manager)
- Management: Diana (role: management)

**Flow**:
1. **Charlie (Manager) submits** own timesheet
   - Status: `draft` → `management_pending`

2. **Diana (Management) reviews** Charlie's timesheet
   - Sees Charlie's timesheet in "Pending Management Approval"
   - Verifies and freezes
   - Status: `management_pending` → `frozen`

**Expected Result**: ✅ Charlie's timesheet bypasses Lead and Manager review

---

### Scenario 4: Auto-Escalation Setting (Lead → Management)

**Setup**:
- Project: "Website Redesign"
- Setting: `lead_approval_auto_escalates = true`
- Employee: Alice
- Lead: Bob
- Management: Diana

**Flow**:
1. **Alice submits** timesheet
   - Status: `draft` → `submitted`

2. **Bob (Lead) approves** Alice's timesheet
   - Auto-escalation enabled
   - Status: `submitted` → `lead_approved` → `manager_approved` (auto)

3. **Diana (Management) verifies**
   - Sees Alice's timesheet already in "Manager Approved"
   - Verifies and freezes
   - Status: `manager_approved` → `frozen`

**Expected Result**: ✅ Alice's timesheet skips Manager review due to auto-escalation

---

### Scenario 5: Lead Rejection

**Setup**:
- Employee: Alice
- Lead: Bob

**Flow**:
1. **Alice submits** timesheet (40 hours, but some entries have issues)
   - Status: `draft` → `submitted`

2. **Bob (Lead) rejects** with reason: "Please add more details to Friday's entries"
   - Status: `submitted` → `lead_rejected`

3. **Alice fixes** the timesheet and resubmits
   - Status: `lead_rejected` → `draft` → `submitted`

4. **Bob approves** fixed timesheet
   - Status: `submitted` → `lead_approved`

**Expected Result**: ✅ Alice can fix and resubmit after Lead rejection

---

## API Endpoints Summary

### Lead Endpoints
```typescript
GET  /api/v1/team-review/project-weeks?role=lead
POST /api/v1/team-review/project-week/approve  // Lead approves all employees
POST /api/v1/team-review/project-week/reject   // Lead rejects employees
POST /api/v1/timesheets/:id/approve             // Lead approves single employee
POST /api/v1/timesheets/:id/reject              // Lead rejects single employee
```

### Manager Endpoints
```typescript
GET  /api/v1/team-review/project-weeks?role=manager
POST /api/v1/team-review/project-week/approve  // Manager approves lead-approved
POST /api/v1/team-review/project-week/reject   // Manager rejects
POST /api/v1/timesheets/:id/approve             // Manager approves single
POST /api/v1/timesheets/:id/reject              // Manager rejects single
```

### Management Endpoints
```typescript
GET  /api/v1/team-review/project-weeks?role=management
POST /api/v1/team-review/project-week/freeze   // Management freezes manager-approved
POST /api/v1/team-review/project-week/verify   // Management verifies all
POST /api/v1/team-review/project-week/reject   // Management rejects
```

---

## Success Criteria

✅ **Lead Approval**:
- Lead can see Employee timesheets in project-week view
- Lead can approve/reject Employee timesheets
- Lead-approved timesheets move to Manager review

✅ **Manager Approval**:
- Manager can see Lead-approved + Lead's timesheets
- Manager can approve/reject each timesheet
- Manager-approved timesheets move to Management verification
- Auto-escalation setting works (Lead → Management directly)

✅ **Management Verification**:
- Management can see Manager-approved timesheets
- Management can verify and freeze all timesheets in project-week
- Management can approve Manager's own timesheets directly

✅ **UI/UX**:
- Role-based views show correct timesheets
- Approval status clearly displayed per tier
- Action buttons labeled appropriately per role
- Rejection reasons captured and displayed

✅ **Project-Week Views**:
- Lead sees project-week cards with Employee timesheets
- Manager sees project-week cards with Lead-approved + Lead timesheets
- Management sees project-week cards with Manager-approved timesheets

---

## Migration Script

```typescript
// Migrate existing timesheets to new status structure
db.timesheets.updateMany(
  { status: 'submitted' },
  { $set: { status: 'submitted' } } // Remains same, but now can go to lead_approved
);

// Add management_status to all project approvals
db.timesheetprojectapprovals.updateMany(
  { management_status: { $exists: false } },
  {
    $set: {
      management_status: 'pending',
      management_approved_at: null,
      management_rejection_reason: null
    }
  }
);

// Add approval_settings to all projects
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

---

## Notes

1. **Role Hierarchy**:
   - Employee < Lead < Manager < Management < Super Admin

2. **Approval Authority**:
   - Lead: Can only approve Employee timesheets
   - Manager: Can approve Lead-approved Employee + Lead timesheets
   - Management: Can verify Manager-approved timesheets + Manager's own

3. **Rejection Behavior**:
   - ANY rejection resets ALL approvals
   - Employee must fix and resubmit from draft

4. **Auto-Escalation**:
   - Configurable per project
   - When enabled: Lead approval → Manager approved (auto) → Management verification
   - Default: Disabled (Manager must explicitly review)

5. **Status Transitions**:
   - Always forward-moving (except rejections which reset to draft/rejected)
   - Frozen timesheets cannot be modified
   - Billed timesheets are final

---

## Implementation Checklist

- [ ] Update Timesheet model with new status enum
- [ ] Update TimesheetProjectApproval model with management fields
- [ ] Update Project model with approval_settings
- [ ] Implement Lead approval logic in TeamReviewApprovalService
- [ ] Implement Manager approval logic with auto-escalation check
- [ ] Implement Management verification logic
- [ ] Update TeamReviewServiceV2 with role-based filtering
- [ ] Update Frontend types (TimesheetStatus, ProjectWeekUser)
- [ ] Update TeamReviewPageV2 with role-based views
- [ ] Update ProjectWeekCard to show tier-based approval status
- [ ] Add Lead approval UI components
- [ ] Add Manager approval UI with escalation indicator
- [ ] Add Management verification UI
- [ ] Write migration scripts
- [ ] Test all scenarios (Lead, Manager, Management flows)
- [ ] Test auto-escalation setting
- [ ] Test rejection and resubmission flows
- [ ] Document API endpoints
- [ ] Update user guide with new approval hierarchy

---

This is the **CORRECT** and **COMPLETE** implementation plan matching your exact requirements!
