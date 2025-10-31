import { backendApi } from './backendApi';

export type CalendarType = 'system' | 'company' | 'regional' | 'personal';

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  type: CalendarType;
  timezone: string;
  is_default: boolean;
  is_active: boolean;
  include_public_holidays: boolean;
  include_company_holidays: boolean;
  working_days: number[];
  business_hours_start?: string;
  business_hours_end?: string;
  working_hours_per_day: number;
  created_by: {
    id: string;
    full_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CalendarWithHolidays extends Calendar {
  holidays: Array<{
    id: string;
    name: string;
    date: string;
    holiday_type: 'public' | 'company' | 'optional';
    description?: string;
    is_active: boolean;
  }>;
}

export interface CreateCalendarData {
  name: string;
  description?: string;
  type: CalendarType;
  timezone?: string;
  working_days?: number[];
  business_hours_start?: string;
  business_hours_end?: string;
  working_hours_per_day?: number;
}

export interface UpdateCalendarData extends Partial<CreateCalendarData> {
  is_default?: boolean;
}

export interface CloneCalendarData {
  name: string;
  description?: string;
  type?: CalendarType;
}

export class CalendarService {
  /**
   * Get all active calendars
   */
  static async getCalendars(params?: {
    type?: CalendarType;
    is_active?: boolean;
    created_by?: string;
  }): Promise<{ calendars: Calendar[]; error?: string }> {
    try {
      const response = await backendApi.get('/calendars', { params });

      if (response.data.success) {
        return { calendars: response.data.calendars };
      } else {
        return { calendars: [], error: response.data.error || 'Failed to fetch calendars' };
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching calendars:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch calendars';
      return {
        calendars: [],
        error: errorMessage
      };
    }
  }

  /**
   * Get calendar by ID
   */
  static async getCalendar(id: string): Promise<{ calendar?: Calendar; error?: string }> {
    try {
      const response = await backendApi.get(`/calendars/${id}`);

      if (response.data.success) {
        return { calendar: response.data.calendar };
      } else {
        return { error: response.data.error || 'Failed to fetch calendar' };
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching calendar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch calendar';
      return {
        error: errorMessage
      };
    }
  }

  /**
   * Get calendar with associated holidays
   */
  static async getCalendarWithHolidays(id: string): Promise<{
    calendar?: CalendarWithHolidays;
    error?: string;
  }> {
    try {
      const response = await backendApi.get(`/calendars/${id}/with-holidays`);

      if (response.data.success) {
        return { calendar: response.data };
      } else {
        return { error: response.data.error || 'Failed to fetch calendar with holidays' };
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching calendar with holidays:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch calendar with holidays';
      return {
        error: errorMessage
      };
    }
  }

  /**
   * Get default calendar for a type
   */
  static async getDefaultCalendar(type: CalendarType): Promise<{
    calendar?: Calendar;
    error?: string;
  }> {
    try {
      const response = await backendApi.get(`/calendars/default/${type}`);

      if (response.data.success) {
        return { calendar: response.data.calendar };
      } else {
        return { error: response.data.error || 'Failed to fetch default calendar' };
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching default calendar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch default calendar';
      return {
        error: errorMessage
      };
    }
  }

  /**
   * Create a new calendar
   */
  static async createCalendar(data: CreateCalendarData): Promise<{
    calendar?: Calendar;
    error?: string;
  }> {
    try {
      const response = await backendApi.post('/calendars', data);

      if (response.data.success) {
        return { calendar: response.data.calendar };
      } else {
        return { error: response.data.error || 'Failed to create calendar' };
      }
    } catch (error: unknown) {
      console.error('❌ Error creating calendar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create calendar';
      return {
        error: errorMessage
      };
    }
  }

  /**
   * Update calendar
   */
  static async updateCalendar(id: string, data: UpdateCalendarData): Promise<{
    calendar?: Calendar;
    error?: string;
  }> {
    try {
      const response = await backendApi.put(`/calendars/${id}`, data);

      if (response.data.success) {
        return { calendar: response.data.calendar };
      } else {
        return { error: response.data.error || 'Failed to update calendar' };
      }
    } catch (error: unknown) {
      console.error('❌ Error updating calendar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update calendar';
      return {
        error: errorMessage
      };
    }
  }

  /**
   * Delete calendar (soft delete)
   */
  static async deleteCalendar(id: string): Promise<{ error?: string }> {
    try {
      const response = await backendApi.delete(`/calendars/${id}`);

      if (response.data.success) {
        return {};
      } else {
        return { error: response.data.error || 'Failed to delete calendar' };
      }
    } catch (error: unknown) {
      console.error('❌ Error deleting calendar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete calendar';
      return {
        error: errorMessage
      };
    }
  }

  /**
   * Clone calendar with holidays
   */
  static async cloneCalendar(id: string, data: CloneCalendarData): Promise<{
    calendar?: Calendar;
    holidaysCloned?: number;
    error?: string;
  }> {
    try {
      const response = await backendApi.post(`/calendars/${id}/clone`, data);

      if (response.data.success) {
        return {
          calendar: response.data.calendar,
          holidaysCloned: response.data.holidaysCloned
        };
      } else {
        return { error: response.data.error || 'Failed to clone calendar' };
      }
    } catch (error: unknown) {
      console.error('❌ Error cloning calendar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clone calendar';
      return {
        error: errorMessage
      };
    }
  }

  /**
   * Check if a date is a working day according to calendar
   */
  static isWorkingDay(calendar: Calendar, date: Date): boolean {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return calendar.working_days.includes(dayOfWeek);
  }

  /**
   * Check if a date is a holiday in the calendar
   */
  static async isHoliday(calendarId: string, date: Date): Promise<boolean> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await backendApi.get(`/holidays/check/${dateStr}`, {
        params: { calendar_id: calendarId }
      });

      return response.data.success && response.data.is_holiday;
    } catch (error) {
      console.error('❌ Error checking holiday:', error);
      return false;
    }
  }

  /**
   * Get working days count between two dates
   */
  static async getWorkingDaysCount(
    calendar: Calendar,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    let workingDays = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (this.isWorkingDay(calendar, currentDate)) {
        // Check if it's not a holiday
        const isHoliday = await this.isHoliday(calendar.id, currentDate);
        if (!isHoliday) {
          workingDays++;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }

  /**
   * Get calendar-aware holidays for a date range
   */
  static async getHolidaysForCalendar(
    calendarId: string,
    params?: {
      startDate?: string;
      endDate?: string;
      holiday_type?: string;
      year?: number;
    }
  ): Promise<{
    holidays: Array<{
      id: string;
      name: string;
      date: string;
      holiday_type: string;
      description?: string;
      is_active: boolean;
    }>;
    error?: string;
  }> {
    try {
      const response = await backendApi.get(`/holidays/calendar/${calendarId}`, { params });

      if (response.data.success) {
        return { holidays: response.data.holidays };
      } else {
        return { holidays: [], error: response.data.error || 'Failed to fetch holidays' };
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching calendar holidays:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch holidays';
      return {
        holidays: [],
        error: errorMessage
      };
    }
  }
}