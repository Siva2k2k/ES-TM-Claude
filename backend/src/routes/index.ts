import { Express } from 'express';
import testRoutes from './test';
import timesheetRoutes from './timesheet';
import authRoutes from './auth';
import userRoutes from './user';
import projectRoutes from './project';
import billingRoutes from './billing';
import projectBillingRoutes from './projectBilling';
import invoiceRoutes from './invoice';
import billingRateRoutes from './billingRate';
import auditRoutes from './audit';
import clientRoutes from './client';
import dashboardRoutes from './dashboard';
import reportRoutes from './reports';
import settingsRoutes from './settings';
import notificationRoutes from './notifications';
import searchRoutes from './search';
import defaulterRoutes from './defaulters';
import holidayRoutes from './holidays';

export const registerRoutes = (app: Express): void => {
  // Test routes (for development and health checks)
  app.use('/api/test', testRoutes);

  // API v1 routes - Re-enabled after fixing imports!
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/billing', billingRoutes);
  app.use('/api/v1/project-billing', projectBillingRoutes);
  app.use('/api/v1/invoices', invoiceRoutes);
  app.use('/api/v1/billing-rates', billingRateRoutes);
  app.use('/api/v1/audit', auditRoutes);
  app.use('/api/v1/timesheets', timesheetRoutes);
  app.use('/api/v1/clients', clientRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/settings', settingsRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/search', searchRoutes);
  app.use('/api/v1/defaulters', defaulterRoutes);
  app.use('/api/v1/holidays', holidayRoutes);
  
  // Health check at root
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'Server is running',
      timestamp: new Date().toISOString(),
      database: 'MongoDB connected successfully!'
    });
  });
};
