/**
 * Centralized formatting utilities
 * Ensures consistent formatting across the application
 */

/**
 * Format date to localized string
 * @param date - Date to format
 * @param format - Format type ('short', 'long', 'time', 'datetime')
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: 'short' | 'long' | 'time' | 'datetime' = 'short'
): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return 'Invalid date';

  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit'
    },
    datetime: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  };

  const options = optionsMap[format];

  return dateObj.toLocaleDateString('en-US', options);
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param date - Date to format
 * @returns ISO date string
 */
export function formatISODate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
}

/**
 * Format currency with proper symbol and decimals
 * @param amount - Amount to format
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency = 'USD'
): string {
  if (amount === null || amount === undefined) return '-';

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) return '-';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Format duration in hours to human-readable format
 * @param hours - Number of hours
 * @param format - Format type ('short', 'long')
 * @returns Formatted duration string
 */
export function formatDuration(
  hours: number | string | null | undefined,
  format: 'short' | 'long' = 'short'
): string {
  if (hours === null || hours === undefined) return '-';

  const num = typeof hours === 'string' ? parseFloat(hours) : hours;

  if (isNaN(num)) return '-';

  if (format === 'short') {
    return `${num.toFixed(1)}h`;
  }

  const wholeHours = Math.floor(num);
  const minutes = Math.round((num - wholeHours) * 60);

  if (wholeHours === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  if (minutes === 0) {
    return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
  }

  return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Format percentage with proper decimals
 * @param value - Percentage value (0-100 or 0-1)
 * @param isDecimal - Whether input is decimal (0-1) or percentage (0-100)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number | string | null | undefined,
  isDecimal = false
): string {
  if (value === null || value === undefined) return '-';

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return '-';

  const percentage = isDecimal ? num * 100 : num;

  return `${percentage.toFixed(1)}%`;
}

/**
 * Format phone number to standard format
 * @param phone - Phone number to format
 * @returns Formatted phone number
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11) {
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return original if format is unrecognized
  return phone;
}

/**
 * Format file size to human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return 'Invalid date';

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  }

  if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  }

  if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  }

  if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  }

  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  }

  if (diffDay < 365) {
    const months = Math.floor(diffDay / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }

  const years = Math.floor(diffDay / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text
 */
export function truncateText(text: string | null | undefined, maxLength = 50): string {
  if (!text) return '-';

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength)}...`;
}

/**
 * Capitalize first letter of each word
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export function capitalizeWords(text: string | null | undefined): string {
  if (!text) return '-';

  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format role name (e.g., "super_admin" -> "Super Admin")
 * @param role - Role to format
 * @returns Formatted role name
 */
export function formatRole(role: string | null | undefined): string {
  if (!role) return '-';

  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
