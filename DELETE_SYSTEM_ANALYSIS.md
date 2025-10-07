# 🗑️ DELETE & RESTORE SYSTEM ANALYSIS

## 📋 Current System Overview

Based on the codebase analysis, here's how users can perform hard delete and restore operations based on their roles:

## 🔐 User Role Capabilities

### **1. Regular Users (employee)**

```typescript
// Timesheet Operations
canSoftDelete: true,     // ✅ Can delete own draft timesheets only
canHardDelete: false,    // ❌ Cannot permanently delete
canRestore: false        // ❌ Cannot restore deleted items
```

**Available Actions:**

- ✅ Delete own draft timesheets (moves to trash)
- ❌ Cannot delete submitted/approved timesheets
- ❌ Cannot hard delete anything permanently
- ❌ Cannot restore deleted items

### **2. Manager Role**

```typescript
// Enhanced permissions for team management
canSoftDelete: true,     // ✅ Can delete team member timesheets
canHardDelete: false,    // ❌ Cannot permanently delete
canRestore: false        // ❌ Cannot restore (requires management level)
```

**Available Actions:**

- ✅ Delete timesheets for team members
- ✅ Delete tasks assigned to team
- ❌ Cannot hard delete anything permanently
- ❌ Cannot restore deleted items

### **3. Management Role**

```typescript
// Administrative delete powers
canSoftDelete: true,     // ✅ Can delete any timesheet/user/project
canHardDelete: false,    // ❌ Cannot permanently delete (super admin only)
canRestore: true         // ✅ Can restore soft-deleted items
```

**Available Actions:**

- ✅ Delete any timesheet (regardless of status)
- ✅ Delete users (soft delete)
- ✅ Delete projects and clients
- ✅ **RESTORE deleted timesheets and users**
- ❌ Cannot hard delete permanently

### **4. Super Admin Role**

```typescript
// Ultimate delete powers
canSoftDelete: true,     // ✅ Can soft delete anything
canHardDelete: true,     // ✅ Can permanently delete (DANGEROUS)
canRestore: true         // ✅ Can restore anything soft-deleted
```

**Available Actions:**

- ✅ Delete anything in the system
- ✅ **HARD DELETE (permanent) - Cannot be undone**
- ✅ **RESTORE any soft-deleted items**
- ✅ Manage delete permissions for other roles

## 🛠️ Technical Implementation

### **Backend Services Available:**

#### **1. TimesheetService.ts**

```typescript
// Regular delete (what users currently use)
static async deleteTimesheet(timesheetId: string, currentUser: AuthUser)

// Soft delete (recoverable)
static async softDeleteTimesheet(timesheetId: string, reason: string, currentUser: AuthUser)

// Hard delete (permanent - super admin only)
static async hardDeleteTimesheet(timesheetId: string, currentUser: AuthUser)

// Restore from soft delete
static async restoreTimesheet(timesheetId: string, currentUser: AuthUser)
```

#### **2. DeleteService.ts (Centralized)**

```typescript
// Check permissions
static getDeletePermissions(currentUser: AuthUser, entityType: string, ownerId?: string)

// Bulk operations
static async bulkDelete(entityType: string, entityIds: string[], deleteType: 'soft' | 'hard')

// Restore functionality
static async restoreEntity(entityType: string, entityId: string, currentUser: AuthUser)

// Get deleted items for recovery
static async getDeletedEntities(entityType: string, currentUser: AuthUser)
```

### **Frontend Components Available:**

#### **DeleteButton.tsx**

```typescript
// Supports both delete and restore
interface DeleteButtonProps {
  onDelete?: (
    entityType: string,
    entityId: string,
    deleteType: "soft" | "hard"
  ) => Promise<void>;
  onRestore?: (entityType: string, entityId: string) => Promise<void>;
  showRestore?: boolean;
  isDeleted?: boolean;
}
```

## ❌ **MISSING IMPLEMENTATION**

### **1. API Routes Not Exposed**

```typescript
// Missing routes in timesheet.ts:
// DELETE /api/v1/timesheets/:id/hard     - Hard delete
// POST  /api/v1/timesheets/:id/restore   - Restore
// GET   /api/v1/timesheets/deleted       - List deleted items
```

### **2. Controller Methods Missing**

```typescript
// Missing in TimesheetController.ts:
static hardDeleteTimesheet = handleAsyncError(async (req, res) => {})
static restoreTimesheet = handleAsyncError(async (req, res) => {})
static getDeletedTimesheets = handleAsyncError(async (req, res) => {})
```

### **3. Frontend Integration Missing**

- No "Trash/Recycle Bin" view for deleted items
- No restore functionality in UI
- Hard delete not exposed to super admin
- No bulk delete operations in interface

## 🚧 **How Users COULD Access These Features**

### **For Management/Super Admin to Restore:**

1. **Backend Implementation Exists** ✅

   ```typescript
   await TimesheetService.restoreTimesheet(timesheetId, currentUser);
   ```

2. **Need API Route** ❌

   ```typescript
   router.post("/:timesheetId/restore", TimesheetController.restoreTimesheet);
   ```

3. **Need Controller Method** ❌

   ```typescript
   static restoreTimesheet = async (req, res) => {
     const result = await TimesheetService.restoreTimesheet(req.params.timesheetId, req.user);
   }
   ```

4. **Need Frontend Service** ❌

   ```typescript
   static async restoreTimesheet(timesheetId: string): Promise<void>
   ```

5. **Need UI Component** ❌ (DeleteButton supports it but not integrated)

### **For Super Admin to Hard Delete:**

1. **Backend Implementation Exists** ✅

   ```typescript
   await TimesheetService.hardDeleteTimesheet(timesheetId, currentUser);
   ```

2. **Requires Multi-Step Process**:
   - Item must be soft deleted first
   - Then hard delete permanently removes it
   - Includes audit trail archival

## 🎯 **Summary: Current State**

### **What Works:**

- ✅ Regular users can delete own draft timesheets
- ✅ Backend services have full delete/restore capability
- ✅ Role-based permission system is comprehensive
- ✅ Audit logging for all delete operations
- ✅ DeleteButton component supports restore UI

### **What's Missing:**

- ❌ API routes not exposed for restore/hard delete
- ❌ Controller methods not implemented
- ❌ Frontend integration not complete
- ❌ No "Deleted Items" management interface
- ❌ Super admin hard delete not accessible via UI

### **User Access Reality:**

- **Regular Users**: Can only delete own draft timesheets (basic delete)
- **Management**: Can delete any timesheet but **CANNOT restore via UI**
- **Super Admin**: Can delete anything but **CANNOT hard delete or restore via UI**

## 🚀 **To Enable Full Functionality**

1. **Add API routes** for restore and hard delete
2. **Implement controller methods** to expose backend services
3. **Create admin interface** for managing deleted items
4. **Add restore buttons** to deleted item views
5. **Enable hard delete** for super admin with proper warnings

**The system has all the backend infrastructure but lacks the frontend integration to make these features accessible to users through the UI.** 🔧
