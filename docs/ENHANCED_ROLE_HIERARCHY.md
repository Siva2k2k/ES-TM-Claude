# Enhanced Role Hierarchy Documentation

## Overview
This document outlines the clarified role hierarchy and permissions for the Employee Timesheet Management system, specifically focusing on the System Wide Lead role capabilities and project-based role elevation.

## System Architecture
- **Backend**: Node.js + MongoDB (Port 3001)
- **Frontend**: React + Vite (Port 5173)
- **Database**: MongoDB with role-based collections

## System-Wide Roles

### 1. Super Admin
- **Project Roles**: None needed (system access overrides)
- **Permissions**: Full system control, user management, all projects access

### 2. Management 
- **Project Roles**: None needed (system access overrides)
- **Permissions**: Business oversight, approve managers, financial reports

### 3. Manager
- **Project Roles**: Can take `secondary_manager`, `lead`, or `employee` roles in projects
- **Key Point**: Manager maintains same high-level access regardless of project role
- **Permissions**: Department management, project creation, timesheet approval

### 4. Lead (System Wide)
- **Project Roles**: Can be `secondary_manager`, `lead`, or `employee` in specific projects
- **Key Role**: This is where the hierarchy becomes flexible and project-specific

### 5. Employee
- **Project Roles**: Can be elevated to `lead` or remain as `employee` in projects
- **Permissions**: Individual work, timesheet submission, task completion

## System Wide Lead - Detailed Permissions

### ✅ What a System Lead CAN Do:

#### System Level Permissions:
```typescript
const LEAD_SYSTEM_PERMISSIONS = {
  // Team Management
  viewEmployeeTimesheets: true,        // Read-only access to employee timesheets
  guideTeamMembers: true,              // Mentor and guide employees
  viewTeamProgress: true,              // Monitor team performance
  
  // Project Participation
  participateInMultipleProjects: true, // Can be assigned to multiple projects
  viewAssignedProjectAnalytics: true,  // Analytics for projects they're in
  submitOwnTimesheets: true,           // Submit personal timesheets
  
  // Task Management (Project Context)
  assignTasksToEmployees: true,        // When in project as Lead
  coordinateTeamActivities: true,      // Team coordination within projects
  viewAllProjectTasks: true,           // See all tasks in assigned projects
}
```

#### Project Level Permissions (Role-Based):
```typescript
// When assigned as "Lead" in project
const PROJECT_LEAD_PERMISSIONS = {
  assignTasks: true,
  coordinateTeam: true,
  viewProjectProgress: true,
  guideProjectMembers: true,
}

// When elevated to "Secondary Manager" in project  
const PROJECT_SECONDARY_MANAGER_PERMISSIONS = {
  addRemoveMembers: true,
  approveTimesheets: true,
  manageProjectTasks: true,
  managerLevelAccess: true, // Within that specific project only
}
```

### ❌ What a System Lead CANNOT Do:

#### System Level Restrictions:
```typescript
const LEAD_SYSTEM_RESTRICTIONS = {
  // User Management
  createUsers: false,
  editUsers: false,
  deleteUsers: false,
  approveUserRegistrations: false,
  activateDeactivateUsers: false,
  changeUserRoles: false,
  
  // Project Management  
  createProjects: false,
  deleteProjects: false,
  addClients: false,
  
  // Financial & Administrative
  accessBillingData: false,
  approveSystemWideTimesheets: false, // Only in specific projects if elevated
  accessSystemConfiguration: false,
  viewAuditLogs: false, // System level audit logs
  exportSystemReports: false,
}
```

## Project Role Elevation Matrix

| System Role | Available Project Roles | Elevation Benefits |
|-------------|------------------------|-------------------|
| Super Admin | None (system overrides) | N/A |
| Management | None (system overrides) | N/A |
| Manager | secondary_manager, lead, employee | Role is organizational only |
| **Lead** | **secondary_manager**, lead, employee | **Can gain manager-level access in specific projects** |
| Employee | lead, employee | Can be promoted to lead specific projects |

## Implementation Details

### Frontend Hook Enhancement
```typescript
// useRoleManager.ts - New capabilities
export const useRoleManager = () => {
  return {
    // Enhanced Lead-specific permissions
    canViewTeamTimesheets: () => boolean,
    canGuideTeamMembers: () => boolean,
    canAssignTasks: (projectId?: string) => boolean,
    
    // Project elevation utilities
    canBeElevatedInProject: (targetRole: ProjectRole) => boolean,
    getAvailableProjectRoles: () => ProjectRole[],
    getEffectivePermissions: (projectId?: string, projectRole?: ProjectRole) => {...}
  };
};
```

### Backend Permission Logic
```javascript
// authorization.js - Enhanced permission checking
function getUserEffectivePermissions(systemRole, projectRole, projectId) {
  // System-level permissions first
  const systemPerms = getSystemPermissions(systemRole);
  
  // Manager role gets same access everywhere
  if (systemRole === 'manager') {
    return { ...systemPerms, projectOverride: false };
  }
  
  // Project-specific enhancements for Lead/Employee
  const projectEnhanced = getProjectEnhancements(projectRole);
  
  return {
    system: systemPerms,
    project: projectEnhanced,
    effective: mergePermissions(systemPerms, projectEnhanced)
  };
}
```

### Database Structure
```javascript
// Project Member Schema Enhancement
{
  project_id: ObjectId,
  user_id: ObjectId,
  project_role: 'secondary_manager' | 'lead' | 'employee', // Project-specific role
  system_role: 'lead', // User's system role (for reference)
  elevated_permissions: ['approve_timesheets', 'manage_members'], // When elevated
  effective_date: Date,
  assigned_by: ObjectId
}
```

## Use Cases & Examples

### Example 1: Lead Elevated to Secondary Manager
```
Sarah (System Role: Lead)
├── Project Alpha: Role = secondary_manager
│   ├── ✅ Can approve timesheets in Project Alpha
│   ├── ✅ Can add/remove members in Project Alpha  
│   └── ✅ Has manager-level access in Project Alpha
├── Project Beta: Role = lead
│   ├── ✅ Can assign tasks in Project Beta
│   ├── ✅ Can coordinate team in Project Beta
│   └── ❌ Cannot approve timesheets in Project Beta
└── System Level: Role = lead
    ├── ✅ Can view employee timesheets (read-only)
    ├── ✅ Can guide team members
    └── ❌ Cannot create projects or manage users
```

### Example 2: Manager with Project Role
```
Mike (System Role: Manager)
├── Project Gamma: Role = employee (organizational choice)
│   └── ✅ Still has full manager access (system role overrides)
├── Project Delta: Role = secondary_manager  
│   └── ✅ Full manager access (same as always)
└── System Level: Role = manager
    └── ✅ Full management permissions everywhere
```

## Implementation Timeline

### Phase 1: Backend Enhancement (Week 1)
- [ ] Update `getUserEffectivePermissions` function
- [ ] Add project role validation in ProjectService
- [ ] Implement role elevation logic
- [ ] Update permission middleware

### Phase 2: Frontend Integration (Week 2)  
- [x] Enhanced `useRoleManager` hook with project context
- [ ] Update project member management UI
- [ ] Add role elevation indicators
- [ ] Update permission checks across components

### Phase 3: User Experience (Week 3)
- [ ] Add project role display in user interfaces
- [ ] Implement role elevation workflow
- [ ] Add effective permission indicators
- [ ] Update help documentation

## Key Benefits

✅ **Clear Hierarchy**: System Lead role has defined capabilities and limitations
✅ **Project Flexibility**: Leads can be elevated to gain manager-level access in specific projects  
✅ **Maintainable**: Simple rule system - system permissions first, then project enhancements
✅ **Scalable**: Easy to add new roles or modify permissions
✅ **Practical**: Addresses real-world team leadership needs

This structure maintains simplicity while providing the flexibility needed for project-based team management.