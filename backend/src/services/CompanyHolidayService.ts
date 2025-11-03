/**
 * CompanyHolidayService
 *
 * Handles CRUD operations for company holidays and provides utility methods
 * for checking if dates are holidays.
 */

import { CompanyHoliday, ICompanyHoliday, HolidayType } from '@/models/CompanyHoliday';
import { ValidationError, NotFoundError } from '@/utils/errors';
import mongoose from 'mongoose';

export interface CreateHolidayData {
  name: string;
  date: Date | string;
  holiday_type: HolidayType;
  description?: string;
  created_by: string;
}

export interface UpdateHolidayData {
  name?: string;
  date?: Date | string;
  holiday_type?: HolidayType;
  description?: string;
  is_active?: boolean;
}

export interface HolidayFilters {
  startDate?: Date | string;
  endDate?: Date | string;
  holiday_type?: HolidayType;
  is_active?: boolean;
}

export class CompanyHolidayService {

  /**
   * Create a new company holiday
   *
   * @param data Holiday creation data
   * @returns Created holiday document
   */
  async createHoliday(data: CreateHolidayData): Promise<ICompanyHoliday> {
    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Holiday name is required');
    }

    if (!data.date) {
      throw new ValidationError('Holiday date is required');
    }

    if (!data.created_by) {
      throw new ValidationError('created_by user ID is required');
    }

    // Validate date format
    const holidayDate = new Date(data.date);
    if (Number.isNaN(holidayDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    // Set date to midnight UTC to avoid timezone issues
    holidayDate.setUTCHours(0, 0, 0, 0);

    // Check if holiday already exists for this date
    const existingHoliday = await CompanyHoliday.findOne({
      date: holidayDate,
      deleted_at: null
    });

    if (existingHoliday) {
      throw new ValidationError(`A holiday already exists for ${holidayDate.toISOString().split('T')[0]}`);
    }

    // Create holiday
    const holiday = await CompanyHoliday.create({
      name: data.name.trim(),
      date: holidayDate,
      holiday_type: data.holiday_type || 'public',
      description: data.description?.trim(),
      is_active: true,
      created_by: new mongoose.Types.ObjectId(data.created_by)
    });

    return holiday;
  }

  /**
   * Get all holidays (with optional filters)
   *
   * @param filters Optional filters
   * @returns Array of holidays
   */
  async getHolidays(filters?: HolidayFilters): Promise<ICompanyHoliday[]> {
    const query: any = {
      deleted_at: null
    };

    // Apply filters
    if (filters?.startDate || filters?.endDate) {
      query.date = {};

      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setUTCHours(0, 0, 0, 0);
        query.date.$gte = startDate;
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setUTCHours(23, 59, 59, 999);
        query.date.$lte = endDate;
      }
    }

    if (filters?.holiday_type) {
      query.holiday_type = filters.holiday_type;
    }

    if (filters?.is_active !== undefined) {
      query.is_active = filters.is_active;
    }

    const holidays = await CompanyHoliday.find(query)
      .sort({ date: 1 })
      .populate('created_by', 'full_name email')
      .lean();

    return holidays as ICompanyHoliday[];
  }

  /**
   * Get holidays within a specific date range
   *
   * @param startDate Range start date
   * @param endDate Range end date
   * @returns Array of holidays in the range
   */
  async getHolidaysInRange(startDate: Date, endDate: Date): Promise<ICompanyHoliday[]> {
    return this.getHolidays({
      startDate,
      endDate,
      is_active: true
    });
  }

  /**
   * Check if a specific date is a holiday
   *
   * @param date Date to check
   * @returns true if the date is an active holiday, false otherwise
   */
  async isHoliday(date: Date): Promise<boolean> {
    const checkDate = new Date(date);
    checkDate.setUTCHours(0, 0, 0, 0);

    const holiday = await CompanyHoliday.findOne({
      date: checkDate,
      is_active: true,
      deleted_at: null
    });

    return !!holiday;
  }

  /**
   * Get holiday by ID
   *
   * @param holidayId Holiday ID
   * @returns Holiday document
   */
  async getHolidayById(holidayId: string): Promise<ICompanyHoliday> {
    if (!mongoose.Types.ObjectId.isValid(holidayId)) {
      throw new ValidationError('Invalid holiday ID format');
    }

    const holiday = await CompanyHoliday.findOne({
      _id: new mongoose.Types.ObjectId(holidayId),
      deleted_at: null
    }).populate('created_by', 'full_name email');

    if (!holiday) {
      throw new NotFoundError('Holiday not found');
    }

    return holiday;
  }

  /**
   * Get holiday by date
   *
   * @param date Holiday date
   * @returns Holiday document or null
   */
  async getHolidayByDate(date: Date): Promise<ICompanyHoliday | null> {
    const checkDate = new Date(date);
    checkDate.setUTCHours(0, 0, 0, 0);

    const holiday = await CompanyHoliday.findOne({
      date: checkDate,
      deleted_at: null
    }).populate('created_by', 'full_name email');

    return holiday;
  }

  /**
   * Update a holiday
   *
   * @param holidayId Holiday ID
   * @param data Update data
   * @returns Updated holiday document
   */
  async updateHoliday(holidayId: string, data: UpdateHolidayData): Promise<ICompanyHoliday> {
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(holidayId)) {
      throw new ValidationError('Invalid holiday ID format');
    }

    // Get existing holiday
    const holiday = await CompanyHoliday.findOne({
      _id: new mongoose.Types.ObjectId(holidayId),
      deleted_at: null
    });

    if (!holiday) {
      throw new NotFoundError('Holiday not found');
    }

    // Update fields
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new ValidationError('Holiday name cannot be empty');
      }
      holiday.name = data.name.trim();
    }

    if (data.date !== undefined) {
      const newDate = new Date(data.date);
      if (Number.isNaN(newDate.getTime())) {
        throw new ValidationError('Invalid date format');
      }
      newDate.setUTCHours(0, 0, 0, 0);

      // Check if another holiday exists for the new date
      const existingHoliday = await CompanyHoliday.findOne({
        date: newDate,
        _id: { $ne: holiday._id },
        deleted_at: null
      });

      if (existingHoliday) {
        throw new ValidationError(`A holiday already exists for ${newDate.toISOString().split('T')[0]}`);
      }

      holiday.date = newDate;
    }

    if (data.holiday_type !== undefined) {
      holiday.holiday_type = data.holiday_type;
    }

    if (data.description !== undefined) {
      holiday.description = data.description?.trim();
    }

    if (data.is_active !== undefined) {
      holiday.is_active = data.is_active;
    }

    await holiday.save();

    return holiday;
  }

  /**
   * Delete a holiday (soft delete)
   *
   * @param holidayId Holiday ID
   * @returns Deleted holiday document
   */
  async deleteHoliday(holidayId: string): Promise<ICompanyHoliday> {
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(holidayId)) {
      throw new ValidationError('Invalid holiday ID format');
    }

    // Get existing holiday
    const holiday = await CompanyHoliday.findOne({
      _id: new mongoose.Types.ObjectId(holidayId),
      deleted_at: null
    });

    if (!holiday) {
      throw new NotFoundError('Holiday not found');
    }

    // Soft delete
    holiday.deleted_at = new Date();
    await holiday.save();

    return holiday;
  }

  /**
   * Get upcoming holidays (next N days)
   *
   * @param days Number of days to look ahead (default: 30)
   * @returns Array of upcoming holidays
   */
  async getUpcomingHolidays(days: number = 30): Promise<ICompanyHoliday[]> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    return this.getHolidaysInRange(today, futureDate);
  }

  /**
   * Get holidays for a specific year
   *
   * @param year Year (e.g., 2025)
   * @returns Array of holidays for that year
   */
  async getHolidaysByYear(year: number): Promise<ICompanyHoliday[]> {
    const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    return this.getHolidaysInRange(startDate, endDate);
  }

  /**
   * Get holidays within a week range for automatic timesheet entry creation
   *
   * @param weekStartDate Week start date (Monday)
   * @param weekEndDate Week end date (Sunday)
   * @returns Array of active holidays in the week
   */
  async getHolidaysInWeek(weekStartDate: Date, weekEndDate: Date): Promise<ICompanyHoliday[]> {
    return this.getHolidaysInRange(weekStartDate, weekEndDate);
  }

  /**
   * Create holiday time entries for a timesheet
   *
   * @param timesheetId Timesheet ID
   * @param weekStartDate Week start date
   * @param weekEndDate Week end date
   * @param defaultHours Default hours for holiday entries
   * @returns Array of created holiday time entries
   */
  async createHolidayTimeEntries(
    timesheetId: string,
    weekStartDate: Date,
    weekEndDate: Date,
    defaultHours: number = 8
  ): Promise<any[]> {
    const { TimeEntry } = require('@/models/TimeEntry');
    
    // Get holidays in the week
    const holidays = await this.getHolidaysInWeek(weekStartDate, weekEndDate);
    
    if (holidays.length === 0) {
      return [];
    }

    // Create holiday time entries
    const holidayEntries = holidays.map(holiday => ({
      timesheet_id: new mongoose.Types.ObjectId(timesheetId),
      entry_category: 'holiday',
      date: holiday.date,
      hours: defaultHours,
      description: `Holiday: ${holiday.name}`,
      is_billable: false,
      holiday_name: holiday.name,
      holiday_type: holiday.holiday_type,
      is_auto_generated: true
    }));

    if (holidayEntries.length > 0) {
      const createdEntries = await TimeEntry.insertMany(holidayEntries);
      return createdEntries;
    }

    return [];
  }

  /**
   * Synchronize holiday entries for a timesheet based on current week dates
   * This handles dynamic add/remove of holiday entries during timesheet editing
   *
   * @param timesheetId Timesheet ID
   * @param weekStartDate Week start date
   * @param weekEndDate Week end date
   * @param defaultHours Default hours for holiday entries
   * @returns Object with added and removed holiday entries
   */
  async synchronizeHolidayEntries(
    timesheetId: string,
    weekStartDate: Date,
    weekEndDate: Date,
    defaultHours: number = 8
  ): Promise<{ added: any[]; removed: any[]; existing: any[] }> {
    const { TimeEntry } = require('@/models/TimeEntry');
    
    // Get current holidays in the week
    const currentHolidays = await this.getHolidaysInWeek(weekStartDate, weekEndDate);
    const currentHolidayDates = currentHolidays.map(h => h.date.toISOString().split('T')[0]);
    
    // Get existing holiday entries for this timesheet
    const existingHolidayEntries = await TimeEntry.find({
      timesheet_id: new mongoose.Types.ObjectId(timesheetId),
      entry_category: 'holiday',
      is_auto_generated: true,
      deleted_at: null
    });

    const existingHolidayDates = existingHolidayEntries.map(e => 
      e.date.toISOString().split('T')[0]
    );

    // Find holidays to add (in current week but not in existing entries)
    const holidaysToAdd = currentHolidays.filter(holiday => 
      !existingHolidayDates.includes(holiday.date.toISOString().split('T')[0])
    );

    // Find holiday entries to remove (existing but not in current week)
    const entriesToRemove = existingHolidayEntries.filter(entry => 
      !currentHolidayDates.includes(entry.date.toISOString().split('T')[0])
    );

    // Add new holiday entries
    const addedEntries = [];
    if (holidaysToAdd.length > 0) {
      const newHolidayEntries = holidaysToAdd.map(holiday => ({
        timesheet_id: new mongoose.Types.ObjectId(timesheetId),
        entry_category: 'holiday',
        date: holiday.date,
        hours: defaultHours,
        description: `Holiday: ${holiday.name}`,
        is_billable: false,
        holiday_name: holiday.name,
        holiday_type: holiday.holiday_type,
        is_auto_generated: true
      }));

      const createdEntries = await TimeEntry.insertMany(newHolidayEntries);
      addedEntries.push(...createdEntries);
    }

    // Remove outdated holiday entries (soft delete)
    const removedEntries = [];
    if (entriesToRemove.length > 0) {
      await TimeEntry.updateMany(
        { 
          _id: { $in: entriesToRemove.map(e => e._id) }
        },
        { 
          deleted_at: new Date(),
          updated_at: new Date()
        }
      );
      removedEntries.push(...entriesToRemove);
    }

    // Get remaining existing entries
    const remainingEntries = existingHolidayEntries.filter(entry => 
      currentHolidayDates.includes(entry.date.toISOString().split('T')[0])
    );

    return {
      added: addedEntries,
      removed: removedEntries,
      existing: remainingEntries
    };
  }
}

// Export singleton instance
export default new CompanyHolidayService();
