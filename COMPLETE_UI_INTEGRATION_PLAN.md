# Complete Integration Plan: Lead → Secondary Manager UI Adaptation

## Overview
This plan shows exactly how the UI adapts when Sarah (System Lead) gets elevated to Secondary Manager role in Project Alpha, with real code examples and screenshots.

## Scenario: Sarah's Role Elevation

**Before**: Sarah (System Lead) → Project Alpha (Lead role)
**After**: Sarah (System Lead) → Project Alpha (Secondary Manager role)

## 🎯 UI Changes That Happen

### 1. Project Dashboard - Permission Indicators
```tsx
// Enhanced Project Dashboard with Role Elevation Indicators
const ProjectDashboard = ({ projectId }) => {
  const { getProjectPermissions, currentRole } = useEnhancedRoleManager();
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    loadPermissions();
  }, [projectId]);

  const loadPermissions = async () => {
    const perms = await getProjectPermissions(projectId);
    setPermissions(perms);
  };

  return (
    <div className="project-dashboard">
      {/* Role Elevation Banner */}
      {permissions?.isElevated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Crown className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900">
                Enhanced Project Role
              </h4>
              <p className="text-sm text-blue-700">
                You have been elevated to <span className="font-semibold">{permissions.projectRole}</span> in this project.
                You have additional permissions beyond your system role ({permissions.systemRole}).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Permission Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <PermissionCard
          icon={Users}
          title="Manage Members"
          enabled={permissions?.canAddMembers}
          description={permissions?.canAddMembers ? "Add/remove project members" : "View members only"}
        />
        <PermissionCard
          icon={CheckCircle}
          title="Approve Timesheets"
          enabled={permissions?.canApproveTimesheets}
          description={permissions?.canApproveTimesheets ? "Approve team timesheets" : "Submit timesheets only"}
        />
        <PermissionCard
          icon={Settings}
          title="Assign Tasks"
          enabled={permissions?.canAssignTasks}
          description={permissions?.canAssignTasks ? "Create and assign tasks" : "Complete assigned tasks"}
        />
        <PermissionCard
          icon={Eye}
          title="View All Tasks"
          enabled={permissions?.canViewAllTasks}
          description={permissions?.canViewAllTasks ? "See all project tasks" : "View assigned tasks only"}
        />
      </div>
    </div>
  );
};
```

### 2. Project Member Management - Enhanced UI
```tsx
// Enhanced Project Member Management with Role Elevation
const EnhancedProjectMemberManagement = ({ projectId }) => {
  const { canManageProjectMembers, canAssignTasks, getEffectivePermissions } = useEnhancedRoleManager();
  const [members, setMembers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const permissions = getEffectivePermissions(projectId);

  return (
    <div className="project-member-management">
      {/* Enhanced Header with Permission Context */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Team</h2>
          <p className="text-gray-600 mt-1">
            {canManageProjectMembers(projectId) 
              ? "Manage project members and assign roles"
              : "View project team members"
            }
          </p>
        </div>

        {/* Add Member Button - Only shows if user can manage members */}
        {canManageProjectMembers(projectId) && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </button>
        )}
      </div>

      {/* Members List with Enhanced Actions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {members.map((member) => (
          <MemberRow 
            key={member.id} 
            member={member}
            canManageMembers={canManageProjectMembers(projectId)}
            canAssignTasks={canAssignTasks(projectId)}
            permissions={permissions}
          />
        ))}
      </div>

      {/* Enhanced Add Member Modal */}
      {showAddModal && (
        <AddMemberModal 
          projectId={projectId}
          onClose={() => setShowAddModal(false)}
          userSystemRole={permissions.systemRole}
          availableProjectRoles={permissions.availableProjectRoles}
        />
      )}
    </div>
  );
};
```

### 3. Timesheet Management - Approval Powers
```tsx
// Enhanced Timesheet View with Conditional Approval
const EnhancedTimesheetView = ({ projectId, timesheetId }) => {
  const { canApproveProjectTimesheets, getProjectRole } = useEnhancedRoleManager();
  const [timesheet, setTimesheet] = useState(null);
  const [canApprove, setCanApprove] = useState(false);

  useEffect(() => {
    loadTimesheet();
    checkApprovalPermission();
  }, [timesheetId, projectId]);

  const checkApprovalPermission = async () => {
    const projectRole = await getProjectRole(projectId);
    const approvalPermission = canApproveProjectTimesheets(projectId);
    setCanApprove(approvalPermission);
  };

  const handleApproval = async (action) => {
    if (!canApprove) {
      toast.error("You don't have permission to approve timesheets in this project");
      return;
    }

    // Process approval...
  };

  return (
    <div className="timesheet-view">
      {/* Timesheet Details */}
      <TimesheetDetails timesheet={timesheet} />

      {/* Conditional Approval Section */}
      {canApprove && timesheet?.status === 'submitted' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">
            Timesheet Approval
          </h3>
          <div className="flex space-x-4">
            <button
              onClick={() => handleApproval('approve')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Timesheet
            </button>
            <button
              onClick={() => handleApproval('reject')}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <X className="h-4 w-4 mr-2" />
              Reject Timesheet
            </button>
          </div>
        </div>
      )}

      {/* Info Banner for Non-Managers */}
      {!canApprove && timesheet?.status === 'submitted' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-gray-600">
            This timesheet is pending approval from a project manager.
          </p>
        </div>
      )}
    </div>
  );
};
```

### 4. Navigation Sidebar - Dynamic Menu Items
```tsx
// Enhanced Sidebar with Permission-Based Menu Items
const EnhancedSidebar = () => {
  const { currentRole, getProjectsWithElevatedRoles, canManageUsers } = useEnhancedRoleManager();
  const [elevatedProjects, setElevatedProjects] = useState([]);

  useEffect(() => {
    loadElevatedProjects();
  }, []);

  const loadElevatedProjects = async () => {
    const projects = await getProjectsWithElevatedRoles();
    setElevatedProjects(projects);
  };

  return (
    <div className="sidebar">
      {/* User Role Display */}
      <div className="user-role-section p-4 border-b">
        <h3 className="text-sm font-semibold text-gray-900">System Role</h3>
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {currentRole}
        </span>

        {/* Elevated Projects Display */}
        {elevatedProjects.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Enhanced Roles
            </h4>
            <div className="mt-2 space-y-1">
              {elevatedProjects.map(project => (
                <div key={project.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 truncate">{project.name}</span>
                  <span className="inline-flex px-1 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">
                    {project.projectRole}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Menu Items */}
      <nav className="navigation-menu">
        <MenuItem href="/dashboard" icon={Home} label="Dashboard" />
        <MenuItem href="/projects" icon={Folder} label="Projects" />
        <MenuItem href="/timesheets" icon={Clock} label="Timesheets" />
        
        {/* Conditional Management Items */}
        {canManageUsers() && (
          <MenuItem href="/users" icon={Users} label="User Management" />
        )}

        {/* Project-Specific Management */}
        {elevatedProjects.some(p => p.canManageMembers) && (
          <MenuSection title="Project Management">
            {elevatedProjects.filter(p => p.canManageMembers).map(project => (
              <MenuItem 
                key={project.id}
                href={`/projects/${project.id}/manage`}
                icon={Crown}
                label={`Manage ${project.name}`}
                badge="Enhanced"
              />
            ))}
          </MenuSection>
        )}
      </nav>
    </div>
  );
};
```

## 🔄 Backend API Enhancement

### Enhanced Permission Endpoint
```javascript
// GET /api/v1/projects/:projectId/permissions
app.get('/api/v1/projects/:projectId/permissions', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    
    // Use enhanced authorization
    const { getUserEffectivePermissions } = require('../utils/enhancedAuthorization');
    
    // Get user's system role
    const user = await User.findById(userId);
    const systemRole = user.role;
    
    // Get project role (check for elevation)
    const membership = await ProjectMember.findOne({
      project_id: projectId,
      user_id: userId,
      removed_at: { $exists: false }
    });
    
    let projectRole = membership?.project_role || null;
    const isElevated = (systemRole === 'lead' && membership?.is_secondary_manager) ||
                      (systemRole === 'employee' && projectRole === 'lead');
    
    if (membership?.is_secondary_manager) {
      projectRole = 'secondary_manager';
    }
    
    // Get effective permissions
    const permissions = getUserEffectivePermissions(systemRole, projectRole, projectId);
    
    res.json({
      permissions: {
        systemRole,
        projectRole,
        isElevated,
        canAddMembers: permissions.canManageProjectMembers,
        canApproveTimesheets: permissions.canApproveTimesheets,
        canAssignTasks: permissions.canAssignTasks,
        canViewAllTasks: permissions.canViewTeamData || permissions.canAssignTasks,
        effectivePermissions: permissions.effectivePermissions
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});
```

### Role Elevation Endpoint
```javascript
// PUT /api/v1/projects/:projectId/members/:userId/elevate
app.put('/api/v1/projects/:projectId/members/:userId/elevate', async (req, res) => {
  try {
    const { projectId, userId } = req.params;
    const { targetProjectRole } = req.body;
    const currentUser = req.user;
    
    // Check if current user can manage project members
    const permissions = getUserEffectivePermissions(currentUser.role, null, projectId);
    if (!permissions.canManageProjectMembers) {
      return res.status(403).json({ error: 'Cannot manage project members' });
    }
    
    // Validate elevation
    const targetUser = await User.findById(userId);
    const { canUserBeElevated } = require('../utils/enhancedAuthorization');
    
    if (!canUserBeElevated(targetUser.role, targetProjectRole)) {
      return res.status(400).json({ 
        error: `Cannot elevate ${targetUser.role} to ${targetProjectRole}` 
      });
    }
    
    // Update project membership
    const updateData = {
      project_role: targetProjectRole === 'secondary_manager' ? 'lead' : targetProjectRole,
      is_secondary_manager: targetProjectRole === 'secondary_manager',
      updated_at: new Date()
    };
    
    await ProjectMember.updateOne(
      { project_id: projectId, user_id: userId },
      updateData
    );
    
    // Log the elevation
    await AuditLog.create({
      table_name: 'project_members',
      record_id: projectId,
      action: 'ROLE_ELEVATED',
      performed_by: currentUser.id,
      old_values: { project_role: 'lead' },
      new_values: { project_role: targetProjectRole }
    });
    
    res.json({ success: true, message: 'User role elevated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to elevate user role' });
  }
});
```

## 🎨 UI Flow Example: Sarah's Experience

### Step 1: Before Elevation
```
Sarah logs in (System Role: Lead)
├── Dashboard shows: "Team Lead" badge
├── Project Alpha card shows: "Lead" role
├── Project permissions: Can assign tasks, guide team
└── Timesheet section: View team timesheets (read-only)
```

### Step 2: Manager Elevates Sarah
```
Manager promotes Sarah to Secondary Manager in Project Alpha
├── Database: is_secondary_manager = true
├── API: Returns isElevated: true, projectRole: 'secondary_manager'
└── Notification: "You have been granted enhanced permissions in Project Alpha"
```

### Step 3: After Elevation - UI Changes
```
Sarah's Dashboard (Enhanced Experience)
├── Blue banner: "Enhanced Project Role - Secondary Manager in Project Alpha"
├── Navigation: New menu item "Manage Project Alpha" with crown icon
├── Project Alpha card: Shows "Secondary Manager" badge with elevation indicator
├── New permissions unlocked:
│   ├── ✅ Add/remove project members
│   ├── ✅ Approve timesheets for this project
│   ├── ✅ Manage project settings
│   └── ✅ Full project oversight
└── Timesheet approval: New "Approve/Reject" buttons appear
```

## 🔄 Real-Time Updates

### WebSocket Integration
```javascript
// When role elevation happens
socket.emit('roleElevated', {
  userId: 'sarah-id',
  projectId: 'project-alpha-id',
  newRole: 'secondary_manager',
  effectivePermissions: [...updatedPermissions]
});

// Frontend listener
socket.on('roleElevated', (data) => {
  if (data.userId === currentUser.id) {
    // Refresh permissions
    refreshUserPermissions();
    // Show notification
    toast.success(`You now have ${data.newRole} access in this project!`);
    // Update UI
    reloadProjectData();
  }
});
```

## Summary

This integration shows exactly how the app dynamically adapts when Sarah (System Lead) gets elevated to Secondary Manager in Project Alpha:

1. **Permission API** returns enhanced permissions
2. **UI Components** conditionally render based on new permissions  
3. **Navigation** adds new menu items for elevated projects
4. **Action Buttons** appear/disappear based on effective permissions
5. **Role Indicators** show elevation status with visual badges
6. **Real-time Updates** notify users when their permissions change

The key is that the frontend components use the `useEnhancedRoleManager` hook to check both system and project-specific permissions, creating a seamless experience where the UI adapts automatically to the user's effective permissions in each context.