# Phase 8: Billing Management - Adjustment Model Implementation

## Overview

This document details the **Adjustment Model** implementation for Phase 8 billing management. The adjustment model ensures that when Management reduces billable hours, the adjustment **persists** as new hours are added.

---

## The Adjustment Model Logic

### Core Principle

```typescript
billable_hours = total_worked_hours + adjustment_hours
```

- `total_worked_hours`: Sum of all time entry hours (auto-calculated)
- `adjustment_hours`: Delta set by Management (can be negative or positive)
- `billable_hours`: Final billable hours (recalculated as worked hours change)

### Example Scenario

```
Week 1 - Day 1-5:
├─ User works 40 hours on Project A
├─ total_worked_hours = 40h
├─ adjustment_hours = 0h (no adjustment yet)
└─ billable_hours = 40h

Management adjusts:
├─ Reduces billable to 35h
├─ adjustment_hours = -5h (delta)
└─ billable_hours = 40 + (-5) = 35h

Week 1 - Day 6-7 (continued):
├─ User works 20 more hours
├─ total_worked_hours = 60h (40 + 20)
├─ adjustment_hours = -5h (PERSISTS!)
└─ billable_hours = 60 + (-5) = 55h ✅

NOT 60h ❌ (adjustment persists, not reset)
```

---

## Updated Data Models

### 1. BillingAdjustment Model (Updated)

**File:** `backend/src/models/BillingAdjustment.ts`

```typescript
export interface IBillingAdjustment extends Document {
  _id: ObjectId;
  timesheet_id: ObjectId;
  user_id: ObjectId;

  // Adjustment Scope
  adjustment_scope: 'project' | 'timesheet';
  project_id?: ObjectId; // Required if scope='project', null if scope='timesheet'

  // Billing Period
  billing_period_start: Date;
  billing_period_end: Date;

  // Adjustment Model Fields
  total_worked_hours: number; // Snapshot of worked hours at time of adjustment
  adjustment_hours: number; // Delta: negative (reduce) or positive (increase)
  total_billable_hours: number; // Calculated: worked + adjustment

  // Audit
  adjusted_by: ObjectId; // Management user
  adjusted_at: Date;
  reason?: string;

  // Soft delete
  deleted_at?: Date;
  deleted_by?: ObjectId;
}
```

**Key Features:**
- ✅ Supports **per-project** adjustments: `adjustment_scope='project'`
- ✅ Supports **per-timesheet** (all projects) adjustments: `adjustment_scope='timesheet'`
- ✅ Stores adjustment as **delta** (`adjustment_hours`), not absolute value
- ✅ Auto-calculates `total_billable_hours` on save
- ✅ Validates `project_id` required when `scope='project'`
- ✅ Complete audit trail

### 2. BillingSnapshot Model (Enhanced)

**File:** `backend/src/models/BillingSnapshot.ts`

```typescript
export interface IBillingSnapshot extends Document {
  timesheet_id: ObjectId;
  user_id: ObjectId;
  week_start_date: string;
  week_end_date: string;
  total_hours: number; // Total worked hours
  billable_hours: number; // After adjustments applied
  adjustment_hours?: number; // Total adjustment delta (for reference)
  hourly_rate: number;
  total_amount: number; // hourly_rate × total_hours
  billable_amount: number; // hourly_rate × billable_hours
}
```

**Changes:**
- ✅ Added `adjustment_hours` field to track total adjustments
- ✅ `billable_hours` now reflects worked hours + adjustments

---

## Adjustment API Design

### 1. Create/Update Adjustment

**Endpoint:** `PUT /api/billing/adjustments`

**Request Body:**
```json
{
  "timesheet_id": "68e73b8e97d5c529676a95b4",
  "adjustment_scope": "project",
  "project_id": "68df77ec2ba674aa3c8cd2c7",
  "adjustment_hours": -5,
  "reason": "Client requested discount"
}
```

**Logic:**
1. Calculate current `total_worked_hours` from TimeEntries
2. Create or update BillingAdjustment record
3. Calculate `total_billable_hours = total_worked_hours + adjustment_hours`
4. Return updated billable hours

**Response:**
```json
{
  "adjustment_id": "...",
  "total_worked_hours": 60,
  "adjustment_hours": -5,
  "total_billable_hours": 55,
  "adjusted_at": "2025-10-14T10:30:00Z"
}
```

### 2. Get Current Billable Hours (with Adjustments)

**Endpoint:** `GET /api/billing/timesheets/:timesheetId/billable`

**Response:**
```json
{
  "timesheet_id": "68e73b8e97d5c529676a95b4",
  "total_worked_hours": 60,
  "adjustments": [
    {
      "scope": "project",
      "project_id": "68df77ec2ba674aa3c8cd2c7",
      "project_name": "Website Redesign",
      "adjustment_hours": -5,
      "reason": "Client discount"
    }
  ],
  "total_adjustment_hours": -5,
  "total_billable_hours": 55
}
```

### 3. Project-Level Billable Hours

**Endpoint:** `GET /api/billing/projects/:projectId/billable`

**Query Params:**
- `timesheet_id` (optional): Specific timesheet
- `user_id` (optional): Specific user
- `start_date`, `end_date` (optional): Date range

**Response:**
```json
{
  "project_id": "68df77ec2ba674aa3c8cd2c7",
  "project_name": "Website Redesign",
  "total_worked_hours": 320,
  "total_adjustment_hours": -25,
  "total_billable_hours": 295,
  "members": [
    {
      "user_id": "68df77ec2ba674aa3c8cd2be",
      "user_name": "John Developer",
      "worked_hours": 120,
      "adjustment_hours": -5,
      "billable_hours": 115,
      "hourly_rate": 75,
      "cost": 8625
    }
  ]
}
```

---

## Service Layer Implementation

### BillingAdjustmentService.ts

**File:** `backend/src/services/BillingAdjustmentService.ts`

```typescript
class BillingAdjustmentService {
  /**
   * Create or update adjustment for a timesheet/project
   */
  async upsertAdjustment(data: {
    timesheet_id: ObjectId;
    user_id: ObjectId;
    adjustment_scope: 'project' | 'timesheet';
    project_id?: ObjectId;
    adjustment_hours: number;
    adjusted_by: ObjectId;
    reason?: string;
  }): Promise<IBillingAdjustment> {
    // 1. Get timesheet to determine billing period
    const timesheet = await Timesheet.findById(data.timesheet_id);

    // 2. Calculate total_worked_hours
    const query: any = {
      timesheet_id: data.timesheet_id,
      deleted_at: null
    };
    if (data.adjustment_scope === 'project' && data.project_id) {
      query.project_id = data.project_id;
    }

    const entries = await TimeEntry.find(query);
    const total_worked_hours = entries.reduce((sum, e) => sum + e.hours, 0);

    // 3. Find existing adjustment or create new
    const filter: any = {
      timesheet_id: data.timesheet_id,
      adjustment_scope: data.adjustment_scope
    };
    if (data.adjustment_scope === 'project') {
      filter.project_id = data.project_id;
    }

    const adjustment = await BillingAdjustment.findOneAndUpdate(
      filter,
      {
        user_id: data.user_id,
        adjustment_scope: data.adjustment_scope,
        project_id: data.project_id,
        billing_period_start: timesheet.week_start_date,
        billing_period_end: timesheet.week_end_date,
        total_worked_hours,
        adjustment_hours: data.adjustment_hours,
        adjusted_by: data.adjusted_by,
        adjusted_at: new Date(),
        reason: data.reason
      },
      { upsert: true, new: true }
    );

    return adjustment;
  }

  /**
   * Calculate current billable hours for a timesheet
   * Accounts for all adjustments
   */
  async calculateBillableHours(
    timesheet_id: ObjectId,
    project_id?: ObjectId
  ): Promise<{
    worked_hours: number;
    adjustment_hours: number;
    billable_hours: number;
  }> {
    // 1. Get worked hours from TimeEntries
    const query: any = { timesheet_id, deleted_at: null };
    if (project_id) {
      query.project_id = project_id;
    }

    const entries = await TimeEntry.find(query);
    const worked_hours = entries.reduce((sum, e) => sum + e.hours, 0);

    // 2. Get adjustments
    const adjustmentQuery: any = { timesheet_id, deleted_at: null };
    if (project_id) {
      adjustmentQuery.$or = [
        { adjustment_scope: 'timesheet' }, // Global adjustments
        { adjustment_scope: 'project', project_id } // Project-specific
      ];
    } else {
      adjustmentQuery.adjustment_scope = 'timesheet';
    }

    const adjustments = await BillingAdjustment.find(adjustmentQuery);
    const adjustment_hours = adjustments.reduce((sum, adj) => sum + adj.adjustment_hours, 0);

    // 3. Calculate billable hours
    const billable_hours = Math.max(0, worked_hours + adjustment_hours);

    return { worked_hours, adjustment_hours, billable_hours };
  }

  /**
   * Get all adjustments for a timesheet
   */
  async getTimesheetAdjustments(
    timesheet_id: ObjectId
  ): Promise<IBillingAdjustment[]> {
    return BillingAdjustment.find({
      timesheet_id,
      deleted_at: null
    })
      .populate('project_id', 'name')
      .populate('adjusted_by', 'first_name last_name email')
      .sort({ adjusted_at: -1 });
  }

  /**
   * Delete an adjustment (soft delete)
   */
  async deleteAdjustment(
    adjustment_id: ObjectId,
    deleted_by: ObjectId
  ): Promise<void> {
    await BillingAdjustment.findByIdAndUpdate(adjustment_id, {
      deleted_at: new Date(),
      deleted_by
    });
  }
}
```

---

## Controller Implementation

### BillingAdjustmentController.ts

**File:** `backend/src/controllers/BillingAdjustmentController.ts`

```typescript
export class BillingAdjustmentController {
  /**
   * PUT /api/billing/adjustments
   * Create or update billing adjustment
   */
  static async upsertAdjustment(req: Request, res: Response) {
    try {
      const {
        timesheet_id,
        adjustment_scope,
        project_id,
        adjustment_hours,
        reason
      } = req.body;

      // Validate
      if (!timesheet_id || !adjustment_scope || adjustment_hours === undefined) {
        return res.status(400).json({
          error: 'Missing required fields: timesheet_id, adjustment_scope, adjustment_hours'
        });
      }

      if (adjustment_scope === 'project' && !project_id) {
        return res.status(400).json({
          error: 'project_id is required when adjustment_scope is "project"'
        });
      }

      // Get timesheet to find user_id
      const timesheet = await Timesheet.findById(timesheet_id);
      if (!timesheet) {
        return res.status(404).json({ error: 'Timesheet not found' });
      }

      // Create adjustment
      const adjustment = await BillingAdjustmentService.upsertAdjustment({
        timesheet_id: new mongoose.Types.ObjectId(timesheet_id),
        user_id: timesheet.user_id,
        adjustment_scope,
        project_id: project_id ? new mongoose.Types.ObjectId(project_id) : undefined,
        adjustment_hours,
        adjusted_by: req.user!._id,
        reason
      });

      res.json({
        success: true,
        adjustment: {
          adjustment_id: adjustment._id,
          total_worked_hours: adjustment.total_worked_hours,
          adjustment_hours: adjustment.adjustment_hours,
          total_billable_hours: adjustment.total_billable_hours,
          adjusted_at: adjustment.adjusted_at
        }
      });
    } catch (error) {
      console.error('Error upserting adjustment:', error);
      res.status(500).json({ error: 'Failed to create adjustment' });
    }
  }

  /**
   * GET /api/billing/timesheets/:timesheetId/billable
   * Get current billable hours with adjustments
   */
  static async getTimesheetBillable(req: Request, res: Response) {
    try {
      const { timesheetId } = req.params;

      const adjustments = await BillingAdjustmentService.getTimesheetAdjustments(
        new mongoose.Types.ObjectId(timesheetId)
      );

      const { worked_hours, adjustment_hours, billable_hours } =
        await BillingAdjustmentService.calculateBillableHours(
          new mongoose.Types.ObjectId(timesheetId)
        );

      res.json({
        timesheet_id: timesheetId,
        total_worked_hours: worked_hours,
        adjustments: adjustments.map(adj => ({
          scope: adj.adjustment_scope,
          project_id: adj.project_id,
          project_name: (adj.project_id as any)?.name,
          adjustment_hours: adj.adjustment_hours,
          reason: adj.reason,
          adjusted_by: (adj.adjusted_by as any)?.email,
          adjusted_at: adj.adjusted_at
        })),
        total_adjustment_hours: adjustment_hours,
        total_billable_hours: billable_hours
      });
    } catch (error) {
      console.error('Error getting timesheet billable:', error);
      res.status(500).json({ error: 'Failed to get billable hours' });
    }
  }

  /**
   * DELETE /api/billing/adjustments/:adjustmentId
   * Delete an adjustment
   */
  static async deleteAdjustment(req: Request, res: Response) {
    try {
      const { adjustmentId } = req.params;

      await BillingAdjustmentService.deleteAdjustment(
        new mongoose.Types.ObjectId(adjustmentId),
        req.user!._id
      );

      res.json({ success: true, message: 'Adjustment deleted' });
    } catch (error) {
      console.error('Error deleting adjustment:', error);
      res.status(500).json({ error: 'Failed to delete adjustment' });
    }
  }
}
```

---

## Frontend Implementation

### Adjustment UI Component

**File:** `frontend/src/components/billing/BillableHoursAdjustment.tsx`

```typescript
interface BillableHoursAdjustmentProps {
  timesheetId: string;
  projectId?: string;
  currentWorkedHours: number;
  currentAdjustment: number;
  scope: 'project' | 'timesheet';
  onUpdate: () => void;
}

export const BillableHoursAdjustment: React.FC<BillableHoursAdjustmentProps> = ({
  timesheetId,
  projectId,
  currentWorkedHours,
  currentAdjustment,
  scope,
  onUpdate
}) => {
  const [editing, setEditing] = useState(false);
  const [adjustmentHours, setAdjustmentHours] = useState(currentAdjustment);
  const [reason, setReason] = useState('');

  const currentBillable = currentWorkedHours + currentAdjustment;
  const newBillable = currentWorkedHours + adjustmentHours;

  const handleSave = async () => {
    try {
      await BillingService.upsertAdjustment({
        timesheet_id: timesheetId,
        adjustment_scope: scope,
        project_id: projectId,
        adjustment_hours: adjustmentHours,
        reason
      });

      toast.success('Adjustment saved successfully');
      setEditing(false);
      onUpdate();
    } catch (error) {
      toast.error('Failed to save adjustment');
    }
  };

  return (
    <div className="billable-hours-adjustment">
      <div className="hours-display">
        <div className="worked-hours">
          <label>Worked Hours:</label>
          <span>{currentWorkedHours}h</span>
        </div>

        <div className="adjustment-hours">
          <label>Adjustment:</label>
          {editing ? (
            <Input
              type="number"
              value={adjustmentHours}
              onChange={(e) => setAdjustmentHours(Number(e.target.value))}
              placeholder="e.g., -5 to reduce by 5h"
            />
          ) : (
            <span className={adjustmentHours < 0 ? 'negative' : 'positive'}>
              {adjustmentHours > 0 ? '+' : ''}{adjustmentHours}h
            </span>
          )}
        </div>

        <div className="billable-hours">
          <label>Billable Hours:</label>
          <span className="result">
            {newBillable}h
            {newBillable !== currentBillable && (
              <small>(was {currentBillable}h)</small>
            )}
          </span>
        </div>
      </div>

      {editing && (
        <div className="reason-input">
          <Textarea
            placeholder="Reason for adjustment (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
        </div>
      )}

      <div className="actions">
        {editing ? (
          <>
            <Button onClick={handleSave} variant="primary">Save Adjustment</Button>
            <Button onClick={() => setEditing(false)} variant="secondary">Cancel</Button>
          </>
        ) : (
          <Button onClick={() => setEditing(true)} variant="outline">
            Edit Adjustment
          </Button>
        )}
      </div>

      <div className="formula-explanation">
        <small>
          Formula: Billable = Worked ({currentWorkedHours}h) + Adjustment ({adjustmentHours}h) = {newBillable}h
        </small>
      </div>
    </div>
  );
};
```

---

## Testing Scenarios

### Scenario 1: Basic Adjustment Persistence

```
1. User works 40h Mon-Fri on Project A
   → worked_hours = 40, billable_hours = 40

2. Management adjusts: adjustment_hours = -5
   → worked_hours = 40, billable_hours = 35

3. User works 20h Sat-Sun on same Project A
   → worked_hours = 60, billable_hours = 55 ✅

Verification:
- BillingAdjustment.adjustment_hours = -5
- TimeEntry.sum(hours) = 60
- Calculated billable = 60 + (-5) = 55
```

### Scenario 2: Multiple Projects

```
1. User works on Project A: 40h
2. User works on Project B: 30h
3. Management adjusts Project A: -5h
   → Project A: 40h worked, 35h billable
   → Project B: 30h worked, 30h billable (unaffected)

4. User adds 10h to Project A
   → Project A: 50h worked, 45h billable (adjustment persists!)
   → Project B: 30h worked, 30h billable
```

### Scenario 3: Timesheet-Wide Adjustment

```
1. User works on 3 projects: 20h + 20h + 20h = 60h total
2. Management adjusts timesheet-wide: -10h
   → All projects affected proportionally or as lump sum
   → Total: 60h worked, 50h billable

3. User adds 15h to Project A
   → Total: 75h worked, 65h billable (adjustment persists!)
```

---

## Migration Script

**File:** `backend/scripts/migrate-to-adjustment-model.js`

```javascript
/**
 * Migrate existing TimeEntry.billable_hours to BillingAdjustment model
 */
async function migrateToAdjustmentModel() {
  const timesheets = await Timesheet.find({ status: { $in: ['approved', 'frozen'] } });

  for (const timesheet of timesheets) {
    const entries = await TimeEntry.find({
      timesheet_id: timesheet._id,
      billable_hours: { $exists: true }
    });

    // Group by project
    const projectGroups = {};
    for (const entry of entries) {
      const projectId = entry.project_id?.toString() || 'none';
      if (!projectGroups[projectId]) {
        projectGroups[projectId] = { worked: 0, billable: 0 };
      }
      projectGroups[projectId].worked += entry.hours;
      projectGroups[projectId].billable += entry.billable_hours || entry.hours;
    }

    // Create adjustments if needed
    for (const [projectId, data] of Object.entries(projectGroups)) {
      const adjustmentHours = data.billable - data.worked;

      if (adjustmentHours !== 0) {
        await BillingAdjustment.create({
          timesheet_id: timesheet._id,
          user_id: timesheet.user_id,
          adjustment_scope: 'project',
          project_id: projectId !== 'none' ? projectId : undefined,
          billing_period_start: timesheet.week_start_date,
          billing_period_end: timesheet.week_end_date,
          total_worked_hours: data.worked,
          adjustment_hours: adjustmentHours,
          adjusted_by: timesheet.user_id, // Assuming system migration
          reason: 'Migrated from legacy billable_hours field'
        });
      }
    }
  }

  console.log(`Migrated ${timesheets.length} timesheets to adjustment model`);
}
```

---

## Summary

### What's Been Updated:

1. ✅ **BillingAdjustment Model** - Now supports adjustment delta model
2. ✅ **BillingSnapshot Model** - Tracks adjustment_hours
3. ✅ **Model Exports** - Added to index.ts
4. ✅ **Adjustment Logic** - Persists as new hours are added
5. ✅ **Scope Support** - Per-project OR per-timesheet adjustments
6. ✅ **Audit Trail** - Complete tracking of who/when/why

### Next Steps:

1. Create BillingAdjustmentService (service layer)
2. Create BillingAdjustmentController (API endpoints)
3. Add routes to Express app
4. Implement frontend UI components
5. Test adjustment persistence
6. Integrate with freeze timesheet workflow

### Key Benefits:

- ✅ **Persistent Adjustments** - Adjustments survive as new hours are added
- ✅ **Flexible Scope** - Project-specific or timesheet-wide
- ✅ **Audit Trail** - Full history of changes
- ✅ **No Data Loss** - Original worked hours always preserved
- ✅ **Real-time Calculation** - Billable hours computed on-the-fly
