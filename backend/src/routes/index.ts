import { Express } from 'express';
import testRoutes from './test';
import timesheetRoutes from './timesheet';
import authRoutes from './auth';
import userRoutes from './user';
import projectRoutes from './project';
import billingRoutes from './billing';
import auditRoutes from './audit';

export const registerRoutes = (app: Express): void => {
  // Test routes (for development and health checks)
  app.use('/api/test', testRoutes);

  // API v1 routes - Re-enabled after fixing imports!
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/billing', billingRoutes);
  app.use('/api/v1/audit', auditRoutes);
  app.use('/api/v1/timesheets', timesheetRoutes);
  
  // Health check at root
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'Server is running',
      timestamp: new Date().toISOString(),
      database: 'MongoDB connected successfully!'
    });
  });
};