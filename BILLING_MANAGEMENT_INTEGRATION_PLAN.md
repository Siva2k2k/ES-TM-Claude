# Billing Management Integration with Team Review Verification

## Overview
**Requirement**: After Management verifies a Project-week group in Team Review, the data (worked hours, adjustments, and billable hours) should be automatically fetched and populated in the Billing Management Project View. Management can then make additional adjustments if needed.

**Current Date**: October 23, 2025

---

## Current Architecture Analysis

### 1. Team Review Approval Flow (Tier 3 - Management)
**File**: `backend/src/services/TeamReviewApprovalService.ts`

When Management approves a project-week timesheet:
```typescript
// Lines 262-263
projectApproval.management_status = 'approved';
projectApproval.management_approved_at = new Date();

// Lines 290-294
timesheet.status = 'frozen';
timesheet.is_frozen = true;
timesheet.verified_by_id = approverId;
timesheet.verified_at = new Date();
timesheet.approved_by_management_id = approverId;
```

**Data Available in `TimesheetProjectApproval` Model**:
- `worked_hours`: Sum of hours from billable entries
- `billable_hours`: worked_hours + billable_adjustment
- `billable_adjustment`: Manager adjustment (+/-)
- `management_status`: 'approved' | 'rejected' | 'pending' | 'not_required'
- `management_approved_at`: Timestamp when Management verified

### 2. Billing Management Current Implementation
**File**: `frontend/src/pages/billing/ProjectBillingPage.tsx`

**Current Data Source**: `ProjectBillingController.getProjectBillingView()`
- Uses `BILLING_ELIGIBLE_STATUSES`: ['lead_approved', 'manager_approved', 'management_pending', 'management_approved', 'frozen', 'billed']
- Aggregates TimeEntry data with BillingAdjustment overrides
- Does NOT currently use `TimesheetProjectApproval` data

**Current Adjustment Flow**:
- Management can adjust individual user billable hours
- Management can adjust total project billable hours
- Adjustments stored in `BillingAdjustment` model

### 3. Data Models Involved

#### TimesheetProjectApproval (Source of Truth after Verification)
```typescript
{
  timesheet_id: ObjectId,
  project_id: ObjectId,
  worked_hours: number,        // Actual hours worked
  billable_hours: number,       // worked_hours + billable_adjustment
  billable_adjustment: number,  // Manager's adjustment in Team Review
  management_status: 'approved' | 'rejected' | 'pending' | 'not_required',
  management_approved_at: Date
}
```

#### BillingAdjustment (Current Billing Management Adjustments)
```typescript
{
  user_id: ObjectId,
  project_id?: ObjectId,
  task_id?: ObjectId,
  adjustment_hours: number,
  total_worked_hours: number,
  total_billable_hours: number,
  reason: string,
  adjusted_by: ObjectId,
  date_range: { start: Date, end: Date }
}
```

#### TimeEntry (Raw Time Data)
```typescript
{
  user_id: ObjectId,
  project_id: ObjectId,
  task_id: ObjectId,
  hours: number,
  is_billable: boolean,
  billable_hours?: number,  // Management override
  date: Date
}
```

---

## Gap Analysis

### Current Issues:
1. **Data Disconnect**: Billing Management doesn't use the verified data from Team Review
2. **Double Adjustment**: Manager adjusts in Team Review, then Management adjusts again in Billing
3. **No Visibility**: Billing view doesn't show Team Review adjustments
4. **Data Inconsistency**: Two sources of truth for billable hours

### Missing Features:
1. Team Review verified data not imported into Billing
2. No indication in Billing UI which projects are verified
3. No display of Manager's original adjustments
4. No audit trail connecting Team Review → Billing

---

## Proposed Solution

### Architecture: Single Source of Truth Flow

```
┌─────────────────────┐
│  Team Review V2     │
│  (Management Tier)  │
└──────────┬──────────┘
           │
           │ Verifies Project-Week
           │ Updates: worked_hours, billable_hours, billable_adjustment
           │ Sets: management_status = 'approved', timesheet.status = 'frozen'
           │
           ▼
┌─────────────────────────────────────┐
│  TimesheetProjectApproval           │
│  ✓ worked_hours                     │
│  ✓ billable_hours                   │
│  ✓ billable_adjustment (Manager)    │
│  ✓ management_status = 'approved'   │
│  ✓ management_approved_at           │
└──────────┬──────────────────────────┘
           │
           │ Automatically synced to Billing
           │
           ▼
┌─────────────────────────────────────┐
│  Billing Management                 │
│  Project View                        │
│                                      │
│  Display:                            │
│  - Worked Hours (from verification)  │
│  - Manager Adjustment (from TR)      │
│  - Billable Hours (calculated)       │
│  - Verification Status & Timestamp   │
│                                      │
│  Allow:                              │
│  - Additional Management Adjustment  │
│  - Override billable hours           │
│  - Add adjustment reason             │
└──────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Backend - Data Integration Layer

#### 1.1 Update ProjectBillingController
**File**: `backend/src/controllers/ProjectBillingController.ts`

**Changes**:
```typescript
// Add new method to fetch verified data from TimesheetProjectApproval
async getVerifiedProjectData(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<VerifiedBillingData[]>

// Modify getProjectBillingView to:
// 1. Query TimesheetProjectApproval for management_status = 'approved'
// 2. Include worked_hours, billable_hours, billable_adjustment
// 3. Merge with existing TimeEntry aggregation
// 4. Show both "Team Review Verified" and "Final Billable" amounts
```

**New Response Structure**:
```typescript
interface ProjectBillingResource {
  user_id: string;
  user_name: string;
  role: string;
  
  // NEW: Team Review Verified Data
  verified_worked_hours?: number;
  verified_billable_hours?: number;
  manager_adjustment?: number;  // From Team Review
  verified_at?: string;
  
  // Existing: Aggregated from TimeEntry
  total_hours: number;
  billable_hours: number;
  
  // NEW: Final billable (includes Billing Management adjustments)
  final_billable_hours: number;
  billing_adjustment?: number;  // From Billing Management
  
  hourly_rate: number;
  total_amount: number;
}
```

#### 1.2 Create Sync Service
**New File**: `backend/src/services/BillingVerificationSyncService.ts`

```typescript
export class BillingVerificationSyncService {
  /**
   * Sync verified data from TimesheetProjectApproval to Billing view
   */
  static async syncVerifiedData(
    projectId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<SyncResult>
  
  /**
   * Get verification status for projects in date range
   */
  static async getVerificationStatus(
    projectIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, VerificationInfo>>
}

interface VerificationInfo {
  is_verified: boolean;
  verified_at?: Date;
  verified_by?: string;
  worked_hours: number;
  billable_hours: number;
  manager_adjustment: number;
  user_count: number;
}
```

#### 1.3 Add New API Endpoints
**File**: `backend/src/routes/projectBilling.ts`

```typescript
// GET /api/v1/project-billing/verification-status
// Returns verification status for projects in date range
router.get('/verification-status', 
  verificationStatusValidation, 
  ProjectBillingController.getVerificationStatus
);

// POST /api/v1/project-billing/sync-verified
// Manually trigger sync of verified data
router.post('/sync-verified', 
  syncVerifiedDataValidation, 
  ProjectBillingController.syncVerifiedData
);

// GET /api/v1/project-billing/projects/:projectId/verified
// Get verified data for specific project-week
router.get('/projects/:projectId/verified', 
  getVerifiedDataValidation, 
  ProjectBillingController.getVerifiedProjectData
);
```

---

### Phase 2: Frontend - UI Enhancement

#### 2.1 Update ProjectBillingTable Component
**File**: `frontend/src/pages/billing/components/ProjectBillingTable.tsx`

**New Features**:
1. **Verification Badge**: Show badge for verified projects
2. **Expandable Details**: Show breakdown of hours
3. **Adjustment History**: Display Manager adjustments from Team Review

**UI Structure**:
```tsx
<ProjectRow>
  <ProjectName>
    TimesheetChecker
    {isVerified && <Badge>✓ Verified Oct 19</Badge>}
  </ProjectName>
  
  <HoursBreakdown>
    <WorkedHours>128.0h</WorkedHours>
    {managerAdjustment && <Adjustment>+4.0h</Adjustment>}
    <VerifiedBillable>132.0h</VerifiedBillable>
    {billingAdjustment && <BillingAdjustment>+2.0h</BillingAdjustment>}
    <FinalBillable className="font-bold">134.0h</FinalBillable>
  </HoursBreakdown>
  
  <Actions>
    <ViewDetailsButton />
    <AdjustButton />
  </Actions>
</ProjectRow>

{expanded && (
  <UserBreakdown>
    {resources.map(user => (
      <UserRow>
        <UserName>{user.user_name}</UserName>
        <Worked>{user.verified_worked_hours}h</Worked>
        <ManagerAdj>{user.manager_adjustment > 0 ? `+${user.manager_adjustment}h` : ''}</ManagerAdj>
        <Verified>{user.verified_billable_hours}h</Verified>
        <BillingAdj>{user.billing_adjustment > 0 ? `+${user.billing_adjustment}h` : ''}</BillingAdj>
        <Final>{user.final_billable_hours}h</Final>
        <Amount>${user.total_amount}</Amount>
      </UserRow>
    ))}
  </UserBreakdown>
)}
```

#### 2.2 Create Verification Status Indicator
**New Component**: `frontend/src/components/billing/VerificationStatusBadge.tsx`

```tsx
interface VerificationStatusBadgeProps {
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  workedHours: number;
  billableHours: number;
  managerAdjustment: number;
}

export function VerificationStatusBadge({ ... }) {
  return (
    <Tooltip content={
      <div>
        <p>Verified by {verifiedBy}</p>
        <p>{new Date(verifiedAt).toLocaleDateString()}</p>
        <p>Worked: {workedHours}h</p>
        <p>Adjustment: {managerAdjustment > 0 ? '+' : ''}{managerAdjustment}h</p>
        <p>Billable: {billableHours}h</p>
      </div>
    }>
      <Badge variant="success">
        <CheckCircle className="w-3 h-3" />
        Verified
      </Badge>
    </Tooltip>
  );
}
```

#### 2.3 Enhanced Adjustment Dialog
**Update**: `frontend/src/pages/billing/components/BillingEditHoursDialog.tsx`

**New Props**:
```tsx
interface BillingEditHoursDialogProps {
  // ... existing props
  verifiedHours?: number;
  managerAdjustment?: number;
  verifiedAt?: string;
  showVerificationInfo?: boolean;
}
```

**UI Enhancement**:
```tsx
<Dialog>
  <DialogTitle>Adjust Billable Hours - {projectName}</DialogTitle>
  
  {showVerificationInfo && (
    <VerificationSummary>
      <Label>Team Review Verification</Label>
      <InfoRow>
        <Span>Worked Hours:</Span>
        <Value>{workedHours}h</Value>
      </InfoRow>
      <InfoRow>
        <Span>Manager Adjustment:</Span>
        <Value className="text-blue-600">
          {managerAdjustment > 0 ? '+' : ''}{managerAdjustment}h
        </Value>
      </InfoRow>
      <InfoRow>
        <Span>Verified Billable:</Span>
        <Value className="font-semibold">{verifiedHours}h</Value>
      </InfoRow>
      <Divider />
    </VerificationSummary>
  )}
  
  <Label>Additional Management Adjustment</Label>
  <Input
    type="number"
    value={additionalAdjustment}
    onChange={...}
  />
  
  <Summary>
    <Row>
      <Span>Verified Billable:</Span>
      <Value>{verifiedHours}h</Value>
    </Row>
    <Row>
      <Span>Your Adjustment:</Span>
      <Value>{additionalAdjustment > 0 ? '+' : ''}{additionalAdjustment}h</Value>
    </Row>
    <Divider />
    <Row className="font-bold">
      <Span>Final Billable:</Span>
      <Value>{verifiedHours + additionalAdjustment}h</Value>
    </Row>
  </Summary>
  
  <TextArea
    label="Adjustment Reason (Required)"
    value={reason}
    onChange={...}
  />
</Dialog>
```

#### 2.4 Update BillingService
**File**: `frontend/src/services/BillingService.ts`

**New Methods**:
```typescript
/**
 * Get verification status for projects
 */
static async getVerificationStatus(
  projectIds: string[],
  startDate: string,
  endDate: string
): Promise<{ data?: Map<string, VerificationInfo>; error?: string }>

/**
 * Sync verified data from Team Review
 */
static async syncVerifiedData(
  projectId: string,
  weekStart: string,
  weekEnd: string
): Promise<{ success: boolean; error?: string }>

/**
 * Get verified project data
 */
static async getVerifiedProjectData(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<{ data?: VerifiedBillingData[]; error?: string }>
```

---

### Phase 3: Data Migration & Sync

#### 3.1 Historical Data Sync Script
**New File**: `backend/scripts/sync-verified-billing-data.ts`

```typescript
/**
 * One-time migration script to sync existing verified data
 * from TimesheetProjectApproval to Billing view
 */
async function syncHistoricalVerifiedData() {
  // 1. Find all TimesheetProjectApprovals with management_status = 'approved'
  // 2. For each approval:
  //    - Get project_id, timesheet_id
  //    - Extract worked_hours, billable_hours, billable_adjustment
  //    - Create/update BillingAdjustment record if adjustment exists
  //    - Mark as "synced from Team Review verification"
  // 3. Generate sync report
}
```

#### 3.2 Automatic Sync on Verification
**Update**: `backend/src/services/TeamReviewApprovalService.ts`

```typescript
// After Management approves (line 263)
projectApproval.management_approved_at = new Date();

// ADD: Trigger billing sync
await BillingVerificationSyncService.syncVerifiedData(
  projectId.toString(),
  timesheet.week_start_date,
  timesheet.week_end_date
);
```

---

### Phase 4: Type Definitions

#### 4.1 Frontend Types
**Update**: `frontend/src/types/billing.ts`

```typescript
export interface VerificationInfo {
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  verified_by_name?: string;
  worked_hours: number;
  billable_hours: number;
  manager_adjustment: number;
  user_count: number;
}

export interface ProjectBillingResource {
  user_id: string;
  user_name: string;
  role: string;
  
  // Team Review Verified Data
  verified_worked_hours?: number;
  verified_billable_hours?: number;
  manager_adjustment?: number;
  verified_at?: string;
  
  // Aggregated Time Entry Data
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  
  // Final Billable (includes Billing adjustments)
  final_billable_hours: number;
  billing_adjustment?: number;
  billing_adjustment_reason?: string;
  
  hourly_rate: number;
  total_amount: number;
  
  weekly_breakdown?: Array<{
    week_start: string;
    total_hours: number;
    billable_hours: number;
    amount: number;
  }>;
  tasks?: ProjectBillingResourceTask[];
}

export interface ProjectBillingRecord {
  project_id: string;
  project_name: string;
  client_name?: string;
  
  // Verification info
  verification_info?: VerificationInfo;
  
  // Aggregated totals
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  total_amount: number;
  
  // Resources breakdown
  resources: ProjectBillingResource[];
}
```

#### 4.2 Backend Types
**New File**: `backend/src/types/billingVerification.ts`

```typescript
export interface VerifiedBillingData {
  project_id: string;
  project_name: string;
  week_start: Date;
  week_end: Date;
  users: VerifiedUserBilling[];
  verification_info: VerificationInfo;
}

export interface VerifiedUserBilling {
  user_id: string;
  user_name: string;
  worked_hours: number;
  manager_adjustment: number;
  billable_hours: number;
  verified_at: Date;
}

export interface SyncResult {
  success: boolean;
  synced_count: number;
  errors: string[];
  project_id: string;
  week_label: string;
}
```

---

## Implementation Steps (Priority Order)

### Sprint 1: Backend Foundation (5-7 days)
1. ✅ **Day 1-2**: Create `BillingVerificationSyncService`
2. ✅ **Day 2-3**: Update `ProjectBillingController` to include verified data
3. ✅ **Day 3-4**: Add new API endpoints
4. ✅ **Day 4-5**: Update types and validation
5. ✅ **Day 5-6**: Write unit tests
6. ✅ **Day 6-7**: Integration testing

### Sprint 2: Frontend UI (5-7 days)
1. ✅ **Day 1-2**: Update `ProjectBillingResource` type and data fetching
2. ✅ **Day 2-3**: Create `VerificationStatusBadge` component
3. ✅ **Day 3-4**: Update `ProjectBillingTable` with verified data display
4. ✅ **Day 4-5**: Enhance `BillingEditHoursDialog` with verification info
5. ✅ **Day 5-6**: Update `BillingService` with new methods
6. ✅ **Day 6-7**: UI testing and refinement

### Sprint 3: Integration & Sync (3-5 days)
1. ✅ **Day 1-2**: Create historical data sync script
2. ✅ **Day 2-3**: Add automatic sync trigger in Team Review approval
3. ✅ **Day 3-4**: End-to-end testing
4. ✅ **Day 4-5**: Performance optimization

### Sprint 4: Polish & Documentation (2-3 days)
1. ✅ **Day 1**: User documentation
2. ✅ **Day 2**: Code documentation
3. ✅ **Day 3**: Final testing and deployment

---

## Testing Strategy

### Unit Tests
- `BillingVerificationSyncService` methods
- `ProjectBillingController` verified data queries
- Frontend component rendering with verified data

### Integration Tests
1. **Team Review → Billing Sync**
   - Management verifies project-week
   - Verify data appears in Billing view
   - Check worked_hours, billable_hours, adjustments

2. **Adjustment Flow**
   - Manager adjusts in Team Review
   - Management verifies
   - Management adjusts again in Billing
   - Verify final billable hours = verified + billing adjustment

3. **Date Range Filtering**
   - Load different date ranges
   - Verify correct verified data displayed
   - Check aggregation accuracy

### E2E Tests
1. Complete workflow: Submit → Lead → Manager → Management → Billing
2. Multi-project timesheet verification
3. Adjustment audit trail

---

## UI/UX Mockup

### Project Billing Table View
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PROJECT BILLING - OCTOBER 2025                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ TimesheetChecker  [✓ Verified Oct 19, 2025]                   [▼]     │ │
│ ├────────────────────────────────────────────────────────────────────────┤ │
│ │ Worked: 128.0h  │  Manager Adj: +4.0h  │  Verified: 132.0h  │  $3,300│ │
│ │                                                                        │ │
│ │ ┌──────────────────────────────────────────────────────────────────┐ │ │
│ │ │ TEAM MEMBER      WORKED   MGR ADJ   VERIFIED   BILLING   FINAL   │ │ │
│ │ ├──────────────────────────────────────────────────────────────────┤ │ │
│ │ │ John Dev H       24.0h    +4.0h     28.0h       ---     28.0h    │ │ │
│ │ │ Jane Designer    24.0h     ---      24.0h       ---     24.0h    │ │ │
│ │ │ John Dev AB      40.0h     ---      40.0h       ---     40.0h    │ │ │
│ │ │ Siva Kumar V     40.0h     ---      40.0h       ---     40.0h    │ │ │
│ │ └──────────────────────────────────────────────────────────────────┘ │ │
│ │                                                  [Adjust Total Hours] │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ ProjectChecker  [✓ Verified Oct 19, 2025]                      [▼]    │ │
│ ├────────────────────────────────────────────────────────────────────────┤ │
│ │ Worked: 64.0h  │  Manager Adj: ---  │  Verified: 64.0h  │  $6,900     │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Adjustment Dialog
```
┌─────────────────────────────────────────────────────────────┐
│ Adjust Billable Hours - TimesheetChecker                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ TEAM REVIEW VERIFICATION                                     │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Verified by: Super Admin                                ││
│ │ Verified on: Oct 19, 2025, 10:30 AM                     ││
│ │                                                          ││
│ │ Worked Hours:          128.0h                           ││
│ │ Manager Adjustment:     +4.0h                           ││
│ │ Verified Billable:     132.0h                           ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ MANAGEMENT ADJUSTMENT                                        │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Additional Adjustment (hours):                          ││
│ │ [  +2.0  ] hours                                        ││
│ │                                                          ││
│ │ Reason (required):                                       ││
│ │ ┌────────────────────────────────────────────────────┐  ││
│ │ │ Client requested additional billing for overtime  │  ││
│ │ │ hours worked during deployment weekend            │  ││
│ │ └────────────────────────────────────────────────────┘  ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ FINAL SUMMARY                                                │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Verified Billable:    132.0h                            ││
│ │ Management Adj:        +2.0h                            ││
│ │ ─────────────────────────────                           ││
│ │ FINAL BILLABLE:       134.0h                            ││
│ │ Amount (@ $25/hr):  $3,350.00                           ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│                          [Cancel]  [Update Billable Hours]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefits

### 1. Single Source of Truth
- Team Review verified data flows directly to Billing
- No manual re-entry or data duplication
- Reduced errors and inconsistencies

### 2. Audit Trail
- Clear visibility: Manager adjustment → Management verification → Billing adjustment
- Timestamps and user tracking at each step
- Compliance-ready reporting

### 3. Efficiency
- Verified data pre-populated in Billing view
- Management focuses on exceptions and final approvals
- Faster billing cycle

### 4. Transparency
- Users see how hours flow through approval tiers
- Clear breakdown of worked vs billable hours
- Justification for all adjustments

---

## Risks & Mitigation

### Risk 1: Data Sync Delays
**Mitigation**: 
- Implement real-time sync on verification
- Add manual sync button for edge cases
- Show "last synced" timestamp

### Risk 2: Historical Data Inconsistency
**Mitigation**:
- Run migration script during off-hours
- Implement verification checks
- Provide rollback capability

### Risk 3: UI Performance with Large Datasets
**Mitigation**:
- Use pagination and lazy loading
- Implement virtualized lists for large tables
- Cache verification status

### Risk 4: Conflicting Adjustments
**Mitigation**:
- Clear UI indication of adjustment source (Team Review vs Billing)
- Prevent modification of Team Review adjustments in Billing
- Allow only additive Billing adjustments

---

## Success Metrics

1. **Data Accuracy**: 100% of verified projects show correct worked/billable hours
2. **Sync Speed**: Verified data appears in Billing < 5 seconds after verification
3. **User Adoption**: 80% of Management uses verified data vs manual entry
4. **Time Savings**: 30% reduction in billing preparation time
5. **Error Rate**: 50% reduction in billing hour discrepancies

---

## Future Enhancements

### Phase 2 Features:
1. **Bulk Verification Import**: Import multiple project-weeks at once
2. **Variance Analysis**: Show expected vs actual billable hours
3. **Client Notifications**: Auto-notify clients when hours are verified
4. **Invoice Integration**: Auto-populate invoices from verified billing data
5. **Analytics Dashboard**: Trends in adjustments, verification speed, etc.

---

## Conclusion

This integration creates a seamless flow from Team Review verification to Billing Management, eliminating data duplication and providing full visibility into the approval and billing process. The implementation follows a phased approach with clear milestones and success criteria.

**Estimated Total Effort**: 15-22 developer days
**Recommended Team**: 1 Backend + 1 Frontend developer
**Timeline**: 3-4 weeks for full implementation

---

**Next Steps**:
1. Review and approve this plan
2. Create JIRA tickets for each sprint
3. Assign resources
4. Begin Sprint 1 implementation
