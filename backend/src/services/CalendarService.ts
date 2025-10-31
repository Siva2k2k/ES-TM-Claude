import { Calendar, ICalendar } from '@/models/Calendar';
import { CompanyHoliday } from '@/models/CompanyHoliday';
import { ValidationError, NotFoundError } from '@/utils/errors';

export class CalendarService {
  /**
   * Get all active calendars
   */
  static async getActiveCalendars(createdBy?: string): Promise<ICalendar[]> {
    const query: any = {
      is_active: true,
      deleted_at: { $exists: false }
    };

    if (createdBy) {
      query.created_by = createdBy;
    }

    return Calendar.find(query)
      .populate('created_by', 'full_name email')
      .sort({ name: 1 });
  }

  /**
   * Get calendar by ID with populated holidays
   */
  static async getCalendarWithHolidays(calendarId: string): Promise<{
    calendar: ICalendar;
    holidays: any[];
  }> {
    const calendar = await Calendar.findById(calendarId)
      .populate('created_by', 'full_name email');

    if (!calendar) {
      throw new NotFoundError('Calendar not found');
    }

    const holidays = await CompanyHoliday.find({
      calendar_id: calendarId,
      is_active: true,
      deleted_at: { $exists: false }
    }).sort({ date: 1 });

    return { calendar, holidays };
  }

  /**
   * Get default calendar for a type
   */
  static async getDefaultCalendar(type: string = 'company'): Promise<ICalendar | null> {
    return (Calendar as any).getDefaultCalendar(type);
  }

  /**
   * Create a new calendar
   */
  static async createCalendar(calendarData: {
    name: string;
    description?: string;
    type: string;
    timezone?: string;
    working_days?: number[];
    business_hours_start?: string;
    business_hours_end?: string;
    working_hours_per_day?: number;
    created_by: string;
  }): Promise<ICalendar> {
    // Validate required fields
    if (!calendarData.name || !calendarData.type) {
      throw new ValidationError('Calendar name and type are required');
    }

    // Validate calendar type
    const validTypes = ['system', 'company', 'regional', 'personal'];
    if (!validTypes.includes(calendarData.type)) {
      throw new ValidationError(`Invalid calendar type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate working days
    if (calendarData.working_days) {
      const invalidDays = calendarData.working_days.filter(day => day < 0 || day > 6);
      if (invalidDays.length > 0) {
        throw new ValidationError('Working days must be between 0 (Sunday) and 6 (Saturday)');
      }
    }

    const calendar = new Calendar({
      name: calendarData.name,
      description: calendarData.description,
      type: calendarData.type,
      timezone: calendarData.timezone || 'UTC',
      is_default: false, // New calendars are not default by default
      is_active: true,
      include_public_holidays: true,
      include_company_holidays: true,
      working_days: calendarData.working_days || [1, 2, 3, 4, 5], // Default Monday-Friday
      business_hours_start: calendarData.business_hours_start,
      business_hours_end: calendarData.business_hours_end,
      working_hours_per_day: calendarData.working_hours_per_day || 8,
      created_by: calendarData.created_by
    });

    return calendar.save();
  }

  /**
   * Update calendar
   */
  static async updateCalendar(
    calendarId: string,
    updateData: Partial<{
      name: string;
      description: string;
      timezone: string;
      is_default: boolean;
      working_days: number[];
      business_hours_start: string;
      business_hours_end: string;
      working_hours_per_day: number;
    }>
  ): Promise<ICalendar> {
    const calendar = await Calendar.findById(calendarId);

    if (!calendar) {
      throw new NotFoundError('Calendar not found');
    }

    // Validate working days if provided
    if (updateData.working_days) {
      const invalidDays = updateData.working_days.filter(day => day < 0 || day > 6);
      if (invalidDays.length > 0) {
        throw new ValidationError('Working days must be between 0 (Sunday) and 6 (Saturday)');
      }
    }

    // Update fields
    Object.assign(calendar, updateData);

    return calendar.save();
  }

  /**
   * Soft delete calendar
   */
  static async deleteCalendar(calendarId: string): Promise<void> {
    const calendar = await Calendar.findById(calendarId);

    if (!calendar) {
      throw new NotFoundError('Calendar not found');
    }

    // Check if calendar has associated holidays
    const holidayCount = await CompanyHoliday.countDocuments({
      calendar_id: calendarId,
      deleted_at: { $exists: false }
    });

    if (holidayCount > 0) {
      throw new ValidationError(
        `Cannot delete calendar with ${holidayCount} associated holidays. ` +
        'Please reassign or delete the holidays first.'
      );
    }

    calendar.deleted_at = new Date();
    await calendar.save();
  }

  /**
   * Check if a date is a working day according to calendar
   */
  static isWorkingDay(calendar: ICalendar, date: Date): boolean {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return calendar.working_days.includes(dayOfWeek);
  }

  /**
   * Check if a date is a holiday in the calendar
   */
  static async isHoliday(calendar: ICalendar, date: Date): Promise<boolean> {
    // Check for holidays in this calendar
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const holiday = await CompanyHoliday.findOne({
      calendar_id: calendar._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      is_active: true,
      deleted_at: { $exists: false },
      holiday_type: {
        $in: calendar.include_public_holidays && calendar.include_company_holidays
          ? ['public', 'company', 'optional']
          : calendar.include_public_holidays
            ? ['public', 'optional']
            : calendar.include_company_holidays
              ? ['company', 'optional']
              : ['optional']
      }
    });

    return !!holiday;
  }

  /**
   * Get working days between two dates for a calendar
   */
  static async getWorkingDaysCount(
    calendar: ICalendar,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    let workingDays = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (this.isWorkingDay(calendar, currentDate)) {
        // Check if it's not a holiday
        const isHoliday = await this.isHoliday(calendar, currentDate);
        if (!isHoliday) {
          workingDays++;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }

  /**
   * Clone calendar with holidays
   */
  static async cloneCalendar(
    sourceCalendarId: string,
    newCalendarData: {
      name: string;
      description?: string;
      type?: string;
      created_by: string;
    }
  ): Promise<{ calendar: ICalendar; holidaysCloned: number }> {
    const sourceCalendar = await Calendar.findById(sourceCalendarId);

    if (!sourceCalendar) {
      throw new NotFoundError('Source calendar not found');
    }

    // Create new calendar
    const newCalendar = new Calendar({
      name: newCalendarData.name,
      description: newCalendarData.description || `Clone of ${sourceCalendar.name}`,
      type: newCalendarData.type || sourceCalendar.type,
      timezone: sourceCalendar.timezone,
      is_default: false,
      is_active: true,
      include_public_holidays: sourceCalendar.include_public_holidays,
      include_company_holidays: sourceCalendar.include_company_holidays,
      working_days: [...sourceCalendar.working_days],
      business_hours_start: sourceCalendar.business_hours_start,
      business_hours_end: sourceCalendar.business_hours_end,
      working_hours_per_day: sourceCalendar.working_hours_per_day,
      created_by: newCalendarData.created_by
    });

    const savedCalendar = await newCalendar.save();

    // Clone holidays
    const sourceHolidays = await CompanyHoliday.find({
      calendar_id: sourceCalendarId,
      deleted_at: { $exists: false }
    });

    const clonedHolidays = sourceHolidays.map(holiday => ({
      name: holiday.name,
      date: holiday.date,
      holiday_type: holiday.holiday_type,
      description: holiday.description,
      is_active: holiday.is_active,
      calendar_id: savedCalendar._id,
      created_by: newCalendarData.created_by
    }));

    if (clonedHolidays.length > 0) {
      await CompanyHoliday.insertMany(clonedHolidays);
    }

    return {
      calendar: savedCalendar,
      holidaysCloned: clonedHolidays.length
    };
  }
}