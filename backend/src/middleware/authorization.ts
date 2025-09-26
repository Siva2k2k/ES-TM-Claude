import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/models/User';
import { AuthUser } from '@/utils/auth';
import { AuthorizationError, ValidationError } from '@/utils/errors';
import {
  PermissionValidator,
  requireSuperAdmin,
  requireSuperAdminOrManagement,
  requireManagerOrAbove,
  canManageRoleHierarchy
} from '@/utils/authorization';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Role-based authorization middleware
 * Based on migration.sql permission specifications
 */

// Base role requirement middleware
export function requireRole(requiredRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!requiredRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required roles: ${requiredRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'Authorization failed'
      });
    }
  };
}

// Specific role middleware (from original auth.ts)
export const requireSuperAdminMiddleware = requireRole(['super_admin']);

export const requireManagement = requireRole(['super_admin', 'management']);

export const requireManagerOrHigher = requireRole(['super_admin', 'management', 'manager']);

export const requireLeadOrHigher = requireRole(['super_admin', 'management', 'manager', 'lead']);

// Resource-specific authorization middleware

// User management authorization
export function authorizeUserAccess(action: 'view' | 'create' | 'update' | 'delete') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const targetUserId = req.params.userId || req.params.id;
      const targetRole = req.body.role as UserRole;

      switch (action) {
        case 'view':
          if (!PermissionValidator.canViewUser(currentUser, targetUserId)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied: Cannot view this user'
            });
          }
          break;

        case 'create':
          if (!PermissionValidator.canCreateUser(currentUser.role, targetRole)) {
            return res.status(403).json({
              success: false,
              error: `Access denied: Cannot create user with role ${targetRole}`
            });
          }
          break;

        case 'update':
          if (!PermissionValidator.canUpdateUser(currentUser, targetUserId, targetRole)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied: Cannot update this user'
            });
          }
          break;

        case 'delete':
          requireSuperAdminOrManagement(currentUser);
          break;
      }

      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
}

// Client management authorization
export function authorizeClientAccess(action: 'view' | 'create' | 'update' | 'delete') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;

      switch (action) {
        case 'view':
          if (!PermissionValidator.canViewClients(currentUser.role)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied: Cannot view clients'
            });
          }
          break;

        case 'create':
        case 'update':
        case 'delete':
          if (!PermissionValidator.canManageClients(currentUser.role)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied: Client management requires management level access'
            });
          }
          break;
      }

      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'Client authorization failed'
      });
    }
  };
}

// Project management authorization
export function authorizeProjectAccess(action: 'view' | 'create' | 'update' | 'delete') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;

      switch (action) {
        case 'view':
          // View authorization is handled in service layer with project membership
          break;

        case 'create':
          if (!PermissionValidator.canCreateProject(currentUser.role)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied: Project creation requires manager level access'
            });
          }
          break;

        case 'update':
          // Update authorization includes primary manager check in service layer
          if (!['super_admin', 'management', 'manager'].includes(currentUser.role)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied: Project update requires manager level access'
            });
          }
          break;

        case 'delete':
          if (!PermissionValidator.canDeleteProject(currentUser.role)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied: Project deletion requires management level access'
            });
          }
          break;
      }

      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'Project authorization failed'
      });
    }
  };
}

// Timesheet authorization
export function authorizeTimesheetAccess(action: 'view' | 'create' | 'update' | 'delete' | 'submit' | 'approve') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const targetUserId = req.params.userId || req.body.userId;
      const timesheetId = req.params.timesheetId || req.params.id;

      switch (action) {
        case 'view':
          // View authorization handled in service layer with specific timesheet data
          break;

        case 'create':
          if (targetUserId && !PermissionValidator.canCreateTimesheet(currentUser, targetUserId)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied: Cannot create timesheet for this user'
            });
          }
          break;

        case 'update':
          // Update authorization requires timesheet data (handled in service layer)
          break;

        case 'submit':
          // Submit authorization requires ownership check (handled in service layer)
          if (currentUser.role === 'management') {
            return res.status(403).json({
              success: false,
              error: 'Management role cannot submit timesheets'
            });
          }
          break;

        case 'approve':
          if (!['super_admin', 'management', 'manager'].includes(currentUser.role)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied: Timesheet approval requires manager level access'
            });
          }
          break;
      }

      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'Timesheet authorization failed'
      });
    }
  };
}

// Time entry authorization
export function authorizeTimeEntryAccess(action: 'view' | 'create' | 'update' | 'delete') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;

      // Time entry authorization is tightly coupled to timesheet authorization
      // Detailed checks are performed in service layer with timesheet context

      switch (action) {
        case 'create':
        case 'update':
        case 'delete':
          if (currentUser.role === 'management') {
            return res.status(403).json({
              success: false,
              error: 'Management role cannot create, update, or delete time entries'
            });
          }

          if (currentUser.role === 'lead') {
            return res.status(403).json({
              success: false,
              error: 'Lead role cannot create, update, or delete time entries'
            });
          }
          break;
      }

      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'Time entry authorization failed'
      });
    }
  };
}

// Billing authorization
export function authorizeBillingAccess(action: 'view' | 'generate' | 'approve' | 'export') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;

      switch (action) {
        case 'view':
          if (!PermissionValidator.canAccessBilling(currentUser.role)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied: Billing access requires management level permissions'
            });
          }
          break;

        case 'generate':
          if (!PermissionValidator.canGenerateBillingSnapshot(currentUser.role)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied: Billing snapshot generation requires management level permissions'
            });
          }
          break;

        case 'approve':
          if (!PermissionValidator.canMarkTimesheetBilled(currentUser.role)) {
            return res.status(403).json({
              success: false,
              error: 'Access denied: Billing approval requires management level permissions'
            });
          }
          break;

        case 'export':
          requireSuperAdminOrManagement(currentUser);
          break;
      }

      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Billing authorization failed'
      });
    }
  };
}

// Audit log authorization
export function authorizeAuditLogAccess() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;

      if (!PermissionValidator.canViewAuditLogs(currentUser.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Audit log access requires manager level permissions'
        });
      }

      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'Audit log authorization failed'
      });
    }
  };
}

// Ownership validation middleware (for resources that belong to users)
export function requireOwnershipOrManager(getUserIdFromResource: (req: Request) => string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const resourceUserId = getUserIdFromResource(req);

      // Allow if user owns the resource
      if (currentUser._id?.toString() === resourceUserId) {
        return next();
      }

      // Allow if user has management authority
      if (!canManageRoleHierarchy(currentUser.role, 'employee')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You can only access your own resources'
        });
      }

      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'Ownership validation failed'
      });
    }
  };
}

// Helper function to create ownership validator for common patterns
export const requireTimesheetOwnership = requireOwnershipOrManager(
  (req) => req.params.userId || req.body.userId
);

// Status validation middleware
export function validateTimesheetStatus() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { status } = req.body;

    if (status) {
      const validStatuses = [
        'draft', 'submitted', 'manager_approved', 'manager_rejected',
        'management_pending', 'management_rejected', 'frozen', 'billed'
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid timesheet status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
    }

    next();
  };
}