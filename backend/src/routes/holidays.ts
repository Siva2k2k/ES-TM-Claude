import { Router } from 'express';
import { CompanyHoliday } from '@/models/CompanyHoliday';
import { Calendar } from '@/models/Calendar';
import { requireHolidayManagement } from '@/utils/authorization';
import { requireAuth, AuthRequest } from '@/middleware/auth';

const router = Router();

// Helper function to get calendar and build holiday query
async function getCalendarAndQuery(calendarId?: string) {
  let calendar = null;
  let query: any = {};

  if (calendarId) {
    // Specific calendar requested
    calendar = await Calendar.findById(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }
    query.calendar_id = calendarId;
  } else {
    // No calendar specified - use default company calendar
    calendar = await (Calendar as any).getDefaultCalendar('company');
    if (calendar) {
      query.calendar_id = calendar._id;
    }
  }

  return { calendar, query };
}

// Helper function to build holiday type filter
function buildHolidayTypeFilter(holidayType?: string, calendar?: any) {
  if (holidayType) {
    return holidayType;
  }

  if (calendar) {
    // Filter by calendar's holiday type preferences
    const allowedTypes = [];
    if (calendar.include_public_holidays) allowedTypes.push('public');
    if (calendar.include_company_holidays) allowedTypes.push('company');
    allowedTypes.push('optional'); // Always include optional holidays
    return { $in: allowedTypes };
  }

  return undefined;
}

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, holiday_type, is_active, year, calendar_id } = req.query;

    // Get calendar and base query
    const { calendar, query } = await getCalendarAndQuery(calendar_id as string);

    // Add date filters
    if (year) {
      const yearNumber = Number(year);
      if (!Number.isNaN(yearNumber)) {
        const startOfYear = new Date(yearNumber, 0, 1);
        const endOfYear = new Date(yearNumber, 11, 31, 23, 59, 59, 999);
        query.date = { $gte: startOfYear, $lte: endOfYear };
      }
    }

    if (startDate || endDate) {
      query.date = query.date || {};
      if (startDate) {
        query.date.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const endDateObj = new Date(endDate as string);
        endDateObj.setHours(23, 59, 59, 999);
        query.date.$lte = endDateObj;
      }
    }

    // Add holiday type filter
    const holidayTypeFilter = buildHolidayTypeFilter(holiday_type as string, calendar);
    if (holidayTypeFilter) {
      query.holiday_type = holidayTypeFilter;
    }

    // Add active status filter
    query.is_active = is_active === 'true';

    const holidays = await CompanyHoliday.find(query)
      .populate('calendar_id', 'name type')
      .sort({ date: 1 });

    res.json({
      success: true,
      holidays,
      calendar: calendar ? {
        id: calendar.id,
        name: calendar.name,
        type: calendar.type
      } : null,
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    const statusCode = error.message === 'Calendar not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch holidays',
    });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const { days, calendar_id } = req.query;
    const daysAhead = Number(days) || 30;

    // Get calendar and base query
    const { calendar, query } = await getCalendarAndQuery(calendar_id as string);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const future = new Date(today);
    future.setDate(future.getDate() + daysAhead);

    query.date = { $gte: today, $lte: future };
    query.is_active = true;

    // Add holiday type filter
    const holidayTypeFilter = buildHolidayTypeFilter(undefined, calendar);
    if (holidayTypeFilter) {
      query.holiday_type = holidayTypeFilter;
    }

    const upcoming = await CompanyHoliday.find(query)
      .populate('calendar_id', 'name type')
      .sort({ date: 1 });

    res.json({
      success: true,
      holidays: upcoming,
      count: upcoming.length,
      calendar: calendar ? {
        id: calendar.id,
        name: calendar.name,
        type: calendar.type
      } : null,
    });
  } catch (error) {
    console.error('Error fetching upcoming holidays:', error);
    const statusCode = error.message === 'Calendar not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to fetch upcoming holidays',
    });
  }
});

router.get('/check/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { calendar_id } = req.query;
    const target = new Date(date);

    if (Number.isNaN(target.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
      });
    }

    // Get calendar and base query
    const { calendar, query } = await getCalendarAndQuery(calendar_id as string);

    // Set to start of day for comparison
    target.setHours(0, 0, 0, 0);
    const endOfDay = new Date(target);
    endOfDay.setHours(23, 59, 59, 999);

    query.date = { $gte: target, $lte: endOfDay };
    query.is_active = true;

    // Add holiday type filter
    const holidayTypeFilter = buildHolidayTypeFilter(undefined, calendar);
    if (holidayTypeFilter) {
      query.holiday_type = holidayTypeFilter;
    }

    const holiday = await CompanyHoliday.findOne(query)
      .populate('calendar_id', 'name type');

    res.json({
      success: true,
      is_holiday: Boolean(holiday),
      holiday: holiday ?? null,
      calendar: calendar ? {
        id: calendar.id,
        name: calendar.name,
        type: calendar.type
      } : null,
    });
  } catch (error) {
    console.error('Error checking holiday:', error);
    const statusCode = error.message === 'Calendar not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to check holiday',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const holiday = await CompanyHoliday.findById(req.params.id);

    if (!holiday) {
      return res.status(404).json({
        success: false,
        error: 'Holiday not found',
      });
    }

    res.json({
      success: true,
      holiday,
    });
  } catch (error) {
    console.error('Error fetching holiday:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch holiday',
    });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    requireHolidayManagement(req.user);

    const { name, date, holiday_type, description, is_active = true, calendar_id } = req.body;

    if (!name || !date || !holiday_type) {
      return res.status(400).json({
        success: false,
        error: 'Name, date, and holiday_type are required',
      });
    }

    // Validate calendar exists if calendar_id is provided
    if (calendar_id) {
      const calendar = await Calendar.findById(calendar_id);
      if (!calendar) {
        return res.status(400).json({
          success: false,
          error: 'Invalid calendar_id: Calendar not found',
        });
      }
    }

    const holiday = new CompanyHoliday({
      name,
      date: new Date(date),
      holiday_type,
      description,
      is_active,
      calendar_id: calendar_id || undefined, // Use undefined if not provided
      created_by: req.user.id,
    });

    await holiday.save();
    await holiday.populate('calendar_id', 'name type');

    res.status(201).json({
      success: true,
      holiday,
    });
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create holiday',
    });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    requireHolidayManagement(req.user);

    const { name, date, holiday_type, description, is_active, calendar_id } = req.body;

    const holiday = await CompanyHoliday.findById(req.params.id);

    if (!holiday) {
      return res.status(404).json({
        success: false,
        error: 'Holiday not found',
      });
    }

    // Validate calendar exists if calendar_id is being updated
    if (calendar_id !== undefined) {
      if (calendar_id) {
        const calendar = await Calendar.findById(calendar_id);
        if (!calendar) {
          return res.status(400).json({
            success: false,
            error: 'Invalid calendar_id: Calendar not found',
          });
        }
      }
      holiday.calendar_id = calendar_id || undefined;
    }

    if (name !== undefined) holiday.name = name;
    if (date !== undefined) holiday.date = new Date(date);
    if (holiday_type !== undefined) holiday.holiday_type = holiday_type;
    if (description !== undefined) holiday.description = description;
    if (is_active !== undefined) holiday.is_active = is_active;

    await holiday.save();
    await holiday.populate('calendar_id', 'name type');

    res.json({
      success: true,
      holiday,
    });
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update holiday',
    });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    requireHolidayManagement(req.user);

    const holiday = await CompanyHoliday.findByIdAndDelete(req.params.id);

    if (!holiday) {
      return res.status(404).json({
        success: false,
        error: 'Holiday not found',
      });
    }

    res.json({
      success: true,
      message: 'Holiday deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete holiday',
    });
  }
});

// Get holidays for a specific calendar
router.get('/calendar/:calendarId', async (req, res) => {
  try {
    const { calendarId } = req.params;
    const { startDate, endDate, holiday_type, is_active, year } = req.query;

    // Verify calendar exists
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) {
      return res.status(404).json({
        success: false,
        error: 'Calendar not found',
      });
    }

    let query: any = { calendar_id: calendarId };

    // Add date filters
    if (year) {
      const yearNumber = Number(year);
      if (!Number.isNaN(yearNumber)) {
        const startOfYear = new Date(yearNumber, 0, 1);
        const endOfYear = new Date(yearNumber, 11, 31, 23, 59, 59, 999);
        query.date = { $gte: startOfYear, $lte: endOfYear };
      }
    }

    if (startDate || endDate) {
      query.date = query.date || {};
      if (startDate) {
        query.date.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const endDateObj = new Date(endDate as string);
        endDateObj.setHours(23, 59, 59, 999);
        query.date.$lte = endDateObj;
      }
    }

    if (holiday_type) {
      query.holiday_type = holiday_type;
    }

    query.is_active = is_active !== undefined ? is_active === 'true' : true;

    const holidays = await CompanyHoliday.find(query).sort({ date: 1 });

    res.json({
      success: true,
      holidays,
      calendar: {
        id: calendar.id,
        name: calendar.name,
        type: calendar.type
      },
    });
  } catch (error) {
    console.error('Error fetching calendar holidays:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar holidays',
    });
  }
});

// Admin route to get all holidays across all calendars
router.get('/admin/all', requireAuth, async (req: AuthRequest, res) => {
  try {
    requireHolidayManagement(req.user);

    const { startDate, endDate, holiday_type, is_active, year, calendar_id } = req.query;

    let query: any = {};

    if (calendar_id) {
      query.calendar_id = calendar_id;
    }

    // Add date filters
    if (year) {
      const yearNumber = Number(year);
      if (!Number.isNaN(yearNumber)) {
        const startOfYear = new Date(yearNumber, 0, 1);
        const endOfYear = new Date(yearNumber, 11, 31, 23, 59, 59, 999);
        query.date = { $gte: startOfYear, $lte: endOfYear };
      }
    }

    if (startDate || endDate) {
      query.date = query.date || {};
      if (startDate) {
        query.date.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const endDateObj = new Date(endDate as string);
        endDateObj.setHours(23, 59, 59, 999);
        query.date.$lte = endDateObj;
      }
    }

    if (holiday_type) {
      query.holiday_type = holiday_type;
    }

    query.is_active = is_active !== undefined ? is_active === 'true' : true;

    const holidays = await CompanyHoliday.find(query)
      .populate('calendar_id', 'name type')
      .populate('created_by', 'full_name email')
      .sort({ date: 1 });

    res.json({
      success: true,
      holidays,
    });
  } catch (error) {
    console.error('Error fetching all holidays:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch all holidays',
    });
  }
});

export default router;
