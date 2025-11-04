import 'module-alias/register';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import path from 'path';
import dotenv from 'dotenv';

import { connectDB } from './config/database';
import logger from './config/logger';
import { configurePassport } from './config/passport';
import { errorHandler, notFound } from './middleware/errorHandler';
import { checkMaintenanceMode } from './middleware/auth';
import { registerRoutes } from './routes';
import { SearchService } from './services/SearchService';
import voiceSocketServer from './websocket/voiceSocketServer';

dotenv.config();

// Configure Passport
configurePassport();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 5000;
const MAX_PORT_RETRIES = Number(process.env.PORT_RETRIES || 5);

// Trust proxy for Heroku (needed for rate limiting and correct IP detection)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware - Configure helmet with relaxed CSP for production
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP as it's blocking API calls in production
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL?.split(',') || []
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5000', 'http://localhost:8000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Initialize Passport
app.use(passport.initialize());

// Maintenance mode check
app.use(checkMaintenanceMode);

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
registerRoutes(app);

// 404 handler for API routes
app.use('/api/*', notFound);

// Global error handler
app.use(errorHandler);

// Serve static files from frontend build directory
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Catch-all handler for React Router (SPA)
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found',
      path: req.originalUrl,
    });
  }

  // Serve the React app for all non-API routes
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Global error handler
app.use(errorHandler);

// Create HTTP server from Express app
const httpServer = createServer(app);

// Initialize Socket.IO for voice recognition
voiceSocketServer.initialize(httpServer);

// Database connection and server startup
const startServer = async () => {
  try {
    await connectDB();

    // Initialize search index on startup
    try {
      await SearchService.initializeSearchIndex();
      logger.info('Search index initialized successfully');
    } catch (searchError) {
      logger.warn('Failed to initialize search index:', searchError);
    }

    const listenWithRetry = (port: number, attempt: number = 0): void => {
      const server = httpServer.listen(port, () => {
        process.env.PORT = String(port);
        logger.info(`Server is running on port ${port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Health check available at http://localhost:${port}/health`);
        logger.info(`WebSocket server ready for voice recognition`);

        // Log Socket.IO stats
        const stats = voiceSocketServer.getStats();
        logger.info(`Active WebSocket connections: ${stats.connections}`);
        logger.info(`Active voice sessions: ${stats.activeSessions}`);
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          if (attempt >= MAX_PORT_RETRIES) {
            logger.error(`Port ${port} is already in use and maximum retry attempts reached.`);
            process.exit(1);
          }

          const nextPort = port + 1;
          logger.warn(`Port ${port} is in use. Attempting to start on port ${nextPort} (attempt ${attempt + 1}/${MAX_PORT_RETRIES}).`);

          setTimeout(() => listenWithRetry(nextPort, attempt + 1), 250);
        } else {
          logger.error('Failed to start server:', err);
          process.exit(1);
        }
      });
    };

    listenWithRetry(DEFAULT_PORT);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received. Starting graceful shutdown...`);

  try {
    // Shutdown voice WebSocket server
    await voiceSocketServer.shutdown();

    // Close HTTP server
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle SIGTERM signal
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle SIGINT signal (Ctrl+C)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;
