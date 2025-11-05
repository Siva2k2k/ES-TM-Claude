/**
 * Socket.IO Authentication Middleware
 *
 * Authenticates WebSocket connections using JWT tokens
 */

import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { JWTUtils } from '../utils/jwt';
import User from '../models/User';
import logger from '../config/logger';

/**
 * Authenticated socket interface
 */
export interface AuthenticatedSocket extends Socket {
  user: any; // User document from MongoDB
  userId: string;
}

/**
 * Socket.IO authentication middleware
 *
 * Verifies JWT token from socket handshake and attaches user to socket
 *
 * Usage:
 * ```typescript
 * io.use(socketAuthMiddleware);
 * ```
 */
export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError) => void
) => {
  try {
    // Extract token from handshake
    const token = extractToken(socket);

    if (!token) {
      logger.warn('Socket connection attempt without token', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error('Authentication required. No token provided.'));
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = JWTUtils.verifyAccessToken(token);
    } catch (error: any) {
      logger.warn('Socket connection with invalid token', {
        socketId: socket.id,
        error: error.message,
      });
      return next(new Error('Invalid or expired token.'));
    }

    if (!decoded || !decoded.id) {
      logger.warn('Socket connection with malformed token', {
        socketId: socket.id,
        decoded: decoded ? 'exists but missing id' : 'null',
      });
      return next(new Error('Invalid token payload.'));
    }

    // Fetch user from database
    const user = await (User as any).findById(decoded.id)
      .select('+role +is_active +is_approved_by_super_admin')
      .lean();

    if (!user) {
      logger.warn('Socket connection for non-existent user', {
        socketId: socket.id,
        userId: decoded.id,
      });
      return next(new Error('User not found.'));
    }

    // Check if user is active
    if (!user.is_active) {
      logger.warn('Socket connection for inactive user', {
        socketId: socket.id,
        userId: user._id,
      });
      return next(new Error('User account is inactive.'));
    }

    // Check if user is approved
    if (!user.is_approved_by_super_admin) {
      logger.warn('Socket connection for unapproved user', {
        socketId: socket.id,
        userId: user._id,
      });
      return next(new Error('User account is not approved.'));
    }

    // Attach user to socket
    (socket as AuthenticatedSocket).user = user;
    (socket as AuthenticatedSocket).userId = user._id.toString();

    logger.info('Socket authenticated successfully', {
      socketId: socket.id,
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    // Authentication successful
    next();
  } catch (error: any) {
    logger.error('Socket authentication error', {
      socketId: socket.id,
      error: error.message,
      stack: error.stack,
    });
    next(new Error('Authentication failed. Internal server error.'));
  }
};

/**
 * Extract JWT token from socket handshake
 *
 * Supports multiple token locations:
 * 1. Authorization header (Bearer token)
 * 2. Query parameter (token)
 * 3. Auth object (token)
 */
function extractToken(socket: Socket): string | null {
  // Method 1: Authorization header
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/);
    if (match) {
      return match[1];
    }
  }

  // Method 2: Query parameter
  const queryToken = socket.handshake.query.token;
  if (queryToken && typeof queryToken === 'string') {
    return queryToken;
  }

  // Method 3: Auth object (Socket.IO specific)
  const authToken = socket.handshake.auth?.token;
  if (authToken && typeof authToken === 'string') {
    return authToken;
  }

  return null;
}

/**
 * Optional: Role-based authorization middleware
 *
 * Usage:
 * ```typescript
 * socket.on('admin-event', requireSocketRole(['admin', 'super_admin'], async (data) => {
 *   // Handler code
 * }));
 * ```
 */
export const requireSocketRole = (
  allowedRoles: string[],
  handler: (socket: AuthenticatedSocket, ...args: any[]) => void | Promise<void>
) => {
  return async (socket: AuthenticatedSocket, ...args: any[]) => {
    const user = socket.user;

    if (!user) {
      socket.emit('voice:error', {
        error: 'Unauthorized. User not authenticated.',
        errorCode: 'AUTH_FAILED',
        recoverable: false,
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn('Socket action denied due to insufficient role', {
        socketId: socket.id,
        userId: user._id,
        userRole: user.role,
        requiredRoles: allowedRoles,
      });

      socket.emit('voice:error', {
        error: 'Forbidden. Insufficient permissions.',
        errorCode: 'FORBIDDEN',
        recoverable: false,
      });
      return;
    }

    // User has required role, proceed with handler
    await handler(socket, ...args);
  };
};

/**
 * Check if socket is authenticated
 */
export const isSocketAuthenticated = (socket: Socket): socket is AuthenticatedSocket => {
  return !!(socket as AuthenticatedSocket).user;
};

/**
 * Get user from authenticated socket
 */
export const getSocketUser = (socket: Socket): any | null => {
  if (isSocketAuthenticated(socket)) {
    return (socket as AuthenticatedSocket).user;
  }
  return null;
};

/**
 * Get user ID from authenticated socket
 */
export const getSocketUserId = (socket: Socket): string | null => {
  if (isSocketAuthenticated(socket)) {
    return (socket as AuthenticatedSocket).userId;
  }
  return null;
};

export default socketAuthMiddleware;
