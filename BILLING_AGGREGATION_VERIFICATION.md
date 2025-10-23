# Billing Aggregation Verification & Debug Guide

## Test Scenario

**Setup:**
- Management verified and froze "Timesheet Management" project for weeks Oct 6-12 and Oct 13-19
- Management did NOT verify "Project Management" project for those weeks
- Only "Timesheet Management" data should appear in billing aggregation

## Expected Results

### Timesheet Management Project (SHOULD APPEAR)
| User | Worked Hours | Manager Adjustment | Billable Hours |
|------|--------------|-------------------|----------------|
| John Developer H | 64h | +4h | **68h** |
| John Developer AB | 64h | 0h | **64h** |
| Jane Designer (Lead) | 80h | 0h | **80h** |
| Siva Kumar V (Manager) | 80h | 0h | **80h** |
| **TOTAL** | **288h** | **+4h** | **292h** |

### Project Management Project (SHOULD NOT APPEAR)
- This project's data should be **excluded** from billing aggregation
- Reason: `management_status` ≠ `'approved'`

## Current Issue Analysis

### Issue #1: Non-Approved Projects Being Included
**Symptom:** UI shows 270h billable instead of expected 292h  
**Possible Causes:**
1. Aggregation query is not filtering by `management_status='approved'` correctly
2. Some TimesheetProjectApproval records have incorrect `management_status`
3. Data inconsistency in `billable_hours` field vs. calculation

### Issue #2: Adjustment Calculation Inconsistency
**Expected Formula:**
```
billable_hours = worked_hours + billable_adjustment
```

**Your Data Shows:**
- Total worked: 288h ✓
- Total adjustment: +4h ✓
- **Expected billable: 292h**
- **Actual billable: 270h** ✗

**Discrepancy:** 292h - 270h = **22h missing**

## Verification Steps

### Step 1: Run Test Script
```bash
cd backend
node test-billing-aggregation.js
```

This will show:
- All projects in the system
- All timesheets in the date range
- All TimesheetProjectApproval records (before filter)
- Only management-approved records (after filter)
- Detailed breakdown per project and user
- Verification against expected values

### Step 2: Check Debug Logs
Start the backend in development mode and watch the console:
```bash
cd backend
npm run dev
```

Then make a request to the billing API. You'll see detailed logs:
```
=== BILLING AGGREGATION DEBUG ===
Date Range: { start: ..., end: ... }
Project Filter: { ... }
Approved Approvals Count: X

=== Processing Project: Timesheet Management ===
  Approvals found: 4
  User: John Developer H
    Worked Hours: 64
    Manager Adjustment: 4
    Base Billable Hours (from DB): 68
    Expected Base Billable: 68
    Match: ✓
    Final Billable Hours: 68
  ...
```

### Step 3: Verify Database Records

**Query 1: Check TimesheetProjectApproval records**
```javascript
db.timesheetprojectapprovals.find({
  management_status: 'approved',
  // Add project_id filter for Timesheet Management
}).pretty()
```

**Expected Fields:**
- `worked_hours`: Should sum to 288
- `billable_adjustment`: Should sum to +4
- `billable_hours`: Should sum to 292
- `management_status`: All should be 'approved'

**Query 2: Check for data consistency**
```javascript
db.timesheetprojectapprovals.find({
  management_status: 'approved',
  // Add filters
}).forEach(doc => {
  const expected = doc.worked_hours + doc.billable_adjustment;
  const actual = doc.billable_hours;
  if (expected !== actual) {
    print(`MISMATCH: ${doc._id}`);
    print(`  worked_hours: ${doc.worked_hours}`);
    print(`  billable_adjustment: ${doc.billable_adjustment}`);
    print(`  Expected billable: ${expected}`);
    print(`  Actual billable: ${actual}`);
  }
});
```

## Root Cause Possibilities

### Scenario A: Wrong Field Used
**Problem:** Aggregation is using `worked_hours` instead of `billable_hours`  
**Evidence:** 288h matches worked hours, not billable  
**Fix:** Ensure using `billable_hours` field (which includes manager adjustment)

### Scenario B: Data Inconsistency
**Problem:** `billable_hours` field doesn't match `worked_hours + billable_adjustment`  
**Evidence:** Database records are out of sync  
**Fix:** Run data migration to recalculate `billable_hours`

### Scenario C: Missing Records
**Problem:** Some TimesheetProjectApproval records are missing or not approved  
**Evidence:** Only partial data being aggregated  
**Fix:** Ensure all weeks are properly approved by Management

### Scenario D: Wrong Status Filter
**Problem:** Query is including records where `management_status != 'approved'`  
**Evidence:** Extra data from non-approved projects  
**Fix:** Verify aggregation query filter

## Implementation Verification

### Current Aggregation Query
```javascript
const approvedApprovals = await TimesheetProjectApproval.aggregate([
  {
    $lookup: {
      from: 'timesheets',
      localField: 'timesheet_id',
      foreignField: '_id',
      as: 'timesheet'
    }
  },
  { $unwind: '$timesheet' },
  {
    $match: {
      project_id: { $in: projectObjectIds },
      management_status: 'approved', // ← CRITICAL FILTER
      'timesheet.week_start_date': { $gte: start, $lte: end },
      'timesheet.status': { $in: ['frozen', 'billed'] },
      'timesheet.deleted_at': null
    }
  },
  {
    $group: {
      _id: { project_id: '$project_id', user_id: '$timesheet.user_id' },
      worked_hours: { $sum: '$worked_hours' },
      base_billable_hours: { $sum: '$billable_hours' }, // ← Should include adjustment
      manager_adjustment: { $sum: '$billable_adjustment' },
      verified_at: { $max: '$management_approved_at' },
      entries_count: { $sum: '$entries_count' }
    }
  }
]);
```

### Key Points:
1. ✓ Filters by `management_status='approved'`
2. ✓ Uses `billable_hours` field (already includes manager adjustment)
3. ✓ Groups by project + user
4. ✓ Sums all approved weeks

### Expected Behavior:
- **Input:** TimesheetProjectApproval records where `management_status='approved'`
- **Output:** Aggregated data with `base_billable_hours` = sum of `billable_hours`
- **Result:** Should show 292h for Timesheet Management

## Troubleshooting Checklist

- [ ] Run `test-billing-aggregation.js` to see raw data
- [ ] Verify `management_status='approved'` for all expected records
- [ ] Check `billable_hours` matches `worked_hours + billable_adjustment`
- [ ] Confirm timesheet `status` is `'frozen'` or `'billed'`
- [ ] Verify date range includes Oct 6-12 and Oct 13-19
- [ ] Check that "Project Management" is properly excluded
- [ ] Review backend console logs for detailed breakdown
- [ ] Compare UI display with backend API response

## Next Steps

1. **Run the test script** to identify where the discrepancy occurs
2. **Review console logs** from the backend when fetching billing data
3. **Check database records** directly to verify data integrity
4. **Compare expected vs actual** at each aggregation step
5. **Fix root cause** based on findings (likely Scenario A or B)

## Contact Points

If issues persist after verification:
1. Check if TimesheetProjectApproval records exist for all expected weeks
2. Verify the approval workflow completed successfully
3. Ensure Management clicked "Verify & Freeze" for Timesheet Management project
4. Confirm no data corruption in the database
