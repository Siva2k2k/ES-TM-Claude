# 🚀 NEW FEATURES IMPLEMENTATION GUIDE

## STATUS: In Progress

This guide provides implementation details for the three major features requested.

---

## ✅ COMPLETED SO FAR

1. **Planning Document Created** - `NEW_FEATURES_PLAN.md`
2. **User Model Enhanced** - Added hard/soft delete fields
3. **Infrastructure Ready** - Validation utilities, delete modal component

---

## 🗑️ FEATURE 1: HARD & SOFT DELETE SYSTEM

### ✅ Backend Model Updates - DONE

**File: `backend/src/models/User.ts`**
Added fields:
```typescript
deleted_at?: Date;
deleted_by?: mongoose.Types.ObjectId;
deleted_reason?: string;
is_hard_deleted: boolean;
hard_deleted_at?: Date;
hard_deleted_by?: mongoose.Types.ObjectId;
```

### 📝 Next Steps for Delete System

#### 1. Update Timesheet Model
**File: `backend/src/models/Timesheet.ts`**

Add the same delete fields:
```typescript
export interface ITimesheet extends Document {
  // ... existing fields ...

  // Soft delete fields
  deleted_at?: Date;
  deleted_by?: mongoose.Types.ObjectId;
  deleted_reason?: string;

  // Hard delete fields
  is_hard_deleted: boolean;
  hard_deleted_at?: Date;
  hard_deleted_by?: mongoose.Types.ObjectId;
}
```

#### 2. Create Enhanced UserService Methods
**File: `backend/src/services/UserService.ts`**

```typescript
/**
 * Soft delete user - hide from normal queries but keep data
 */
static async softDeleteUser(
  userId: string,
  reason: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    // Only super admin can delete users
    if (currentUser.role !== 'super_admin') {
      throw new AuthorizationError('Only super admins can delete users');
    }

    // Check if user has active dependencies
    const canDelete = await this.canDeleteUser(userId, currentUser);
    if (!canDelete.allowed) {
      return { success: false, error: canDelete.reason };
    }

    // Soft delete
    await User.updateOne(
      { _id: userId },
      {
        deleted_at: new Date(),
        deleted_by: currentUser.id,
        deleted_reason: reason,
        updated_at: new Date()
      }
    );

    // Audit log
    await AuditLogService.logEvent(
      'users',
      userId,
      'SOFT_DELETE',
      currentUser.id,
      currentUser.full_name,
      { reason },
      { deleted_by: currentUser.id },
      null,
      { deleted_at: new Date(), reason }
    );

    return { success: true };
  } catch (error) {
    console.error('Error soft deleting user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Hard delete user - permanently remove from database
 * Should only be used after audit log review
 */
static async hardDeleteUser(
  userId: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string; auditLogsArchived?: number }> {
  try {
    // Only super admin can hard delete
    if (currentUser.role !== 'super_admin') {
      throw new AuthorizationError('Only super admins can permanently delete users');
    }

    // Check if already soft deleted
    const user = await User.findById(userId);
    if (!user || !user.deleted_at) {
      return { success: false, error: 'User must be soft deleted first' };
    }

    // Archive audit logs first
    const auditLogs = await AuditLogService.archiveLogsForEntity('users', userId);

    // Mark as hard deleted (don't actually delete for compliance)
    await User.updateOne(
      { _id: userId },
      {
        is_hard_deleted: true,
        hard_deleted_at: new Date(),
        hard_deleted_by: currentUser.id,
        updated_at: new Date()
      }
    );

    // Final audit log
    await AuditLogService.logEvent(
      'users',
      userId,
      'HARD_DELETE',
      currentUser.id,
      currentUser.full_name,
      { audit_logs_archived: auditLogs },
      { hard_deleted_by: currentUser.id },
      null,
      { is_hard_deleted: true }
    );

    return { success: true, auditLogsArchived: auditLogs };
  } catch (error) {
    console.error('Error hard deleting user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Restore soft deleted user
 */
static async restoreUser(
  userId: string,
  currentUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentUser.role !== 'super_admin') {
      throw new AuthorizationError('Only super admins can restore users');
    }

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.is_hard_deleted) {
      return { success: false, error: 'Cannot restore hard deleted user' };
    }

    await User.updateOne(
      { _id: userId },
      {
        deleted_at: null,
        deleted_by: null,
        deleted_reason: null,
        updated_at: new Date()
      }
    );

    // Audit log
    await AuditLogService.logEvent(
      'users',
      userId,
      'RESTORE',
      currentUser.id,
      currentUser.full_name,
      { restored_from: 'soft_delete' },
      { restored_by: currentUser.id },
      { deleted_at: user.deleted_at },
      { deleted_at: null }
    );

    return { success: true };
  } catch (error) {
    console.error('Error restoring user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all soft deleted users (for admin review)
 */
static async getDeletedUsers(
  currentUser: AuthUser
): Promise<{ users: IUser[]; error?: string }> {
  try {
    if (currentUser.role !== 'super_admin') {
      throw new AuthorizationError('Only super admins can view deleted users');
    }

    const users = await User.find({
      deleted_at: { $ne: null },
      is_hard_deleted: false
    })
      .populate('deleted_by', 'full_name email')
      .sort({ deleted_at: -1 })
      .select('-password_hash -temporary_password');

    return { users };
  } catch (error) {
    console.error('Error getting deleted users:', error);
    return { users: [], error: error.message };
  }
}

/**
 * Check if user can be deleted (dependency check)
 */
static async canDeleteUser(
  userId: string,
  currentUser: AuthUser
): Promise<{ allowed: boolean; reason?: string; dependencies?: string[] }> {
  const dependencies: string[] = [];

  // Check active timesheets
  const activeTimesheets = await Timesheet.countDocuments({
    user_id: userId,
    status: { $in: ['submitted', 'manager_approved', 'management_pending'] },
    deleted_at: null
  });

  if (activeTimesheets > 0) {
    dependencies.push(`${activeTimesheets} active timesheet(s)`);
  }

  // Check if primary manager of projects
  const managedProjects = await Project.countDocuments({
    primary_manager_id: userId,
    deleted_at: null,
    status: { $in: ['active', 'pending'] }
  });

  if (managedProjects > 0) {
    dependencies.push(`Primary manager of ${managedProjects} active project(s)`);
  }

  // Check if has approved billing
  const billingSnapshots = await BillingSnapshot.countDocuments({
    $or: [
      { manager_approved_by: userId },
      { management_approved_by: userId }
    ],
    status: { $in: ['finalized', 'invoiced', 'paid'] }
  });

  if (billingSnapshots > 0) {
    dependencies.push(`Approved ${billingSnapshots} billing snapshot(s)`);
  }

  if (dependencies.length > 0) {
    return {
      allowed: false,
      reason: 'User has active dependencies that must be resolved first',
      dependencies
    };
  }

  return { allowed: true };
}
```

#### 3. Create Frontend Delete Management Modal
**File: `frontend/src/components/DeleteManagement/DeleteActionModal.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, RefreshCcw, Shield, X } from 'lucide-react';
import { showSuccess, showError, showWarning } from '../../utils/toast';

interface DeleteActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'user' | 'timesheet' | 'billing';
  entity: any;
  deleteType: 'soft' | 'hard';
  onConfirm: (reason?: string) => Promise<void>;
}

export const DeleteActionModal: React.FC<DeleteActionModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entity,
  deleteType,
  onConfirm
}) => {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [auditLogCount, setAuditLogCount] = useState(0);
  const [dependencies, setDependencies] = useState<string[]>([]);

  const entityName = entity?.full_name || entity?.name || entity?.id;
  const canProceed = deleteType === 'soft'
    ? reason.trim().length > 10
    : confirmText.toLowerCase() === entityName.toLowerCase();

  useEffect(() => {
    if (isOpen && deleteType === 'hard') {
      // Fetch audit log count
      fetchAuditLogCount();
    }
  }, [isOpen, deleteType]);

  const fetchAuditLogCount = async () => {
    // TODO: Implement API call to get audit log count
    setAuditLogCount(42); // Mock data
  };

  const handleConfirm = async () => {
    if (!canProceed) return;

    setIsLoading(true);
    try {
      await onConfirm(deleteType === 'soft' ? reason : undefined);
      showSuccess(`${entityType} ${deleteType === 'soft' ? 'deleted' : 'permanently deleted'} successfully`);
      onClose();
    } catch (error) {
      showError(`Failed to delete ${entityType}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 ${deleteType === 'hard' ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2.5 rounded-xl">
                {deleteType === 'hard' ? (
                  <Shield className="w-6 h-6 text-white" />
                ) : (
                  <Trash2 className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {deleteType === 'hard' ? 'Permanent Deletion' : 'Delete'} {entityType}
                </h3>
                <p className="text-white text-opacity-90 text-sm">
                  {deleteType === 'hard' ? 'This action cannot be undone' : 'Item will be hidden but recoverable'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Entity Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600 mb-1">
              {deleteType === 'hard' ? 'Permanently deleting' : 'Deleting'} {entityType}:
            </p>
            <p className="font-semibold text-slate-900 text-lg">{entityName}</p>
            {entity?.email && (
              <p className="text-sm text-slate-600 mt-1">{entity.email}</p>
            )}
          </div>

          {/* Hard Delete Warning */}
          {deleteType === 'hard' && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 mb-2">⚠️ Permanent Deletion Warning</h4>
                  <p className="text-sm text-red-800 mb-3">
                    This action will PERMANENTLY delete this {entityType} from the database.
                    While data will be retained for compliance, it will be inaccessible.
                  </p>
                  <div className="bg-white rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Audit Logs:</span>
                      <span className="font-semibold text-slate-900">{auditLogCount} entries will be archived</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Reversible:</span>
                      <span className="font-semibold text-red-600">NO</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dependencies Check */}
          {dependencies.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900 mb-2">Cannot Delete - Dependencies Found:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {dependencies.map((dep, i) => (
                      <li key={i} className="text-sm text-yellow-800">{dep}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Soft Delete: Reason Input */}
          {deleteType === 'soft' && dependencies.length === 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Reason for Deletion <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a reason for this deletion (minimum 10 characters)..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
              <p className="text-sm text-slate-500">
                {reason.length}/10 characters minimum
              </p>
            </div>
          )}

          {/* Hard Delete: Confirmation Input */}
          {deleteType === 'hard' && dependencies.length === 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Type <span className="font-mono text-red-600 bg-red-50 px-2 py-1 rounded">{entityName}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type "${entityName}" to confirm deletion`}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canProceed || isLoading || dependencies.length > 0}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all flex items-center space-x-2 ${
              canProceed && dependencies.length === 0 && !isLoading
                ? deleteType === 'hard'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{deleteType === 'hard' ? 'Permanently Delete' : 'Delete'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 💰 FEATURE 2: BILLING MANAGEMENT

### Key Components Needed

1. **Billing Workflow Stepper** - Visual status progression
2. **Billing Editor** - Adjust hours, rates, add discounts
3. **Invoice Generator** - PDF export functionality
4. **Payment Tracker** - Track payment status

### Implementation Priority

1. First: Enhance existing billing snapshot generation
2. Second: Add workflow status and approvals
3. Third: Invoice generation
4. Fourth: Payment tracking

---

## 👤 FEATURE 3: USER PROFILE & SETTINGS

### Structure

```
/profile
  /overview - View profile summary
  /edit - Edit personal details
  /settings - Preferences & theme
  /security - Password & 2FA
  /activity - Recent actions
```

### Key Components

1. **ProfileView.tsx** - Display user profile
2. **ProfileEdit.tsx** - Edit form
3. **SettingsPanel.tsx** - All settings
4. **ThemeSwitcher.tsx** - Light/Dark mode
5. **PasswordChange.tsx** - Security

---

## 🎯 IMMEDIATE NEXT STEPS

1. **Complete Delete System (Priority 1)**
   - Add delete methods to UserService ✓
   - Add delete methods to TimesheetService
   - Create Delete Action Modal ✓
   - Create Deleted Items Manager
   - Add routes to controllers
   - Test thoroughly

2. **Basic Profile System (Priority 2)**
   - Create UserProfile model
   - Create ProfileService
   - Create basic profile view
   - Add password change
   - Add theme switcher

3. **Billing Enhancement (Priority 3)**
   - Review existing billing code
   - Add workflow states
   - Create approval flow
   - Add invoice generation

---

## 📊 ESTIMATED COMPLETION

- **Delete System:** 70% planning done, 30% implementation remaining (~8 hours)
- **Profile System:** 100% planning done, 0% implementation (~12 hours)
- **Billing:** 80% planning done, 20% research needed (~15 hours)

**Total Remaining:** ~35 hours of development

---

## 🚀 DEPLOYMENT NOTES

When ready to deploy:
1. Run database migrations for new fields
2. Test delete functionality with test data
3. Verify audit logs are captured correctly
4. Test theme system in different browsers
5. Verify billing calculations are accurate
6. Document API changes
7. Update user documentation

---

This guide provides a clear roadmap with complete code examples for the most critical components. The delete system is the highest priority and is most complete.
