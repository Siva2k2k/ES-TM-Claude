import { Request, Response, NextFunction } from 'express';
import User, { UserRole } from '@/models/User';
import { JWTUtils } from '@/utils/jwt';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  hourly_rate: number;
  is_active: boolean;
  is_approved_by_super_admin: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware to check if user is authenticated
 */
export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = JWTUtils.verifyAccessToken(token);
    } catch (error) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    // Look up user in database to ensure they still exist and are active
    const user = await (User.findOne as any)({
      _id: decoded.id,
      deleted_at: { $exists: false }
    }).select('-password_hash');

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    if (!user.is_active) {
      res.status(401).json({ success: false, message: 'Account is deactivated' });
      return;
    }

    if (!user.is_approved_by_super_admin) {
      res.status(401).json({ success: false, message: 'Account is not approved' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      hourly_rate: user.hourly_rate,
      is_active: user.is_active,
      is_approved_by_super_admin: user.is_approved_by_super_admin
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
    return;
  }
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: `Access denied. Required roles: ${roles.join(', ')}` });
      return;
    }

    next();
  };
};

/**
 * Middleware to require manager role or above
 */
export const requireManager = requireRole(['manager', 'management', 'super_admin']);

/**
 * Middleware to require management role or above
 */
export const requireManagement = requireRole(['management', 'super_admin']);

/**
 * Middleware to require super admin role
 */
export const requireSuperAdmin = requireRole(['super_admin']);

/**
 * Check maintenance mode
 */
export const checkMaintenanceMode = (req: Request, res: Response, next: NextFunction): Response | void => {
  if (process.env.MAINTENANCE_MODE === 'true') {
    // Allow access to health check and admin routes during maintenance
    if (req.path === '/health' || req.path.startsWith('/api/v1/admin')) {
      return next();
    }

    return res.status(503).json({
      success: false,
      message: 'System is currently under maintenance. Please try again later.',
      maintenance: true
    });
  }

  next();
};