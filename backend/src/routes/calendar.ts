import { Router } from 'express';
import { Calendar } from '@/models/Calendar';
import { CalendarService } from '@/services/CalendarService';
import { requireCalendarManagement } from '@/utils/authorization';
import { requireAuth, AuthRequest } from '@/middleware/auth';

const router = Router();

// Get all calendars
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { type, is_active, created_by } = req.query;

    let query: any = {};

    if (type) {
      query.type = type;
    }

    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }

    if (created_by) {
      query.created_by = created_by;
    } else {
      // If no specific user requested, show all active calendars
      query.is_active = true;
      query.deleted_at = { $exists: false };
    }

    const calendars = await Calendar.find(query)
      .populate('created_by', 'full_name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      calendars,
    });
  } catch (error) {
    console.error('Error fetching calendars:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendars',
    });
  }
});

// Get calendar by ID
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const calendar = await Calendar.findById(req.params.id)
      .populate('created_by', 'full_name email');

    if (!calendar) {
      return res.status(404).json({
        success: false,
        error: 'Calendar not found',
      });
    }

    res.json({
      success: true,
      calendar,
    });
  } catch (error) {
    console.error('Error fetching calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar',
    });
  }
});

// Create new calendar
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    requireCalendarManagement(req.user);

    const calendar = await CalendarService.createCalendar({
      ...req.body,
      created_by: req.user.id,
    });

    await calendar.populate('created_by', 'full_name email');

    res.status(201).json({
      success: true,
      calendar,
    });
  } catch (error) {
    console.error('Error creating calendar:', error);
    const statusCode = error.message.includes('required') || error.message.includes('Invalid') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to create calendar',
    });
  }
});

// Update calendar
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    requireCalendarManagement(req.user);

    const calendar = await CalendarService.updateCalendar(req.params.id, req.body);

    await calendar.populate('created_by', 'full_name email');

    res.json({
      success: true,
      calendar,
    });
  } catch (error) {
    console.error('Error updating calendar:', error);
    let statusCode = 500;
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('Invalid') || error.message.includes('must be')) {
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to update calendar',
    });
  }
});

// Delete calendar (soft delete)
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    requireCalendarManagement(req.user);

    await CalendarService.deleteCalendar(req.params.id);

    res.json({
      success: true,
      message: 'Calendar deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    let statusCode = 500;
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('Cannot delete')) {
      statusCode = 400;
    }
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to delete calendar',
    });
  }
});

// Get default calendar for a type
router.get('/default/:type', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { type } = req.params;

    if (!['system', 'company', 'regional', 'personal'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid calendar type',
      });
    }

    const calendar = await (Calendar as any).getDefaultCalendar(type as any);

    if (!calendar) {
      return res.status(404).json({
        success: false,
        error: `No default ${type} calendar found`,
      });
    }

    await calendar.populate('created_by', 'full_name email');

    res.json({
      success: true,
      calendar,
    });
  } catch (error) {
    console.error('Error fetching default calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch default calendar',
    });
  }
});

// Get calendar with associated holidays
router.get('/:id/with-holidays', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await CalendarService.getCalendarWithHolidays(req.params.id);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching calendar with holidays:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch calendar with holidays',
    });
  }
});

// Clone calendar with holidays
router.post('/:id/clone', requireAuth, async (req: AuthRequest, res) => {
  try {
    requireCalendarManagement(req.user);

    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'New calendar name is required',
      });
    }

    const result = await CalendarService.cloneCalendar(req.params.id, {
      name,
      description,
      created_by: req.user.id,
    });

    await result.calendar.populate('created_by', 'full_name email');

    res.status(201).json({
      success: true,
      calendar: result.calendar,
      holidaysCloned: result.holidaysCloned,
    });
  } catch (error) {
    console.error('Error cloning calendar:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to clone calendar',
    });
  }
});

export default router;