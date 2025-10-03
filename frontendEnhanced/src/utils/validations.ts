/**
 * Frontend Validation Utilities
 * Provides client-side validation for forms and user inputs
 */

export class FrontendValidation {
  /**
   * Check if a date is a Monday
   */
  static isMondayDate(date: Date): boolean {
    return date.getDay() === 1;
  }

  /**
   * Get the Monday of the week for any given date
   */
  static getMondayOfWeek(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * Get the Sunday (end of week) for a given Monday
   */
  static getSundayOfWeek(monday: Date): Date {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  }

  /**
   * Check if a date falls within a given week range
   */
  static isDateInWeek(date: Date, weekStart: Date): boolean {
    const weekEnd = this.getSundayOfWeek(weekStart);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return checkDate >= weekStart && checkDate <= weekEnd;
  }

  /**
   * Get week range (start and end) for any date
   */
  static getWeekRange(date: Date): { start: Date; end: Date } {
    const start = this.getMondayOfWeek(date);
    const end = this.getSundayOfWeek(start);
    return { start, end };
  }

  /**
   * Format date to YYYY-MM-DD
   */
  static formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Check if value is required and not empty
   */
  static isRequired(value: any, fieldName: string): string | null {
    if (value === undefined || value === null || value === '' ||
        (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} is required`;
    }
    return null;
  }

  /**
   * Validate string length
   */
  static validateStringLength(
    value: string,
    minLength: number,
    maxLength: number,
    fieldName: string
  ): string | null {
    if (!value) return null;

    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      return `${fieldName} must be at least ${minLength} characters`;
    }
    if (trimmed.length > maxLength) {
      return `${fieldName} cannot exceed ${maxLength} characters`;
    }
    return null;
  }

  /**
   * Validate number is in range
   */
  static isInRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): string | null {
    if (isNaN(value)) {
      return `${fieldName} must be a valid number`;
    }
    if (value < min) {
      return `${fieldName} must be at least ${min}`;
    }
    if (value > max) {
      return `${fieldName} cannot exceed ${max}`;
    }
    return null;
  }

  /**
   * Validate date range (start before end)
   */
  static isValidDateRange(start: Date, end: Date, fieldPrefix: string = 'Date'): string | null {
    if (start > end) {
      return `${fieldPrefix} start must be before end date`;
    }
    return null;
  }

  /**
   * Validate hours per day (0-24)
   */
  static validateDailyHours(hours: number): string | null {
    return this.isInRange(hours, 0, 24, 'Daily hours');
  }

  /**
   * Validate hours per week (0-168)
   */
  static validateWeeklyHours(hours: number): string | null {
    return this.isInRange(hours, 0, 168, 'Weekly hours');
  }

  /**
   * Validate project budget
   */
  static validateBudget(budget: number): string | null {
    if (budget < 0) {
      return 'Budget cannot be negative';
    }
    if (budget > 10000000) {
      return 'Budget seems unreasonably high';
    }
    return null;
  }

  /**
   * Validate hourly rate
   */
  static validateHourlyRate(rate: number): string | null {
    if (rate < 0) {
      return 'Hourly rate cannot be negative';
    }
    if (rate > 10000) {
      return 'Hourly rate seems unreasonably high';
    }
    return null;
  }

  /**
   * Check if a date is in the past
   */
  static isDateInPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  /**
   * Check if a date is in the future
   */
  static isDateInFuture(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  }

  /**
   * Get available week Mondays for timesheet selection
   * Returns array of Mondays within a range (e.g., past 12 weeks + next 4 weeks)
   */
  static getAvailableWeekMondays(pastWeeks: number = 12, futureWeeks: number = 4): Date[] {
    const mondays: Date[] = [];
    const today = new Date();
    const currentMonday = this.getMondayOfWeek(today);

    // Add past weeks
    for (let i = pastWeeks; i >= 0; i--) {
      const monday = new Date(currentMonday);
      monday.setDate(currentMonday.getDate() - (i * 7));
      mondays.push(monday);
    }

    // Add future weeks
    for (let i = 1; i <= futureWeeks; i++) {
      const monday = new Date(currentMonday);
      monday.setDate(currentMonday.getDate() + (i * 7));
      mondays.push(monday);
    }

    return mondays;
  }

  /**
   * Combine multiple validation errors
   */
  static combineErrors(...errors: (string | null)[]): string | null {
    const validErrors = errors.filter((e): e is string => e !== null);
    return validErrors.length > 0 ? validErrors.join('; ') : null;
  }

  /**
   * Sanitize string input (trim and remove extra spaces)
   */
  static sanitizeString(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  /**
   * Check if ObjectId format is valid (MongoDB ObjectId)
   */
  static isValidObjectId(id: string): boolean {
    return /^[a-f\d]{24}$/i.test(id);
  }

  /**
   * Validate phone number (basic US format)
   */
  static isValidPhoneNumber(phone: string): boolean {
    // Accepts formats: (123) 456-7890, 123-456-7890, 1234567890
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Check if array is empty
   */
  static isArrayEmpty(arr: any[]): boolean {
    return !arr || arr.length === 0;
  }

  /**
   * Validate file size (in MB)
   */
  static isValidFileSize(file: File, maxSizeMB: number): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  /**
   * Validate file type
   */
  static isValidFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  /**
   * Get user-friendly day name for date
   */
  static getDayName(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  /**
   * Check if two dates are the same day
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Get days between two dates
   */
  static getDaysBetween(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if date is a weekend
   */
  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  /**
   * Check if date is a weekday
   */
  static isWeekday(date: Date): boolean {
    return !this.isWeekend(date);
  }
}

export default FrontendValidation;
