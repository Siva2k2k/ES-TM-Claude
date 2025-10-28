# Training Entry Feature - Implementation Summary

## Overview
This document summarizes the implementation of the Training Entry feature for the ES-TM (Employee & Shift - Time Management) system. Training entries allow employees to log time spent on training activities, which follow a streamlined approval workflow and are always non-billable.

---

## Feature Requirements

### Key Requirements Implemented
1. ✅ Training entries are grouped in a Training Project (week-based)
2. ✅ Training entries go directly to Manager for approval (skip Lead approval)
3. ✅ A common Training Project exists under Project Management with default tasks
4. ✅ Default tasks are accessible to all employees when selecting training entries
5. ✅ Management/Manager/Admin can add/edit/delete training tasks
6. ✅ Training entries are **always non-billable**
7. ✅ On Manager approval, training entries move to Management for verification
8. ✅ Once verified by Management, training hours appear in Project Billing Breakdown

### Approval Flow
```
Employee Creates Training Entry → Manager Approval → Management Verification → Frozen → Billing
(Bypasses Lead Approval)
```

---

## Backend Implementation

### 1. Database & Seed Data

**File**: `backend/src/scripts/seedTraining.ts`

Added:
- **Internal Client**: For internal company projects and training
- **Training Program Project**:
  - `project_type: 'training'`
  - `is_billable: false`
  - `status: 'active'`
  - Globally accessible (not tied to specific manager)
- **Default Training Task**: "General Training" task

### 2. Project Model

**File**: `backend/src/models/Project.ts`

Added:
- `getTrainingProject()` static method to fetch the active training project
  ```typescript
  ProjectSchema.statics.getTrainingProject = async function(): Promise<IProject | null> {
    return this.findOne({
      project_type: 'training',
      status: 'active',
      deleted_at: null
    }).exec();
  };
  ```

### 3. Approval Logic

**File**: `backend/src/services/TimesheetService.ts`

Modified `submitTimesheet()` method:
- Training projects automatically set `lead_status='not_required'`
- Training entries notify Manager directly (skip Lead notification)
- Force `is_billable=false` for all training entries at creation time

**File**: `backend/src/services/TeamReviewApprovalService.ts`

Modified `checkAllLeadsApproved()` method:
- Now properly handles `'not_required'` status for training projects
- Training approvals don't wait for Lead approval

### 4. API Endpoints

**File**: `backend/src/controllers/ProjectController.ts`

Added 4 new endpoints:

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/projects/training` | All authenticated users | Fetch training project with all tasks |
| POST | `/api/v1/projects/training/tasks` | Management/Manager/Admin | Add new training task |
| PUT | `/api/v1/projects/training/tasks/:taskId` | Management/Manager/Admin | Update training task |
| DELETE | `/api/v1/projects/training/tasks/:taskId` | Management/Manager/Admin | Delete training task (soft delete) |

**File**: `backend/src/routes/project.ts`

Added routes with proper validation middleware.

### 5. Service Layer

**File**: `backend/src/services/ProjectService.ts`

Added methods:
- `getTrainingProjectWithTasks()` - Fetches training project and tasks
- `addTrainingTask()` - Creates task (enforces `is_billable=false`)
- `updateTrainingTask()` - Updates task (maintains non-billable status)
- `deleteTrainingTask()` - Soft deletes task

### 6. Validation & Security

**File**: `backend/src/controllers/ProjectController.ts`

Added validation schemas:
- `createTrainingTaskValidation` - Validates task creation
- `updateTrainingTaskValidation` - Validates task updates

**File**: `backend/src/services/TimesheetService.ts`

In `addTimeEntry()` method:
- Automatically detects training project entries
- Forces `is_billable=false` regardless of user input
- Validation prevents manual override

---

## Frontend Implementation

### 1. Timesheet Form

**File**: `frontend/src/components/timesheet/TimesheetForm.tsx`

Added:
- State for training project and tasks:
  ```typescript
  const [trainingProject, setTrainingProject] = useState<{ id: string; name: string } | null>(null);
  const [trainingTasks, setTrainingTasks] = useState<Array<{ id: string; name: string }>>([]);
  ```

- `useEffect` hook to fetch training data on component mount

- Updated training entry creation to use training project ID and default task

- Updated info panel to display:
  - Training project name
  - **Non-billable** indicator
  - Correct approval flow: **Manager → Management** (bypassing Lead)
  - Loading state
  - Error state if training project not found

- Disabled "Add Training Entry" button when training data is loading or unavailable

### 2. Timesheet Entry Row

**File**: `frontend/src/components/timesheet/TimesheetEntryRow.tsx`

Added:
- **Non-Billable badge** for training, leave, and miscellaneous entries
- Disabled billable checkbox for non-billable entry types
- Training entries already show correct project emoji: 📚 Training
- Task selection automatically filtered to training tasks

### 3. Training Task Management UI

**File**: `frontend/src/pages/training/TrainingTasksPage.tsx`

Created new page with:
- **Permission check**: Only Management, Manager, and Super Admin can access
- **List all training tasks** with:
  - Task name and description
  - Active/Inactive badge
  - Creation date
  - Edit and Delete actions

- **Add new training task**:
  - Name (required)
  - Description (optional)
  - Automatic `is_billable=false` enforcement

- **Edit existing training task**:
  - Update name and description
  - Cannot change non-billable status

- **Delete training task**:
  - Soft delete with confirmation
  - Task remains in database but marked as deleted

- **Info panel** explaining:
  - Training tasks are visible to all employees
  - Training entries are non-billable
  - Training entries skip Lead approval
  - Training hours appear in billing breakdown

---

## Data Flow

### Creating a Training Entry

1. **Employee selects "Training" category**
   - Frontend fetches training project and tasks from `/api/v1/projects/training`
   - Displays training project name and available tasks
   - Shows info about non-billable and approval flow

2. **Employee adds training entry**
   - Entry auto-populated with training project ID
   - Default task selected (first available training task)
   - Hours defaulted to 8
   - `is_billable` forced to `false`

3. **Employee saves timesheet** (draft)
   - Entry saved to database
   - Backend validates and enforces non-billable status

4. **Employee submits timesheet**
   - `TimesheetProjectApproval` record created with:
     - `lead_status='not_required'` (training projects skip lead)
     - `manager_status='pending'`
     - `management_status='pending'`
   - Notification sent **directly to Manager** (not Lead)

5. **Manager approves**
   - Training entry approved
   - Status moves to `management_pending`
   - Notification sent to Management

6. **Management verifies**
   - Training entry frozen
   - Appears in Project Billing Breakdown as:
     - **Worked Hours**: X hours
     - **Billable Hours**: 0 hours

### Managing Training Tasks

1. **Access Training Tasks page** (Management/Manager/Admin only)
   - Fetch `/api/v1/projects/training`
   - Display all training tasks

2. **Add new task**
   - POST to `/api/v1/projects/training/tasks`
   - Validation ensures name is provided
   - Task automatically set to `is_billable=false`

3. **Edit task**
   - PUT to `/api/v1/projects/training/tasks/:taskId`
   - Can update name and description
   - Cannot change billable status (always false)

4. **Delete task**
   - DELETE to `/api/v1/projects/training/tasks/:taskId`
   - Soft delete (task.deleted_at set)
   - Task no longer appears in training task list

---

## Key Technical Details

### Approval Flow Logic

**Lead Status for Training Projects**:
```typescript
// In TimesheetService.submitTimesheet()
if (project.project_type === 'training') {
  leadStatus = 'not_required';
}
```

**Notification Logic**:
```typescript
// Training projects skip lead and notify manager directly
if (currentUser.role === 'employee') {
  if (project.project_type === 'training') {
    // Notify manager directly
    if (managerId && managerId !== timesheetOwnerId) {
      submissionRecipientIds.add(managerId);
    }
  } else {
    // Regular projects - notify lead
    if (leadId && leadId !== timesheetOwnerId) {
      submissionRecipientIds.add(leadId);
    }
  }
}
```

### Non-Billable Enforcement

**Backend Validation** (in `TimesheetService.addTimeEntry()`):
```typescript
// Check if entry is for training project - training entries must be non-billable
let isBillable = entryData.is_billable;
if (entryData.project_id) {
  const project = await Project.findById(entryData.project_id).lean();
  if (project && project.project_type === 'training') {
    isBillable = false; // Force non-billable for training projects
  }
}
```

**Task Creation** (in `ProjectService.addTrainingTask()`):
```typescript
const task = await Task.create({
  name: taskData.name,
  description: taskData.description || '',
  project_id: project._id,
  // ... other fields
  is_billable: false, // Training tasks are always non-billable
});
```

### Frontend State Management

**Training Data Fetching**:
```typescript
useEffect(() => {
  const fetchTrainingData = async () => {
    setLoadingTrainingData(true);
    try {
      const response = await backendApi.get('/projects/training');
      if (response.success && response.project && response.tasks) {
        setTrainingProject({ id: response.project.id, name: response.project.name });
        setTrainingTasks(response.tasks.map((task: any) => ({
          id: task.id,
          name: task.name
        })));
      }
    } catch (error) {
      console.error('Failed to fetch training project:', error);
    } finally {
      setLoadingTrainingData(false);
    }
  };

  fetchTrainingData();
}, []);
```

---

## Testing Checklist

### Backend Testing
- [ ] Run seed script to create Training Project and default task
- [ ] Verify `GET /api/v1/projects/training` returns project and tasks
- [ ] Test creating training task (Management/Manager/Admin only)
- [ ] Test updating training task
- [ ] Test deleting training task (soft delete)
- [ ] Test permission checks (employees cannot manage training tasks)
- [ ] Verify training entries are forced to `is_billable=false`

### Frontend Testing
- [ ] Create timesheet and select "Training" category
- [ ] Verify training project name and tasks are fetched
- [ ] Verify info panel shows correct approval flow
- [ ] Add training entry and verify project/task are auto-populated
- [ ] Verify "Non-Billable" badge is displayed
- [ ] Verify billable checkbox is disabled
- [ ] Submit timesheet and verify it goes to Manager (not Lead)
- [ ] Access Training Tasks page as Management/Manager/Admin
- [ ] Add new training task and verify it appears in timesheet form
- [ ] Edit and delete training tasks
- [ ] Verify employees cannot access Training Tasks page

### Approval Flow Testing
- [ ] Employee submits timesheet with training entry
- [ ] Verify Manager receives notification (Lead does not)
- [ ] Manager approves training entry
- [ ] Verify Management receives notification
- [ ] Management verifies and freezes timesheet
- [ ] Check Project Billing Breakdown:
  - Training hours appear in worked hours
  - Training hours show 0 billable hours
  - Training project listed with other projects

---

## Files Modified/Created

### Backend Files

**Modified**:
1. `backend/src/scripts/seed.ts` - Added Training Project and default task
2. `backend/src/models/Project.ts` - Added `getTrainingProject()` static method
3. `backend/src/services/TimesheetService.ts` - Training approval logic and non-billable enforcement
4. `backend/src/services/TeamReviewApprovalService.ts` - Updated `checkAllLeadsApproved()` for training
5. `backend/src/controllers/ProjectController.ts` - Added training endpoints
6. `backend/src/routes/project.ts` - Added training routes
7. `backend/src/services/ProjectService.ts` - Added training task management methods

**Created**:
- None (all modifications to existing files)

### Frontend Files

**Modified**:
1. `frontend/src/components/timesheet/TimesheetForm.tsx` - Training data fetching and entry creation
2. `frontend/src/components/timesheet/TimesheetEntryRow.tsx` - Non-billable badge and checkbox

**Created**:
1. `frontend/src/pages/training/TrainingTasksPage.tsx` - Training task management UI

---

## Deployment Notes

### Database Migration
1. Run seed script to create Training Project:
   ```bash
   cd backend
   npm run seed
   ```

2. Verify Training Project exists:
   - Check database for project with `project_type='training'`
   - Verify default "General Training" task exists

### Environment Variables
No new environment variables required.

### Routing (To Be Added)
Add route for Training Tasks Management page in frontend routing configuration:
```typescript
{
  path: '/training/tasks',
  component: TrainingTasksPage,
  requiresAuth: true,
  requiresRole: ['management', 'manager', 'super_admin']
}
```

### API Documentation
Update API documentation with new training endpoints:
- `GET /api/v1/projects/training`
- `POST /api/v1/projects/training/tasks`
- `PUT /api/v1/projects/training/tasks/:taskId`
- `DELETE /api/v1/projects/training/tasks/:taskId`

---

## Future Enhancements

1. **Training Categories**: Add categories for training tasks (e.g., Technical, Soft Skills, Certifications)
2. **Training Reports**: Generate reports showing training hours per employee/department
3. **Training Budget**: Track training budget vs. actual hours
4. **Training Certificates**: Attach completion certificates to training entries
5. **Training Calendar**: View upcoming training sessions
6. **Training Approval Notifications**: Enhanced notifications with training details
7. **Training Analytics**: Dashboard showing training trends and patterns

---

## Support & Maintenance

### Known Limitations
1. Training Tasks Management page route needs to be added to frontend routing
2. No training-specific reports yet (uses standard project billing breakdown)
3. Training project must be manually created if database is reset without seed data

### Common Issues & Solutions

**Issue**: Training project not found
**Solution**: Run seed script or manually create Training Project with `project_type='training'`

**Issue**: Employees cannot see training tasks
**Solution**: Ensure training project `status='active'` and tasks have `deleted_at=null`

**Issue**: Training entries showing as billable
**Solution**: Backend enforces non-billable; check if frontend is sending correct project_id

---

## Conclusion

The Training Entry feature has been successfully implemented with all required functionality:
- ✅ Streamlined approval workflow (bypassing Lead approval)
- ✅ Always non-billable enforcement
- ✅ Global training project with manageable tasks
- ✅ Management UI for training task administration
- ✅ Clear indicators in UI (badges, info panels)
- ✅ Integration with existing billing breakdown

The feature is production-ready pending:
1. Adding frontend route for Training Tasks Management page
2. Running seed script to create Training Project
3. User acceptance testing

**Implementation Date**: January 2025
**Implemented By**: Claude Code
**Status**: ✅ Complete
