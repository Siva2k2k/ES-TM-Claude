# Timesheet Management System - Complete Restructuring Plan

## Executive Summary

This document outlines a comprehensive restructuring of the Timesheet Management application from backend to frontend, aligning with the core business requirements and ensuring SonarQube compliance.

### Core Business Requirements

**A. Timesheet Creation**
- Employees, Leads, and Managers create timesheets on assigned projects
- Each timesheet contains time entries (tasks + logged hours)
- Entries can be: Project tasks (assigned tasks) OR Custom tasks (user-defined, non-billable by default)
- Business validations: 8-10 hours/day, <52 hours/week, Only weekday entries mandatory
- Two modes: View (read-only) and Edit (editable, copy, save)
- Single-week timesheets on multiple project/task
- Status progression: draft → submitted (locked from editing)

**B. Project-Week Group View**
- Group user entries by project and week
- Display users on same project for a particular week
- Show per-user total worked hours and billable hours with their list of entries
- Show project-week aggregated worked/billable hours
- Billable hours = worked hours (from billable tasks)

**C. Lead Review**
- Lead approves/rejects only when ALL employees submit entries
- Partial submissions viewable before completion
- Lead rejection: timesheet → 'lead_rejected', entries → 'rejected', individually editable
- Lead can wait others while waiting for resubmissions
- Rejected: project-week → pending with resubmission status
- Lead approval: entries → 'approved', timesheet → 'lead_approved' (corresponding entries)
- Lead can submit own timesheet if reviewed all employees on corresponding projects
- Approval enabled when all employee entries available (project-week level)
- Rejection: user-level or project-week level

**D. Manager Review**
- Project-week view similar to Lead
- Manager approval: lead_approved → manager_approved
- Lead's timesheet: submitted → manager_approved
- Manager can only view until lead reviewed project-week and submitted own timesheet
- Manager can approve/reject similar to Lead
- Manager can edit billable hours at user level in project-week view
- Manager adjusts total billable hours for each user (applied as adjustment to entries)
- Billable hours = worked hours + adjustment
- Adjustment is distributed proportionally across user's billable entries
- Rejection: lead_approved → manager_rejected → resubmission → submitted → lead_approved → manager_approved

**E. Management Review**
- Bulk verify and freeze project groups
- Manager approved billable hours moved directly here with adjustments
- Employee timesheet entries: 'approved' → 'frozen'
- Employee timesheet: all entries frozen → 'manager_approved' → 'frozen'
- Manager timesheet: 'submitted' → 'frozen' (verified) or 'management_rejected' (rejected)
- Bulk verification available if: project-week approved by manager AND manager's time entries verified

---

## System Architecture Overview

### Current Issues Identified
1. **Schema Inconsistencies**: Mixed approval tracking (timesheet-level + project-level)
2. **Complex Status Flow**: Unclear status transitions across tiers
3. **Entry-Level Tracking**: No individual entry status tracking for partial rejections
4. **Validation Gaps**: Business rules not consistently enforced (custom task handling, billable defaults)
5. **Custom Task Support**: Unclear handling of custom (non-project) tasks
6. **SonarQube Violations**: High cognitive complexity, nested functions, ternary operators
7. **Redundant Code**: Duplicate logic across services

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  React Components (Atomic Design) + Context Providers        │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                           │
│  Business Logic Services (Single Responsibility)             │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    VALIDATION LAYER                          │
│  Zod Schemas + Business Rule Validators                      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  Mongoose Models + Repository Pattern                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Data Model Restructuring

### 1.1 Core Models

#### **Timesheet Model** (Updated)
```typescript
// Location: backend/src/models/Timesheet.ts

export type TimesheetStatus =
  | 'draft'              // Being created/edited
  | 'submitted'          // Submitted for review
  | 'lead_rejected'      // Rejected by lead
  | 'lead_approved'      // Approved by lead
  | 'manager_rejected'   // Rejected by manager
  | 'manager_approved'   // Approved by manager
  | 'management_rejected'// Rejected by management
  | 'frozen'             // Locked and verified
  | 'billed';            // Included in billing

interface ITimesheet {
  _id: ObjectId;
  user_id: ObjectId;          // Owner of timesheet
  week_start_date: Date;      // Monday 00:00:00
  week_end_date: Date;        // Sunday 23:59:59
  
  // Status tracking
  status: TimesheetStatus;
  submitted_at?: Date;
  
  // Approval tracking (only for audit trail)
  approved_by_lead_id?: ObjectId;
  approved_by_lead_at?: Date;
  lead_rejection_reason?: string;
  
  approved_by_manager_id?: ObjectId;
  approved_by_manager_at?: Date;
  manager_rejection_reason?: string;
  
  approved_by_management_id?: ObjectId;
  approved_by_management_at?: Date;
  management_rejection_reason?: string;
  
  // Frozen state
  is_frozen: boolean;
  frozen_at?: Date;
  frozen_by?: ObjectId;
  
  // Billing
  is_billed: boolean;
  billed_at?: Date;
  billing_snapshot_id?: ObjectId;
  
  // Soft delete
  deleted_at?: Date;
  deleted_by?: ObjectId;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}
```

#### **TimeEntry Model** (Updated)
```typescript
// Location: backend/src/models/TimeEntry.ts

export type EntryStatus =
  | 'draft'              // Part of draft timesheet (can be edited)
  | 'submitted'          // Submitted with timesheet
  | 'rejected'           // Rejected (can be edited)
  | 'approved'           // Approved
  | 'frozen';            // Locked and verified

export type EntryType = 'project_task' | 'custom_task';

interface ITimeEntry {
  _id: ObjectId;
  timesheet_id: ObjectId;
  project_id: ObjectId;       // Required: must be assigned project
  task_id?: ObjectId;         // Optional: task within project (null for custom tasks)
  
  // Entry type and custom task support
  entry_type: EntryType;      // 'project_task' or 'custom_task'
  custom_task_description?: string; // Required when entry_type = 'custom_task'
  
  // Time tracking
  date: Date;                 // Date of work
  hours: number;              // Actual hours worked (0.25 increments)
  description?: string;       // Work description
  
  // Billing
  is_billable: boolean;       // Is this task billable? (false by default for custom tasks)
  worked_hours: number;       // = hours (calculated from billable tasks)
  billable_hours: number;     // = worked_hours + adjustment (manager can edit)
  adjustment: number;         // Manager adjustment (default 0)
  
  // Business Rule: Custom tasks are non-billable by default
  // Users can create custom tasks for project-related work that isn't in the task list
  
  // Entry status (independent of timesheet)
  status: EntryStatus;
  
  // Rejection tracking
  is_rejected: boolean;
  rejected_by?: ObjectId;
  rejection_reason?: string;
  rejected_at?: Date;
  
  // Approval tracking
  approved_by?: ObjectId;
  approved_at?: Date;
  
  // Frozen state
  is_frozen: boolean;
  frozen_at?: Date;
  
  // Soft delete
  deleted_at?: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}
```

#### **ProjectWeekApproval Model** (NEW)
```typescript
// Location: backend/src/models/ProjectWeekApproval.ts

export type ProjectWeekStatus =
  | 'incomplete'          // Not all employees submitted
  | 'pending_lead'        // Awaiting lead review
  | 'lead_rejected'       // Lead rejected (partial/full)
  | 'lead_approved'       // All employees approved by lead
  | 'pending_manager'     // Awaiting manager review
  | 'manager_rejected'    // Manager rejected
  | 'manager_approved'    // All approved by manager
  | 'frozen';             // Management verified and frozen

interface IProjectWeekApproval {
  _id: ObjectId;
  project_id: ObjectId;
  week_start_date: Date;
  week_end_date: Date;
  
  // Status
  status: ProjectWeekStatus;
  
  // Lead tracking
  lead_id?: ObjectId;
  lead_reviewed: boolean;       // Has lead completed review?
  lead_submitted: boolean;      // Has lead submitted own timesheet?
  
  // Manager tracking
  manager_id: ObjectId;
  manager_reviewed: boolean;    // Has manager completed review?
  manager_submitted: boolean;   // Has manager submitted own timesheet?
  
  // Statistics
  total_employees: number;
  submitted_employees: number;
  approved_employees: number;
  rejected_employees: number;
  
  total_hours: number;
  total_billable_hours: number;
  
  // User-level billable hours tracking (for manager adjustments)
  user_billable_hours: Map<string, {  // userId -> billable hours info
    user_id: ObjectId;
    worked_hours: number;              // Original worked hours
    billable_hours: number;            // Manager-adjusted billable hours
    adjustment: number;                // Total adjustment applied
    adjusted_by?: ObjectId;            // Manager who made adjustment
    adjusted_at?: Date;
  }>;
  
  // Resubmission tracking
  has_resubmissions: boolean;
  resubmission_count: number;
  last_resubmitted_at?: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}
```

### 1.2 Models to Remove

- **TimesheetProjectApproval** - Replace with ProjectWeekApproval
- Redundant approval tracking fields in Timesheet (keep only for audit)

### 1.3 Migration Strategy

1. **Create new models** with proper schemas
2. **Migrate existing data** with migration scripts
3. **Update all references** in services
4. **Remove deprecated models**
5. **Update indexes** for performance

---

## Phase 2: Business Logic Restructuring

### 2.1 Service Organization

#### **Core Services**

1. **TimesheetLifecycleService** (NEW)
   - `createTimesheet(userId, weekStart)`
   - `updateEntries(timesheetId, entries)`
   - `submitTimesheet(timesheetId)`
   - `deleteTimesheet(timesheetId)`

2. **TimesheetValidationService** (NEW)
   - `validateHourLimits(entries)` - 8-10 hrs/day, <52/week
   - `validateWeekdayCompletion(entries)` - Mon-Fri mandatory
   - `validateProjectAssignment(userId, projectId)`
   - `validateTaskAssignment(userId, taskId)`
   - `validateEntryType(entry)` - Validate project_task vs custom_task requirements
   - `validateCustomTask(entry)` - Ensure custom tasks have description, are non-billable by default

3. **LeadReviewService** (NEW)
   - `getProjectWeekForReview(leadId, projectId, weekStart)`
   - `approveEmployee(leadId, timesheetId)`
   - `rejectEmployee(leadId, timesheetId, reason)`
   - `approveProjectWeek(leadId, projectId, weekStart)`
   - `rejectProjectWeek(leadId, projectId, weekStart, reason)`
   - `canLeadSubmit(leadId, weekStart)` - Check if all projects reviewed

4. **ManagerReviewService** (NEW)
   - `getProjectWeekForReview(managerId, projectId, weekStart)`
   - `approveEmployee(managerId, timesheetId)`
   - `rejectEmployee(managerId, timesheetId, reason)`
   - `approveLeadTimesheet(managerId, timesheetId)`
   - `updateUserBillableHours(managerId, userId, projectId, weekStart, totalBillableHours)` - Edit user-level billable hours
   - `updateEntryBillableHours(managerId, entryId, billableHours)` - Edit individual entry billable hours
   - `distributeAdjustment(entries, totalAdjustment)` - Distribute adjustment across entries
   - `approveProjectWeek(managerId, projectId, weekStart)`

5. **ManagementReviewService** (NEW)
   - `getProjectWeeksForVerification(filters)`
   - `bulkFreezeProjectWeek(projectId, weekStart)`
   - `approveManagerTimesheet(managementId, timesheetId)`
   - `rejectProjectWeek(managementId, projectId, weekStart, reason)`

6. **ProjectWeekAggregationService** (NEW)
   - `getProjectWeekView(projectId, weekStart)`
   - `calculateWorkedHours(projectId, weekStart)`
   - `calculateBillableHours(projectId, weekStart)`
   - `getUserTimesheetSummary(userId, projectId, weekStart)`

### 2.2 Service Method Structure (SonarQube Compliant)

**Template for all service methods:**

```typescript
// ✅ Cognitive Complexity < 15
// ✅ No ternary operators
// ✅ Max 3 levels of nesting

class ServiceName {
  static async methodName(params): Promise<Result> {
    // 1. Validate inputs (early returns)
    const validationError = this.validateInputs(params);
    if (validationError) {
      return { error: validationError };
    }
    
    // 2. Fetch required data
    const data = await this.fetchData(params);
    if (!data) {
      return { error: 'Data not found' };
    }
    
    // 3. Execute business logic (extracted methods)
    const result = await this.executeBusinessLogic(data);
    
    // 4. Return result
    return { success: true, data: result };
  }
  
  // Helper methods (private, single responsibility)
  private static validateInputs(params) { /* ... */ }
  private static fetchData(params) { /* ... */ }
  private static executeBusinessLogic(data) { /* ... */ }
}
```

### 2.3 Validation Layer

**Location:** `backend/src/validators/`

```typescript
// timesheet.validator.ts
export class TimesheetValidator {
  static validateDailyHours(hours: number): ValidationResult {
    if (hours < 8) {
      return { valid: false, error: 'Minimum 8 hours per day' };
    }
    if (hours > 10) {
      return { valid: false, error: 'Maximum 10 hours per day' };
    }
    return { valid: true };
  }
  
  static validateWeeklyHours(totalHours: number): ValidationResult {
    if (totalHours >= 52) {
      return { valid: false, error: 'Weekly hours must be less than 52' };
    }
    return { valid: true };
  }
  
  static validateWeekdayEntries(entries: TimeEntry[]): ValidationResult {
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const entriesMap = new Map(entries.map(e => [getDayName(e.date), e]));
    
    for (const day of weekdays) {
      if (!entriesMap.has(day)) {
        return { valid: false, error: `${day} entry is mandatory` };
      }
    }
    
    return { valid: true };
  }
  
  static validateEntryType(entry: TimeEntry): ValidationResult {
    // Project task must have task_id
    if (entry.entry_type === 'project_task' && !entry.task_id) {
      return { valid: false, error: 'Project task requires a task_id' };
    }
    
    // Custom task must have description
    if (entry.entry_type === 'custom_task' && !entry.custom_task_description) {
      return { valid: false, error: 'Custom task requires a description' };
    }
    
    // Custom tasks must be non-billable by default (can be overridden by manager)
    if (entry.entry_type === 'custom_task' && entry.is_billable && !entry.approved_by) {
      return { valid: false, error: 'Custom tasks are non-billable by default' };
    }
    
    return { valid: true };
  }
}
```

---

## Phase 3: API Endpoint Restructuring

### 3.1 Endpoint Organization

**RESTful structure:**

```
/api/v1/timesheets
  GET    /                           # Get user's timesheets
  POST   /                           # Create new timesheet
  GET    /:id                        # Get specific timesheet
  PUT    /:id                        # Update timesheet (draft only)
  DELETE /:id                        # Delete timesheet (draft only)
  POST   /:id/submit                 # Submit for approval
  POST   /:id/entries                # Add/update entries
  GET    /:id/entries                # Get entries
  
/api/v1/lead-review
  GET    /project-weeks               # Get project-weeks for review
  GET    /project-weeks/:id           # Get specific project-week details
  POST   /approve/employee/:id        # Approve employee timesheet
  POST   /reject/employee/:id         # Reject employee timesheet
  POST   /approve/project-week        # Approve entire project-week
  POST   /reject/project-week         # Reject project-week
  GET    /can-submit                  # Check if lead can submit
  
/api/v1/manager-review
  GET    /project-weeks               # Get project-weeks for review
  GET    /project-weeks/:id           # Get specific project-week details
  POST   /approve/employee/:id        # Approve employee timesheet
  POST   /approve/lead/:id            # Approve lead timesheet
  POST   /reject/timesheet/:id        # Reject any timesheet
  PUT    /entries/:id/billable        # Update individual entry billable hours
  PUT    /project-weeks/:projectId/users/:userId/billable  # Update user-level billable hours
  POST   /approve/project-week        # Approve entire project-week
  
/api/v1/management-review
  GET    /project-weeks               # Get project-weeks for verification
  POST   /freeze/project-week         # Bulk freeze project-week
  POST   /approve/manager/:id         # Approve manager timesheet
  POST   /reject/project-week         # Reject project-week
```

### 3.2 Controller Structure

**Location:** `backend/src/controllers/`

```typescript
// timesheets.controller.ts
export class TimesheetsController {
  static async create(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user.id;
    const { week_start_date } = req.body;
    
    const validationResult = validateWeekStart(week_start_date);
    if (!validationResult.valid) {
      res.status(400).json({ error: validationResult.error });
      return;
    }
    
    const result = await TimesheetLifecycleService.createTimesheet(
      userId,
      week_start_date
    );
    
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    
    res.status(201).json(result.timesheet);
  }
  
  // Other methods follow same pattern
}
```

---

## Phase 4: Frontend Restructuring

### 4.1 Component Architecture

**Atomic Design Structure:**

```
frontend/src/components/
  atoms/                        # Basic UI elements
    Button/
    Input/
    Badge/
    StatusIndicator/
  
  molecules/                    # Simple combinations
    TimeEntryRow/
    CustomTaskEntryForm/        # NEW: Form for creating custom tasks
    UserBillableHoursEditor/    # NEW: Manager edits user-level billable hours
    ProjectWeekHeader/
    ApprovalActionButtons/
    HoursSummaryCard/
  
  organisms/                    # Complex components
    TimesheetEntryTable/
    ProjectWeekCard/
    ApprovalHistoryPanel/
    ValidationErrorList/
  
  templates/                    # Page layouts
    TimesheetLayout/
    ReviewLayout/
    DashboardLayout/
```

### 4.2 State Management

**Context Structure:**

```typescript
// contexts/TimesheetContext.tsx
interface TimesheetContextValue {
  // Current timesheet
  currentTimesheet: Timesheet | null;
  entries: TimeEntry[];
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Actions
  createTimesheet: (weekStart: string) => Promise<void>;
  updateEntry: (entry: TimeEntry) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  submitTimesheet: () => Promise<void>;
  
  // Validations
  validationErrors: ValidationError[];
  canSubmit: boolean;
}
```

### 4.3 Page Structure

```
frontend/src/pages/
  employee/
    TimesheetCreate.tsx         # Create/edit timesheet
    TimesheetList.tsx           # View all timesheets
    TimesheetView.tsx           # View-only mode
  
  lead/
    LeadReview.tsx              # Project-week review
    LeadDashboard.tsx           # Overview
  
  manager/
    ManagerReview.tsx           # Project-week review
    ManagerDashboard.tsx        # Overview
  
  management/
    ManagementVerification.tsx  # Bulk verification
    ManagementDashboard.tsx     # Overview
```

### 4.4 Service Layer (Frontend)

**Location:** `frontend/src/services/`

```typescript
// TimesheetApiService.ts
export class TimesheetApiService {
  static async createTimesheet(
    userId: string,
    weekStart: string
  ): Promise<ApiResult<Timesheet>> {
    const response = await api.post('/timesheets', {
      user_id: userId,
      week_start_date: weekStart
    });
    
    return handleApiResponse(response);
  }
  
  static async getTimesheetByWeek(
    userId: string,
    weekStart: string
  ): Promise<ApiResult<Timesheet>> {
    const response = await api.get('/timesheets', {
      params: { user_id: userId, week_start: weekStart }
    });
    
    return handleApiResponse(response);
  }
  
  // Other methods...
}
```

---

## Phase 5: Validation & Business Rules

### 5.1 Backend Validators

**Location:** `backend/src/validators/`

1. **timesheet.validator.ts**
   - Daily hour limits (8-10)
   - Weekly hour limits (<52)
   - Weekday completion
   - Project assignment
   - Task assignment

2. **approval.validator.ts**
   - Role permissions
   - Status transitions
   - Approval prerequisites
   - Bulk operation validations
   - Manager billable hours adjustment permissions
   - Adjustment range validations (e.g., max 20% deviation from worked hours)

3. **entry.validator.ts**
   - Hour increments (0.25)
   - Date ranges
   - Billable hour calculations
   - Adjustment limits
   - Manager adjustment permissions (only managers can adjust billable hours)
   - Adjustment distribution validation (proportional across entries)
   - Custom task validation (description required, non-billable by default)
   - Entry type validation (project_task requires task_id, custom_task requires description)

### 5.2 Frontend Validators

**Location:** `frontend/src/validators/`

Using Zod for schema validation:

```typescript
// timesheetEntry.schema.ts
export const timesheetEntrySchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  entry_type: z.enum(['project_task', 'custom_task']),
  task_id: z.string().optional(),
  custom_task_description: z.string().max(200).optional(),
  date: z.date(),
  hours: z.number()
    .min(0.25, 'Minimum 0.25 hours')
    .max(24, 'Maximum 24 hours')
    .multipleOf(0.25, 'Hours must be in 0.25 increments'),
  description: z.string().max(500).optional(),
  is_billable: z.boolean()
}).refine(
  (data) => {
    // Project tasks require task_id
    if (data.entry_type === 'project_task' && !data.task_id) {
      return false;
    }
    // Custom tasks require description and must be non-billable by default
    if (data.entry_type === 'custom_task' && !data.custom_task_description) {
      return false;
    }
    return true;
  },
  {
    message: 'Project tasks need task_id, custom tasks need description'
  }
);

export const weeklyTimesheetSchema = z.object({
  entries: z.array(timesheetEntrySchema)
}).refine(
  (data) => validateWeeklyHours(data.entries),
  { message: 'Weekly hours must be less than 52' }
).refine(
  (data) => validateWeekdayCompletion(data.entries),
  { message: 'Weekday entries are mandatory' }
);
```

---

## Phase 6: Utilities & Helpers

### 6.1 Date Utilities

**Location:** `backend/src/utils/date.utils.ts` & `frontend/src/utils/date.utils.ts`

```typescript
export class DateUtils {
  static getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
  
  static getWeekEnd(date: Date): Date {
    const weekStart = this.getWeekStart(date);
    const sunday = new Date(weekStart);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  }
  
  static getWeekdayDates(weekStart: Date): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }
  
  static isWeekday(date: Date): boolean {
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }
}
```

### 6.2 Calculation Utilities

**Location:** `backend/src/utils/calculations.utils.ts`

```typescript
export class CalculationUtils {
  static calculateWorkedHours(entries: TimeEntry[]): number {
    return entries
      .filter(e => e.is_billable)
      .reduce((sum, e) => sum + e.hours, 0);
  }
  
  static calculateBillableHours(entries: TimeEntry[]): number {
    return entries
      .filter(e => e.is_billable)
      .reduce((sum, e) => sum + e.billable_hours, 0);
  }
  
  static calculateDailyHours(entries: TimeEntry[], date: Date): number {
    return entries
      .filter(e => isSameDay(e.date, date))
      .reduce((sum, e) => sum + e.hours, 0);
  }
  
  static calculateWeeklyHours(entries: TimeEntry[]): number {
    return entries.reduce((sum, e) => sum + e.hours, 0);
  }
  
  /**
   * Distribute total adjustment across billable entries proportionally
   * Used when manager adjusts user-level billable hours in project-week view
   */
  static distributeAdjustmentAcrossEntries(
    entries: TimeEntry[], 
    totalAdjustment: number
  ): TimeEntry[] {
    const billableEntries = entries.filter(e => e.is_billable);
    const totalWorkedHours = billableEntries.reduce((sum, e) => sum + e.hours, 0);
    
    if (totalWorkedHours === 0) {
      return entries;
    }
    
    return entries.map(entry => {
      if (!entry.is_billable) {
        return entry;
      }
      
      // Calculate proportional adjustment for this entry
      const proportion = entry.hours / totalWorkedHours;
      const entryAdjustment = totalAdjustment * proportion;
      
      return {
        ...entry,
        adjustment: entryAdjustment,
        billable_hours: entry.hours + entryAdjustment
      };
    });
  }
  
  /**
   * Calculate total adjustment needed to reach target billable hours
   */
  static calculateRequiredAdjustment(
    workedHours: number, 
    targetBillableHours: number
  ): number {
    return targetBillableHours - workedHours;
  }
}
```

---

## Phase 7: Implementation Sequence

### Week 1: Database & Models
- [ ] Create new Mongoose schemas
- [ ] Write migration scripts
- [ ] Update indexes
- [ ] Test migrations in dev environment

### Week 2: Backend Services
- [ ] Implement TimesheetLifecycleService
- [ ] Implement ValidationServices
- [ ] Implement LeadReviewService
- [ ] Implement ManagerReviewService
- [ ] Implement ManagementReviewService
- [ ] Write unit tests for each service

### Week 3: Backend API
- [ ] Implement controllers
- [ ] Update routes
- [ ] Add middleware validations
- [ ] Write integration tests
- [ ] Test API endpoints

### Week 4: Frontend Services
- [ ] Implement API service layer
- [ ] Create utility functions
- [ ] Set up context providers
- [ ] Write frontend validators

### Week 5: Frontend Components
- [ ] Build atomic components
- [ ] Build molecule components
- [ ] Build organism components
- [ ] Create page templates

### Week 6: Frontend Pages
- [ ] Employee timesheet pages
- [ ] Lead review pages
- [ ] Manager review pages
- [ ] Management verification pages

### Week 7: Integration & Testing
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security testing
- [ ] SonarQube compliance check

### Week 8: Documentation & Deployment
- [ ] API documentation
- [ ] User guides
- [ ] Developer documentation
- [ ] Deployment scripts

---

## SonarQube Compliance Guidelines

### 1. Cognitive Complexity < 15

**Bad Example:**
```typescript
function processTimesheet(ts: Timesheet) {
  if (ts.status === 'submitted') {
    if (ts.user.role === 'employee') {
      if (ts.entries.length > 0) {
        for (const entry of ts.entries) {
          if (entry.is_billable) {
            // ... more logic
          }
        }
      }
    }
  }
}
// Cognitive Complexity: 6
```

**Good Example:**
```typescript
function processTimesheet(ts: Timesheet) {
  const canProcess = validateTimesheetForProcessing(ts);
  if (!canProcess) {
    return;
  }
  
  const billableEntries = getBillableEntries(ts.entries);
  processEntries(billableEntries);
}

function validateTimesheetForProcessing(ts: Timesheet): boolean {
  if (ts.status !== 'submitted') return false;
  if (ts.user.role !== 'employee') return false;
  if (ts.entries.length === 0) return false;
  return true;
}

function getBillableEntries(entries: TimeEntry[]): TimeEntry[] {
  return entries.filter(e => e.is_billable);
}
// Cognitive Complexity: 2 per function
```

### 2. No Ternary Operators

**Bad Example:**
```typescript
const status = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending';
```

**Good Example:**
```typescript
function getStatus(isApproved: boolean, isRejected: boolean): string {
  if (isApproved) {
    return 'approved';
  }
  if (isRejected) {
    return 'rejected';
  }
  return 'pending';
}

const status = getStatus(isApproved, isRejected);
```

### 3. Max 3 Levels of Nesting

**Bad Example:**
```typescript
function process() {
  if (condition1) {
    if (condition2) {
      if (condition3) {
        if (condition4) {
          // Too deep!
        }
      }
    }
  }
}
```

**Good Example:**
```typescript
function process() {
  if (!condition1) return;
  if (!condition2) return;
  if (!condition3) return;
  if (!condition4) return;
  
  executeProcess();
}
```

---

## Testing Strategy

### Unit Tests
- All service methods
- All validators
- All utilities
- Target: 80%+ coverage

### Integration Tests
- API endpoints
- Service interactions
- Database operations
- Target: 70%+ coverage

### E2E Tests
- Complete timesheet lifecycle
- Approval workflows
- Edge cases and error handling
- Target: Critical paths covered

---

## File Structure Summary

```
backend/
  src/
    models/
      Timesheet.ts                    # Core model
      TimeEntry.ts                    # Core model
      ProjectWeekApproval.ts          # NEW model
      User.ts
      Project.ts
      Task.ts
    
    services/
      TimesheetLifecycleService.ts    # NEW
      TimesheetValidationService.ts   # NEW
      LeadReviewService.ts            # NEW
      ManagerReviewService.ts         # NEW
      ManagementReviewService.ts      # NEW
      ProjectWeekAggregationService.ts # NEW
    
    validators/
      timesheet.validator.ts          # NEW
      approval.validator.ts           # NEW
      entry.validator.ts              # NEW
    
    controllers/
      timesheets.controller.ts        # UPDATED
      lead-review.controller.ts       # NEW
      manager-review.controller.ts    # NEW
      management-review.controller.ts # NEW
    
    routes/
      timesheets.routes.ts            # UPDATED
      lead-review.routes.ts           # NEW
      manager-review.routes.ts        # NEW
      management-review.routes.ts     # NEW
    
    utils/
      date.utils.ts                   # NEW
      calculations.utils.ts           # NEW
      status.utils.ts                 # NEW

frontend/
  src/
    components/
      atoms/                          # NEW structure
      molecules/                      # NEW structure
      organisms/                      # NEW structure
      templates/                      # NEW structure
    
    pages/
      employee/                       # NEW structure
      lead/                           # NEW structure
      manager/                        # NEW structure
      management/                     # NEW structure
    
    services/
      TimesheetApiService.ts          # NEW
      LeadReviewApiService.ts         # NEW
      ManagerReviewApiService.ts      # NEW
      ManagementApiService.ts         # NEW
    
    contexts/
      TimesheetContext.tsx            # UPDATED
      ReviewContext.tsx               # NEW
    
    validators/
      timesheetEntry.schema.ts        # NEW (Zod)
      approval.schema.ts              # NEW (Zod)
    
    utils/
      date.utils.ts                   # NEW
      calculations.utils.ts           # NEW
      formatting.utils.ts             # NEW
```

---

## Migration Checklist

### Database Migration
- [ ] Backup existing database
- [ ] Create new schemas
- [ ] Write data migration scripts
- [ ] Test migration in dev
- [ ] Execute migration in staging
- [ ] Validate data integrity
- [ ] Execute migration in production

### Code Migration
- [ ] Create new service files
- [ ] Migrate business logic
- [ ] Update API endpoints
- [ ] Update frontend components
- [ ] Update tests
- [ ] Remove deprecated code

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Performance benchmarks met
- [ ] SonarQube compliance verified

### Documentation
- [ ] API documentation updated
- [ ] User guides updated
- [ ] Developer documentation updated
- [ ] Migration guide created

---

## Success Metrics

1. **Code Quality**
   - SonarQube: 0 critical issues
   - Cognitive Complexity: < 15 for all methods
   - Test Coverage: > 80%

2. **Performance**
   - API response time: < 500ms (95th percentile)
   - Page load time: < 2s
   - Database query time: < 100ms

3. **Business Goals**
   - All business requirements implemented
   - Clear approval workflows
   - Accurate hour calculations
   - Proper validation enforcement
   - Custom task support with correct billable defaults

---

## Risk Mitigation

1. **Data Loss**: Full database backup before migration
2. **Downtime**: Staged rollout with rollback plan
3. **Breaking Changes**: API versioning maintained
4. **Performance Issues**: Load testing before production
5. **User Training**: Comprehensive documentation and guides

---

## Next Steps

1. **Review this plan** with the team
2. **Allocate resources** for 8-week timeline
3. **Set up development environment** for new structure
4. **Begin Phase 1** (Database & Models)
5. **Schedule weekly checkpoints** for progress review

---

**Document Version:** 1.0  
**Last Updated:** October 21, 2025  
**Author:** AI Development Team  
**Status:** Pending Approval
