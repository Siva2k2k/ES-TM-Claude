import { AuthUser } from '@/utils/auth';
import { UserRole } from '@/models/User';
import { AuthorizationError, ValidationError } from '@/utils/errors';

/**
 * Role-Based Access Control Utilities
 * Based on migration.sql specifications
 */

// Role hierarchy levels (higher number = more authority)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  employee: 1,
  lead: 2,
  manager: 3,
  management: 4,
  super_admin: 5
};

// Role hierarchy validation
export function canManageRoleHierarchy(currentRole: UserRole, targetRole: UserRole): boolean {
  const currentLevel = ROLE_HIERARCHY[currentRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];

  switch (currentRole) {
    case 'super_admin':
      return true; // Super admin manages all
    case 'management':
      return targetRole !== 'super_admin'; // Management can't manage super_admin
    case 'manager':
      return ['lead', 'employee'].includes(targetRole);
    case 'lead':
      return targetRole === 'employee'; // Lead can only view employees
    default:
      return false;
  }
}

// Check if role can access another user's resources
export function canAccessUserResources(currentRole: UserRole, targetRole: UserRole): boolean {
  return canManageRoleHierarchy(currentRole, targetRole);
}

// Permission validators for different resource types
export class PermissionValidator {

  // User management permissions
  static canCreateUser(currentRole: UserRole, targetRole: UserRole): boolean {
    if (currentRole === 'super_admin') return true;
    if (currentRole === 'management') {
      return ['manager', 'lead', 'employee'].includes(targetRole);
    }
    return false;
  }

  static canViewUser(currentUser: AuthUser, targetUserId: string): boolean {
    // Can view own profile
    if (currentUser._id?.toString() === targetUserId) return true;

    // Role-based hierarchy access
    return canManageRoleHierarchy(currentUser.role, 'employee'); // Simplified check
  }

  static canUpdateUser(currentUser: AuthUser, targetUserId: string, targetRole?: UserRole): boolean {
    // Can update own profile
    if (currentUser._id?.toString() === targetUserId) return true;

    // Role-based hierarchy for others
    if (targetRole) {
      return canManageRoleHierarchy(currentUser.role, targetRole);
    }

    return ['super_admin', 'management', 'manager'].includes(currentUser.role);
  }

  // Client management permissions
  static canManageClients(currentRole: UserRole): boolean {
    return ['super_admin', 'management'].includes(currentRole);
  }

  static canViewClients(currentRole: UserRole): boolean {
    return true; // All roles can view active clients (per migration.sql)
  }

  // Project management permissions
  static canCreateProject(currentRole: UserRole): boolean {
    return ['super_admin', 'management', 'manager'].includes(currentRole);
  }

  static canUpdateProject(currentUser: AuthUser, primaryManagerId?: string): boolean {
    // Primary manager can update their project
    if (primaryManagerId && currentUser._id?.toString() === primaryManagerId) return true;

    // Management hierarchy access
    return ['super_admin', 'management', 'manager'].includes(currentUser.role);
  }

  static canDeleteProject(currentRole: UserRole): boolean {
    return ['super_admin', 'management'].includes(currentRole);
  }

  // Timesheet permissions
  static canViewTimesheet(currentUser: AuthUser, timesheetUserId: string): boolean {
    // Can view own timesheet
    if (currentUser._id?.toString() === timesheetUserId) return true;

    // Management hierarchy can view team timesheets
    return canManageRoleHierarchy(currentUser.role, 'employee');
  }

  static canCreateTimesheet(currentUser: AuthUser, targetUserId: string): boolean {
    // Can create own timesheet
    if (currentUser._id?.toString() === targetUserId) return true;

    // IMPORTANT: Management CANNOT create timesheets (per migration.sql rules)
    if (currentUser.role === 'management') return false;

    // Other roles can create for team members they manage
    return canManageRoleHierarchy(currentUser.role, 'employee');
  }

  static canEditTimesheet(currentUser: AuthUser, timesheetUserId: string, status: string, isFrozen: boolean): boolean {
    // Cannot edit frozen or billed timesheets
    if (isFrozen || status === 'billed') return false;

    // Can edit own timesheet in draft/rejected states
    if (currentUser._id?.toString() === timesheetUserId) {
      return ['draft', 'manager_rejected', 'management_rejected'].includes(status);
    }

    // IMPORTANT: Management CANNOT edit timesheets (per migration.sql rules)
    if (currentUser.role === 'management') return false;

    // Lead CANNOT edit timesheets, only view (per migration.sql rules)
    if (currentUser.role === 'lead') return false;

    // Managers can edit team timesheets in editable states
    return currentUser.role === 'manager' &&
           ['draft', 'manager_rejected', 'management_rejected'].includes(status);
  }

  static canApproveTimesheet(currentRole: UserRole, currentStatus: string): boolean {
    if (currentRole === 'manager') {
      return ['submitted', 'management_rejected'].includes(currentStatus);
    }

    if (currentRole === 'management') {
      return ['manager_approved', 'management_pending'].includes(currentStatus);
    }

    if (currentRole === 'super_admin') {
      return ['submitted', 'manager_approved', 'management_pending'].includes(currentStatus);
    }

    return false;
  }

  static canSubmitTimesheet(currentUser: AuthUser, timesheetUserId: string): boolean {
    // Only timesheet owner can submit
    if (currentUser._id?.toString() !== timesheetUserId) return false;

    // Management cannot submit timesheets
    return currentUser.role !== 'management';
  }

  // Time entry permissions
  static canCreateTimeEntry(currentUser: AuthUser, timesheetUserId: string, timesheetStatus: string): boolean {
    // Can create entries in own timesheet
    if (currentUser._id?.toString() === timesheetUserId) {
      return ['draft', 'manager_rejected', 'management_rejected'].includes(timesheetStatus);
    }

    // IMPORTANT: Management CANNOT create time entries (per migration.sql)
    if (currentUser.role === 'management') return false;

    // Lead CANNOT create time entries (per migration.sql)
    if (currentUser.role === 'lead') return false;

    // Managers can create for team members in editable states
    return currentUser.role === 'manager' &&
           ['draft', 'manager_rejected', 'management_rejected'].includes(timesheetStatus) &&
           timesheetStatus !== 'billed';
  }

  // Billing permissions
  static canAccessBilling(currentRole: UserRole): boolean {
    return ['super_admin', 'management'].includes(currentRole);
  }

  static canGenerateBillingSnapshot(currentRole: UserRole): boolean {
    return ['super_admin', 'management'].includes(currentRole);
  }

  static canMarkTimesheetBilled(currentRole: UserRole): boolean {
    return ['super_admin', 'management'].includes(currentRole);
  }

  // Audit log permissions
  static canViewAuditLogs(currentRole: UserRole): boolean {
    return ['super_admin', 'management', 'manager'].includes(currentRole);
  }

  static canViewAllAuditLogs(currentRole: UserRole): boolean {
    return ['super_admin', 'management'].includes(currentRole);
  }
}

// Authorization requirement functions (throw errors if unauthorized)
export function requireSuperAdmin(currentUser: AuthUser): void {
  if (currentUser.role !== 'super_admin') {
    throw new AuthorizationError('Super admin access required');
  }
}

export function requireSuperAdminOrManagement(currentUser: AuthUser): void {
  if (!['super_admin', 'management'].includes(currentUser.role)) {
    throw new AuthorizationError('Management level access required');
  }
}

export function requireManagerOrAbove(currentUser: AuthUser): void {
  if (!['super_admin', 'management', 'manager'].includes(currentUser.role)) {
    throw new AuthorizationError('Manager level access required');
  }
}

export function requireTimesheetOwnershipOrManager(currentUser: AuthUser, timesheetUserId: string): void {
  const isOwner = currentUser._id?.toString() === timesheetUserId;
  const hasManagerAccess = canManageRoleHierarchy(currentUser.role, 'employee');

  if (!isOwner && !hasManagerAccess) {
    throw new AuthorizationError('Access denied: Insufficient permissions for this timesheet');
  }
}

export function requireResourceOwnership(currentUser: AuthUser, resourceUserId: string): void {
  if (currentUser._id?.toString() !== resourceUserId) {
    throw new AuthorizationError('Access denied: You can only access your own resources');
  }
}

// Project membership validation (to be used with project data)
export function requireProjectMembership(currentUser: AuthUser, projectMembers: any[]): void {
  const isMember = projectMembers.some(member =>
    member.user_id?.toString() === currentUser._id?.toString() &&
    !member.removed_at &&
    !member.deleted_at
  );

  const hasManagementAccess = ['super_admin', 'management', 'manager'].includes(currentUser.role);

  if (!isMember && !hasManagementAccess) {
    throw new AuthorizationError('Access denied: Not a member of this project');
  }
}

// Validation helpers
export function validateUserRole(role: string): UserRole {
  const validRoles: UserRole[] = ['super_admin', 'management', 'manager', 'lead', 'employee'];

  if (!validRoles.includes(role as UserRole)) {
    throw new ValidationError(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
  }

  return role as UserRole;
}

export function isValidTimesheetStatus(status: string): boolean {
  const validStatuses = [
    'draft', 'submitted', 'manager_approved', 'manager_rejected',
    'management_pending', 'management_rejected', 'frozen', 'billed'
  ];

  return validStatuses.includes(status);
}

export function canTransitionTimesheetStatus(
  currentRole: UserRole,
  fromStatus: string,
  toStatus: string
): boolean {
  // Define allowed transitions per role
  const transitions: Record<UserRole, Record<string, string[]>> = {
    employee: {
      draft: ['submitted'],
      manager_rejected: ['submitted'],
      management_rejected: ['submitted']
    },
    lead: {}, // Lead cannot transition statuses
    manager: {
      submitted: ['manager_approved', 'manager_rejected'],
      management_rejected: ['submitted'] // Can help resubmit
    },
    management: {
      manager_approved: ['frozen', 'management_rejected'],
      management_pending: ['frozen', 'management_rejected'],
      frozen: ['billed']
    },
    super_admin: {
      // Super admin can make any transition
      draft: ['submitted', 'manager_approved', 'frozen', 'billed'],
      submitted: ['manager_approved', 'manager_rejected', 'frozen'],
      manager_approved: ['frozen', 'management_rejected'],
      management_pending: ['frozen', 'management_rejected'],
      frozen: ['billed']
    }
  };

  const allowedTransitions = transitions[currentRole];
  return allowedTransitions?.[fromStatus]?.includes(toStatus) || false;
}