# Billing System Safeguards

## Overview

This document describes the safeguards implemented to prevent accidental use of incorrect billing logic patterns that could result in incorrect adjustment calculations.

## Problem Background

### Previous Issue
A BillingAdjustment record was created using `worked_hours` (64h) as the base instead of `billable_hours` (68h) from TimesheetProjectApproval. This caused:
- Base: 64h (wrong - used worked_hours)
- Adjustment: -22h (calculated from wrong base)
- Expected: 42h (64 - 22)
- Actual UI: 46h (68 - 22, mixing new base with old adjustment)
- Discrepancy: 22h difference

### Root Cause
The old logic fetched hours from TimeEntry or used `worked_hours` directly, ignoring manager adjustments stored in `billable_hours`.

## Data Flow (Correct)

### Two-Tier Adjustment Model

```
┌─────────────────────────────────────────────────────────────┐
│ TIER 1: Manager Adjustments (Team Review)                  │
├─────────────────────────────────────────────────────────────┤
│ worked_hours (actual)                                       │
│        +                                                     │
│ billable_adjustment (manager delta)                         │
│        =                                                     │
│ billable_hours (base for management)                        │
│                                                              │
│ Stored in: TimesheetProjectApproval                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ TIER 2: Management Adjustments (Billing)                   │
├─────────────────────────────────────────────────────────────┤
│ billable_hours (from Tier 1)                                │
│        +                                                     │
│ adjustment_hours (management delta)                         │
│        =                                                     │
│ final_billable_hours                                        │
│                                                              │
│ Stored in: BillingAdjustment                                │
└─────────────────────────────────────────────────────────────┘
```

### Correct Calculation Steps

1. **Aggregate from TimesheetProjectApproval** (management_status='approved'):
   ```typescript
   worked_hours = SUM(TimesheetProjectApproval.worked_hours)
   manager_adjustment = SUM(TimesheetProjectApproval.billable_adjustment)
   base_billable_hours = SUM(TimesheetProjectApproval.billable_hours)
   ```

2. **Apply Management Adjustment**:
   ```typescript
   management_adjustment = BillingAdjustment.adjustment_hours (delta)
   final_billable_hours = base_billable_hours + management_adjustment
   ```

3. **Data Integrity Check**:
   ```typescript
   // Verify: base = worked + manager adjustment
   base_billable_hours ≈ worked_hours + manager_adjustment
   
   // Verify: final = base + management adjustment
   final_billable_hours ≈ base_billable_hours + management_adjustment
   ```

## Safeguards Implemented

### 1. Comprehensive Documentation Header

Location: `backend/src/controllers/ProjectBillingController.ts` (top of file)

**Purpose**: Explains correct data flow and marks dangerous patterns

**Content**:
- Two-tier adjustment model explanation
- Correct data flow steps
- Dangerous patterns marked with ❌
- Safeguards list

### 2. Method-Level Documentation

**Locations**:
- `applyBillingAdjustment()` - Lines 1183-1194
- `createBillingAdjustment()` - Lines 1526-1540

**Content**:
- Data flow enforcement explanation
- Safeguard mechanisms
- Clear ❌ and ✅ markers for wrong/right patterns

### 3. Runtime Validations

#### A. Approved Base Check
**Location**: `applyBillingAdjustment()`, `createBillingAdjustment()`

```typescript
if (!approvedApprovals || approvedApprovals.length === 0) {
  throw new Error(
    '⚠️ SAFEGUARD VIOLATION: No management-approved billing data found. ' +
    'Cannot create adjustment without approved TimesheetProjectApproval base.'
  );
}
```

**Prevents**: Creating adjustments without approved TimesheetProjectApproval records

#### B. Data Integrity Validation
**Location**: `applyBillingAdjustment()` - Lines 1233-1242

```typescript
const expectedBase = workedHours + managerAdjustment;
const tolerance = 0.01;
if (Math.abs(baseBillableHours - expectedBase) > tolerance) {
  console.warn(
    `⚠️ DATA INTEGRITY WARNING: Base billable hours doesn't match ` +
    `worked + manager adjustment. This may indicate corrupted data.`
  );
}
```

**Detects**: Corrupted or incorrectly calculated base billable hours

#### C. Adjustment Integrity Validation
**Location**: `validateAdjustmentIntegrity()` - Lines 214-252

```typescript
private static validateAdjustmentIntegrity(
  worked_hours: number,
  manager_adjustment: number,
  base_billable_hours: number,
  management_adjustment: number,
  final_billable_hours: number
): { valid: boolean; errors: string[] }
```

**Validates**:
1. Base = worked + manager adjustment (within tolerance)
2. Final = base + management adjustment (within tolerance)

**Used in**: `buildProjectBillingData()` for every user-project combination

### 4. Code Comments and Markers

**Inline Safeguard Comments**:

```typescript
// ✅ SAFEGUARD: Fetch base billable hours ONLY from approved TimesheetProjectApproval
const approvedApprovals = await TimesheetProjectApproval.aggregate([...]);

// ✅ CORRECT: Calculate adjustment as DELTA from base billable hours
const managementAdjustmentHours = params.billableHours - baseBillableHours;

// ✅ SAFEGUARD: Validate adjustment data integrity
const validation = ProjectBillingController.validateAdjustmentIntegrity(...);
```

### 5. Import Warnings

**Location**: Import statements (Lines 73-86)

```typescript
// ⚠️ TimeEntry import kept for legacy compatibility only
// DO NOT use TimeEntry for billing aggregation - use TimesheetProjectApproval instead
import { TimeEntry } from '@/models/TimeEntry';

// ✅ PRIMARY SOURCE: TimesheetProjectApproval is the source of truth for billing
import { TimesheetProjectApproval } from '@/models/TimesheetProjectApproval';
```

**Prevents**: Accidental use of TimeEntry for billing calculations

## How Safeguards Prevent Future Issues

### Scenario 1: Developer tries to use TimeEntry for base
**Prevention**:
- Import warning flags TimeEntry as legacy
- Method documentation explains correct source
- No code path exists that uses TimeEntry for aggregation

### Scenario 2: Developer creates adjustment without approved base
**Prevention**:
- `applyBillingAdjustment()` validates approved records exist
- Clear error message explains requirement
- 404 status with guidance on fixing issue

### Scenario 3: Developer uses worked_hours as base
**Prevention**:
- Documentation clearly states to use billable_hours
- Aggregation query explicitly fetches `billable_hours` field
- Validation detects mismatch and logs warning

### Scenario 4: Corrupted data exists
**Detection**:
- `validateAdjustmentIntegrity()` checks every calculation
- Logs warnings when data doesn't follow expected formula
- Developers see errors during testing/debugging

## Testing the Safeguards

### Test 1: Create Adjustment Without Approved Base
```javascript
// Should fail with safeguard error
await applyBillingAdjustment({
  projectId: 'unapproved_project',
  // ... other params
});
// Expected: Error with message about missing approved base
```

### Test 2: Verify Data Integrity
```javascript
// Should log warning if base doesn't match formula
const validation = validateAdjustmentIntegrity(
  64,  // worked_hours
  4,   // manager_adjustment
  64,  // base_billable_hours (WRONG - should be 68)
  0,   // management_adjustment
  64   // final_billable_hours
);
// Expected: validation.valid = false, errors about base mismatch
```

### Test 3: Check Production Data
Run the integrity validation on existing data to find issues:

```javascript
// In buildProjectBillingData, the validation runs automatically
// and logs errors for any user-project with invalid calculations
```

## Maintenance Guidelines

### When Adding New Adjustment Features

1. **Always fetch base from TimesheetProjectApproval**:
   ```typescript
   const base = await TimesheetProjectApproval.aggregate([
     { $match: { management_status: 'approved' } },
     // ...
   ]);
   ```

2. **Calculate adjustment as delta**:
   ```typescript
   const adjustment = final_value - base_value;
   ```

3. **Validate before saving**:
   ```typescript
   if (!approvedBase) {
     throw new Error('Safeguard violation: No approved base');
   }
   ```

4. **Add validation call**:
   ```typescript
   const validation = validateAdjustmentIntegrity(...);
   if (!validation.valid) {
     console.error('Data integrity error:', validation.errors);
   }
   ```

### When Refactoring

1. **Read the header documentation** in ProjectBillingController.ts
2. **Search for ✅ and ❌ markers** to understand correct patterns
3. **Run integrity validation** on test data before deploying
4. **Keep safeguard comments** when moving code

### When Debugging Issues

1. **Check console for validation warnings** - they indicate data problems
2. **Verify management_status='approved'** filter is present
3. **Confirm base comes from billable_hours** not worked_hours
4. **Use validateAdjustmentIntegrity()** to test specific calculations

## Success Metrics

### Coverage
- ✅ All adjustment methods have safeguards
- ✅ All aggregation queries validate approved status
- ✅ All calculations validated for integrity
- ✅ All dangerous patterns documented

### Effectiveness
- ❌ Cannot create adjustment without approved base (enforced)
- ❌ Cannot use TimeEntry as source (no code path exists)
- ❌ Cannot use worked_hours as base (validation detects)
- ✅ Corrupted data detected by integrity checks
- ✅ Clear error messages guide to correct approach

## Related Files

- **Controller**: `backend/src/controllers/ProjectBillingController.ts`
- **Models**: 
  - `backend/src/models/TimesheetProjectApproval.ts`
  - `backend/src/models/BillingAdjustment.ts`
- **Types**: `backend/src/types/billingVerification.ts`
- **Test Scripts** (for reference only):
  - `backend/test-billing-aggregation.js`
  - `backend/check-billing-adjustments.js`
  - `backend/fix-john-dev-h-adjustment.js`

## Version History

- **v1.1** (2025-10-23): User data mapping and cost calculation improvements
  - Updated to fetch `hourly_rate` from User schema
  - Calculate costs using `billable_hours × hourly_rate` from User model
  - Removed dependency on BillingRateService for simpler, more direct calculation
  - Updated all billing views (Project, User, Task) to use user's hourly_rate
  
- **v1.0** (2025-01-XX): Initial safeguards implementation
  - Comprehensive documentation header
  - Method-level safeguards
  - Runtime validations
  - Import warnings
  - Integrity validation function
