import { Router } from 'express';
import { CompanyHoliday } from '@/models/CompanyHoliday';
import { requireHolidayManagement } from '@/utils/authorization';
import { requireAuth, AuthRequest } from '@/middleware/auth';

const router = Router();

// Get all holidays with optional filters
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, holiday_type, is_active, year } = req.query;

    let query: any = { deleted_at: null };

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

    // Default to active holidays only
    query.is_active = is_active === 'false' ? false : true;

    const holidays = await CompanyHoliday.find(query)
      .populate('created_by', 'full_name email')
      .sort({ date: 1 });

    res.json({
      success: true,
      holidays,
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch holidays',
    });
  }
});

// Get upcoming holidays (next N days)
router.get('/upcoming', async (req, res) => {
  try {
    const { days } = req.query;
    const daysAhead = Number(days) || 30;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const future = new Date(today);
    future.setDate(future.getDate() + daysAhead);

    const query = {
      date: { $gte: today, $lte: future },
      is_active: true,
      deleted_at: null
    };

    const upcoming = await CompanyHoliday.find(query)
      .populate('created_by', 'full_name email')
      .sort({ date: 1 });

    res.json({
      success: true,
      holidays: upcoming,
      count: upcoming.length,
    });
  } catch (error) {
    console.error('Error fetching upcoming holidays:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch upcoming holidays',
    });
  }
});

// Check if a specific date is a holiday
router.get('/check/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const target = new Date(date);

    if (Number.isNaN(target.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
      });
    }

    // Set to start of day for comparison
    target.setHours(0, 0, 0, 0);
    const endOfDay = new Date(target);
    endOfDay.setHours(23, 59, 59, 999);

    const holiday = await CompanyHoliday.findOne({
      date: { $gte: target, $lte: endOfDay },
      is_active: true,
      deleted_at: null
    }).populate('created_by', 'full_name email');

    res.json({
      success: true,
      is_holiday: Boolean(holiday),
      holiday: holiday ?? null,
    });
  } catch (error) {
    console.error('Error checking holiday:', error);
    res.status(500).json({
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

// Get a specific holiday by ID
router.get('/:id', async (req, res) => {
  try {
    const holiday = await CompanyHoliday.findById(req.params.id)
      .populate('created_by', 'full_name email');

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

// Create a new holiday (Admin only)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    requireHolidayManagement(req.user);

    const { name, date, holiday_type, description, is_active = true } = req.body;

    if (!name || !date || !holiday_type) {
      return res.status(400).json({
        success: false,
        error: 'Name, date, and holiday_type are required',
      });
    }

    const holiday = new CompanyHoliday({
      name,
      date: new Date(date),
      holiday_type,
      description,
      is_active,
      created_by: req.user.id,
    });

    await holiday.save();
    await holiday.populate('created_by', 'full_name email');

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

// Update a holiday (Admin only)
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    requireHolidayManagement(req.user);

    const { name, date, holiday_type, description, is_active } = req.body;

    const holiday = await CompanyHoliday.findById(req.params.id);

    if (!holiday) {
      return res.status(404).json({
        success: false,
        error: 'Holiday not found',
      });
    }

    if (name !== undefined) holiday.name = name;
    if (date !== undefined) holiday.date = new Date(date);
    if (holiday_type !== undefined) holiday.holiday_type = holiday_type;
    if (description !== undefined) holiday.description = description;
    if (is_active !== undefined) holiday.is_active = is_active;

    await holiday.save();
    await holiday.populate('created_by', 'full_name email');

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

// Delete a holiday (Admin only)
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

export default router;
