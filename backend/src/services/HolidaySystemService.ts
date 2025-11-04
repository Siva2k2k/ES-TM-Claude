/**
 * Holiday System Service
 * 
 * Simplified company calendar and holiday management system.
 * This service provides centralized management for company holidays
 * and automatic timesheet holiday entry creation.
 */

import Calendar from '@/models/Calendar';
import { CompanyHoliday } from '@/models/CompanyHoliday';
import CompanyHolidayService from '@/services/CompanyHolidayService';
import { SettingsService } from '@/services/SettingsService';
import { AuthUser } from '@/middleware/auth';
import mongoose from 'mongoose';

export class HolidaySystemService {

  /**
   * Initialize the holiday system for a company
   * This should be called during system setup or by super admin
   */
  static async initializeSystem(currentUser: AuthUser): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (currentUser.role !== 'super_admin') {
        return { success: false, error: 'Only super admins can initialize the holiday system' };
      }

      let message = 'Holiday system initialized successfully';

      // 1. Ensure company calendar exists
      await Calendar.getOrCreateCompanyCalendar(new mongoose.Types.ObjectId(currentUser.id));
      
      // 2. Initialize holiday system settings
      const settingsResult = await SettingsService.initializeHolidaySettings(currentUser);
      if (!settingsResult.success) {
        return { success: false, error: settingsResult.error };
      }

      // 3. Create some default holidays if none exist
      const existingHolidays = await CompanyHoliday.countDocuments({ deleted_at: null });
      if (existingHolidays === 0) {
        const currentYear = new Date().getFullYear();
        const defaultHolidays = [
          {
            name: 'New Year\'s Day',
            date: new Date(currentYear, 0, 1),
            holiday_type: 'public' as const,
            description: 'First day of the year'
          },
          {
            name: 'Independence Day',
            date: new Date(currentYear, 6, 4),
            holiday_type: 'public' as const,
            description: 'National Independence Day'
          },
          {
            name: 'Christmas Day',
            date: new Date(currentYear, 11, 25),
            holiday_type: 'public' as const,
            description: 'Christmas Day celebration'
          }
        ];

        for (const holidayData of defaultHolidays) {
          try {
            await CompanyHolidayService.createHoliday({
              ...holidayData,
              created_by: currentUser.id
            });
          } catch (error) {
            // Continue if holiday already exists
            console.log(`Holiday ${holidayData.name} may already exist:`, error.message);
          }
        }
        message += `. Created ${defaultHolidays.length} default holidays for ${currentYear}.`;
      }

      return { success: true, message };
    } catch (error) {
      console.error('Error initializing holiday system:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to initialize holiday system' };
    }
  }

  /**
   * Get holiday system status and configuration
   */
  static async getSystemStatus(): Promise<{ 
    calendar?: any; 
    settings?: any; 
    holidayCount: number; 
    error?: string 
  }> {
    try {
      // Get company calendar
      const calendar = await Calendar.getCompanyCalendar();
      
      // Get holiday settings
      const settingsResult = await SettingsService.getHolidaySettings();
      
      // Get holiday count
      const holidayCount = await CompanyHoliday.countDocuments({ 
        deleted_at: null, 
        is_active: true 
      });

      return {
        calendar: calendar ? {
          id: calendar.id,
          name: calendar.name,
          auto_create_holiday_entries: calendar.auto_create_holiday_entries,
          default_holiday_hours: calendar.default_holiday_hours,
          working_days: calendar.working_days,
          working_hours_per_day: calendar.working_hours_per_day
        } : null,
        settings: settingsResult.settings,
        holidayCount
      };
    } catch (error) {
      console.error('Error getting holiday system status:', error);
      return { 
        holidayCount: 0, 
        error: error instanceof Error ? error.message : 'Failed to get system status' 
      };
    }
  }

  /**
   * Update company calendar settings
   */
  static async updateCalendarSettings(
    settings: {
      auto_create_holiday_entries?: boolean;
      default_holiday_hours?: number;
      working_days?: number[];
      working_hours_per_day?: number;
    },
    currentUser: AuthUser
  ): Promise<{ calendar?: any; error?: string }> {
    try {
      if (!['super_admin', 'management'].includes(currentUser.role)) {
        return { error: 'Only administrators can update calendar settings' };
      }

      const calendar = await Calendar.getOrCreateCompanyCalendar(new mongoose.Types.ObjectId(currentUser.id));
      
      if (settings.auto_create_holiday_entries !== undefined) {
        calendar.auto_create_holiday_entries = settings.auto_create_holiday_entries;
      }
      
      if (settings.default_holiday_hours !== undefined) {
        calendar.default_holiday_hours = settings.default_holiday_hours;
      }
      
      if (settings.working_days !== undefined) {
        calendar.working_days = settings.working_days;
      }
      
      if (settings.working_hours_per_day !== undefined) {
        calendar.working_hours_per_day = settings.working_hours_per_day;
      }

      await calendar.save();

      return {
        calendar: {
          id: calendar.id,
          name: calendar.name,
          auto_create_holiday_entries: calendar.auto_create_holiday_entries,
          default_holiday_hours: calendar.default_holiday_hours,
          working_days: calendar.working_days,
          working_hours_per_day: calendar.working_hours_per_day
        }
      };
    } catch (error) {
      console.error('Error updating calendar settings:', error);
      return { error: error instanceof Error ? error.message : 'Failed to update calendar settings' };
    }
  }

  /**
   * Get holidays for the current year or a specific year
   */
  static async getYearlyHolidays(year?: number): Promise<{ holidays?: any[]; error?: string }> {
    try {
      const targetYear = year || new Date().getFullYear();
      const holidays = await CompanyHolidayService.getHolidaysByYear(targetYear);
      
      return { holidays };
    } catch (error) {
      console.error('Error getting yearly holidays:', error);
      return { error: error instanceof Error ? error.message : 'Failed to get yearly holidays' };
    }
  }

  /**
   * Bulk import holidays for a year
   */
  static async bulkImportHolidays(
    holidays: Array<{
      name: string;
      date: string;
      holiday_type: 'public' | 'company' | 'optional';
      description?: string;
    }>,
    currentUser: AuthUser
  ): Promise<{ success: boolean; imported: number; skipped: number; errors: string[] }> {
    try {
      if (!['super_admin', 'management'].includes(currentUser.role)) {
        return { success: false, imported: 0, skipped: 0, errors: ['Only administrators can bulk import holidays'] };
      }

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const holidayData of holidays) {
        try {
          await CompanyHolidayService.createHoliday({
            ...holidayData,
            created_by: currentUser.id
          });
          imported++;
        } catch (error) {
          skipped++;
          errors.push(`${holidayData.name}: ${error.message}`);
        }
      }

      return { success: true, imported, skipped, errors };
    } catch (error) {
      console.error('Error bulk importing holidays:', error);
      return { 
        success: false, 
        imported: 0, 
        skipped: 0, 
        errors: [error instanceof Error ? error.message : 'Failed to bulk import holidays'] 
      };
    }
  }
}

export default HolidaySystemService;