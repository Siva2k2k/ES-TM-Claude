# Final Integration Summary: Lead → Secondary Manager Role Elevation

## 🎯 Complete Integration Plan

This document shows exactly how the frontend and backend work together when a Lead gets elevated to Secondary Manager in a specific project.

## Backend Integration Steps

### 1. Enhanced Permission Service (Already Created)
✅ **File**: `backend/src/utils/enhancedAuthorization.ts`
- Contains `getUserEffectivePermissions()` function
- Handles role elevation logic
- Returns combined system + project permissions

### 2. Update Project Service Method
**File**: `backend/src/services/ProjectService.ts` - `getProjectPermissions` method

```javascript
// Enhanced to return:
{
  projectRole: 'secondary_manager',    // Current project role
  systemRole: 'lead',                  // User's system role  
  isElevated: true,                    // Whether user is elevated
  canAddMembers: true,                 // From project role enhancement
  canApproveTimesheets: true,          // From project role enhancement
  canAssignTasks: true,                // From system + project roles
  canViewAllTasks: true,               // From enhanced permissions
  effectivePermissions: [...]          // Combined permission list
}
```

### 3. Role Elevation API Endpoint
**New Route**: `PUT /api/v1/projects/:projectId/members/:userId/elevate`

```javascript
// Allows managers to elevate team members
app.put('/api/v1/projects/:projectId/members/:userId/elevate', async (req, res) => {
  const { targetProjectRole } = req.body;
  
  // Validate current user can manage project members
  // Validate target role elevation is allowed
  // Update project membership with new role
  // Log the elevation for audit
  // Return success
});
```

## Frontend Integration Steps

### 1. Enhanced Role Manager Hook (✅ Already Updated)
**File**: `frontend/src/hooks/useRoleManager.ts`
- Added project-specific permission methods
- Includes role elevation utilities
- Returns effective permissions

### 2. Update Project Context
**File**: `frontend/src/contexts/ProjectContext.tsx`

```typescript
// Add to ProjectPermissions interface:
interface ProjectPermissions {
  projectRole: string | null;
  systemRole: string;
  isElevated: boolean;        // NEW: Whether user has elevated role
  hasManagerAccess: boolean;
  canAddMembers: boolean;
  canApproveTimesheets: boolean;
  canViewAllTasks: boolean;
  canAssignTasks: boolean;
  effectivePermissions: string[];  // NEW: List of all permissions
}
```

### 3. Update Project Member Management Component
**File**: `frontend/src/components/ProjectMemberManagement.tsx`

**Key Changes**:
```tsx
// Add role elevation controls
const ProjectMemberManagement = ({ projectId }) => {
  const { canManageProjectMembers } = useRoleManager();
  
  // Load enhanced permissions
  const loadPermissions = async () => {
    const response = await fetch(`/api/v1/projects/${projectId}/permissions`);
    const data = await response.json();
    setPermissions(data.permissions);
  };

  // Handle role elevation
  const handleElevateRole = async (memberId, targetRole) => {
    const response = await fetch(`/api/v1/projects/${projectId}/members/${memberId}/elevate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetProjectRole: targetRole })
    });
    
    if (response.ok) {
      showSuccess('Member role elevated successfully');
      loadProjectData(); // Refresh
    }
  };

  return (
    <div>
      {/* Role elevation banner for current user */}
      {permissions?.isElevated && <ElevationBanner />}
      
      {/* Member list with elevation controls */}
      {members.map(member => (
        <MemberRow 
          member={member}
          canElevate={canManageProjectMembers(projectId)}
          onElevate={handleElevateRole}
        />
      ))}
    </div>
  );
};
```

## UI Changes When Lead → Secondary Manager

### Sarah's Experience Timeline

#### Before Elevation:
```
1. Dashboard shows: "System Role: Lead"
2. Project Alpha card: "Project Role: Lead" 
3. Available actions:
   ✅ Assign tasks to employees
   ✅ View team timesheets (read-only)
   ✅ Guide team members
   ❌ Add/remove project members
   ❌ Approve timesheets
```

#### Manager Elevates Sarah:
```
1. Manager goes to Project Alpha → Team Management
2. Finds Sarah's row, clicks "Elevate" button
3. Selects "Secondary Manager" from dropdown
4. API call: PUT /api/projects/alpha/members/sarah/elevate
5. Database: sets is_secondary_manager = true
```

#### After Elevation:
```
1. Sarah's page refreshes automatically (WebSocket/polling)
2. Blue banner appears: "Enhanced Project Role - Secondary Manager"
3. Permission cards update:
   ✅ Manage Members (NEW - unlocked)
   ✅ Approve Timesheets (NEW - unlocked) 
   ✅ Assign Tasks (already had)
   ✅ View All Tasks (already had)
4. Navigation: New menu item "Manage Project Alpha" 
5. Timesheet page: Approve/Reject buttons appear
6. Project team: "Add Member" button appears
```

## Code Implementation Checklist

### Phase 1: Backend (Week 1)
- [ ] Update `ProjectService.getProjectPermissions()` method
- [ ] Add role elevation API endpoint
- [ ] Update project member queries to check `is_secondary_manager`
- [ ] Add audit logging for role elevations
- [ ] Test permission logic with different role combinations

### Phase 2: Frontend (Week 2)
- [ ] Update `ProjectContext` to handle new permission structure
- [ ] Modify `ProjectMemberManagement` component with elevation controls
- [ ] Add role elevation banner component
- [ ] Update timesheet components with conditional approval buttons
- [ ] Add visual indicators for elevated roles

### Phase 3: Testing (Week 3)
- [ ] Test role elevation workflow end-to-end
- [ ] Verify permission enforcement on all actions
- [ ] Test UI updates and real-time changes
- [ ] Validate audit trail and logging
- [ ] User acceptance testing

## Key Technical Benefits

✅ **Granular Permissions**: Each project can have different role assignments
✅ **System Role Preservation**: Sarah remains a "Lead" system-wide
✅ **Project-Specific Enhancement**: Gets manager powers only in Project Alpha  
✅ **UI Adaptability**: Interface changes dynamically based on effective permissions
✅ **Audit Trail**: All role changes are logged for compliance
✅ **Scalable**: Easy to add new project roles or modify permissions

## Real-World Use Cases

### Scenario 1: Cross-Project Leadership
```
John (System: Lead)
├── Project A: Lead role (standard permissions)
├── Project B: Secondary Manager (elevated - can approve timesheets)  
└── Project C: Employee (demoted for learning purposes)
```

### Scenario 2: Temporary Elevation
```
Alice (System: Employee)  
├── Project X: Lead role (elevated for 3 months)
└── Other projects: Employee role (standard)
```

### Scenario 3: Manager Taking Employee Role
```
Bob (System: Manager)
├── Project Y: Employee role (learning new tech stack)
└── All other projects: Full manager access (system role overrides)
```

This integration provides the flexibility needed for real-world project management while maintaining clear hierarchies and permissions!