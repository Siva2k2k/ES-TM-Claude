/**
 * Date utility functions for timezone-safe date handling
 * These functions create UTC dates to ensure consistent storage in MongoDB
 */

/**
 * Parse a date string (YYYY-MM-DD) and create a UTC Date object
 * This ensures the calendar date is preserved when storing in MongoDB
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object in UTC representing the calendar date
 * 
 * @example
 * parseLocalDate("2025-10-06") → Date object for 2025-10-06T00:00:00.000Z
 * When stored in MongoDB, it remains 2025-10-06T00:00:00.000Z (Monday)
 */
export function parseLocalDate(dateString: string | Date): Date {
  if (dateString instanceof Date) {
    return new Date(dateString);
  }

  // Parse YYYY-MM-DD format and create UTC date
  const parts = dateString.split('T')[0].split('-');
  if (parts.length !== 3) {
    throw new TypeError('Invalid date format. Expected YYYY-MM-DD');
  }

  const year = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const day = Number.parseInt(parts[2], 10);

  // Create UTC date to preserve calendar date
  const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

  if (Number.isNaN(date.getTime())) {
    throw new TypeError('Invalid date');
  }

  return date;
}

/**
 * Get the Monday of the week for a given date
 * Works with UTC dates to maintain calendar date consistency
 * 
 * @param date - Date object or date string
 * @returns Date object set to Monday of that week (UTC)
 * 
 * @example
 * getMondayOfWeek("2025-10-06") → 2025-10-06T00:00:00.000Z (already Monday)
 * getMondayOfWeek("2025-10-08") → 2025-10-06T00:00:00.000Z (Monday of that week)
 */
export function getMondayOfWeek(date: string | Date): Date {
  const d = parseLocalDate(date);
  
  // Work with UTC to maintain calendar dates
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  
  // Create new UTC date for Monday
  const monday = new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    diff,
    0, 0, 0, 0
  ));
  
  return monday;
}

/**
 * Get the Sunday (end of week) for a given Monday
 * Works with UTC dates to maintain calendar date consistency
 * 
 * @param monday - Date object or date string (should be a Monday)
 * @returns Date object set to Sunday of that week (UTC)
 * 
 * @example
 * getSundayOfWeek("2025-10-06") → 2025-10-12T23:59:59.999Z (Sunday)
 */
export function getSundayOfWeek(monday: string | Date): Date {
  const d = parseLocalDate(monday);
  
  // Create new UTC date for Sunday (6 days later)
  const sunday = new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 6,
    23, 59, 59, 999
  ));
  
  return sunday;
}

/**
 * Format date to YYYY-MM-DD string using UTC components
 * This ensures the calendar date is preserved
 * 
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 * 
 * @example
 * toISODateString(new Date("2025-10-06T00:00:00.000Z")) → "2025-10-06"
 */
export function toISODateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * Uses UTC day to maintain calendar date consistency
 * 
 * @param date - Date object or date string
 * @returns true if weekend, false otherwise
 */
export function isWeekend(date: string | Date): boolean {
  const d = parseLocalDate(date);
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Check if a date is a Monday
 * Uses UTC day to maintain calendar date consistency
 * 
 * @param date - Date object or date string
 * @returns true if Monday, false otherwise
 */
export function isMonday(date: string | Date): boolean {
  const d = parseLocalDate(date);
  return d.getUTCDay() === 1;
}
