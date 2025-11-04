/**
 * Voice WebSocket Server
 *
 * Initializes Socket.IO server for real-time voice recognition
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { socketAuthMiddleware, AuthenticatedSocket } from '../middleware/socketAuth';
import logger from '../config/logger';
import VoiceSocketController from '../controllers/VoiceSocketController';

/**
 * Voice WebSocket Server class
 */
class VoiceSocketServer {
  private io: SocketIOServer | null = null;
  private controller: VoiceSocketController | null = null;

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HTTPServer): SocketIOServer {
    // Create Socket.IO server with CORS configuration
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000, // 25 seconds
      maxHttpBufferSize: 1e7, // 10MB max message size
      transports: ['websocket', 'polling'], // Support both transports
    });

    logger.info('Socket.IO server initialized', {
      cors: process.env.FRONTEND_URL || 'http://localhost:3000',
    });

    // Apply authentication middleware
    this.io.use(socketAuthMiddleware);

    // Initialize voice controller
    this.controller = new VoiceSocketController();

    // Handle new connections
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket as AuthenticatedSocket);
    });

    return this.io;
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const user = socket.user;

    logger.info('Voice WebSocket connection established', {
      socketId: socket.id,
      userId: user._id,
      email: user.email,
    });

    // Attach event handlers
    if (this.controller) {
      this.controller.attachHandlers(socket);
    }

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle connection errors
    socket.on('error', (error: Error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId: user._id,
        error: error.message,
      });
    });
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    const user = socket.user;

    logger.info('Voice WebSocket disconnected', {
      socketId: socket.id,
      userId: user._id,
      reason,
    });

    // Cleanup any active sessions for this socket
    if (this.controller) {
      this.controller.cleanupSocketSessions(socket);
    }
  }

  /**
   * Get Socket.IO server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Get controller instance
   */
  getController(): VoiceSocketController | null {
    return this.controller;
  }

  /**
   * Broadcast message to specific user
   */
  emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('Attempted to emit to user but Socket.IO not initialized');
      return;
    }

    // Find all sockets for this user
    this.io.sockets.sockets.forEach((socket) => {
      const authSocket = socket as AuthenticatedSocket;
      if (authSocket.userId === userId) {
        socket.emit(event, data);
      }
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(event: string, data: any): void {
    if (!this.io) {
      logger.warn('Attempted to broadcast but Socket.IO not initialized');
      return;
    }

    this.io.emit(event, data);
  }

  /**
   * Get active connections count
   */
  getConnectionsCount(): number {
    if (!this.io) {
      return 0;
    }

    return this.io.sockets.sockets.size;
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    if (!this.controller) {
      return 0;
    }

    return this.controller.getActiveSessionsCount();
  }

  /**
   * Get server statistics
   */
  getStats(): {
    connections: number;
    activeSessions: number;
    uptime: number;
  } {
    return {
      connections: this.getConnectionsCount(),
      activeSessions: this.getActiveSessionsCount(),
      uptime: process.uptime(),
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Voice WebSocket server...');

    if (this.controller) {
      // Cleanup all active sessions
      await this.controller.cleanupAllSessions();
    }

    if (this.io) {
      // Disconnect all clients
      this.io.disconnectSockets(true);

      // Close server
      this.io.close();
      this.io = null;
    }

    logger.info('Voice WebSocket server shutdown complete');
  }
}

// Export singleton instance
export default new VoiceSocketServer();
