/**
 * Holiday System Routes
 * 
 * Routes for managing the simplified company holiday system.
 * Provides endpoints for initialization, configuration, and management.
 */

import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import { HolidaySystemController, updateCalendarValidation, bulkImportValidation } from '@/controllers/HolidaySystemController';

const router = Router();

// Initialize the holiday system (Super Admin only)
router.post('/initialize', requireAuth, HolidaySystemController.initializeSystem);

// Get holiday system status (Public for frontend to check if system is set up)
router.get('/status', HolidaySystemController.getSystemStatus);

// Update company calendar settings (Admin only)
router.put('/calendar', requireAuth, updateCalendarValidation, HolidaySystemController.updateCalendarSettings);

// Get holidays for current year or specific year
router.get('/holidays/:year?', HolidaySystemController.getYearlyHolidays);

// Bulk import holidays (Admin only)
router.post('/bulk-import', requireAuth, bulkImportValidation, HolidaySystemController.bulkImportHolidays);

export default router;