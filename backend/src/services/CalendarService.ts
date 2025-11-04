import Calendar, { ICalendar } from '@/models/Calendar';
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

    // In the simplified system, get all active holidays (not tied to specific calendar)
    const holidays = await CompanyHoliday.find({
      is_active: true,
      deleted_at: { $exists: false }
    }).sort({ date: 1 });

    return { calendar, holidays };
  }

  /**
   * Get default calendar (the active company calendar)
   */
  static async getDefaultCalendar(): Promise<ICalendar | null> {
    return Calendar.getCompanyCalendar();
  }

  /**
   * Create a new calendar
   */
  static async createCalendar(calendarData: {
    name: string;
    description?: string;
    timezone?: string;
    working_days?: number[];
    business_hours_start?: string;
    business_hours_end?: string;
    working_hours_per_day?: number;
    auto_create_holiday_entries?: boolean;
    default_holiday_hours?: number;
    created_by: string;
  }): Promise<ICalendar> {
    // Validate required fields
    if (!calendarData.name) {
      throw new ValidationError('Calendar name is required');
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
      timezone: calendarData.timezone || 'UTC',
      is_active: true,
      auto_create_holiday_entries: calendarData.auto_create_holiday_entries ?? true,
      default_holiday_hours: calendarData.default_holiday_hours || 8,
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

    // Note: In the simplified calendar system, holidays are not tied to specific calendars
    // so we can proceed with deletion

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
   * Check if a date is a holiday
   * Note: In the simplified calendar system, holidays are global
   */
  static async isHoliday(_calendar: ICalendar, date: Date): Promise<boolean> {
    // Check for holidays (calendar parameter kept for API compatibility)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // The simplified calendar system includes all active holidays
    const holiday = await CompanyHoliday.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      is_active: true,
      deleted_at: { $exists: false }
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
      timezone: sourceCalendar.timezone,
      is_active: true,
      auto_create_holiday_entries: sourceCalendar.auto_create_holiday_entries,
      default_holiday_hours: sourceCalendar.default_holiday_hours,
      working_days: [...sourceCalendar.working_days],
      business_hours_start: sourceCalendar.business_hours_start,
      business_hours_end: sourceCalendar.business_hours_end,
      working_hours_per_day: sourceCalendar.working_hours_per_day,
      created_by: newCalendarData.created_by
    });

    const savedCalendar = await newCalendar.save();

    // Note: In the simplified calendar system, holidays are global and not tied to specific calendars
    // so we don't clone holidays

    return {
      calendar: savedCalendar,
      holidaysCloned: 0
    };
  }
}